// Módulo de dinheiro do domínio — SEMPRE centavos inteiros, nunca float de reais.
export const Money = {
  parseToCents(str) {
    let s = String(str ?? "").trim();
    if (!s) return 0;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  },
  centsToInput(cents) {
    return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
  },
  format(cents) {
    const n = (cents || 0) / 100;
    return (n < 0 ? "-" : "") + "R$ " + Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  splitInstallments(totalCents, n) {
    if (!Number.isInteger(totalCents) || !Number.isInteger(n) || n <= 0) {
      throw new Error("splitInstallments espera totalCents e n inteiros, n > 0");
    }
    const base = Math.floor(totalCents / n);
    const remainder = totalCents - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
  },
};
