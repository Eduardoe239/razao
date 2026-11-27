// Categorias como contas internas: criar, renomear, arquivar, mesclar e recategorizar em lote (CAT-001, 002, 004).
import { activeEntries, isFlow } from '@/domain/income-expense';
import type { JournalEntry, LedgerAccount } from '@/domain/ledger';
import { entriesUsing, recategorize } from '@/domain/recategorize';
import type { OpsContext } from './account-ops';
import { alreadyDone, domainSafe, writable } from './account-ops';
import { AppError } from './errors';
import type { Category, CategoryRuleItem } from './model';
import { ENTITY, categorySchema } from './model';
import type { WorkspaceSnapshot } from './ports';
import { categoriesOf, rulesOf, workspaceOf } from './session-read';

export interface NewCategory {
  readonly name: string;
  readonly group: Category['group'];
  readonly parentId?: string | undefined;
  readonly categoryId: string;
  readonly ledgerAccountId: string;
  readonly operationId: string;
}

const mesmoNome = (a: string, b: string) => a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');

/** CAT-001: cria a categoria e a conta interna dela numa operação só. */
export async function createCategory(
  c: OpsContext,
  workspaceId: string,
  input: NewCategory,
): Promise<'gravada' | 'repetida'> {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const snap = await c.port.load(workspaceId);
  const todas = categoriesOf(snap);
  const nome = input.name.trim();
  const pai = input.parentId ? todas.find((x) => x.id === input.parentId) : undefined;
  if (input.parentId) {
    if (!pai)
      throw new AppError('INVALID', 'A categoria principal não existe neste espaço. Nada foi criado.');
    if (pai.archived) throw new AppError('INVALID', 'A categoria principal está arquivada. Reative-a antes.');
    if (pai.group !== input.group) {
      throw new AppError('INVALID', 'A subcategoria precisa ser do mesmo tipo da principal.');
    }
    if (pai.parentId !== null)
      throw new AppError('INVALID', 'Subcategoria não tem outra subcategoria dentro.');
  }
  const parentId = pai?.id ?? null;
  const repetida = todas.some(
    (x) => !x.archived && x.group === input.group && x.parentId === parentId && mesmoNome(x.name, nome),
  );
  if (repetida) throw new AppError('INVALID', `Já existe a categoria "${nome}" aqui.`);
  const categoria: Category = {
    id: input.categoryId,
    name: nome,
    group: input.group,
    parentId,
    ledgerAccountId: input.ledgerAccountId,
    archived: false,
    createdAt: c.clock.nowIso(),
  };
  const valida = categorySchema.safeParse(categoria);
  if (!valida.success) throw new AppError('INVALID', 'Dê um nome à categoria, com até 60 caracteres.');
  const ledger: LedgerAccount = { id: input.ledgerAccountId, workspaceId, group: input.group };
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: [],
    items: [
      { type: ENTITY.ledgerAccount, id: ledger.id, data: { ...ledger, name: nome } },
      { type: ENTITY.category, id: categoria.id, data: valida.data },
    ],
    audit: {
      action: 'categoria.criar',
      target: `category/${categoria.id}`,
      after: { name: nome, group: input.group, parentId },
    },
  });
}

type Gravacao = Promise<'gravada' | 'repetida'>;

function categoria(todas: readonly Category[], id: string): Category {
  const c = todas.find((x) => x.id === id);
  if (!c) throw new AppError('INVALID', 'Categoria não encontrada neste espaço. Nada foi alterado.');
  return c;
}

const itemCategoria = (c: Category) => ({ type: ENTITY.category, id: c.id, data: c });
const itemRegra = (r: CategoryRuleItem) => ({ type: ENTITY.categoryRule, id: r.id, data: r });

