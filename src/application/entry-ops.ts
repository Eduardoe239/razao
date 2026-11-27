// Casos de uso de receitas e despesas (LAN-001 a LAN-007, LAN-012). Ainda sem tela: as telas vêm no I-04.
// Cada caso de uso lê o espaço, monta a mudança pelo domínio e grava tudo numa operação só.
import type { CivilDate } from '@/domain/civil-date';
import { isCivilDate } from '@/domain/civil-date';
import type { FlowInput, FlowKind, JournalChange } from '@/domain/income-expense';
import {
  activeEntries,
  confirmPending,
  deleteFlow,
  editFlow,
  isFlow,
  recordFlow,
  restorePending,
  undoDelete,
} from '@/domain/income-expense';
import type { EntryStatus, JournalEntry } from '@/domain/ledger';
import { money } from '@/domain/money';
import type { OpsContext } from './account-ops';
import { alreadyDone, contaDe, dataAte, domainSafe, writable } from './account-ops';
import { AppError } from './errors';
import type { Account, Category } from './model';
import type { WorkspaceSnapshot } from './ports';
import { attachmentCounts, rootFinder } from './attachment-ops';
import { accountsOf, attachmentsOf, categoriesOf, workspaceOf } from './session-read';

export const MAX_DESCRIPTION = 200;
export const MAX_NOTE = 500;
export const MAX_TAGS = 10;
const MAX_TAG = 30;

/** Tags sem espaço sobrando, sem repetir (maiúsculas não contam) e sem vírgula, que separa umas das outras. */
export function cleanTags(tags: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of tags) {
    const limpa = t.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!limpa) continue;
    if (limpa.length > MAX_TAG)
      throw new AppError('INVALID', `Cada tag pode ter até ${String(MAX_TAG)} caracteres.`);
    if (!out.some((x) => x.toLocaleLowerCase('pt-BR') === limpa.toLocaleLowerCase('pt-BR'))) out.push(limpa);
  }
  if (out.length > MAX_TAGS)
    throw new AppError('INVALID', `Use até ${String(MAX_TAGS)} tags por lançamento.`);
  return out;
}

