export function calculateForecast({ transactions = [], recurring = [], cards = [], accounts = [], openingBalanceCents, todayISO, monthsAhead = 3 }) {
  if (!todayISO) throw new Error("todayISO é obrigatório para previsão");

  const start = new Date(`${todayISO}T00:00:00Z`);
  const getVal = (t) => Number.isInteger(t.amountCents) ? t.amountCents : (Number.isInteger(t.amount) ? t.amount : Math.round((t.amount || 0) * 100));
  const signed = (t) => t.type === "receita" ? getVal(t) : t.type === "despesa" ? -getVal(t) : 0;
  const firstMonth = `${start.getUTCFullYear()}-${String(start.getUTCMonth()+1).padStart(2,'0')}`;
  const baseBalance = Number.isFinite(openingBalanceCents) ? openingBalanceCents : accounts.reduce((sum, a) => sum + (Number.isInteger(a.initialBalanceCents) ? a.initialBalanceCents : 0), 0) + transactions.filter(t => t.date && t.date.slice(0,7) < firstMonth && t.status === 'pago').reduce((sum,t)=>sum+signed(t),0);
  let runningBalance = baseBalance;
  const results = [];

  for (let m = 0; m <= monthsAhead; m++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + m, 1));
    const monthKey = d.toISOString().slice(0, 7);
    const monthTx = transactions.filter(t => t.date && t.date.slice(0, 7) === monthKey);
    const realizedIncomes = monthTx.filter(t => t.type === "receita" && t.status === "pago").reduce((acc,t)=>acc+getVal(t),0);
    const realizedExpenses = monthTx.filter(t => t.type === "despesa" && t.status === "pago").reduce((acc,t)=>acc+getVal(t),0);
    const pendingIncomes = monthTx.filter(t => t.type === "receita" && t.status === "pendente").reduce((acc,t)=>acc+getVal(t),0);
    const pendingExpenses = monthTx.filter(t => t.type === "despesa" && t.status === "pendente").reduce((acc,t)=>acc+getVal(t),0);
    const netProjected = (realizedIncomes + pendingIncomes) - (realizedExpenses + pendingExpenses);
    runningBalance += netProjected;
    results.push({ monthKey, realizedIncomes, realizedExpenses, pendingIncomes, pendingExpenses, netProjected, openingBalanceCents: runningBalance - netProjected, projectedBalanceCents: runningBalance });
  }
  return results;
}
