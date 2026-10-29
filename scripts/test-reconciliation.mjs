import assert from 'node:assert/strict';
import { sanitizeTransaction } from '../src/domain/sanitize.js';
import {
  reconcileTransactions,
  applyReconciliationDecisions,
  isValidReconciliationDate
} from '../src/domain/reconciliation.js';

const existing = [
  { id: 'tx-pending', description: 'Academia Mensal', amountCents: 8990, type: 'despesa', date: '2026-10-27', status: 'pendente', accountId: 'checking', categoryId: 'fitness', profileType: 'PF' },
  { id: 'tx-paid', description: 'Mercado Central', amountCents: 12850, type: 'despesa', date: '2026-10-28', status: 'pago', accountId: 'checking', importedId: 'fitid-market', profileType: 'PF' },
  { id: 'tx-unrelated', description: 'Outro estabelecimento', amountCents: 20000, type: 'despesa', date: '2026-10-28', status: 'pago', accountId: 'checking', profileType: 'PF' }
];

assert.equal(isValidReconciliationDate('2024-02-29'), true, 'aceita data bissexta válida');
assert.equal(isValidReconciliationDate('2026-02-29'), false, 'rejeita dia inexistente em fevereiro');

const pending = reconcileTransactions([{
  importedId: 'fitid-gym', description: 'ACADEMIA MENSAL', amountCents: 8990,
  type: 'despesa', date: '2026-10-28', status: 'pago', source: 'ofx'
}], existing, { accountId: 'checking' })[0];
assert.equal(pending.reconciliationStatus, 'match_pending', 'identifica lançamento pendente com mesma descrição, valor, tipo e data próxima');

const settled = applyReconciliationDecisions({
  existingTransactions: existing,
  selectedItems: [{ ...pending, selected: true }],
  accountId: 'checking',
  categoryId: 'fitness',
  profileType: 'PF',
  createId: () => 'should-not-be-used'
});
assert.equal(settled.addedCount, 0, 'baixar pendência não cria novo lançamento');
assert.equal(settled.settledCount, 1, 'conta pendência conciliada');
assert.equal(settled.transactions.length, existing.length, 'não aumenta quantidade de lançamentos ao baixar pendência');
assert.equal(settled.transactions.find(item => item.id === 'tx-pending').status, 'pago', 'altera o status da pendência para pago');
assert.equal(settled.transactions.find(item => item.id === 'tx-pending').importedId, 'fitid-gym', 'vincula ID do extrato à pendência baixada');

const duplicate = reconcileTransactions([{
  importedId: 'fitid-market', description: 'Mercado Central', amountCents: 12850,
  type: 'despesa', date: '2026-10-28', status: 'pago'
}], existing, { accountId: 'checking' })[0];
assert.equal(duplicate.reconciliationStatus, 'duplicate', 'reconhece ID de extrato já importado');
const duplicateApply = applyReconciliationDecisions({
  existingTransactions: existing,
  selectedItems: [{ ...duplicate, selected: true }],
  accountId: 'checking', createId: () => 'unused'
});
assert.equal(duplicateApply.addedCount, 0, 'nunca insere duplicata identificada');
assert.equal(duplicateApply.skippedCount, 1, 'registra duplicata como ignorada');

const sameBatch = reconcileTransactions([
  { importedId: 'same-fitid', description: 'Loja A', amountCents: 1234, type: 'despesa', date: '2026-10-28' },
  { importedId: 'same-fitid', description: 'Loja B', amountCents: 9999, type: 'despesa', date: '2026-10-28' }
], []);
assert.equal(sameBatch[1].reconciliationStatus, 'duplicate', 'detecta FITID repetido dentro do mesmo arquivo');

const ambiguous = reconcileTransactions([{
  importedId: 'fitid-new', description: 'Pagamento genérico', amountCents: 20000,
  type: 'despesa', date: '2026-10-28'
}], existing, { accountId: 'checking' })[0];
assert.equal(ambiguous.reconciliationStatus, 'review', 'encaminha correspondência de baixa confiança para revisão manual');
assert.equal(ambiguous.selected, undefined, 'heurística não seleciona itens automaticamente');
const exactPaid = reconcileTransactions([{ importedId: 'fitid-market', description: 'Mercado Central', amountCents: 12850, type: 'despesa', date: '2026-10-28' }], existing, { accountId: 'checking' })[0];
assert.equal(exactPaid.reconciliationStatus, 'duplicate', 'bloqueia somente quando o ID do extrato confirma a duplicata');

const invalid = reconcileTransactions([{
  importedId: 'invalid', description: 'Linha inválida', amountCents: 123,
  type: 'despesa', date: '2026-02-30'
}], [] )[0];
assert.equal(invalid.reconciliationStatus, 'invalid', 'rejeita transação com data de calendário inválida');

