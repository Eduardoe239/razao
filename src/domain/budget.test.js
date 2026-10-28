import { budgetForMonth, setCategoryBudget } from "./budget.js";

export function runBudgetTests(assert) {
  let map = {};
  map = setCategoryBudget(map, "cat-1", "2026-10", 50000); // R$ 500,00
  assert.strictEqual(budgetForMonth(map, "cat-1", "2026-10"), 50000, "Deve retornar o orçamento definido em centavos");

  // Definir zero explícito
  map = setCategoryBudget(map, "cat-2", "2026-10", 0);
  assert.strictEqual(budgetForMonth(map, "cat-2", "2026-10"), 0, "Deve preservar zero explícito no orçamento");

  // Remover orçamento
  map = setCategoryBudget(map, "cat-1", "2026-10", null);
  assert.strictEqual(budgetForMonth(map, "cat-1", "2026-10"), null, "Deve remover orçamento e retornar null");
}
