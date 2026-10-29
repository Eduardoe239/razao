import assert from 'node:assert/strict';
import { validateTransactionMutation } from '../src/domain/transactionMutationValidation.js';
const accounts = [
  { id: 'pf-account', profileType: 'PF' },
  { id: 'pj-account', profileType: 'PJ' },
  { id: 'pf-destination', profileType: 'PF' }
];
const cards = [{ id: 'pf-card', profileType: 'PF' }, { id: 'pj-card', profileType: 'PJ' }];
const categories = [{ id: 'pf-category', profileType: 'PF' }, { id: 'pj-category', profileType: 'PJ' }];
const base = { description: 'Compra de teste', amountCents: 1234, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'pf-account', categoryId: 'pf-category' };
const validate = (draft, profileType = 'PF') => validateTransactionMutation(draft, { accounts, cards, categories, profileType });
assert.equal(validate(base).valid, true, 'lançamento válido no perfil PF é aceito');
assert.equal(validate({ ...base, accountId: 'pj-account' }).valid, false, 'bloqueia conta PJ em lançamento PF');
assert.equal(validate({ ...base, categoryId: 'pj-category' }).valid, false, 'bloqueia categoria PJ em lançamento PF');
assert.equal(validate({ ...base, profileType: 'PJ' }).valid, false, 'bloqueia perfil embutido divergente');
assert.equal(validate({ ...base, amountCents: 12.5 }).valid, false, 'bloqueia fração de centavo antes da mutação');
assert.equal(validate({ ...base, amountCents: 0 }).valid, false, 'bloqueia valor zero no formulário de lançamento');
assert.equal(validate({ ...base, date: '2026-02-30' }).valid, false, 'bloqueia data inexistente');
assert.equal(validate({ ...base, linkedCardId: 'pj-card' }).valid, false, 'bloqueia cartão vinculado de outro perfil');
assert.equal(validate({ ...base, accountId: 'pf-card', type: 'despesa' }).valid, true, 'aceita cartão de origem no mesmo perfil quando o fluxo requer');
assert.equal(validate({ ...base, type: 'transferencia', toAccountId: 'pf-destination' }).valid, true, 'aceita destino de transferência no mesmo perfil');
assert.equal(validate({ ...base, type: 'transferencia', toAccountId: 'pj-account' }).valid, false, 'bloqueia destino de transferência de outro perfil');
assert.equal(validate({ ...base, type: 'transferencia', toAccountId: 'pf-account' }).valid, false, 'bloqueia transferência para a própria origem');
console.log('Transaction mutation guard: 12 assertions passed, 0 failed');
