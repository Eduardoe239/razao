export function calculateSavingsBalance(goal, transactions = []) {
  if (!goal) return 0;
  const initial = Number.isInteger(goal.initialCents) ? goal.initialCents : 0;
  const contributions = transactions
    .filter(t => t.goalId === goal.id && t.status === "pago")
    .reduce((acc, t) => {
      const val = Number.isInteger(t.amountCents) ? t.amountCents : (Number.isInteger(t.amount) ? t.amount : Math.round((t.amount || 0) * 100));
      return acc + (t.type === "receita" ? val : -val);
    }, 0);
  return initial + contributions;
}
