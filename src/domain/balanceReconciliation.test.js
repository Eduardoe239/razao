import assert from 'node:assert/strict';
import { parseStatementBalance, reconcileAccountBalance, isValidStatementDate } from './balanceReconciliation.js';

const account = { id: 'checking', name: 'Conta Corrente', initialBalanceCents: 100000 };
const transactions = [
  { id: 'salary', accountId: 'checking', type: 'receita', status: 'pago', amountCents: 30000, date: '2026-10-02' },
  { id: 'groceries', accountId: 'checking', type: 'despesa', status: 'pago', amountCents: 12000, date: '2026-10-03' },
  { id: 'transfer-out', accountId: 'checking', toAccountId: 'savings', type: 'transferencia', status: 'pago', amountCents: 5000, date: '2026-10-04' },
  { id: 'transfer-in', accountId: 'savings', toAccountId: 'checking', type: 'transferencia', status: 'pago', amountCents: 10000, date: '2026-10-05' },
  { id: 'pending', accountId: 'checking', type: 'receita', status: 'pendente', amountCents: 5000, date: '2026-10-06' },
  { id: 'cancelled', accountId: 'checking', type: 'despesa', status: 'cancelado', amountCents: 4000, date: '2026-10-06' },
  { id: 'future', accountId: 'checking', type: 'receita', status: 'pago', amountCents: 9000, date: '2026-11-01' },
  { id: 'bad-date', accountId: 'checking', type: 'despesa', status: 'pago', amountCents: 5000, date: '2026-02-30' },
  { id: 'bad-amount', accountId: 'checking', type: 'despesa', status: 'pago', amountCents: 1.5, date: '2026-10-07' },
  { id: 'other-account', accountId: 'other', type: 'receita', status: 'pago', amountCents: 999999, date: '2026-10-07' }
];

assert.equal(isValidStatementDate('2024-02-29'), true, 'aceita dia válido em ano bissexto');
assert.equal(isValidStatementDate('2026-02-29'), false, 'rejeita dia inexistente');
assert.equal(parseStatementBalance('1.234,56').amountCents, 123456, 'converte formato monetário brasileiro com milhar');
assert.equal(parseStatementBalance('-25,00').amountCents, -2500, 'aceita saldo negativo legítimo');
assert.equal(parseStatementBalance('0,00').amountCents, 0, 'aceita saldo zero');
assert.equal(parseStatementBalance('  R$ 2.050,1 ').amountCents, 205010, 'aceita símbolo monetário e uma casa decimal');
assert.equal(parseStatementBalance('').valid, false, 'não trata campo vazio como zero');
assert.equal(parseStatementBalance('12,345').valid, false, 'rejeita mais de duas casas decimais');
assert.equal(parseStatementBalance('abc').valid, false, 'rejeita texto sem valor numérico');

const result = reconcileAccountBalance({ account, transactions, statementBalanceCents: 123000, asOfDate: '2026-10-31' });
assert.equal(result.valid, true, 'aceita conta, saldo e data válidos');
assert.equal(result.status, 'matched', 'marca saldo correto como conciliado');
assert.equal(result.openingBalanceCents, 100000, 'preserva saldo inicial da conta');
assert.equal(result.incomeCents, 30000, 'inclui receita paga antes da data de corte');
assert.equal(result.expenseCents, 12000, 'inclui despesa paga antes da data de corte');
assert.equal(result.transferOutCents, 5000, 'contabiliza saída por transferência como redução do saldo');
assert.equal(result.transferInCents, 10000, 'contabiliza entrada por transferência como aumento do saldo');
assert.equal(result.calculatedBalanceCents, 123000, 'compõe o saldo calculado com impacto líquido correto');
assert.equal(result.counts.included, 4, 'inclui apenas as quatro movimentações válidas e pagas');
assert.equal(result.counts.pendingExcluded, 1, 'separa pendências');
assert.equal(result.counts.cancelledExcluded, 1, 'exclui lançamentos cancelados');
assert.equal(result.counts.futureExcluded, 1, 'exclui lançamentos depois da data de corte');
assert.equal(result.counts.invalidDateExcluded, 1, 'separa datas inválidas');
assert.equal(result.counts.invalidMovementExcluded, 1, 'separa valor não inteiro em centavos');
assert.equal(reconcileAccountBalance({ account, transactions, statementBalanceCents: 120000, asOfDate: '2026-10-31' }).differenceCents, -3000, 'diferença é extrato menos saldo calculado');
assert.equal(reconcileAccountBalance({ account, transactions, statementBalanceCents: 123000, asOfDate: '2026-10-04' }).calculatedBalanceCents, 113000, 'data de corte remove movimentações posteriores');
assert.equal(reconcileAccountBalance({ account, transactions, statementBalanceCents: 0, asOfDate: '2026-10-31' }).valid, true, 'saldo zero é válido');
assert.equal(reconcileAccountBalance({ account, transactions, statementBalanceCents: 123000.5, asOfDate: '2026-10-31' }).valid, false, 'rejeita saldo não inteiro em centavos');
assert.equal(reconcileAccountBalance({ account, transactions, statementBalanceCents: 123000, asOfDate: '2026-02-30' }).valid, false, 'rejeita data de extrato impossível');
assert.equal(reconcileAccountBalance({ account: { id: 'bad', initialBalanceCents: 100.5 }, transactions, statementBalanceCents: 0, asOfDate: '2026-10-31' }).valid, false, 'rejeita saldo inicial inválido');
assert.equal(reconcileAccountBalance({ account, transactions, statementBalanceCents: 123000, asOfDate: '2026-10-31' }).counts.included, 4, 'extrato de outra conta não afeta o cálculo');

console.log('Conciliação de saldos: 24 verificações aprovadas.');
