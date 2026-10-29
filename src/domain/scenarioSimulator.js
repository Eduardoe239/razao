/**
 * Motor determinístico de simulação What-If.
 * O saldo inicial vem do livro-razão; cada fluxo pendente é projetado uma única vez.
 * A simulação é consultiva e nunca altera os lançamentos persistidos.
 */
import {
  calculateCurrentBalanceCents,
  calculatePendingNetCents,
  calculatePendingExpenseCents,
  getCurrentMonthPendingTransactions,
  getMonthPendingTransactions,
  isValidISODate
} from './financialPosition.js';

function normalizeMonthsAhead(value) {
  if (!Number.isInteger(value)) return 3;
  return Math.min(120, Math.max(0, value));
}

export function simulateScenarios(arg1 = {}, monthsParam = 3, todayParam) {
  const state = arg1?.state || arg1 || {};
  const monthsAhead = normalizeMonthsAhead(Number.isInteger(arg1?.monthsAhead) ? arg1.monthsAhead : monthsParam);
  const todayCandidate = todayParam ?? arg1?.todayISO;
  const todayISO = isValidISODate(todayCandidate)
    ? todayCandidate
    : new Date().toISOString().slice(0, 10);
  const transactions = Array.isArray(state?.transactions) ? state.transactions : [];

  // A posição atual inclui saldos iniciais e movimentos pagos até hoje.
  const currentBalanceCents = calculateCurrentBalanceCents(state, todayISO);
  const start = new Date(`${todayISO}T00:00:00.000Z`);
  const monthlyProjections = [];

  let balanceOptimistic = currentBalanceCents;
  let balanceExpected = currentBalanceCents;
  let balanceConservative = currentBalanceCents;

  for (let m = 0; m <= monthsAhead; m++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + m, 1));
    const monthKey = d.toISOString().slice(0, 7);
    // No primeiro mês, incluir itens vencidos que ainda estão pendentes, além
    // dos compromissos do mês. Nos meses seguintes, incluir apenas aquele mês.
    const monthPending = m === 0
      ? getCurrentMonthPendingTransactions(transactions, todayISO)
      : getMonthPendingTransactions(transactions, monthKey);

    const pendingIncomes = monthPending
      .filter(tx => tx.type === 'receita')
      .reduce((total, tx) => total + tx.amountCents, 0);
    const pendingExpenses = calculatePendingExpenseCents(monthPending);
    const pendingNet = calculatePendingNetCents(monthPending);

    // Os movimentos já pagos estão no saldo inicial. Não somá-los outra vez.
    const netOptimistic = pendingIncomes - Math.round(pendingExpenses * 0.85);
    const netExpected = pendingNet;
    const netConservative = Math.round(pendingIncomes * 0.90) - Math.round(pendingExpenses * 1.15);

    balanceOptimistic += netOptimistic;
    balanceExpected += netExpected;
    balanceConservative += netConservative;

    monthlyProjections.push({
      monthKey,
      optimisticNetCents: netOptimistic,
      optimisticBalanceCents: balanceOptimistic,
      expectedNetCents: netExpected,
      expectedBalanceCents: balanceExpected,
      conservativeNetCents: netConservative,
      conservativeBalanceCents: balanceConservative
    });
  }

  return {
    todayISO,
    currentBalanceCents,
    monthsAhead,
    monthlyProjections,
    optimistic: monthlyProjections,
    expected: monthlyProjections,
    conservative: monthlyProjections,
    summary: {
      finalOptimisticCents: balanceOptimistic,
      finalExpectedCents: balanceExpected,
      finalConservativeCents: balanceConservative,
      spreadCents: balanceOptimistic - balanceConservative
    }
  };
}
