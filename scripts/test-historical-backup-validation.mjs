import assert from 'node:assert/strict';
import { createBackup, validateHistoricalBackupState } from '../src/domain/backup.js';

const state = {
  version: 4,
  accounts: [{ id: 'acc-1', name: 'Conta principal', initialBalanceCents: 0 }],
  transactions: [{ id: 'tx-1', description: 'Mercado', amountCents: 1250, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'acc-1', categoryId: 'cat-1' }],
  categories: [{ id: 'cat-1', name: 'Alimentação', type: 'despesa' }],
  cards: [], auditLog: [], budgets: {}, settings: {}
};

const valid = validateHistoricalBackupState(state, '2026-10-28T12:00:00.000Z');
assert.equal(valid.valid, true, 'estado histórico válido deve ser aceito');
assert.equal(valid.state.transactions.length, 1);

const duplicate = structuredClone(state);
duplicate.transactions.push({ ...duplicate.transactions[0] });
const duplicateResult = validateHistoricalBackupState(duplicate);
assert.equal(duplicateResult.valid, false, 'IDs de lançamento duplicados devem ser rejeitados');
assert.ok(duplicateResult.issues.some(issue => issue.includes('duplicados')));

const invalidRef = structuredClone(state);
invalidRef.transactions[0].accountId = 'conta-inexistente';
const invalidRefResult = validateHistoricalBackupState(invalidRef);
assert.equal(invalidRefResult.valid, false, 'referências a contas inexistentes devem ser rejeitadas');
assert.ok(invalidRefResult.issues.some(issue => issue.includes('inexistente')));

const invalidAmount = structuredClone(state);
invalidAmount.transactions[0].amountCents = 1.25;
assert.equal(validateHistoricalBackupState(invalidAmount).valid, false, 'valores não inteiros em centavos devem ser rejeitados');

assert.equal(validateHistoricalBackupState({ accounts: [], transactions: [] }).valid, false, 'estado sem categorias deve ser rejeitado');
assert.equal(validateHistoricalBackupState(state, 'data-inválida').valid, true, 'data de catálogo inválida deve usar data atual para envelope transitório');
assert.equal(validateHistoricalBackupState(null).valid, false, 'estado ausente deve ser rejeitado');

const duplicateCategory = structuredClone(state);
duplicateCategory.categories.push({ ...duplicateCategory.categories[0] });
assert.equal(validateHistoricalBackupState(duplicateCategory).valid, false, 'IDs de categoria duplicados devem ser recusados antes da sanitização');

const duplicateCard = structuredClone(state);
duplicateCard.cards = [{ id: 'card-1' }, { id: 'card-1' }];
assert.equal(validateHistoricalBackupState(duplicateCard).valid, false, 'IDs de cartão duplicados devem ser recusados antes da sanitização');

const missingSource = structuredClone(state);
missingSource.transactions[0].accountId = '';
assert.equal(validateHistoricalBackupState(missingSource).valid, false, 'referência de origem vazia deve ser recusada');


console.log('Historical backup validation: 10 assertions passed, 0 failed');