/** "viagem, trabalho" vira ["viagem", "trabalho"]. */
export function parseTags(texto: string): string[] {
  return texto
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export interface PartInput {
  readonly categoryId: string;
  readonly amountCents: number;
}

export interface FlowEntryInput {
  readonly kind: FlowKind;
  readonly accountId: string;
  readonly parts: readonly PartInput[];
  /** aaaa-mm-dd. Realizado não aceita data futura; pendente aceita a data prevista. */
  readonly date: string;
  readonly status: EntryStatus;
  readonly description: string;
  /** LAN-008: tags livres e observação. */
  readonly tags?: readonly string[];
  readonly note?: string;
  readonly operationId: string;
}

/** O que a interface precisa para mostrar "Desfazer" depois de excluir (LAN-006). */
export type UndoToken =
  | { readonly kind: 'pendente'; readonly entry: JournalEntry }
  | { readonly kind: 'estorno'; readonly entryId: string };

export interface FlowRow {
  readonly entryId: string;
  readonly kind: FlowKind;
  readonly date: CivilDate;
  readonly status: EntryStatus;
  readonly accountId: string;
  readonly amountCents: number;
  readonly parts: readonly PartInput[];
  readonly description: string;
  readonly tags: readonly string[];
  readonly note: string;
  readonly edited: boolean;
  /** LAN-009: quantos comprovantes o lançamento tem. */
  readonly attachments: number;
}

type Gravacao = Promise<'gravada' | 'repetida'>;

function categoriaDe(snap: WorkspaceSnapshot, id: string): Category {
  const c = categoriesOf(snap).find((x) => x.id === id);
  if (!c) throw new AppError('INVALID', 'Categoria não encontrada neste espaço. Nada foi alterado.');
  return c;
}

function data(texto: string, status: EntryStatus, hoje: CivilDate): CivilDate {
  if (status === 'realizado') return dataAte(texto, hoje);
  if (!isCivilDate(texto)) throw new AppError('INVALID', 'Escolha uma data válida.');
  return texto;
}

/** Valida a entrada da pessoa e traduz ids de conta e categoria para as contas internas. */
function montar(snap: WorkspaceSnapshot, input: FlowEntryInput, hoje: CivilDate) {
  const { account, ledger } = contaDe(snap, input.accountId);
  if (account.archived)
    throw new AppError('INVALID', 'Conta arquivada não recebe lançamento. Reative-a antes.');
  if (input.parts.length === 0) throw new AppError('INVALID', 'Escolha uma categoria.');
  const parts = input.parts.map((p) => {
    const cat = categoriaDe(snap, p.categoryId);
    if (cat.archived) throw new AppError('INVALID', `A categoria "${cat.name}" está arquivada.`);
    const conta = snap.ledger.get(cat.ledgerAccountId);
    if (!conta) throw new AppError('STORAGE', 'O espaço está incompleto. Nada foi alterado.');
    if (!Number.isSafeInteger(p.amountCents) || p.amountCents <= 0) {
      throw new AppError('INVALID', 'Cada valor precisa ser maior que zero.');
    }
    return { category: conta, amount: domainSafe(() => money(p.amountCents)) };
  });
  const descricao = input.description.trim();
  if (descricao.length > MAX_DESCRIPTION) {
    throw new AppError('INVALID', `A descrição pode ter até ${String(MAX_DESCRIPTION)} caracteres.`);
  }
  const nota = (input.note ?? '').trim();
  if (nota.length > MAX_NOTE) {
    throw new AppError('INVALID', `A observação pode ter até ${String(MAX_NOTE)} caracteres.`);
  }
  const tags = cleanTags(input.tags ?? []);
  const meta: Record<string, string> = {};
  if (descricao) meta['description'] = descricao;
  if (tags.length) meta['tags'] = tags.join(', ');
  if (nota) meta['note'] = nota;
  const flow: FlowInput = { kind: input.kind, account: ledger, parts, status: input.status, meta };
  return { flow, date: data(input.date, input.status, hoje) };
}

function hojeDe(c: OpsContext, snap: WorkspaceSnapshot): CivilDate {
  return c.clock.today(workspaceOf(snap).timeZone);
}

function gravar(
  c: OpsContext,
  workspaceId: string,
  operationId: string,
  change: JournalChange,
  audit: { action: string; target: string; after?: unknown },
): Gravacao {
  return c.port.commit(workspaceId, {
    operationId,
    entries: change.add,
    ...(change.replace.length ? { replace: change.replace } : {}),
    ...(change.remove.length ? { remove: change.remove } : {}),
    items: [],
    audit,
  });
}

/** Um lançamento de receita ou despesa que ainda vale (não excluído nem substituído por edição). */
function ativo(snap: WorkspaceSnapshot, entryId: string): JournalEntry {
  const e = activeEntries(snap.entries).find((x) => x.entryId === entryId && isFlow(x));
  if (!e)
    throw new AppError('INVALID', 'Este lançamento não existe mais ou já foi alterado. Nada foi alterado.');
  return e;
}

const resumo = (e: JournalEntry) => ({
  kind: e.kind,
  date: e.date,
  status: e.status,
  lines: e.lines,
  description: e.meta['description'] ?? '',
});

/** LAN-001, LAN-003, LAN-007 e LAN-012: registrar. Repetir a mesma operação grava uma vez só. */
export async function createEntry(c: OpsContext, workspaceId: string, input: FlowEntryInput): Gravacao {
  writable(c.port);
  const snap = await c.port.load(workspaceId);
  const { flow, date } = montar(snap, input, hojeDe(c, snap));
  const change = domainSafe(() => recordFlow({ operationId: input.operationId, workspaceId, date }, flow));
  const novo = change.add[0];
  return gravar(c, workspaceId, input.operationId, change, {
    action: 'lancamento.criar',
    target: `entry/${novo?.entryId ?? ''}`,
    after: novo ? resumo(novo) : undefined,
  });
}

/** LAN-004: editar. A auditoria guarda o antes e o depois; o domínio decide entre troca e estorno. */
export async function editEntry(
  c: OpsContext,
  workspaceId: string,
  entryId: string,
  input: FlowEntryInput,
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const snap = await c.port.load(workspaceId);
  const original = ativo(snap, entryId);
  const { flow, date } = montar(snap, input, hojeDe(c, snap));
  const change = domainSafe(() =>
    editFlow({ operationId: input.operationId, workspaceId, date }, original, flow),
  );
  const depois = change.replace[0] ?? change.add[1];
  return gravar(c, workspaceId, input.operationId, change, {
    action: 'lancamento.editar',
    target: `entry/${entryId}`,
    after: { before: resumo(original), now: depois ? resumo(depois) : undefined },
  });
}

/** LAN-006: excluir. Devolve o que a interface usa para desfazer nos 10 s seguintes (nada, se for repetida). */
export async function deleteEntry(
  c: OpsContext,
  workspaceId: string,
  input: { entryId: string; operationId: string },
): Promise<{ result: 'gravada' | 'repetida'; undo: UndoToken | null }> {
  writable(c.port);
  // Repetida: o "Desfazer" já foi entregue na primeira vez; a segunda não oferece outro.
  if (await alreadyDone(c, workspaceId, input.operationId)) return { result: 'repetida', undo: null };
  const snap = await c.port.load(workspaceId);
  const original = ativo(snap, input.entryId);
  const change = domainSafe(() =>
    deleteFlow({ operationId: input.operationId, workspaceId, date: original.date }, original),
  );
  const result = await gravar(c, workspaceId, input.operationId, change, {
    action: 'lancamento.excluir',
    target: `entry/${original.entryId}`,
    after: resumo(original),
  });
  const estorno = change.add[0];
  const undo: UndoToken = estorno
    ? { kind: 'estorno', entryId: estorno.entryId }
    : { kind: 'pendente', entry: original };
  return { result, undo };
}

/** LAN-006: desfazer a exclusão. Fica registrado na auditoria como as outras mudanças. */
export async function undoDeleteEntry(
  c: OpsContext,
  workspaceId: string,
  input: { undo: UndoToken; operationId: string },
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const snap = await c.port.load(workspaceId);
  let change: JournalChange;
  let alvo: string;
  if (input.undo.kind === 'pendente') {
    const original = input.undo.entry;
    if (original.workspaceId !== workspaceId) throw new AppError('INVALID', 'Lançamento de outro espaço.');
    if (snap.entries.some((e) => e.entryId === original.entryId)) {
      throw new AppError('INVALID', 'Este lançamento já foi recuperado.');
    }
    change = domainSafe(() => restorePending(original));
    alvo = original.entryId;
  } else {
    const id = input.undo.entryId;
    const exclusao = snap.entries.find((e) => e.entryId === id);
    if (!exclusao || snap.entries.some((e) => e.links.reverses === id)) {
      throw new AppError('INVALID', 'Esta exclusão já foi desfeita ou não existe.');
    }
    change = domainSafe(() =>
      undoDelete({ operationId: input.operationId, workspaceId, date: exclusao.date }, exclusao),
    );
    alvo = exclusao.links.deletes ?? id;
  }
  return gravar(c, workspaceId, input.operationId, change, {
    action: 'lancamento.desfazer-exclusao',
    target: `entry/${alvo}`,
  });
}

/** LAN-003: confirmar um pendente na data em que o dinheiro se moveu (nunca no futuro). */
export async function confirmEntry(
  c: OpsContext,
  workspaceId: string,
  input: { entryId: string; date: string; operationId: string },
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const snap = await c.port.load(workspaceId);
  const pendente = ativo(snap, input.entryId);
  const date = dataAte(input.date, hojeDe(c, snap));
  const change = domainSafe(() =>
    confirmPending({ operationId: input.operationId, workspaceId, date }, pendente),
  );
  return gravar(c, workspaceId, input.operationId, change, {
    action: 'lancamento.confirmar',
    target: `entry/${pendente.entryId}`,
    after: { from: pendente.date, to: date },
  });
}

/** As receitas e despesas que valem, da mais nova para a mais antiga, com conta e categorias da pessoa. */
export async function listFlows(c: OpsContext, workspaceId: string): Promise<FlowRow[]> {
  const snap = await c.port.load(workspaceId);
  const contaPorLedger = new Map<string, Account>(accountsOf(snap).map((a) => [a.ledgerAccountId, a]));
  const catPorLedger = new Map<string, Category>(categoriesOf(snap).map((x) => [x.ledgerAccountId, x]));
  const raiz = rootFinder(snap.entries);
  const anexos = attachmentCounts(attachmentsOf(snap));
  const rows: FlowRow[] = [];
  for (const e of activeEntries(snap.entries)) {
    if (!isFlow(e)) continue;
    const parts: PartInput[] = [];
    let accountId = '';
    let total = 0;
    for (const l of e.lines) {
      const cat = catPorLedger.get(l.accountId);
      if (cat) parts.push({ categoryId: cat.id, amountCents: l.amount });
      const conta = contaPorLedger.get(l.accountId);
      if (conta) {
        accountId = conta.id;
        total = l.amount;
      }
    }
    rows.push({
      entryId: e.entryId,
      kind: e.kind as FlowKind,
      date: e.date,
      status: e.status,
      accountId,
      amountCents: total,
      parts,
      description: e.meta['description'] ?? '',
      tags: parseTags(e.meta['tags'] ?? ''),
      note: e.meta['note'] ?? '',
      edited: e.links.replaces !== undefined,
      attachments: anexos.get(raiz(e.entryId)) ?? 0,
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.entryId.localeCompare(a.entryId));
}
