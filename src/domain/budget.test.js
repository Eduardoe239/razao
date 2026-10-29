import { budgetForMonth, setCategoryBudget } from "./budget.js";

export function runBudgetTests(assert) {
  let map = {};
  map = setCategoryBudget(map, "cat-1", "2026-10", 50000); // PF por compatibilidade
  assert.strictEqual(budgetForMonth(map, "cat-1", "2026-10"), 50000, "Deve retornar orçamento PF em centavos");

  map = setCategoryBudget(map, "cat-2", "2026-10", 0);
  assert.strictEqual(budgetForMonth(map, "cat-2", "2026-10"), 0, "Deve preservar zero explícito");

  map = setCategoryBudget(map, "cat-1", "2026-10", null);
  assert.strictEqual(budgetForMonth(map, "cat-1", "2026-10"), null, "Deve remover orçamento PF");

  const legacy = { "food:2026-10": 12500 };
  assert.strictEqual(budgetForMonth(legacy, "food", "2026-10", "PF"), 12500, "Orçamento legado deve continuar disponível em PF");
  assert.strictEqual(budgetForMonth(legacy, "food", "2026-10", "PJ"), null, "Orçamento legado não pode vazar para PJ");

  let scoped = setCategoryBudget({}, "same-category-id", "2026-10", 10000, "PF");
  scoped = setCategoryBudget(scoped, "same-category-id", "2026-10", 25000, "PJ");
  assert.strictEqual(budgetForMonth(scoped, "same-category-id", "2026-10", "PF"), 10000, "PF deve manter seu limite independente");
  assert.strictEqual(budgetForMonth(scoped, "same-category-id", "2026-10", "PJ"), 25000, "PJ deve manter seu limite independente");

  scoped = setCategoryBudget(scoped, "same-category-id", "2026-10", null, "PJ");
  assert.strictEqual(budgetForMonth(scoped, "same-category-id", "2026-10", "PJ"), null, "Remover limite PJ não pode afetar PF");
  assert.strictEqual(budgetForMonth(scoped, "same-category-id", "2026-10", "PF"), 10000, "PF deve permanecer intacto ao remover PJ");

  const migrated = setCategoryBudget(legacy, "food", "2026-10", 15000, "PF");
  assert.strictEqual(migrated["PF:food:2026-10"], 15000, "Novos limites PF devem usar chave escopada");
  assert.strictEqual(migrated["food:2026-10"], undefined, "Gravar PF deve retirar chave legada substituída");
}
