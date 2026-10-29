import assert from 'node:assert/strict';
import { validateStateStructure } from '../src/domain/stateValidation.js';

const validState = {
  version: 4,
  accounts: [{ id: 'acc-1', initialBalanceCents: 10000 }],
  cards: [{ id: 'card-1' }],
  categories: [{ id: 'cat-1', type: 'despesa' }],
  transactions: [{ id: 'tx-1', amountCents: 1250, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'acc-1', categoryId: 'cat-1' }],
  auditLog: []
};
assert.equal(validateStateStructure(validState).valid, true);
assert.equal(validateStateStructure({ ...validState, schemaVersion: 4 }).valid, true, 'versões explícitas alinhadas são aceitas');
assert.equal(validateStateStructure({ ...validState, schemaVersion: 3 }).valid, false, 'schemaVersion conflitante com version deve ser recusado');
assert.equal(validateStateStructure({ ...validState, schemaVersion: 99 }).valid, false, 'schema futuro não suportado deve ser recusado sem downgrade');
assert.equal(validateStateStructure({ ...validState, schemaVersion: '4' }).valid, false, 'schema precisa ser número inteiro e não string coercível');
assert.equal(validateStateStructure({ ...validState, transactions: [{ ...validState.transactions[0], amountCents: 1.5 }] }).valid, false, 'valor fracionário de centavos deve ser recusado');
assert.equal(validateStateStructure({ ...validState, transactions: [{ ...validState.transactions[0], date: '2026-02-30' }] }).valid, false, 'data impossível deve ser recusada');
assert.equal(validateStateStructure({ ...validState, transactions: [{ ...validState.transactions[0], accountId: 'missing-account' }] }).valid, false, 'referência de conta inválida deve ser recusada');
assert.equal(validateStateStructure({ ...validState, transactions: [validState.transactions[0], validState.transactions[0]] }).valid, false, 'ID de lançamento duplicado deve ser recusado');
assert.equal(validateStateStructure({ ...validState, transactions: [{ ...validState.transactions[0], type: 'transferencia', toAccountId: 'acc-1' }] }).valid, false, 'transferência com mesmo destino e origem deve ser recusada');
assert.equal(validateStateStructure({ version: 3, userProfile: { name: 'Legado' } }).valid, true, 'schema legado continua migrável pelo caminho de compatibilidade');
assert.equal(validateStateStructure({ ...validState, recurring: [{ id: 'r-1', description: 'Conta fixa', amountCents: 10000, type: 'despesa', dayOfMonth: 31, active: true, accountId: 'missing-account' }] }).valid, false, 'recorrência com conta inexistente deve ser recusada');
assert.equal(validateStateStructure({ ...validState, recurring: [{ id: 'r-1', description: 'Conta fixa', amountCents: 10000 }, { id: 'r-1', description: 'Duplicada', amountCents: 10000 }] }).valid, false, 'IDs de recorrência duplicados devem ser recusados');
assert.equal(validateStateStructure({ ...validState, budgets: { 'PF:cat-1:2026-10': 1.5 } }).valid, false, 'orçamento não pode armazenar frações de centavo');
assert.equal(validateStateStructure({ ...validState, budgets: [] }).valid, false, 'orçamentos devem ser um mapa, não um array');
const mixedProfiles = { ...validState, accounts: [{ id: 'acc-1', profileType: 'PF', initialBalanceCents: 10000 }], transactions: [{ ...validState.transactions[0], profileType: 'PJ' }] };
assert.equal(validateStateStructure(mixedProfiles).valid, false, 'transação cruzando PF/PJ deve ser recusada na gravação final');
assert.equal(validateStateStructure(mixedProfiles, { allowProfileMigration: true }).valid, true, 'mismatch legado deve passar pela validação estrutural para a migração explícita de perfil');
const wrongLinkedCard = { ...validState, transactions: [{ ...validState.transactions[0], linkedCardId: 'missing-card' }] };
assert.equal(validateStateStructure(wrongLinkedCard).valid, false, 'referência de cartão vinculado inexistente deve ser recusada');
assert.equal(validateStateStructure({ ...validState, cards: [{ id: 'card-1', limitCents: 1.5 }] }).valid, false, 'limite de cartão precisa estar em centavos inteiros');
const transferCrossProfile = { ...validState, accounts: [{ id: 'acc-1', profileType: 'PJ', initialBalanceCents: 10000 }, { id: 'acc-2', profileType: 'PF', initialBalanceCents: 0 }], transactions: [{ ...validState.transactions[0], type: 'transferencia', toAccountId: 'acc-2', profileType: 'PJ' }] };
assert.equal(validateStateStructure(transferCrossProfile).valid, false, 'transferência entre perfis PF/PJ deve ser recusada na gravação final');
assert.equal(validateStateStructure(transferCrossProfile, { allowProfileMigration: true }).valid, true, 'referência de destino legada deve poder ser reescrita pela migração explícita de perfil');
const ordinaryTransferToCard = { ...validState, transactions: [{ ...validState.transactions[0], type: 'transferencia', toAccountId: 'card-1' }] };
assert.equal(validateStateStructure(ordinaryTransferToCard).valid, false, 'transferência comum não pode usar cartão como conta de destino');
const invoicePaymentToCard = { ...validState, transactions: [{ ...validState.transactions[0], type: 'transferencia', toAccountId: 'card-1', linkedInvoiceKey: '2026-10', linkedCardId: 'card-1' }] };
assert.equal(validateStateStructure(invoicePaymentToCard).valid, true, 'quitação de fatura pode apontar para o cartão vinculado');
const invoicePaymentToAccount = { ...validState, transactions: [{ ...validState.transactions[0], type: 'transferencia', toAccountId: 'acc-2', linkedInvoiceKey: '2026-10', linkedCardId: 'card-1' }], accounts: [...validState.accounts, { id: 'acc-2' }] };
assert.equal(validateStateStructure(invoicePaymentToAccount).valid, false, 'quitação de fatura não pode declarar conta bancária como destino de cartão');
console.log('State validation: 24 assertions passed, 0 failed');
