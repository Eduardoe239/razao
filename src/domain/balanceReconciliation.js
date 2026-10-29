import { transactionImpactOnAccount } from './ledger.js';
import { parseMoneyInputToCents } from './money.js';

const VALID_TYPES = new Set(['receita', 'despesa', 'transferencia']);

export function isValidStatementDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Parses a signed pt-BR statement balance through the shared money parser. */
export function parseStatementBalance(value) {
  const parsed = parseMoneyInputToCents(value, { allowNegative: true, allowCurrencySymbol: true });
  if (!parsed.valid) {
    return { valid: false, amountCents: null, reason: parsed.reason || 'Informe um saldo válido.' };
  }
  return { valid: true, amountCents: parsed.cents, reason: null };
}

function touchesAccount(transaction, accountId) {
  if (!transaction || !accountId) return false;
  if (transaction.type === 'transferencia') {
    return transaction.accountId === accountId || transaction.toAccountId === accountId;
  }
  return (transaction.type === 'receita' || transaction.type === 'despesa') && transaction.accountId === accountId;
}

/**
 * Compara um saldo de extrato com o saldo calculado no livro-razão até a data
 * informada. É uma função somente de leitura: não altera contas nem transações.
 */
export function reconcileAccountBalance({ account, transactions = [], statementBalanceCents, asOfDate } = {}) {
  const errors = [];
  if (!account?.id || typeof account.id !== 'string') errors.push('Selecione uma conta válida.');
  if (!Number.isSafeInteger(account?.initialBalanceCents)) errors.push('O saldo inicial da conta não é um número inteiro válido de centavos.');
  if (!Number.isSafeInteger(statementBalanceCents)) errors.push('O saldo do extrato precisa estar expresso em centavos inteiros.');
  if (!isValidStatementDate(asOfDate)) errors.push('Informe uma data de extrato válida.');

  if (errors.length) {
    return { valid: false, status: 'invalid', errors, accountId: account?.id || null, asOfDate: asOfDate || null };
  }

  let incomeCents = 0;
  let expenseCents = 0;
  let transferInCents = 0;
  let transferOutCents = 0;
  const counts = {
    included: 0,
    pendingExcluded: 0,
    cancelledExcluded: 0,
    futureExcluded: 0,
    invalidDateExcluded: 0,
    invalidMovementExcluded: 0
  };

  for (const tx of Array.isArray(transactions) ? transactions : []) {
    if (!touchesAccount(tx, account.id)) continue;
    if (tx.status === 'pendente') { counts.pendingExcluded++; continue; }
    if (tx.status === 'cancelado') { counts.cancelledExcluded++; continue; }
    if (tx.status !== 'pago') { counts.invalidMovementExcluded++; continue; }
    if (!isValidStatementDate(tx.date)) { counts.invalidDateExcluded++; continue; }
    if (tx.date > asOfDate) { counts.futureExcluded++; continue; }
    if (!VALID_TYPES.has(tx.type) || !Number.isSafeInteger(tx.amountCents) || tx.amountCents <= 0) {
      counts.invalidMovementExcluded++;
      continue;
    }

    const impact = transactionImpactOnAccount(tx, account.id);
    if (!impact) continue;
    counts.included++;
    if (tx.type === 'receita' && tx.accountId === account.id) incomeCents += impact;
    else if (tx.type === 'despesa' && tx.accountId === account.id) expenseCents += -impact;
    else if (tx.type === 'transferencia' && tx.toAccountId === account.id) transferInCents += impact;
    else if (tx.type === 'transferencia' && tx.accountId === account.id) transferOutCents += -impact;
  }

  const openingBalanceCents = account.initialBalanceCents;
  const movementsCents = incomeCents - expenseCents + transferInCents - transferOutCents;
  const calculatedBalanceCents = openingBalanceCents + movementsCents;
  const differenceCents = statementBalanceCents - calculatedBalanceCents;

  return {
    valid: true,
    status: differenceCents === 0 ? 'matched' : 'difference',
    accountId: account.id,
    asOfDate,
    openingBalanceCents,
    incomeCents,
    expenseCents,
    transferInCents,
    transferOutCents,
    movementsCents,
    calculatedBalanceCents,
    statementBalanceCents,
    differenceCents,
    counts,
    errors: []
  };
}