/** CAT-002: renomear muda só o nome; os lançamentos continuam onde estão. */
export async function renameCategory(
  c: OpsContext,
  workspaceId: string,
  input: { categoryId: string; name: string; operationId: string },
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const snap = await c.port.load(workspaceId);
  const todas = categoriesOf(snap);
  const atual = categoria(todas, input.categoryId);
  const nome = input.name.trim();
  if (!nome || nome.length > 60)
    throw new AppError('INVALID', 'Dê um nome à categoria, com até 60 caracteres.');
  const repetida = todas.some(
    (x) =>
      x.id !== atual.id &&
      !x.archived &&
      x.group === atual.group &&
      x.parentId === atual.parentId &&
      mesmoNome(x.name, nome),
  );
  if (repetida) throw new AppError('INVALID', `Já existe a categoria "${nome}" aqui.`);
  if (nome === atual.name) throw new AppError('INVALID', 'O nome é o mesmo de antes.');
  const ledger = snap.ledger.get(atual.ledgerAccountId);
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: [],
    items: [
      itemCategoria({ ...atual, name: nome }),
      ...(ledger ? [{ type: ENTITY.ledgerAccount, id: ledger.id, data: { ...ledger, name: nome } }] : []),
    ],
    audit: {
      action: 'categoria.renomear',
      target: `category/${atual.id}`,
      after: { from: atual.name, to: nome },
    },
  });
}

/**
 * CAT-002: arquivar tira a categoria das escolhas, sem mexer no histórico. Arquivar a principal arquiva as
 * subcategorias e desliga as regras que apontam para elas (D-049). Reativar vale só para a própria categoria.
 */
export async function setCategoryArchived(
  c: OpsContext,
  workspaceId: string,
  input: { categoryId: string; archived: boolean; operationId: string },
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const snap = await c.port.load(workspaceId);
  const todas = categoriesOf(snap);
  const atual = categoria(todas, input.categoryId);
  if (atual.archived === input.archived) {
    throw new AppError(
      'INVALID',
      input.archived ? 'A categoria já está arquivada.' : 'A categoria já está ativa.',
    );
  }
  if (!input.archived && atual.parentId) {
    const pai = categoria(todas, atual.parentId);
    if (pai.archived) throw new AppError('INVALID', `Reative "${pai.name}" antes da subcategoria.`);
  }
  const afetadas = input.archived
    ? todas.filter((x) => x.id === atual.id || x.parentId === atual.id)
    : [atual];
  const ids = new Set(afetadas.map((x) => x.id));
  const regras = input.archived ? rulesOf(snap).filter((r) => r.active && ids.has(r.categoryId)) : [];
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: [],
    items: [
      ...afetadas
        .filter((x) => x.archived !== input.archived)
        .map((x) => itemCategoria({ ...x, archived: input.archived })),
      ...regras.map((r) => itemRegra({ ...r, active: false })),
    ],
    audit: {
      action: input.archived ? 'categoria.arquivar' : 'categoria.reativar',
      target: `category/${atual.id}`,
      after: { categories: afetadas.length, rulesOff: regras.length },
    },
  });
}

export interface MovePreview {
  readonly count: number;
  readonly pending: number;
  /** Meses afetados, aaaa-mm, do mais antigo para o mais novo. */
  readonly months: readonly string[];
}

