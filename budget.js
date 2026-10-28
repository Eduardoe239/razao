export function budgetForMonth(budgetMap, categoryId, monthKey) {
  if (!budgetMap || !categoryId || !monthKey) return null;
  const val = budgetMap[`${categoryId}:${monthKey}`];
  if (val === undefined || val === null) return null;
  return typeof val === "number" ? val : null;
}

export function setCategoryBudget(budgetMap, categoryId, monthKey, cents) {
  const next = { ...(budgetMap || {}) };
  const key = `${categoryId}:${monthKey}`;
  if (cents === null || cents === undefined || cents === "") {
    delete next[key];
  } else {
    const num = Number(cents);
    if (!Number.isNaN(num) && num >= 0) {
      next[key] = Math.floor(num);
    }
  }
  return next;
}
