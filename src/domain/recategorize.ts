// Trocar a categoria de muitos lançamentos de uma vez: mesclar categorias e recategorizar em lote (CAT-002, CAT-004).
// Saldos das contas e totais de receitas e despesas não mudam; só a distribuição entre as categorias.
import { ensure } from './errors';
import type { JournalChange } from './income-expense';
import { isFlow } from './income-expense';
import type { AccountLookup, EntryLine, JournalEntry } from './ledger';
import { MAX_AMOUNT } from './money';
import type { OperationContext } from './operations';
import { entry, reverseEntry } from './operations';

export const MAX_RECATEGORIZE = 40_000;

/** Lançamentos que usam alguma das categorias (contas internas) indicadas. */
export function entriesUsing(
  entries: Iterable<JournalEntry>,
  ledgerIds: ReadonlySet<string>,
): JournalEntry[] {
  return [...entries].filter((e) => isFlow(e) && e.lines.some((l) => ledgerIds.has(l.accountId)));
}

/** Troca as categorias pelas do mapa; se duas partes caírem na mesma categoria, viram uma só, somadas. */
function trocar(lines: readonly EntryLine[], para: ReadonlyMap<string, string>): EntryLine[] {
  const out: EntryLine[] = [];
  for (const l of lines) {
    const accountId = para.get(l.accountId) ?? l.accountId;
    const igual = out.find((x) => x.accountId === accountId && x.side === l.side);
    if (igual) {
      const i = out.indexOf(igual);
      const soma = igual.amount + l.amount;
      ensure(soma <= MAX_AMOUNT, 'MONEY_OUT_OF_RANGE', 'O total do lançamento passa do limite.');
      out[i] = { ...igual, amount: soma };
    } else out.push({ ...l, accountId });
  }
  return out;
}

/**
 * Recategoriza os lançamentos `entries` pelo mapa `para` (categoria de origem → destino), numa operação só.
 * Pendente é trocado direto (INV-02). Realizado vira estorno e lançamento novo vinculado, na data dele
 * e com a mesma descrição (Volume 04, seção 7.4). Origem e destino são do mesmo espaço e do mesmo grupo.
 */
export function recategorize(
  ctx: OperationContext,
  entries: readonly JournalEntry[],
  para: ReadonlyMap<string, string>,
  accounts: AccountLookup,
): JournalChange {
  ensure(para.size > 0, 'OPERATION_INVALID', 'Escolha a categoria de destino.');
  for (const [de, ate] of para) {
    const a = accounts.get(de);
    const b = accounts.get(ate);
    ensure(a !== undefined && b !== undefined, 'OPERATION_INVALID', 'Categoria não encontrada.');
    ensure(de !== ate, 'OPERATION_INVALID', 'A categoria de destino é a mesma da origem.');
    ensure(
      a.workspaceId === ctx.workspaceId && b.workspaceId === ctx.workspaceId,
      'WORKSPACE_MISMATCH',
      'Categoria de outro espaço.',
    );
    ensure(
      a.group === b.group && (a.group === 'income' || a.group === 'expense'),
      'OPERATION_INVALID',
      'Receita só vai para categoria de receita, e despesa para categoria de despesa.',
    );
  }
  ensure(entries.length > 0, 'OPERATION_INVALID', 'Nenhum lançamento para mover.');
  ensure(
    entries.length <= MAX_RECATEGORIZE,
    'OPERATION_INVALID',
    `Dá para mover até ${String(MAX_RECATEGORIZE)} lançamentos de uma vez.`,
  );
  const add: JournalEntry[] = [];
  const replace: JournalEntry[] = [];
  const vistos = new Set<string>();
  for (const original of entries) {
    ensure(isFlow(original), 'OPERATION_INVALID', 'Só receitas e despesas mudam de categoria.');
    ensure(original.workspaceId === ctx.workspaceId, 'WORKSPACE_MISMATCH', 'Lançamento de outro espaço.');
    ensure(!vistos.has(original.entryId), 'OPERATION_INVALID', 'Lançamento repetido na lista.');
    vistos.add(original.entryId);
    const lines = trocar(original.lines, para);
    ensure(
      JSON.stringify(lines) !== JSON.stringify(original.lines),
      'OPERATION_INVALID',
      'Um dos lançamentos não usa a categoria de origem.',
    );
    if (original.status === 'pendente') {
      replace.push({ ...original, lines });
      continue;
    }
    const naData = { ...ctx, date: original.date };
    const i = add.length;
    add.push(...reverseEntry(naData, original, 'recategorizar', i));
    add.push(
      entry(naData, i + 1, original.kind, lines, original.currency, {
        meta: original.meta,
        links: { replaces: original.entryId },
      }),
    );
  }
  return { add, replace, remove: [] };
}
