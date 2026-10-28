export function calculateSavingsBalance(goal, transactions = []) {
  if (!goal) return 0;
  const initial = Number.isInteger(goal.initialCents) ? goal.initialCents : 0;
  const contributions = transactions
    .filter(t => t.goalId === goal.id && t.status === "pago")
    .reduce((acc, t) => acc + (t.type === "receita" ? t.amount : -t.amount), 0);
  return initial + contributions;
}
