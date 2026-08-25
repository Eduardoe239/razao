import { describe, it, expect } from "vitest";
import { invoiceKeyForDate, invoiceDueDate } from "./invoices.js";

describe("invoiceKeyForDate", () => {
  it("compra até o dia de fechamento cai na fatura deste mês", () => {
    expect(invoiceKeyForDate("2026-03-10", 15)).toBe("2026-03");
    expect(invoiceKeyForDate("2026-03-15", 15)).toBe("2026-03"); // no próprio dia de fechamento
  });
  it("compra depois do fechamento cai na fatura do mês seguinte", () => {
    expect(invoiceKeyForDate("2026-03-16", 15)).toBe("2026-04");
  });
  it("vira o ano corretamente (dezembro -> janeiro)", () => {
    expect(invoiceKeyForDate("2026-12-20", 15)).toBe("2027-01");
  });
});

describe("invoiceDueDate", () => {
  it("vencimento no mesmo mês do fechamento quando dueDay >= closingDay", () => {
    expect(invoiceDueDate("2026-03", 20, 10)).toBe("2026-03-20");
  });
  it("vencimento no mês seguinte quando dueDay < closingDay (padrão brasileiro)", () => {
    expect(invoiceDueDate("2026-03", 5, 25)).toBe("2026-04-05");
  });
  it("vira o ano corretamente no vencimento", () => {
    expect(invoiceDueDate("2026-12", 5, 25)).toBe("2027-01-05");
  });
});
