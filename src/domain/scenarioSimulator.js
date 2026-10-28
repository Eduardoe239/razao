/**
 * MOTOR DE SIMULAÇÃO PREDITIVA DE CENARIOS WHAT-IF (O RAZÃO 3.0 - FASE 7)
 * Projeta o fluxo de caixa futuro sob 3 perspectivas determinísticas sem alterar dados históricos.
 */

export function simulateScenarios({ state, todayISO = new Date().toISOString().slice(0, 10), monthsAhead = 3 }) {
  const { transactions = [], accounts = [] } = state || {};

  // 1. Saldo Inicial Consolidado
  const currentBalanceCents = transactions
    .filter(t => t.status === 'pago')
    .reduce((acc, t) => {
      if (t.type === 'receita') return acc + (t.amountCents || 0);
      if (t.type === 'despesa') return acc - (t.amountCents || 0);
      return acc;
    }, 0);

  const start = new Date(`${todayISO}T00:00:00Z`);
  const monthlyProjections = [];

  let balanceOptimistic = currentBalanceCents;
  let balanceExpected = currentBalanceCents;
  let balanceConservative = currentBalanceCents;

  for (let m = 0; m <= monthsAhead; m++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + m, 1));
    const monthKey = d.toISOString().slice(0, 7);

    // Mês atual ou futuro
    const monthTx = transactions.filter(t => t.date && t.date.slice(0, 7) === monthKey);

    const pendingIncomes = monthTx
      .filter(t => t.type === 'receita' && t.status === 'pendente')
      .reduce((acc, t) => acc + (t.amountCents || 0), 0);

    const pendingExpenses = monthTx
      .filter(t => t.type === 'despesa' && t.status === 'pendente')
      .reduce((acc, t) => acc + (t.amountCents || 0), 0);

    const realizedIncomes = monthTx
      .filter(t => t.type === 'receita' && t.status === 'pago')
      .reduce((acc, t) => acc + (t.amountCents || 0), 0);

    const realizedExpenses = monthTx
      .filter(t => t.type === 'despesa' && t.status === 'pago')
      .reduce((acc, t) => acc + (t.amountCents || 0), 0);

    // 1. Cenário Otimista: 100% de receitas pendentes + redução de 15% nas despesas pendentes
    const netOptimistic = (realizedIncomes + pendingIncomes) - (realizedExpenses + Math.round(pendingExpenses * 0.85));
    balanceOptimistic += netOptimistic;

    // 2. Cenário Esperado: Média ponderada e lançamentos agendados normais
    const netExpected = (realizedIncomes + pendingIncomes) - (realizedExpenses + pendingExpenses);
    balanceExpected += netExpected;

    // 3. Cenário Conservador: Haircut de 10% nas receitas pendentes + contingência de +15% nas despesas
    const netConservative = (realizedIncomes + Math.round(pendingIncomes * 0.90)) - (realizedExpenses + Math.round(pendingExpenses * 1.15));
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
    summary: {
      finalOptimisticCents: balanceOptimistic,
      finalExpectedCents: balanceExpected,
      finalConservativeCents: balanceConservative,
      spreadCents: balanceOptimistic - balanceConservative
    }
  };
}
