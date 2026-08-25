import { describe, it, expect } from "vitest";
import { Money } from "./money.js";

describe("Money.parseToCents", () => {
  it("converte reais simples pra centavos", () => {
    expect(Money.parseToCents("12,50")).toBe(1250);
    expect(Money.parseToCents("12.50")).toBe(1250);
  });
  it("lida com separador de milhar quando há vírgula decimal", () => {
    expect(Money.parseToCents("1.234,56")).toBe(123456);
  });
  it("arredonda corretamente casos de ponto flutuante clássicos", () => {
    // 0.1 + 0.2 em float javascript não dá 0.3 — o parse deve ser exato aqui
    expect(Money.parseToCents("0,10")).toBe(10);
    expect(Money.parseToCents("0,20")).toBe(20);
  });
  it("retorna 0 pra entrada vazia ou inválida", () => {
    expect(Money.parseToCents("")).toBe(0);
    expect(Money.parseToCents("abc")).toBe(0);
    expect(Money.parseToCents(undefined)).toBe(0);
  });
  it("lida com valores negativos", () => {
    expect(Money.parseToCents("-50,00")).toBe(-5000);
  });
});

describe("Money.centsToInput / format", () => {
  it("centsToInput é o inverso de parseToCents pra valores redondos", () => {
    expect(Money.centsToInput(1250)).toBe("12,50");
    expect(Money.centsToInput(0)).toBe("0,00");
  });
  it("format exibe em BRL com sinal", () => {
    expect(Money.format(1250)).toBe("R$ 12,50");
    expect(Money.format(-1250)).toBe("-R$ 12,50");
    expect(Money.format(0)).toBe("R$ 0,00");
  });
});

describe("Money.splitInstallments", () => {
  it("divide igualmente quando é exato", () => {
    expect(Money.splitInstallments(1000, 2)).toEqual([500, 500]);
  });
  it("distribui o resto (em centavos) pras primeiras parcelas, nunca perde nem sobra centavo", () => {
    const parts = Money.splitInstallments(1000, 3); // 333.33... x3
    expect(parts).toEqual([334, 333, 333]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
  });
  it("é determinístico: mesma entrada sempre produz a mesma distribuição", () => {
    const a = Money.splitInstallments(9999, 7);
    const b = Money.splitInstallments(9999, 7);
    expect(a).toEqual(b);
    expect(a.reduce((x, y) => x + y, 0)).toBe(9999);
  });
  it("nunca perde centavo em casos com resto grande (ex.: 100 parcelas de 1 centavo cada de resto)", () => {
    const total = 10099; // 100 parcelas -> base 100, resto 99
    const parts = Money.splitInstallments(total, 100);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    expect(parts.filter((p) => p === 101).length).toBe(99);
    expect(parts.filter((p) => p === 100).length).toBe(1);
  });
  it("lança erro se os parâmetros não forem inteiros válidos", () => {
    expect(() => Money.splitInstallments(10.5, 2)).toThrow();
    expect(() => Money.splitInstallments(1000, 0)).toThrow();
  });
});
