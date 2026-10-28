import { calculateSavingsBalance } from "./savings.js";

export function runSavingsTests(assert) {
  const goal = { id: "g1", initialCents: 10000 };
  const transactions = [
    { id: "1", goalId: "g1", type: "receita", amount: 5000, status: "pago" },
    { id: "2", goalId: "g1", type: "despesa", amount: 2000, status: "pago" }
  ];

  const balance = calculateSavingsBalance(goal, transactions);
  assert.strictEqual(balance, 13000, "Saldo da meta deve somar inicial + contribuições - resgates");
}
