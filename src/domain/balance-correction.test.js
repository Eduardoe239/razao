import assert from 'node:assert/strict';
import { analyzeBalanceDiscrepancy, prepareBalanceAdjustment, applyBalanceAdjustment } from './balanceCorrection.js';
import { reconcileAccountBalance } from './balanceReconciliation.js';

const accounts = [
  { id: 'checking', name: 'Conta corrente', initialBalanceCents: 10000 },
  { id: 'savings', name: 'Poupança', initialBalanceCents: 5000 }
];
const baseTx = [{ id: 'salary', accountId: 'checking', type: 'receita', amountCents: 3000, date: '2026-10-01', status: 'pago' }];
const makeResult = (difference) => reconcileAccountBalance({
  account: accounts[0], transactions: baseTx,
  statementBalanceCents: 13000 + difference,
  asOfDate: '2026-10-28'
});

const positive = makeResult(1200);
const negative = makeResult(-900);
assert.equal(analyzeBalanceDiscrepancy(positive).suggestions[0].id, 'missing_income', 'sugere entrada para diferença positiva');
assert.equal(analyzeBalanceDiscrepancy(negative).suggestions[0].id, 'missing_expense', 'sugere despesa para diferença negativa');
assert.equal(analyzeBalanceDiscrepancy(makeResult(0)).status, 'matched', 'não propõe ajuste quando já conciliado');
assert.equal(analyzeBalanceDiscrepancy({ valid: false }).status, 'invalid', 'não faz hipóteses sobre conferência inválida');

const incomeProposal = prepareBalanceAdjustment({ result: positive, account: accounts[0], accounts, adjustmentKind: 'income', description: 'Depósito não registrado', date: '2026-10-28', categoryId: 'income-cat' });
assert.equal(incomeProposal.valid, true, 'prepara rascunho de receita para diferença positiva');
assert.equal(incomeProposal.draft.amountCents, 1200, 'usa a diferença exata em centavos');
assert.equal(prepareBalanceAdjustment({ result: positive, account: accounts[0], accounts, adjustmentKind: 'expense', description: 'Taxa', date: '2026-10-28' }).valid, false, 'rejeita despesa que aumentaria divergência positiva');
assert.equal(prepareBalanceAdjustment({ result: negative, account: accounts[0], accounts, adjustmentKind: 'income', description: 'Entrada', date: '2026-10-28' }).valid, false, 'rejeita receita que aumentaria divergência negativa');
assert.equal(prepareBalanceAdjustment({ result: negative, account: accounts[0], accounts, adjustmentKind: 'expense', description: 'Tarifa bancária', date: '2026-10-28' }).valid, true, 'prepara despesa para diferença negativa');
assert.equal(prepareBalanceAdjustment({ result: positive, account: accounts[0], accounts, adjustmentKind: 'income', description: 'Depósito', date: '2026-10-29' }).valid, false, 'rejeita data após o extrato');
assert.equal(prepareBalanceAdjustment({ result: positive, account: accounts[0], accounts, adjustmentKind: 'income', description: '', date: '2026-10-28' }).valid, false, 'exige descrição');
assert.equal(prepareBalanceAdjustment({ result: positive, account: accounts[0], accounts, adjustmentKind: 'transfer', description: 'Transferência', date: '2026-10-28', targetAccountId: 'checking' }).valid, false, 'rejeita transferência para a mesma conta');

const transferIn = prepareBalanceAdjustment({ result: positive, account: accounts[0], accounts, adjustmentKind: 'transfer', description: 'Transferência recebida', date: '2026-10-28', targetAccountId: 'savings' });
assert.equal(transferIn.valid, true, 'prepara transferência para diferença positiva');
assert.equal(transferIn.draft.accountId, 'savings', 'transferência recebida usa outra conta como origem');
assert.equal(transferIn.draft.toAccountId, 'checking', 'transferência recebida aponta a conta conciliada como destino');
const transferOut = prepareBalanceAdjustment({ result: negative, account: accounts[0], accounts, adjustmentKind: 'transfer', description: 'Transferência enviada', date: '2026-10-28', targetAccountId: 'savings' });
assert.equal(transferOut.draft.accountId, 'checking', 'transferência enviada parte da conta conciliada');
assert.equal(transferOut.draft.toAccountId, 'savings', 'transferência enviada usa a outra conta como destino');

const applied = applyBalanceAdjustment({ accounts, transactions: baseTx, result: positive, draft: incomeProposal.draft, transactionId: 'adjustment-1' });
assert.equal(applied.valid, true, 'aplica rascunho explícito válido');
assert.equal(applied.transaction.source, 'balance_reconciliation_adjustment', 'marca a origem do ajuste');
assert.equal(applied.transaction.reconciliationAdjustment.priorDifferenceCents, 1200, 'registra o contexto de auditoria');
assert.equal(applyBalanceAdjustment({ accounts, transactions: [...baseTx, applied.transaction], result: positive, draft: incomeProposal.draft, transactionId: 'adjustment-2' }).valid, false, 'bloqueia repetição da mesma correção');
assert.equal(applyBalanceAdjustment({ accounts, transactions: [...baseTx, { id: 'new-tx', accountId: 'checking', type: 'receita', amountCents: 100, date: '2026-10-27', status: 'pago' }], result: positive, draft: incomeProposal.draft, transactionId: 'adjustment-3' }).valid, false, 'bloqueia aplicação após estado financeiro mudar');
assert.equal(applyBalanceAdjustment({ accounts, transactions: baseTx, result: positive, draft: incomeProposal.draft, transactionId: 'salary' }).valid, false, 'bloqueia ID de transação já existente');
const expenseProposal = prepareBalanceAdjustment({ result: negative, account: accounts[0], accounts, adjustmentKind: 'expense', description: 'Tarifa bancária', date: '2026-10-28' });
assert.equal(applyBalanceAdjustment({ accounts, transactions: baseTx, result: negative, draft: expenseProposal.draft, transactionId: 'adjustment-expense' }).valid, true, 'aplica despesa de ajuste válida');

console.log('Correções de divergência: 20 verificações aprovadas.');
