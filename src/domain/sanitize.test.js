import { sanitizeTransactions, sanitizeTransaction, isValidISODate } from "./sanitize.js";

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

  const payment = sanitizeTransaction({
    id: "pay-1", amountCents: 1500, status: "pago", type: "transferencia", date: "2026-10-28",
    accountId: "acc-1", toAccountId: "card-1", profileType: "PF", linkedInvoiceKey: "2026-10",
    linkedCardId: "card-1", idempotencyKey: "invoice-payment:card-1:2026-10:remaining:1500"
  });
  assert.strictEqual(payment.linkedInvoiceKey, "2026-10", "Sanitização preserva vínculo da fatura");
  assert.strictEqual(payment.linkedCardId, "card-1", "Sanitização preserva cartão de destino");
  assert.strictEqual(payment.idempotencyKey, "invoice-payment:card-1:2026-10:remaining:1500", "Sanitização preserva chave idempotente");
  assert.strictEqual(payment.profileType, "PF", "Sanitização preserva perfil PF/PJ");

  const adjustment = sanitizeTransaction({
    id: "adjustment-1", amountCents: 1234, status: "pago", type: "despesa", date: "2026-10-28",
    accountId: "acc-1", profileType: "PF", source: "balance_reconciliation_adjustment",
    reconciliationKey: "acc-1:2026-10-28:-1234:expense:",
    reconciliationAdjustment: {
      kind: "expense", statementDate: "2026-10-28", statementBalanceCents: 10000,
      priorCalculatedBalanceCents: 11234, priorDifferenceCents: -1234,
      note: "Ajuste manual confirmado"
    }
  });
  assert.strictEqual(adjustment.source, "balance_reconciliation_adjustment", "Sanitização preserva a origem do ajuste de conciliação");
  assert.strictEqual(adjustment.reconciliationKey, "acc-1:2026-10-28:-1234:expense:", "Sanitização preserva a chave de idempotência do ajuste");
  assert.strictEqual(adjustment.reconciliationAdjustment.priorDifferenceCents, -1234, "Sanitização preserva a diferença auditada");
  assert.strictEqual(sanitizeTransaction({
    id: "adjustment-2", amountCents: 100, status: "pago", type: "despesa", date: "2026-10-28",
    accountId: "acc-1", source: "balance_reconciliation_adjustment",
    reconciliationAdjustment: { kind: "invalid", statementDate: "2026-02-31", priorDifferenceCents: "bad", note: "x".repeat(500) }
  }).reconciliationAdjustment.note.length, 200, "Sanitização limita metadados de ajuste potencialmente excessivos");
}
