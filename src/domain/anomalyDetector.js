/**
 * DETECTOR DE ANOMALIAS E PADRÕES DE RISCO (O RAZÃO 3.0 - FASE 7)
 * Identifica cobranças duplicadas, aumentos em assinaturas e riscos de estouro de orçamento.
 */

export function detectAnomalies(state, todayISO = new Date().toISOString().slice(0, 10)) {
  const { transactions = [], budgets = {}, categories = [] } = state || {};
  const anomalies = [];

  // 1. Detecção de Cobranças Duplicadas
  const expenses = transactions.filter(t => t.type === 'despesa' && (t.amountCents || 0) > 0);
  
  for (let i = 0; i < expenses.length; i++) {
    for (let j = i + 1; j < expenses.length; j++) {
      const t1 = expenses[i];
      const t2 = expenses[j];

      if (t1.amountCents === t2.amountCents && t1.description.trim().toLowerCase() === t2.description.trim().toLowerCase()) {
        const d1 = new Date(t1.date);
        const d2 = new Date(t2.date);
        const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);

        if (diffDays <= 3) {
          anomalies.push({
            id: `anom-dup-${t1.id}-${t2.id}`,
            type: 'duplicate',
            severity: 'high',
            title: 'Possível Cobrança Duplicada',
            description: `Encontrados dois lançamentos de R$ ${(t1.amountCents / 100).toFixed(2)} com a descrição "${t1.description}" em intervalo de ${Math.round(diffDays)} dia(s).`,
            itemIds: [t1.id, t2.id],
            amountCents: t1.amountCents
          });
        }
      }
    }
  }

  // 2. Detecção de Risco de Estouro de Orçamento no Mês
  const currentMonthKey = todayISO.slice(0, 7);
  const monthExpenses = transactions.filter(t => t.type === 'despesa' && t.date.slice(0, 7) === currentMonthKey);

  categories.forEach(cat => {
    const budgetKey = `${cat.id}:${currentMonthKey}`;
    const limitCents = budgets[budgetKey];

    if (limitCents !== undefined && limitCents !== null && limitCents > 0) {
      const catSpentCents = monthExpenses
        .filter(t => t.categoryId === cat.id)
        .reduce((acc, t) => acc + (t.amountCents || 0), 0);

      const usagePercent = Math.round((catSpentCents / limitCents) * 100);

      if (usagePercent >= 85) {
        anomalies.push({
          id: `anom-budget-${cat.id}`,
          type: 'budget_overrun_risk',
          severity: usagePercent >= 100 ? 'high' : 'medium',
          title: usagePercent >= 100 ? `Orçamento Estourado: ${cat.name}` : `Risco de Estouro: ${cat.name}`,
          description: `Você já consumiu ${usagePercent}% do orçamento estipulado para ${cat.name} (R$ ${(catSpentCents / 100).toFixed(2)} de R$ ${(limitCents / 100).toFixed(2)}).`,
          categoryId: cat.id,
          usagePercent,
          amountCents: catSpentCents
        });
      }
    }
  });

  return anomalies;
}
