/**
 * MÓDULO CONTEXT ENGINE IA RAZÃO (O RAZÃO 3.0 - FASE 7)
 * Constrói um snapshot financeiro completo e avalia consultas analíticas
 * utilizando estritamente regras determinísticas e aritmética em centavos inteiros.
 */

import { formatMoney } from './money.js';

export function buildFinancialContext(state, todayISO = new Date().toISOString().slice(0, 10)) {
  const { transactions = [], accounts = [], cards = [], budgets = {}, categories = [] } = state || {};

  // 1. Saldos Realizado, Pendente e Projetado
  const realizedCents = transactions
    .filter(t => t.status === 'pago')
    .reduce((acc, t) => {
      if (t.type === 'receita') return acc + (t.amountCents || 0);
      if (t.type === 'despesa') return acc - (t.amountCents || 0);
      return acc;
    }, 0);

  const pendingCents = transactions
    .filter(t => t.status === 'pendente')
    .reduce((acc, t) => {
      if (t.type === 'receita') return acc + (t.amountCents || 0);
      if (t.type === 'despesa') return acc - (t.amountCents || 0);
      return acc;
    }, 0);

  const projectedCents = realizedCents + pendingCents;

  // 2. Fatura Atual do Cartão Principal e Comprometido
  const primaryCard = cards[0] || { id: 'card-1', name: 'Cartão Principal' };
  const currentMonthKey = todayISO.slice(0, 7);
  const cardTransactions = transactions.filter(t => t.accountId === primaryCard.id && t.date <= `${currentMonthKey}-31`);
  const totalCardCents = cardTransactions.reduce((acc, t) => acc + (t.amountCents || 0), 0);
  const paidCardCents = transactions
    .filter(t => t.linkedInvoiceKey === currentMonthKey && t.type === 'despesa')
    .reduce((acc, t) => acc + (t.amountCents || 0), 0);
  
  const committedCents = Math.max(0, totalCardCents - paidCardCents);
  const availableCents = realizedCents - committedCents;

  // 3. Média de Gastos Mensais
  const past3Months = [];
  const currentYear = Number(todayISO.slice(0, 4));
  const currentMonth = Number(todayISO.slice(5, 7));

  for (let i = 1; i <= 3; i++) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const mKey = d.toISOString().slice(0, 7);
    past3Months.push(mKey);
  }

  const pastExpenses = transactions.filter(t => t.type === 'despesa' && t.status === 'pago' && past3Months.includes(t.date.slice(0, 7)));
  const totalPastExpenseCents = pastExpenses.reduce((acc, t) => acc + (t.amountCents || 0), 0);
  const avgMonthlyExpenseCents = Math.round(totalPastExpenseCents / (past3Months.length || 1));

  return {
    todayISO,
    currentMonthKey,
    realizedCents,
    pendingCents,
    projectedCents,
    committedCents,
    availableCents,
    avgMonthlyExpenseCents,
    accountsCount: accounts.length,
    cardsCount: cards.length,
    categoriesCount: categories.length
  };
}

/**
 * Responde a uma pergunta do usuário utilizando a lógica financeira determinística do sistema.
 */
export function queryAIAdvisor(promptText, state, todayISO = new Date().toISOString().slice(0, 10)) {
  const context = buildFinancialContext(state, todayISO);
  const lowerPrompt = (promptText || '').toLowerCase();

  // Caso 1: Pergunta sobre simulação de compra específica (ex: "posso comprar X por R$ 1500?")
  const priceMatch = lowerPrompt.match(/(?:comprar|gastar|pagar|valor|r\$)\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (priceMatch) {
    const valFloat = parseFloat(priceMatch[1].replace(',', '.'));
    if (!isNaN(valFloat) && valFloat > 0) {
      const purchaseCents = Math.round(valFloat * 100);
      const remainingAvailable = context.availableCents - purchaseCents;
      const isSafe = remainingAvailable >= 0;

      return {
        type: 'purchase_simulation',
        isSafe,
        purchaseCents,
        remainingAvailableCents: remainingAvailable,
        formattedPurchase: formatMoney(purchaseCents),
        formattedAvailable: formatMoney(context.availableCents),
        formattedRemaining: formatMoney(remainingAvailable),
        answer: isSafe
          ? `Sim, a compra de ${formatMoney(purchaseCents)} é financeiramente viável. Seu Saldo Disponível atual é de ${formatMoney(context.availableCents)}. Após a compra, você ainda manterá ${formatMoney(remainingAvailable)} livres para seus compromissos do mês.`
          : `Atenção: A compra de ${formatMoney(purchaseCents)} excede o seu Saldo Disponível atual (${formatMoney(context.availableCents)}). Realizar este gasto deixaria sua conta negativa em ${formatMoney(Math.abs(remainingAvailable))}, comprometendo a liquidação de suas faturas.`
      };
    }
  }

  // Caso 2: Limite seguro para o fim de semana / gastos livres
  if (lowerPrompt.includes('fim de semana') || lowerPrompt.includes('gastos livres') || lowerPrompt.includes('quanto posso gastar')) {
    const safeWeekendCents = Math.max(0, Math.round(context.availableCents * 0.3)); // 30% do saldo disponível livre
    return {
      type: 'weekend_budget',
      safeWeekendCents,
      answer: `Com base no seu Saldo Disponível de ${formatMoney(context.availableCents)}, o seu limite seguro recomendado para gastos discricionários no fim de semana é de até ${formatMoney(safeWeekendCents)}, preservando o restante para faturas e emergências.`
    };
  }

  // Caso 3: Diagnóstico Geral de Saúde Financeira
  const savingsRate = context.projectedCents > 0 && context.realizedCents > 0
    ? Math.round(((context.realizedCents - context.committedCents) / context.realizedCents) * 100)
    : 0;

  return {
    type: 'general_diagnosis',
    answer: `Análise do Razão para ${context.todayISO}: Seu Saldo Realizado atual é de ${formatMoney(context.realizedCents)}, com ${formatMoney(context.committedCents)} já comprometidos com faturas. Seu Saldo Disponível livre é de ${formatMoney(context.availableCents)}. Sua taxa de margem livre atual está em aproximadamente ${savingsRate}%.`
  };
}
