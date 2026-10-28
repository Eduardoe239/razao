import { sanitizeTransactions, isValidISODate } from "./sanitize.js";

export function runSanitizeTests(assert) {
  assert.strictEqual(isValidISODate("2026-10-28"), true, "Data ISO válida");
  assert.strictEqual(isValidISODate("2026-02-31"), false, "Fevereiro 31 é inválido");
  assert.strictEqual(isValidISODate("texto-invalido"), false, "Texto não-data é inválido");

  const invalidData = [
    { id: "1", amount: 100, status: "pago", date: "2026-10-10" }, // válido
    { id: "2", amount: 100, status: "status_invalido", date: "2026-10-10" } // deve ser descartado ou corrigido
  ];

  const sanitized = sanitizeTransactions(invalidData);
  assert.strictEqual(sanitized.length, 1, "Status desconhecido deve ser descartado e não transformado silenciosamente em pago");
}
