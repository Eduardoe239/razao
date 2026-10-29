const normalizeProfile = profileType => profileType === "PJ" ? "PJ" : "PF";
const scopedKey = (profileType, categoryId, monthKey) => `${normalizeProfile(profileType)}:${categoryId}:${monthKey}`;
const legacyKey = (categoryId, monthKey) => `${categoryId}:${monthKey}`;

export function budgetForMonth(budgetMap, categoryId, monthKey, profileType = "PF") {
  if (!budgetMap || !categoryId || !monthKey) return null;
  const profile = normalizeProfile(profileType);
  const key = scopedKey(profile, categoryId, monthKey);
  // Backward compatibility: historical unscoped budgets belong to PF only.
  const val = budgetMap[key] !== undefined
    ? budgetMap[key]
    : profile === "PF" ? budgetMap[legacyKey(categoryId, monthKey)] : undefined;
  if (val === undefined || val === null) return null;
  return typeof val === "number" ? val : null;
}

export function setCategoryBudget(budgetMap, categoryId, monthKey, cents, profileType = "PF") {
  const next = { ...(budgetMap || {}) };
  const profile = normalizeProfile(profileType);
  const key = scopedKey(profile, categoryId, monthKey);
  if (cents === null || cents === undefined || cents === "") {
    delete next[key];
    // Remove the legacy key too when editing/removing the PF budget, so it
    // cannot reappear via the compatibility fallback after deletion.
    if (profile === "PF") delete next[legacyKey(categoryId, monthKey)];
  } else {
    const num = Number(cents);
    if (!Number.isNaN(num) && Number.isFinite(num) && num >= 0) {
      next[key] = Math.floor(num);
      if (profile === "PF") delete next[legacyKey(categoryId, monthKey)];
    }
  }
  return next;
}
