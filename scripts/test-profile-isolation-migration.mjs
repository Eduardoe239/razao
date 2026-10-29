import assert from 'node:assert/strict';
import { entitiesForProfile, migrateProfileScopedEntities } from '../src/domain/profileIsolation.js';
import { validateStateStructure } from '../src/domain/stateValidation.js';

const legacy = {
  accounts: [{ id: 'acc-1', name: 'Conta principal', initialBalanceCents: 50000 }],
  categories: [{ id: 'cat-1', name: 'Operacional', type: 'despesa' }],
  cards: [{ id: 'card-1', name: 'Cartão principal' }],
  transactions: [
    { id: 'tx-pf', profileType: 'PF', accountId: 'acc-1', categoryId: 'cat-1' },
    { id: 'tx-pj', profileType: 'PJ', accountId: 'acc-1', categoryId: 'cat-1', toAccountId: 'card-1', linkedCardId: 'card-1' }
  ],
  recurring: [{ id: 'rec-pj', profileType: 'PJ', accountId: 'acc-1', categoryId: 'cat-1' }],
  budgets: { 'cat-1:2026-10': 25000 }
};

const migrated = migrateProfileScopedEntities(legacy);
const pjTransaction = migrated.transactions.find(item => item.id === 'tx-pj');
const pfTransaction = migrated.transactions.find(item => item.id === 'tx-pf');
assert.equal(pfTransaction.accountId, 'acc-1');
assert.equal(pfTransaction.categoryId, 'cat-1');
assert.notEqual(pjTransaction.accountId, 'acc-1');
assert.notEqual(pjTransaction.categoryId, 'cat-1');
assert.notEqual(pjTransaction.linkedCardId, 'card-1');
assert.equal(pjTransaction.toAccountId, 'card-1', 'a referência de conta não deve ser reescrita só porque existe cartão com o mesmo ID');
assert.equal(migrated.recurring[0].accountId, pjTransaction.accountId);
assert.equal(migrated.recurring[0].categoryId, pjTransaction.categoryId);
assert.equal(entitiesForProfile(migrated.accounts, 'PF').length, 1);
assert.equal(entitiesForProfile(migrated.accounts, 'PJ').length, 1);
assert.equal(entitiesForProfile(migrated.categories, 'PF').length, 1);
assert.equal(entitiesForProfile(migrated.categories, 'PJ').length, 1);
assert.equal(entitiesForProfile(migrated.cards, 'PF').length, 1);
assert.equal(entitiesForProfile(migrated.cards, 'PJ').length, 1);
assert.equal(migrated.budgets['cat-1:2026-10'], 25000, 'orçamento PF legado deve ser preservado');

const migratedAgain = migrateProfileScopedEntities(migrated);
assert.equal(migratedAgain.accounts.length, migrated.accounts.length, 'migração repetida não deve duplicar contas');
assert.equal(migratedAgain.categories.length, migrated.categories.length, 'migração repetida não deve duplicar categorias');
assert.equal(migratedAgain.cards.length, migrated.cards.length, 'migração repetida não deve duplicar cartões');
assert.equal(migratedAgain.transactions.find(item => item.id === 'tx-pj').accountId, pjTransaction.accountId);

const legacyInvoicePayment = migrateProfileScopedEntities({
  accounts: [{ id: 'bank-1', name: 'Conta', profileType: 'PJ' }],
  categories: [], cards: [{ id: 'card-legacy', name: 'Cartão' }],
  transactions: [{ id: 'invoice-payment', type: 'transferencia', status: 'pago', profileType: 'PJ', accountId: 'bank-1', toAccountId: 'card-legacy', linkedInvoiceKey: '2026-10' }],
  recurring: []
});
assert.equal(legacyInvoicePayment.transactions[0].toAccountId, 'card-legacy__PJ', 'pagamento legado deve apontar para o cartão PJ clonado');

const ordinaryTransfer = migrateProfileScopedEntities({
  accounts: [{ id: 'account-dest', name: 'Conta PF' }],
  categories: [], cards: [{ id: 'account-dest', name: 'Cartão com ID coincidente' }],
  transactions: [{ id: 'transfer', type: 'transferencia', profileType: 'PJ', accountId: 'source', toAccountId: 'account-dest', date: '2026-10-01' }],
  recurring: []
});
assert.equal(ordinaryTransfer.transactions[0].toAccountId, 'account-dest__PJ', 'transferência comum deve preservar referência à conta de destino, não ao cartão');

const mixed = migrateProfileScopedEntities({
  accounts: [{ id: 'acc-x', profileType: 'PJ' }],
  categories: [], cards: [],
  transactions: [{ id: 'tx-x', accountId: 'acc-x' }],
  recurring: []
});
assert.equal(mixed.transactions[0].profileType, 'PF', 'lançamentos legados sem perfil devem ser classificados como PF');
assert.equal(entitiesForProfile(mixed.accounts, 'PJ').length, 1, 'entidade PJ explicitamente marcada deve permanecer PJ');
assert.notEqual(mixed.transactions[0].accountId, 'acc-x', 'referência PF deve ser redirecionada para uma conta PF clonada');
assert.equal(entitiesForProfile(mixed.accounts, 'PF').length, 1, 'a cópia PF da conta incompatível deve ser criada');
assert.equal(migrateProfileScopedEntities(mixed).accounts.length, mixed.accounts.length, 'a correção de perfil deve ser idempotente');

