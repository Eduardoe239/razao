// Regras automáticas de categoria (CAT-003): criar, mudar, apagar, reordenar e sugerir.
import type { RuleScope } from '@/domain/category-rules';
import { matchRule } from '@/domain/category-rules';
import type { OpsContext } from './account-ops';
import { alreadyDone, writable } from './account-ops';
import { AppError } from './errors';
import type { Category, CategoryRuleItem } from './model';
import { ENTITY, categoryRuleSchema } from './model';
import type { WorkspaceSnapshot } from './ports';
import { categoriesOf, rulesOf } from './session-read';

type Gravacao = Promise<'gravada' | 'repetida'>;

export const MAX_RULES = 500;

export interface RuleInput {
  readonly pattern: string;
  readonly categoryId: string;
}

const tipoDe = (c: Category): RuleScope => (c.group === 'income' ? 'receita' : 'despesa');

/**
 * A regra precisa apontar para categoria que existe e está ativa. O tipo da regra (receita ou despesa)
 * é o da categoria: uma regra de despesa nunca sugere categoria de receita.
 */
function conferir(snap: WorkspaceSnapshot, input: RuleInput): RuleScope {
  const cat = categoriesOf(snap).find((x) => x.id === input.categoryId);
  if (!cat) throw new AppError('INVALID', 'A categoria da regra não existe neste espaço. Nada foi gravado.');
  if (cat.archived) throw new AppError('INVALID', `"${cat.name}" está arquivada. Escolha outra categoria.`);
  return tipoDe(cat);
}

function validar(regra: CategoryRuleItem): CategoryRuleItem {
  const r = categoryRuleSchema.safeParse(regra);
  if (!r.success) throw new AppError('INVALID', 'O texto da regra precisa ter de 2 a 80 caracteres.');
  return r.data;
}

function regraDe(snap: WorkspaceSnapshot, id: string): CategoryRuleItem {
  const r = rulesOf(snap).find((x) => x.id === id);
  if (!r) throw new AppError('INVALID', 'Esta regra não existe mais. Nada foi alterado.');
  return r;
}

const gravar = (c: OpsContext, ws: string, operationId: string, regras: CategoryRuleItem[], action: string) =>
  c.port.commit(ws, {
    operationId,
    entries: [],
    items: regras.map((r) => ({ type: ENTITY.categoryRule, id: r.id, data: r })),
    audit: { action, target: `rule/${regras[0]?.id ?? ''}`, after: { count: regras.length } },
  });

/** CAT-003: regra nova entra no fim da fila de prioridade. */
export async function createRule(
  c: OpsContext,
  workspaceId: string,
  input: RuleInput & { ruleId: string; operationId: string },
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const snap = await c.port.load(workspaceId);
  const scope = conferir(snap, input);
  const regras = rulesOf(snap);
  if (regras.length >= MAX_RULES) throw new AppError('INVALID', `O limite é de ${String(MAX_RULES)} regras.`);
  const regra = validar({
    id: input.ruleId,
    pattern: input.pattern.trim(),
    categoryId: input.categoryId,
    scope,
    priority: regras.reduce((m, r) => Math.max(m, r.priority + 1), 0),
    active: true,
    removed: false,
    createdAt: c.clock.nowIso(),
  });
  return gravar(c, workspaceId, input.operationId, [regra], 'regra.criar');
}

/** CAT-003: mudar texto, categoria ou tipo; ligar e desligar. Ligar confere a categoria de novo. */
export async function updateRule(
  c: OpsContext,
  workspaceId: string,
  input: RuleInput & { ruleId: string; active: boolean; operationId: string },
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const snap = await c.port.load(workspaceId);
  const atual = regraDe(snap, input.ruleId);
  const cat = categoriesOf(snap).find((x) => x.id === input.categoryId);
  const scope = input.active || !cat ? conferir(snap, input) : tipoDe(cat);
  const regra = validar({
    ...atual,
    pattern: input.pattern.trim(),
    categoryId: input.categoryId,
    scope,
    active: input.active,
  });
  return gravar(c, workspaceId, input.operationId, [regra], 'regra.editar');
}

export async function removeRule(
  c: OpsContext,
  workspaceId: string,
  input: { ruleId: string; operationId: string },
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const atual = regraDe(await c.port.load(workspaceId), input.ruleId);
  return gravar(
    c,
    workspaceId,
    input.operationId,
    [{ ...atual, removed: true, active: false }],
    'regra.apagar',
  );
}

/** CAT-003: a lista em `ruleIds` é a ordem nova de prioridade, da primeira para a última. */
export async function reorderRules(
  c: OpsContext,
  workspaceId: string,
  input: { ruleIds: readonly string[]; operationId: string },
): Gravacao {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  const regras = rulesOf(await c.port.load(workspaceId));
  const ids = new Set(input.ruleIds);
  if (ids.size !== input.ruleIds.length || ids.size !== regras.length || regras.some((r) => !ids.has(r.id))) {
    throw new AppError('INVALID', 'As regras mudaram enquanto você reordenava. Abra a lista de novo.');
  }
  const porId = new Map(regras.map((r) => [r.id, r]));
  const novas = input.ruleIds.flatMap((id, priority) => {
    const r = porId.get(id);
    return r && r.priority !== priority ? [{ ...r, priority }] : [];
  });
  if (!novas.length) throw new AppError('INVALID', 'A ordem é a mesma de antes.');
  return gravar(c, workspaceId, input.operationId, novas, 'regra.reordenar');
}

/** Regras do espaço, na ordem de prioridade. */
export async function listRules(c: OpsContext, workspaceId: string): Promise<CategoryRuleItem[]> {
  return rulesOf(await c.port.load(workspaceId)).sort(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
  );
}

/**
 * CAT-003: a categoria sugerida pela primeira regra que casa com a descrição. Nunca devolve categoria
 * inexistente, arquivada ou do outro tipo. Vale na entrada e, na Alpha 2b, na importação.
 */
export function suggestFromRules(
  snap: WorkspaceSnapshot,
  description: string,
  kind: 'receita' | 'despesa',
): { categoryId: string; ruleId: string } | undefined {
  const cats = new Map(categoriesOf(snap).map((x) => [x.id, x]));
  const serve = (id: string) => {
    const cat = cats.get(id);
    return cat !== undefined && !cat.archived && tipoDe(cat) === kind;
  };
  const r = matchRule(rulesOf(snap), description, kind, serve);
  return r ? { categoryId: r.categoryId, ruleId: r.id } : undefined;
}

export async function suggestCategory(
  c: OpsContext,
  workspaceId: string,
  input: { description: string; kind: 'receita' | 'despesa' },
): Promise<{ categoryId: string; ruleId: string } | undefined> {
  return suggestFromRules(await c.port.load(workspaceId), input.description, input.kind);
}
