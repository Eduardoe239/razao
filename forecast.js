export function calculateForecast({ transactions = [], recurring = [], cards = [], todayISO, monthsAhead = 3 }) {
  if (!todayISO) throw new Error("todayISO é obrigatório para previsão");
  
  const results = [];
  const start = new Date(todayISO + "T00:00:00Z");

  for (let m = 0; m <= monthsAhead; m++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + m, 1));
    const monthKey = d.toISOString().slice(0, 7);

    const monthTx = transactions.filter(t => t.date && t.date.slice(0, 7) === monthKey);
    const realizedIncomes = monthTx.filter(t => t.type === "receita" && t.status === "pago").reduce((acc, t) => acc + t.amount, 0);
    const realizedExpenses = monthTx.filter(t => t.type === "despesa" && t.status === "pago").reduce((acc, t) => acc + t.amount, 0);
    
    const pendingIncomes = monthTx.filter(t => t.type === "receita" && t.status === "pendente").reduce((acc, t) => acc + t.amount, 0);
    const pendingExpenses = monthTx.filter(t => t.type === "despesa" && t.status === "pendente").reduce((acc, t) => acc + t.amount, 0);

    results.push({
      monthKey,
      realizedIncomes,
      realizedExpenses,
      pendingIncomes,
      pendingExpenses,
      netProjected: (realizedIncomes + pendingIncomes) - (realizedExpenses + pendingExpenses)
    });
  }

  return results;
}