const reverseMismatch = migrateProfileScopedEntities({
  version: 4, schemaVersion: 4,
  accounts: [{ id: 'a-pj', profileType: 'PJ', initialBalanceCents: 0 }],
  categories: [{ id: 'c-pj', profileType: 'PJ', type: 'despesa', name: 'Operação' }],
  cards: [{ id: 'card-pj', profileType: 'PJ', limitCents: 1000 }],
  transactions: [{ id: 'tx-pf-explicit', profileType: 'PF', type: 'despesa', status: 'pago', amountCents: 100, date: '2026-10-28', accountId: 'a-pj', categoryId: 'c-pj', linkedCardId: 'card-pj' }],
  recurring: [{ id: 'rec-pf-explicit', profileType: 'PF', type: 'despesa', amountCents: 100, dayOfMonth: 15, active: true, accountId: 'a-pj', categoryId: 'c-pj' }],
  budgets: {}, auditLog: [], settings: {}
});
const repairedTx = reverseMismatch.transactions[0];
const repairedRecurring = reverseMismatch.recurring[0];
assert.notEqual(repairedTx.accountId, 'a-pj', 'referência de conta PF não pode continuar apontando para entidade PJ');
assert.notEqual(repairedTx.categoryId, 'c-pj', 'referência de categoria PF não pode continuar apontando para entidade PJ');
assert.notEqual(repairedTx.linkedCardId, 'card-pj', 'cartão PJ deve ser clonado para o perfil PF');
assert.equal(reverseMismatch.accounts.find(item => item.id === 'a-pj').profileType, 'PJ', 'entidade PJ original deve permanecer íntegra');
assert.equal(reverseMismatch.accounts.find(item => item.id === repairedTx.accountId).profileType, 'PF', 'conta clonada deve pertencer a PF');
assert.equal(reverseMismatch.categories.find(item => item.id === repairedTx.categoryId).profileType, 'PF', 'categoria clonada deve pertencer a PF');
assert.equal(reverseMismatch.cards.find(item => item.id === repairedTx.linkedCardId).profileType, 'PF', 'cartão clonado deve pertencer a PF');
assert.equal(repairedRecurring.accountId, repairedTx.accountId, 'recorrência deve reutilizar a conta clonada');
assert.equal(repairedRecurring.categoryId, repairedTx.categoryId, 'recorrência deve reutilizar a categoria clonada');
const strictValidation = validateStateStructure(reverseMismatch, { requireCurrentSchema: true, allowProfileMigration: false });
assert.equal(strictValidation.valid, true, `resultado migrado deve passar no validador estrito: ${strictValidation.issues.join('; ')}`);
const reverseAgain = migrateProfileScopedEntities(reverseMismatch);
assert.equal(reverseAgain.accounts.length, reverseMismatch.accounts.length, 'migração reversa repetida não deve gerar clones extras');
assert.equal(reverseAgain.categories.length, reverseMismatch.categories.length, 'repetir migração não deve criar categorias extras');
assert.equal(reverseAgain.cards.length, reverseMismatch.cards.length, 'repetir migração não deve criar cartões extras');
const malformedPreserved = migrateProfileScopedEntities({ accounts: [null], categories: [], cards: [], transactions: [null], recurring: [] });
assert.equal(malformedPreserved.accounts[0], null, 'migrador não pode apagar silenciosamente entidade inválida antes do validador');
assert.equal(malformedPreserved.transactions[0], null, 'migrador não pode apagar silenciosamente lançamento inválido antes do validador');
const invoiceIdCollision = migrateProfileScopedEntities({
  accounts: [{ id: 'same-id', profileType: 'PJ' }],
  categories: [], cards: [{ id: 'same-id', profileType: 'PJ' }],
  transactions: [{ id: 'pay-pf', profileType: 'PF', type: 'transferencia', status: 'pago', amountCents: 100, date: '2026-10-28', accountId: 'account-pf', toAccountId: 'same-id', linkedInvoiceKey: '2026-10', linkedCardId: 'same-id' }], recurring: []
});
assert.equal(invoiceIdCollision.transactions[0].toAccountId, 'same-id__PF', 'destino de pagamento de fatura deve seguir o cartão em colisão de IDs');
assert.equal(invoiceIdCollision.transactions[0].linkedCardId, 'same-id__PF', 'vínculo explícito do cartão deve usar o mesmo clone PF');
assert.equal(invoiceIdCollision.accounts.find(item => item.id === 'same-id').profileType, 'PJ', 'conta PJ de ID coincidente não deve ser usada como destino da fatura');
assert.equal(entitiesForProfile(invoiceIdCollision.cards, 'PF').length, 1, 'deve existir exatamente um cartão clonado para o perfil PF');

console.log('Profile isolation migration: 40 assertions passed, 0 failed');
