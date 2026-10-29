/** Consolidates pending transactions and future recurring occurrences without double counting. */
import { generateRecurringOccurrences } from './recurring.js';

export function buildCommitments({ transactions = [], recurring = [], todayISO = new Date().toISOString().slice(0, 10), monthsAhead = 3 }) {
  const horizon = new Date(`${todayISO}T00:00:00Z`);
  horizon.setUTCMonth(horizon.getUTCMonth() + monthsAhead);
  const horizonISO = horizon.toISOString().slice(0, 10);
  const pendingTransactions = transactions
    .filter(t => t.status === 'pendente' && t.date >= todayISO && t.date <= horizonISO)
    .map(t => ({
      id: t.id,
      sourceType: t.installmentsGroup ? 'installment' : 'transaction',
      sourceId: t.id,
      description: t.description,
      date: t.date,
      amountCents: Number.isInteger(t.amountCents) ? t.amountCents : Math.round((t.amount || 0) * 100),
      accountId: t.accountId,
      type: t.type || 'despesa'
    }));
  const recurringOccurrences = generateRecurringOccurrences({ recurring, transactions, fromISO: todayISO, monthsAhead });
  return [...pendingTransactions, ...recurringOccurrences].sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description));
}