function previa(entries: readonly JournalEntry[]): MovePreview {
  return {
    count: entries.length,
    pending: entries.filter((e) => e.status === 'pendente').length,
    months: [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort(),
  };
}

function paraMesclar(snap: WorkspaceSnapshot, fromId: string, toId: string) {
  const todas = categoriesOf(snap);
  const de = categoria(todas, fromId);
  const para = categoria(todas, toId);
  if (de.id === para.id) throw new AppError('INVALID', 'Escolha outra categoria de destino.');
  if (de.group !== para.group) {
    throw new AppError('INVALID', 'Receita só se mescla com receita, e despesa com despesa.');
  }
  if (para.archived) throw new AppError('INVALID', `"${para.name}" está arquivada. Reative-a antes.`);
  if (todas.some((x) => x.parentId === de.id && !x.archived)) {
    throw new AppError(
      'INVALID',
      `"${de.name}" tem subcategorias. Mescle ou arquive as subcategorias antes.`,
    );
  }
  const usados = entriesUsing(activeEntries(snap.entries), new Set([de.ledgerAccountId]));
  return { de, para, usados };
}

/** CAT-002: prévia da mescla, antes de confirmar. */
export async function previewMerge(
  c: OpsContext,
  workspaceId: string,
  input: { fromId: string; toId: string },
): Promise<MovePreview> {
  return previa(paraMesclar(await c.port.load(workspaceId), input.fromId, input.toId).usados);
}

/**
 * CAT-002: mesclar A em B, numa operação só (D-049). Os lançamentos de A vão para B (pendente direto,
 * realizado por estorno e lançamento novo), A fica arquivada e as regras de A passam para B.
 */
export async function mergeCategory(
  c: OpsContext,
  workspaceId: string,
  input: { fromId: string; toId: string; operationId: string },
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const snap = await c.port.load(workspaceId);
  const { de, para, usados } = paraMesclar(snap, input.fromId, input.toId);
  const hoje = c.clock.today(workspaceOf(snap).timeZone);
  const change = usados.length
    ? domainSafe(() =>
        recategorize(
          { operationId: input.operationId, workspaceId, date: hoje },
          usados,
          new Map([[de.ledgerAccountId, para.ledgerAccountId]]),
          snap.ledger,
        ),
      )
    : { add: [], replace: [], remove: [] };
  const regras = rulesOf(snap).filter((r) => r.categoryId === de.id);
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: change.add,
    ...(change.replace.length ? { replace: change.replace } : {}),
    items: [
      itemCategoria({ ...de, archived: true }),
      ...regras.map((r) => itemRegra({ ...r, categoryId: para.id })),
    ],
    audit: {
      action: 'categoria.mesclar',
      target: `category/${de.id}`,
      after: { into: para.id, ...previa(usados), rules: regras.length },
    },
  });
}

function paraLote(snap: WorkspaceSnapshot, entryIds: readonly string[], toId: string) {
  const para = categoria(categoriesOf(snap), toId);
  if (para.archived) throw new AppError('INVALID', `"${para.name}" está arquivada. Reative-a antes.`);
  const ativos = new Map(activeEntries(snap.entries).map((e) => [e.entryId, e]));
  const tipo = para.group === 'income' ? 'receita' : 'despesa';
  const mapa = new Map<string, string>();
  const mover: JournalEntry[] = [];
  for (const id of new Set(entryIds)) {
    const e = ativos.get(id);
    if (!e || !isFlow(e))
      throw new AppError('INVALID', 'Um dos lançamentos não existe mais. Nada foi alterado.');
    if (e.kind !== tipo) {
      throw new AppError(
        'INVALID',
        'Escolha só receitas para categoria de receita, ou só despesas para despesa.',
      );
    }
    const outras = e.lines.filter(
      (l) => snap.ledger.get(l.accountId)?.group === para.group && l.accountId !== para.ledgerAccountId,
    );
    if (!outras.length) continue;
    for (const l of outras) mapa.set(l.accountId, para.ledgerAccountId);
    mover.push(e);
  }
  if (!mover.length) throw new AppError('INVALID', `Os lançamentos escolhidos já estão em "${para.name}".`);
  return { para, mover, mapa };
}

/** CAT-004: prévia de recategorizar em lote. */
export async function previewRecategorize(
  c: OpsContext,
  workspaceId: string,
  input: { entryIds: readonly string[]; toId: string },
): Promise<MovePreview> {
  return previa(paraLote(await c.port.load(workspaceId), input.entryIds, input.toId).mover);
}

/** CAT-004: põe todos os lançamentos escolhidos numa categoria só, numa operação. */
export async function recategorizeEntries(
  c: OpsContext,
  workspaceId: string,
  input: { entryIds: readonly string[]; toId: string; operationId: string },
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const snap = await c.port.load(workspaceId);
  const { para, mover, mapa } = paraLote(snap, input.entryIds, input.toId);
  const hoje = c.clock.today(workspaceOf(snap).timeZone);
  const change = domainSafe(() =>
    recategorize({ operationId: input.operationId, workspaceId, date: hoje }, mover, mapa, snap.ledger),
  );
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: change.add,
    ...(change.replace.length ? { replace: change.replace } : {}),
    items: [],
    audit: { action: 'categoria.recategorizar', target: `category/${para.id}`, after: previa(mover) },
  });
}
