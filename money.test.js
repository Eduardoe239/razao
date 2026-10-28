import { parseToCents, formatMoney } from "./money.js";

export function runMoneyTests(assert) {
  assert.strictEqual(parseToCents("10,50"), 1050, "deve converter 10,50 para 1050 centavos");
  assert.strictEqual(parseToCents("100"), 10000, "deve converter 100 para 10000 centavos");
  assert.strictEqual(parseToCents("0"), 0, "deve converter 0 para 0 centavos");
  assert.strictEqual(parseToCents("R$ 1.250,99"), 125099, "deve tratar formatação monetária com símbolo");
  assert.strictEqual(formatMoney(1050).replace(/\s/g, ' '), "R$ 10,50", "deve formatar 1050 centavos para BRL");
  assert.strictEqual(formatMoney(0).replace(/\s/g, ' '), "R$ 0,00", "deve formatar 0 centavos para BRL");
}
