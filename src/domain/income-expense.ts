// Receitas e despesas, com divisão em categorias, pendente, edição e exclusão (LAN-001 a LAN-007).
// Como nas outras operações, aqui só se monta a mudança no diário; quem grava é a aplicação, de uma vez.
import { ensure } from './errors';
import type { EntryLine, EntryStatus, JournalEntry, LedgerAccount, Side } from './ledger';
import type { Money } from './money';
import { MAX_AMOUNT, assertSameCurrency, money } from './money';
import type { OperationContext } from './operations';
import { entry, group, opposite, reverseEntry, sameWorkspace } from './operations';

export type FlowKind = 'receita' | 'despesa';

export interface CategoryPart {
  readonly category: LedgerAccount;
  readonly amount: Money;
}

export interface FlowInput {
  readonly kind: FlowKind;
  /** Conta de onde sai ou para onde vai o dinheiro (banco, carteira, dinheiro). */
  readonly account: LedgerAccount;
  /** Uma parte por categoria; com mais de uma, é um lançamento dividido (LAN-007). */
  readonly parts: readonly CategoryPart[];
  readonly status: EntryStatus;
  readonly meta?: Readonly<Record<string, string>>;
}

/** O que uma operação muda no diário: lançamentos novos, pendentes trocados e pendentes removidos. */
export interface JournalChange {
  readonly add: readonly JournalEntry[];
  readonly replace: readonly JournalEntry[];
  readonly remove: readonly string[];
}

export const MAX_PARTS = 50;
const MAX_META_KEYS = 20;

const soAdicionar = (add: JournalEntry[]): JournalChange => ({ add, replace: [], remove: [] });

export function isFlow(e: JournalEntry): boolean {
  return e.kind === 'receita' || e.kind === 'despesa';
}

function metaLimpo(meta: Readonly<Record<string, string>> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta ?? {})) {
    ensure(k.length > 0 && k.length <= 100, 'ENTRY_INVALID', 'Campo de descrição inválido.');
    ensure(v.length <= 2000, 'ENTRY_INVALID', 'Texto longo demais no lançamento.');
    if (v.length > 0) out[k] = v;
  }
  ensure(Object.keys(out).length <= MAX_META_KEYS, 'ENTRY_INVALID', 'Campos demais no lançamento.');
  return out;
}

/**
 * Linhas de uma receita ou despesa. Receita: D conta / C categorias. Despesa: D categorias / C conta.
 * Cada categoria aparece uma vez só, e a conta recebe a soma exata das partes (INV-07 e INV-08).
 */
function linhas(
  ctx: OperationContext,
  input: FlowInput,
): { lines: EntryLine[]; currency: Money['currency'] } {
  const { kind, account, parts } = input;
  sameWorkspace(ctx, account, ...parts.map((p) => p.category));
  group(account, ['asset'], kind === 'receita' ? 'Receita' : 'Despesa');
  ensure(
    parts.length >= 1 && parts.length <= MAX_PARTS,
    'OPERATION_INVALID',
    `O lançamento precisa de 1 a ${String(MAX_PARTS)} categorias.`,
  );
  const esperado = kind === 'receita' ? 'income' : 'expense';
  const ladoCategoria: Side = kind === 'receita' ? 'C' : 'D';
  const vistas = new Set<string>();
  const categorias: EntryLine[] = [];
  const primeira = money(parts[0]?.amount.amount ?? 0, parts[0]?.amount.currency);
  let total = 0;
  for (const p of parts) {
    ensure(
      p.category.group === esperado,
      'OPERATION_INVALID',
      kind === 'receita'
        ? 'Receita só aceita categoria de receita.'
        : 'Despesa só aceita categoria de despesa.',
    );
    ensure(
      !vistas.has(p.category.id),
      'OPERATION_INVALID',
      'A mesma categoria aparece duas vezes na divisão.',
    );
    vistas.add(p.category.id);
    const valor = money(p.amount.amount, p.amount.currency);
    assertSameCurrency(valor, primeira);
    ensure(valor.amount > 0, 'OPERATION_INVALID', 'Cada parte precisa ser maior que zero.');
    total += valor.amount;
    ensure(total <= MAX_AMOUNT, 'MONEY_OUT_OF_RANGE', 'O total do lançamento passa do limite.');
    categorias.push({ accountId: p.category.id, side: ladoCategoria, amount: valor.amount });
  }
  const conta: EntryLine = { accountId: account.id, side: opposite(ladoCategoria), amount: total };
  // Débitos primeiro, como no Volume 04, seção 4.
  return {
    lines: kind === 'receita' ? [conta, ...categorias] : [...categorias, conta],
    currency: primeira.currency,
  };
}

