import { calculateInvoiceCycle, validateInvoicePayment, cardInvoices } from "./invoices.js";

export function runInvoicesTests(assert) {
  const card = { id: "card-1", closingDay: 20, dueDay: 28, limitCents: 500000 };
  const cycle = calculateInvoiceCycle(card, "2026-10-15");

  assert.strictEqual(cycle.closingDate, "2026-10-20", "Data de fechamento em 20/10/2026");
  assert.strictEqual(cycle.dueDate, "2026-10-28", "Data de vencimento em 28/10/2026");

  const invoice = { remainingCents: 15000 };
  
  const valid = validateInvoicePayment({ invoice, amountCents: 10000, fromAccountId: "acc-1", cardId: "card-1" });
  assert.strictEqual(valid.valid, true, "Pagamento parcial válido");

  const invalidOver = validateInvoicePayment({ invoice, amountCents: 20000, fromAccountId: "acc-1", cardId: "card-1" });
  assert.strictEqual(invalidOver.valid, false, "Deve rejeitar pagamento excedente ao saldo devedor");

  const invalidSelf = validateInvoicePayment({ invoice, amountCents: 5000, fromAccountId: "card-1", cardId: "card-1" });
  assert.strictEqual(invalidSelf.valid, false, "Deve rejeitar pagar cartão com a própria conta do cartão");

  const invoices = cardInvoices(card, [], "2026-10", 0, 0, "2026-10-28");
  assert.strictEqual(invoices.length, 1, "Gera 1 fatura para o mês especificado");
}
