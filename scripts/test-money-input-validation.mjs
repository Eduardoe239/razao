import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseMoneyInputToCents } from '../src/domain/money.js';
import { parseStatementBalance } from '../src/domain/balanceReconciliation.js';

const accepted = [
  ['0', 0], ['450', 45000], ['450,00', 45000], ['450,5', 45050],
  ['1.234,56', 123456], ['1234,56', 123456], ['1234.56', 123456],
  ['  12,34  ', 1234], ['999999999,99', 99999999999]
];
for (const [input, expected] of accepted) {
  const result = parseMoneyInputToCents(input);
  assert.equal(result.valid, true, `deveria aceitar ${input}`);
  assert.equal(result.cents, expected, `centavos incorretos para ${input}`);
}
const rejected = ['', ' ', '-1', '1,999', '1.234', '1.2.3', '1,2,3', '1.234,567', 'R$ 10,00', '1e3', '999999999999999999999'];
for (const input of rejected) {
  assert.equal(parseMoneyInputToCents(input).valid, false, `deveria recusar ${JSON.stringify(input)}`);
}
assert.equal(parseMoneyInputToCents(null).valid, false);
assert.deepEqual(parseMoneyInputToCents('-25,00', { allowNegative: true }), { valid: true, cents: -2500 });
assert.deepEqual(parseMoneyInputToCents('R$ 2.050,1', { allowCurrencySymbol: true }), { valid: true, cents: 205010 });
assert.equal(parseMoneyInputToCents('-25,00').valid, false, 'valores negativos devem ser recusados fora do saldo de extrato');
assert.equal(parseMoneyInputToCents('R$ 10,00').valid, false, 'símbolo monetário deve ser explicitamente permitido');
assert.equal(parseStatementBalance('12,345').valid, false, 'saldo de extrato também deve recusar três casas decimais');
assert.equal(parseStatementBalance('-25,00').amountCents, -2500, 'saldo negativo continua permitido no extrato');
const recurringSource = await readFile(new URL('../src/components/RecurringManager.jsx', import.meta.url), 'utf8');
assert.match(recurringSource, /parseMoneyInputToCents\(amount\)/, 'recorrências usam o parser monetário central');
const transactionModal = await readFile(new URL('../src/components/TransactionModal.jsx', import.meta.url), 'utf8');
assert.match(transactionModal, /parseMoneyInputToCents\(amountStr\)/, 'lançamentos manuais recusam mais de duas casas decimais');
assert.match(transactionModal, /inputMode="decimal"/, 'campo monetário oferece teclado decimal em dispositivos móveis');
assert.doesNotMatch(transactionModal, /parseToCents\(amountStr\)/, 'lançamento não usa parser que arredonda silenciosamente');
console.log(`Money input validation: ${accepted.length + rejected.length + 11} assertions passed, 0 failed`);