/** LAN-001, LAN-003 e LAN-007: registra uma receita ou despesa, realizada ou pendente, com uma ou várias categorias. */
export function recordFlow(ctx: OperationContext, input: FlowInput): JournalChange {
  const { lines, currency } = linhas(ctx, input);
  return soAdicionar([
    entry(ctx, 0, input.kind, lines, currency, { status: input.status, meta: metaLimpo(input.meta) }),
  ]);
}

function doFluxo(ctx: OperationContext, original: JournalEntry): void {
  ensure(original.workspaceId === ctx.workspaceId, 'WORKSPACE_MISMATCH', 'Lançamento de outro espaço.');
  ensure(isFlow(original), 'OPERATION_INVALID', 'Só receitas e despesas são editadas ou excluídas aqui.');
}

const mesmasLinhas = (a: readonly EntryLine[], b: readonly EntryLine[]) =>
  JSON.stringify(a) === JSON.stringify(b);
const mesmoMeta = (a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/**
 * LAN-004 (Volume 04, seção 7.4). A data nova vem do contexto.
 * - Pendente: troca direto, porque ainda não mexeu em saldo nenhum (INV-02). Pode virar realizado.
 * - Realizado, só descrição: troca só o `meta`.
 * - Realizado, valor, data, conta ou categoria: estorno do original na data dele e lançamento novo
 *   vinculado, na mesma operação. O total do mês antigo e o do novo mudam juntos.
 */
export function editFlow(ctx: OperationContext, original: JournalEntry, input: FlowInput): JournalChange {
  doFluxo(ctx, original);
  const { lines, currency } = linhas(ctx, input);
  const meta = metaLimpo(input.meta);
  if (original.status === 'pendente') {
    return {
      add: [],
      replace: [
        { ...original, date: ctx.date, kind: input.kind, status: input.status, lines, currency, meta },
      ],
      remove: [],
    };
  }
  ensure(input.status === 'realizado', 'OPERATION_INVALID', 'Lançamento realizado não volta a ser pendente.');
  const calculoIgual =
    input.kind === original.kind && ctx.date === original.date && mesmasLinhas(lines, original.lines);
  if (calculoIgual) {
    ensure(!mesmoMeta(meta, original.meta), 'OPERATION_INVALID', 'Nada mudou no lançamento.');
    return { add: [], replace: [{ ...original, meta }], remove: [] };
  }
  const [estorno] = reverseEntry({ ...ctx, date: original.date }, original, 'edicao');
  ensure(estorno !== undefined, 'OPERATION_INVALID', 'Estorno não montado.');
  const novo = entry(ctx, 1, input.kind, lines, currency, { meta, links: { replaces: original.entryId } });
  return soAdicionar([estorno, novo]);
}

/**
 * LAN-006: excluir. Pendente sai do diário direto; realizado vira estorno marcado como exclusão,
 * na data do original, e pode ser desfeito com undoDelete.
 */
export function deleteFlow(ctx: OperationContext, original: JournalEntry): JournalChange {
  doFluxo(ctx, original);
  if (original.status === 'pendente') return { add: [], replace: [], remove: [original.entryId] };
  const [estorno] = reverseEntry({ ...ctx, date: original.date }, original, 'exclusao');
  ensure(estorno !== undefined, 'OPERATION_INVALID', 'Estorno não montado.');
  return soAdicionar([{ ...estorno, links: { ...estorno.links, deletes: original.entryId } }]);
}

/** LAN-006: desfazer a exclusão de um realizado é estornar o estorno (Volume 04, seção 7.4). */
export function undoDelete(ctx: OperationContext, exclusion: JournalEntry): JournalChange {
  ensure(
    exclusion.kind === 'estorno' && exclusion.links.deletes !== undefined,
    'OPERATION_INVALID',
    'Este lançamento não é uma exclusão.',
  );
  return soAdicionar(reverseEntry({ ...ctx, date: exclusion.date }, exclusion, 'desfazer-exclusao'));
}

/** LAN-006: desfazer a exclusão de um pendente devolve o mesmo lançamento, igual ao que era. */
export function restorePending(original: JournalEntry): JournalChange {
  ensure(original.status === 'pendente', 'OPERATION_INVALID', 'Só pendente volta assim.');
  return soAdicionar([original]);
}

/** LAN-003: confirmar um pendente. Vira realizado na data em que o dinheiro se moveu. */
export function confirmPending(ctx: OperationContext, pending: JournalEntry): JournalChange {
  ensure(pending.workspaceId === ctx.workspaceId, 'WORKSPACE_MISMATCH', 'Lançamento de outro espaço.');
  ensure(pending.status === 'pendente', 'OPERATION_INVALID', 'Este lançamento já foi confirmado.');
  return { add: [], replace: [{ ...pending, status: 'realizado', date: ctx.date }], remove: [] };
}

/**
 * Os lançamentos que valem para listas e totais: sem os estornos e sem o que foi anulado por um estorno
 * que continua valendo. Estorno de estorno devolve o original (desfazer). Os saldos calculados com estes
 * lançamentos são os mesmos calculados com o diário inteiro (INV-11).
 */
export function activeEntries(entries: Iterable<JournalEntry>): JournalEntry[] {
  const lista = [...entries];
  const anuladoPor = new Map<string, string[]>();
  for (const e of lista) {
    const alvo = e.links.reverses;
    if (alvo !== undefined) anuladoPor.set(alvo, [...(anuladoPor.get(alvo) ?? []), e.entryId]);
  }
  const memo = new Map<string, boolean>();
  const vale = (id: string): boolean => {
    const visto = memo.get(id);
    if (visto !== undefined) return visto;
    // Uma corrente de estornos é resolvida da ponta para trás, sem recursão funda.
    // Um ciclo (só em dado adulterado) não trava: quem já está na pilha não entra de novo.
    const pilha = [id];
    const naPilha = new Set([id]);
    while (pilha.length) {
      const atual = pilha[pilha.length - 1] ?? id;
      const pendentes = (anuladoPor.get(atual) ?? []).filter((x) => !memo.has(x) && !naPilha.has(x));
      if (pendentes.length) {
        for (const x of pendentes) naPilha.add(x);
        pilha.push(...pendentes);
        continue;
      }
      memo.set(atual, !(anuladoPor.get(atual) ?? []).some((x) => memo.get(x)));
      pilha.pop();
    }
    return memo.get(id) ?? true;
  };
  return lista.filter((e) => e.kind !== 'estorno' && vale(e.entryId));
}

/** LAN-004: a corrente de edições de um lançamento, do mais novo para o primeiro. */
export function editHistory(entries: Iterable<JournalEntry>, entryId: string): JournalEntry[] {
  const porId = new Map<string, JournalEntry>();
  for (const e of entries) porId.set(e.entryId, e);
  const out: JournalEntry[] = [];
  let atual = porId.get(entryId);
  while (atual && out.length <= porId.size) {
    out.push(atual);
    const anterior = atual.links.replaces;
    atual = anterior === undefined ? undefined : porId.get(anterior);
  }
  return out;
}
