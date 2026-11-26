// Livro-razão interno em partidas dobradas (Volume 04, seção 3).
// O usuário nunca vê débito e crédito; aqui eles garantem que o dinheiro não aparece nem some.
import type { CivilDate } from './civil-date';
import { compareDates, isCivilDate } from './civil-date';
import { DomainError, ensure } from './errors';
import type { Currency, Money } from './money';
import { MAX_AMOUNT } from './money';

export type AccountGroup = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type Side = 'D' | 'C';
export type EntryStatus = 'realizado' | 'pendente';
export type EntryKind =
  | 'receita'
  | 'despesa'
  | 'transferencia'
  | 'compra_cartao'
  | 'pagamento_fatura'
  | 'estorno'
  | 'ajuste'
  | 'abertura'
  | 'titulo'
  | 'liquidacao'
  | 'retirada'
  | 'aporte';

export interface LedgerAccount {
  readonly id: string;
  readonly workspaceId: string;
  readonly group: AccountGroup;
}

export interface EntryLine {
  readonly accountId: string;
  readonly side: Side;
  readonly amount: number;
}

export interface EntryLinks {
  /** Estorno: o lançamento que este anula (INV-11). */
  readonly reverses?: string;
  /** Edição de realizado: o lançamento novo aponta para o que ele substitui (Volume 04, seção 7.4). */
  readonly replaces?: string;
  /** Exclusão: o estorno marcado como exclusão aponta para o lançamento excluído (LAN-006). */
  readonly deletes?: string;
}

export interface JournalEntry {
  readonly entryId: string;
  readonly operationId: string;
  readonly workspaceId: string;
  readonly date: CivilDate;
  readonly status: EntryStatus;
  readonly kind: EntryKind;
  readonly currency: Currency;
  readonly lines: readonly EntryLine[];
  readonly links: EntryLinks;
  readonly meta: Readonly<Record<string, string>>;
}

/** Natureza devedora (ativo e despesa) aumenta com D; credora (passivo, patrimônio e receita) aumenta com C. */
export function normalSide(group: AccountGroup): Side {
  return group === 'asset' || group === 'expense' ? 'D' : 'C';
}

/** O ID do lançamento sai da operação e da posição dele nela (Volume 04, seção 7.3). */
export function entryIdFor(operationId: string, index: number): string {
  ensure(operationId.length > 0, 'OPERATION_INVALID', 'Operação sem identificador.');
  ensure(Number.isInteger(index) && index >= 0, 'OPERATION_INVALID', 'Posição de lançamento inválida.');
  return `${operationId}/${String(index)}`;
}

export type AccountLookup = ReadonlyMap<string, LedgerAccount>;

/**
 * INV-08 e INV-09: pelo menos duas linhas, valores positivos, débitos iguais a créditos,
 * todas as contas conhecidas e do mesmo espaço do lançamento.
 */
export function validateEntry(entry: JournalEntry, accounts: AccountLookup): void {
  ensure(isCivilDate(entry.date), 'ENTRY_INVALID', `Lançamento ${entry.entryId} com data inválida.`);
  ensure(entry.workspaceId.length > 0, 'ENTRY_INVALID', `Lançamento ${entry.entryId} sem espaço.`);
  ensure(
    entry.lines.length >= 2,
    'ENTRY_UNBALANCED',
    `Lançamento ${entry.entryId} precisa de duas linhas ou mais.`,
  );
  let debitos = 0;
  let creditos = 0;
  for (const line of entry.lines) {
    ensure(
      Number.isSafeInteger(line.amount) && line.amount > 0 && line.amount <= MAX_AMOUNT,
      'ENTRY_INVALID',
      `Lançamento ${entry.entryId} com valor de linha inválido.`,
    );
    const account = accounts.get(line.accountId);
    if (!account) throw new DomainError('ACCOUNT_UNKNOWN', `Conta ${line.accountId} não existe.`);
    if (account.workspaceId !== entry.workspaceId) {
      throw new DomainError('WORKSPACE_MISMATCH', `Conta ${line.accountId} é de outro espaço.`);
    }
    if (line.side === 'D') debitos += line.amount;
    else creditos += line.amount;
  }
  ensure(
    Number.isSafeInteger(debitos) && debitos === creditos,
    'ENTRY_UNBALANCED',
    `Lançamento ${entry.entryId} desbalanceado: débitos ${String(debitos)}, créditos ${String(creditos)}.`,
  );
}

/** Efeito de uma linha no saldo da conta, já com o sinal da natureza dela. */
export function signedEffect(line: EntryLine, group: AccountGroup): number {
  return line.side === normalSide(group) ? line.amount : -line.amount;
}

/**
 * INV-01 e INV-02: o saldo é a soma das linhas realizadas até a data, nada mais.
 * Pendentes não contam. Lançamento de outro espaço é erro, nunca é ignorado em silêncio (INV-09).
 */
export function accountBalance(
  entries: Iterable<JournalEntry>,
  account: LedgerAccount,
  asOf: CivilDate,
): Money {
  let total = 0;
  let currency: Currency = 'BRL';
  for (const e of entries) {
    if (e.workspaceId !== account.workspaceId) {
      throw new DomainError('WORKSPACE_MISMATCH', `Lançamento ${e.entryId} é de outro espaço.`);
    }
    if (e.status !== 'realizado' || compareDates(e.date, asOf) > 0) continue;
    currency = e.currency;
    for (const line of e.lines) {
      if (line.accountId === account.id) total += signedEffect(line, account.group);
    }
  }
  ensure(Number.isSafeInteger(total), 'MONEY_INVALID', 'Saldo fora do intervalo seguro.');
  return { amount: total, currency };
}

/** Saldos de todas as contas de um espaço numa data, numa passada só. */
export function balancesAt(
  entries: Iterable<JournalEntry>,
  accounts: AccountLookup,
  workspaceId: string,
  asOf: CivilDate,
): Map<string, number> {
  const saldos = new Map<string, number>();
  for (const a of accounts.values()) if (a.workspaceId === workspaceId) saldos.set(a.id, 0);
  for (const e of entries) {
    if (e.workspaceId !== workspaceId) {
      throw new DomainError('WORKSPACE_MISMATCH', `Lançamento ${e.entryId} é de outro espaço.`);
    }
    if (e.status !== 'realizado' || compareDates(e.date, asOf) > 0) continue;
    for (const line of e.lines) {
      const account = accounts.get(line.accountId);
      if (!account) throw new DomainError('ACCOUNT_UNKNOWN', `Conta ${line.accountId} não existe.`);
      saldos.set(line.accountId, (saldos.get(line.accountId) ?? 0) + signedEffect(line, account.group));
    }
  }
  return saldos;
}

/**
 * INV-10: ativo + despesa = passivo + patrimônio + receita.
 * Devolve a diferença; zero significa diário fechado.
 */
export function journalImbalance(balances: ReadonlyMap<string, number>, accounts: AccountLookup): number {
  let devedoras = 0;
  let credoras = 0;
  for (const [id, saldo] of balances) {
    const account = accounts.get(id);
    if (!account) throw new DomainError('ACCOUNT_UNKNOWN', `Conta ${id} não existe.`);
    if (normalSide(account.group) === 'D') devedoras += saldo;
    else credoras += saldo;
  }
  return devedoras - credoras;
}
