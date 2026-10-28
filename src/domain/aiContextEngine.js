import { formatMoney } from './money.js';

/**
 * CONTEXT ENGINE DA IA RAZÃO (FASE 7)
 * Extrai o estado financeiro consolidado em centavos inteiros
 * para alimentar a camada de análise determinística.
 */
export function buildFinancialContext(state = {}, todayISO = new Date().toISOString().slice(0, 10)) {
  const transactions = state.transactions || [];
  const accounts = state.accounts || [];
  const cards = state.cards || [];
  const categories = state.categories || [];

  const currentMonthKey = todayISO.slice(0, 7);

  const realizedCents = transactions
    .filter(t => t.status === 'pago')
    .reduce((acc, t) => {
      if (t.type === 'receita') return acc + (t.amountCents || 0);
      if (t.type === 'despesa') return acc - (t.amountCents || 0);
      return acc;
    }, 0);

  const pendingCents = transactions
    .filter(t => t.status === 'pendente' && (t.date || '').slice(0, 7) === currentMonthKey)
    .reduce((acc, t) => {
      if (t.type === 'receita') return acc + (t.amountCents || 0);
      if (t.type === 'despesa') return acc - (t.amountCents || 0);
      return acc;
    }, 0);

  const projectedCents = realizedCents + pendingCents;

  const committedCents = transactions
    .filter(t => t.status === 'pendente' && t.type === 'despesa' && (t.date || '').slice(0, 7) === currentMonthKey)
    .reduce((acc, t) => acc + (t.amountCents || 0), 0);

  const availableCents = realizedCents - committedCents;

  // Média de Gastos Mensais
  const paidExpenses = transactions.filter(t => t.status === 'pago' && t.type === 'despesa');
  const totalPaidExpenseCents = paidExpenses.reduce((acc, t) => acc + (t.amountCents || 0), 0);
  const avgMonthlyExpenseCents = paidExpenses.length > 0 ? Math.round(totalPaidExpenseCents / Math.max(1, Math.ceil(paidExpenses.length / 30))) : 0;

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
    categoriesCount: categories.length,
    transactions,
    accounts,
    cards,
    categories
  };
}

/**
 * Responde a uma pergunta do usuário utilizando a lógica financeira determinística do sistema.
 */
export function queryAIAdvisor(arg1, arg2, todayISO = new Date().toISOString().slice(0, 10)) {
  let promptText = "";
  let context = null;

  if (typeof arg1 === 'string') {
    promptText = arg1;
    context = typeof arg2 === 'object' && arg2.availableCents !== undefined ? arg2 : buildFinancialContext(arg2 || {}, todayISO);
  } else {
    context = typeof arg1 === 'object' && arg1.availableCents !== undefined ? arg1 : buildFinancialContext(arg1 || {}, todayISO);
    promptText = typeof arg2 === 'string' ? arg2 : "";
  }

  const lowerPrompt = (promptText || '').toLowerCase();

  // Caso 1: Pergunta sobre simulação de compra específica
  const priceMatch = lowerPrompt.match(/(?:comprar|gastar|pagar|valor|r\$)\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (priceMatch) {
    const valFloat = parseFloat(priceMatch[1].replace(',', '.'));
    if (!isNaN(valFloat) && valFloat > 0) {
      const purchaseCents = Math.round(valFloat * 100);
      const remainingAvailable = context.availableCents - purchaseCents;
      const allowed = remainingAvailable >= 0;

      return {
        type: 'purchase_simulation',
        allowed,
        isSafe: allowed,
        purchaseCents,
        remainingAvailableCents: remainingAvailable,
        formattedPurchase: formatMoney(purchaseCents),
        formattedAvailable: formatMoney(context.availableCents),
        formattedRemaining: formatMoney(remainingAvailable),
        answer: allowed
          ? `Sim, a compra de ${formatMoney(purchaseCents)} é financeiramente viável. Seu Saldo Disponível atual é de ${formatMoney(context.availableCents)}. Após a compra, você ainda manterá ${formatMoney(remainingAvailable)} livres para seus compromissos do mês.`
          : `Atenção: A compra de ${formatMoney(purchaseCents)} excede o seu Saldo Disponível atual (${formatMoney(context.availableCents)}). Realizar este gasto deixaria sua conta negativa em ${formatMoney(Math.abs(remainingAvailable))}, comprometendo a liquidação de suas faturas.`
      };
    }
  }

  return {
    type: 'general_summary',
    allowed: context.availableCents >= 0,
    isSafe: context.availableCents >= 0,
    answer: `Atualmente você possui ${formatMoney(context.availableCents)} livres no Saldo Disponível e ${formatMoney(context.committedCents)} em compromissos assumidos do mês. Suas finanças estão com lógica e sob controle!`
  };
}