const scopedId = reconcileTransactions([{
  importedId: 'fitid-market', description: 'Mercado Central', amountCents: 12850,
  type: 'despesa', date: '2026-10-28'
}], existing, { accountId: 'other-account' })[0];
assert.equal(scopedId.reconciliationStatus, 'unique', 'não considera ID de extrato duplicado entre contas diferentes');

const unique = reconcileTransactions([{
  importedId: 'fitid-new-transaction', description: 'Livro comprado', amountCents: 4000,
  type: 'despesa', date: '2026-10-28', source: 'csv'
}], existing, { accountId: 'checking' })[0];
const added = applyReconciliationDecisions({
  existingTransactions: existing,
  selectedItems: [{ ...unique, selected: true }],
  accountId: 'checking', categoryId: 'books', profileType: 'PF',
  createId: () => 'tx-imported'
});
assert.equal(added.addedCount, 1, 'importa item novo escolhido pelo usuário');
assert.equal(added.transactions[0].id, 'tx-imported', 'atribui identificador ao novo lançamento');
assert.equal(added.transactions[0].source, 'csv', 'guarda a origem da importação');
assert.equal(sanitizeTransaction(added.transactions[0]).source, 'csv', 'preserva a origem da importação após sanitização');

const stale = applyReconciliationDecisions({
  existingTransactions: [{ ...existing[0], status: 'pago' }],
  selectedItems: [{ ...pending, selected: true }],
  accountId: 'checking', createId: () => 'unused'
});
assert.equal(stale.settledCount, 0, 'não baixa novamente uma pendência que mudou depois da análise');
assert.equal(stale.skippedCount, 1, 'ignora proposta de conciliação obsoleta');

const otherProfilePending = { id: 'pj-pending', description: 'Academia Mensal', amountCents: 8990, type: 'despesa', date: '2026-10-27', status: 'pendente', accountId: 'checking', categoryId: 'fitness', profileType: 'PJ' };
const protectedCrossProfile = applyReconciliationDecisions({
  existingTransactions: [existing[0], otherProfilePending],
  selectedItems: [{ ...pending, selected: true, matchedWithId: 'pj-pending' }],
  accountId: 'checking', profileType: 'PF', createId: () => 'unused'
});
assert.equal(protectedCrossProfile.settledCount, 0, 'não baixa pendência de outro perfil mesmo que o ID de correspondência seja forjado/obsoleto');
assert.equal(protectedCrossProfile.transactions.find(item => item.id === 'pj-pending').status, 'pendente', 'preserva a pendência do perfil empresarial');
assert.equal(protectedCrossProfile.skippedCount, 1, 'registra tentativa de baixa entre perfis como ignorada');

const duplicateOtherProfile = reconcileTransactions([{ importedId: 'fitid-pj', description: 'Mercado Central', amountCents: 12850, type: 'despesa', date: '2026-10-28' }], [
  { ...existing[1], importedId: 'fitid-pj', profileType: 'PJ' }
], { accountId: 'checking', profileType: 'PF' })[0];
assert.equal(duplicateOtherProfile.reconciliationStatus, 'unique', 'não marca duplicata com base em lançamento de outro perfil');

const invalidAccountScope = applyReconciliationDecisions({
  existingTransactions: [], selectedItems: [{ ...unique, selected: true }], accountId: 'pj-account', categoryId: 'cat-pf', profileType: 'PF',
  accounts: [{ id: 'pj-account', profileType: 'PJ' }], categories: [{ id: 'cat-pf', profileType: 'PF' }], createId: () => 'must-not-insert'
});
assert.equal(invalidAccountScope.addedCount, 0, 'não aceita conta de destino de perfil diferente');
assert.equal(invalidAccountScope.skippedCount, 1, 'conta de outro perfil é reportada como item ignorado');

const invalidCategoryScope = applyReconciliationDecisions({
  existingTransactions: [], selectedItems: [{ ...unique, selected: true, categoryId: 'cat-pj' }], accountId: 'pf-account', categoryId: 'cat-pj', profileType: 'PF',
  accounts: [{ id: 'pf-account', profileType: 'PF' }], categories: [{ id: 'cat-pj', profileType: 'PJ' }], createId: () => 'must-not-insert'
});
assert.equal(invalidCategoryScope.addedCount, 0, 'não aceita categoria de outro perfil');
assert.equal(invalidCategoryScope.skippedCount, 1, 'categoria de outro perfil é reportada como item ignorado');

console.log('Reconciliação segura: 29 verificações aprovadas.');
