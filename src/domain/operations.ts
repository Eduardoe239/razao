// Operações da Alpha 1 viradas em lançamentos (Volume 04, seção 4).
// Cada função só monta os lançamentos; quem grava é a aplicação, numa transação única.
import type { CivilDate } from './civil-date';
import { DomainError, ensure } from './errors';
import type { EntryLine, JournalEntry, LedgerAccount, Side } from './ledger';
import { entryIdFor, normalSide } from './ledger';
import type { Money } from './money';
import { assertSameCurrency, money } from './money';

export interface OperationContext {
  readonly operationId: string;
  readonly workspaceId: string;
  readonly date: CivilDate;
}

export const opposite = (s: Side): Side => (s === 'D' ? 'C' : 'D');

export function sameWorkspace(ctx: OperationContext, ...accounts: LedgerAccount[]): void {
  for (const a of accounts) {
    if (a.workspaceId !== ctx.workspaceId) {
      throw new DomainError('WORKSPACE_MISMATCH', `Conta ${a.id} é de outro espaço.`);
    }
  }
}

export function group(account: LedgerAccount, allowed: LedgerAccount['group'][], what: string): void {
  ensure(allowed.includes(account.group), 'OPERATION_INVALID', `${what}: tipo de conta não permitido.`);
}

/** Monta um lançamento da operação na posição `index`. Os outros módulos do domínio usam este também. */
export function entry(
  ctx: OperationContext,
  index: number,
  kind: JournalEntry['kind'],
  lines: EntryLine[],
  currency: Money['currency'],
  extra: Partial<Pick<JournalEntry, 'links' | 'meta' | 'status'>> = {},
): JournalEntry {
  return {
    entryId: entryIdFor(ctx.operationId, index),
    operationId: ctx.operationId,
    workspaceId: ctx.workspaceId,
    date: ctx.date,
    status: extra.status ?? 'realizado',
    kind,
    currency,
    lines,
    links: extra.links ?? {},
    meta: extra.meta ?? {},
  };
}

/** Linhas que aumentam (valor positivo) ou diminuem (negativo) o saldo da conta, contra a contrapartida. */
function move(account: LedgerAccount, counterpart: LedgerAccount, amount: number): EntryLine[] {
  const lado = amount > 0 ? normalSide(account.group) : opposite(normalSide(account.group));
  const valor = Math.abs(amount);
  return [
    { accountId: account.id, side: lado, amount: valor },
    { accountId: counterpart.id, side: opposite(lado), amount: valor },
  ];
}

/**
 * CON-001: o saldo de abertura vira lançamento contra "Saldo de abertura", nunca um número solto.
 * Valor negativo vale para conta que já começa no vermelho (cheque especial).
 */
export function openingBalance(
  ctx: OperationContext,
  input: { account: LedgerAccount; openingEquity: LedgerAccount; amount: Money },
): JournalEntry[] {
  sameWorkspace(ctx, input.account, input.openingEquity);
  group(input.account, ['asset', 'liability'], 'Abertura');
  group(input.openingEquity, ['equity'], 'Abertura');
  const valor = money(input.amount.amount, input.amount.currency);
  ensure(valor.amount !== 0, 'OPERATION_INVALID', 'Saldo de abertura zero não gera lançamento.');
  return [entry(ctx, 0, 'abertura', move(input.account, input.openingEquity, valor.amount), valor.currency)];
}

/**
 * CON-004: transferência entre contas do mesmo espaço, com tarifa opcional.
 * Não é receita nem despesa; só a tarifa vira despesa (INV-03).
 */
export function transfer(
  ctx: OperationContext,
  input: { from: LedgerAccount; to: LedgerAccount; amount: Money; fee?: Money; feeAccount?: LedgerAccount },
): JournalEntry[] {
  const { from, to } = input;
  sameWorkspace(ctx, from, to);
  group(from, ['asset'], 'Transferência');
  group(to, ['asset'], 'Transferência');
  ensure(from.id !== to.id, 'OPERATION_INVALID', 'Origem e destino precisam ser contas diferentes.');
  const valor = money(input.amount.amount, input.amount.currency);
  ensure(valor.amount > 0, 'OPERATION_INVALID', 'O valor da transferência precisa ser maior que zero.');

  const tarifa = input.fee ? money(input.fee.amount, input.fee.currency) : undefined;
  const lines: EntryLine[] = [{ accountId: to.id, side: 'D', amount: valor.amount }];
  if (tarifa && tarifa.amount !== 0) {
    ensure(tarifa.amount > 0, 'OPERATION_INVALID', 'A tarifa não pode ser negativa.');
    assertSameCurrency(tarifa, valor);
    const conta = input.feeAccount;
    if (!conta) throw new DomainError('OPERATION_INVALID', 'Tarifa informada sem a categoria de despesa.');
    sameWorkspace(ctx, conta);
    group(conta, ['expense'], 'Tarifa');
    lines.push({ accountId: conta.id, side: 'D', amount: tarifa.amount });
  }
  const saida = valor.amount + (tarifa?.amount ?? 0);
  lines.push({ accountId: from.id, side: 'C', amount: money(saida, valor.currency).amount });
  return [entry(ctx, 0, 'transferencia', lines, valor.currency)];
}

/** CON-006: ajuste de saldo com motivo. Corrige o saldo sem inventar receita nem despesa. */
export function balanceAdjustment(
  ctx: OperationContext,
  input: { account: LedgerAccount; adjustmentEquity: LedgerAccount; delta: Money; reason: string },
): JournalEntry[] {
  sameWorkspace(ctx, input.account, input.adjustmentEquity);
  group(input.account, ['asset', 'liability'], 'Ajuste');
  group(input.adjustmentEquity, ['equity'], 'Ajuste');
  const motivo = input.reason.trim();
  ensure(motivo.length > 0, 'OPERATION_INVALID', 'O ajuste de saldo precisa de um motivo.');
  const delta = money(input.delta.amount, input.delta.currency);
  ensure(delta.amount !== 0, 'OPERATION_INVALID', 'Ajuste zero não gera lançamento.');
  return [
    entry(ctx, 0, 'ajuste', move(input.account, input.adjustmentEquity, delta.amount), delta.currency, {
      meta: { reason: motivo },
    }),
  ];
}

/**
 * INV-11: o estorno inverte cada linha do original e fica vinculado a ele.
 * Os dois continuam no histórico. Estornar um estorno desfaz a exclusão (Volume 04, seção 7.4).
 */
export function reverseEntry(
  ctx: OperationContext,
  original: JournalEntry,
  reason?: string,
  index = 0,
): JournalEntry[] {
  ensure(original.workspaceId === ctx.workspaceId, 'WORKSPACE_MISMATCH', 'Estorno em outro espaço.');
  ensure(
    original.status === 'realizado',
    'OPERATION_INVALID',
    'Lançamento pendente é alterado direto, sem estorno.',
  );
  const lines = original.lines.map((l) => ({ ...l, side: opposite(l.side) }));
  const meta: Record<string, string> = reason ? { reason } : {};
  return [
    entry(ctx, index, 'estorno', lines, original.currency, { links: { reverses: original.entryId }, meta }),
  ];
}
