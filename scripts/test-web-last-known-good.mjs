import assert from 'node:assert/strict';

const values = new Map();
let failSnapshotWrites = false;
const healthEvents = [];
globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) {
    if (failSnapshotWrites && key === 'razao_app_state_v3.last-known-good') {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    }
    values.set(key, String(value));
  },
  removeItem(key) { values.delete(key); },
  clear() { values.clear(); }
};
globalThis.window = { dispatchEvent(event) { healthEvents.push(event); return true; } };
const originalWarn = console.warn;
const originalError = console.error;
console.warn = () => {};
console.error = () => {};

const storage = await import('../src/services/storage.js');
const primaryKey = 'razao_app_state_v3';
const snapshotKey = storage.getLastKnownGoodKey();
const previousRestoreKey = storage.getPreRestoreBackupKey();
const stateA = { accounts: [{ id: 'a' }], transactions: [{ id: 'tx-a', amount: 100 }] };
const stateB = { accounts: [{ id: 'b' }], transactions: [{ id: 'tx-b', amount: 250 }] };

assert.equal(await storage.saveState(stateA), true);
assert.equal(await storage.saveState(stateB), true);
assert.equal(JSON.parse(values.get(snapshotKey)).raw, JSON.stringify(stateB), 'snapshot acompanha a última gravação confirmada');
assert.ok(healthEvents.some(event => event.type === 'razao:storage-health' && event.detail.message === ''), 'gravação confirmada limpa aviso anterior');
values.set(primaryKey, '{json quebrado');
assert.deepEqual(await storage.loadStateAsync(), stateB, 'estado corrompido recupera a última gravação confirmada');
assert.equal(values.get(primaryKey), JSON.stringify(stateB), 'recuperação restaura o arquivo principal');
console.log('✓ Estado Web corrompido recupera e regrava o último estado confirmado');

// A secondary snapshot can fail (e.g. quota exhausted) without falsely reporting
// that the primary financial save failed.
failSnapshotWrites = true;
const stateC = { accounts: [{ id: 'c' }], transactions: [{ id: 'tx-c', amount: 300 }] };
assert.equal(await storage.saveState(stateC), true, 'gravação principal permanece bem-sucedida quando só o snapshot falha');
assert.equal(values.get(primaryKey), JSON.stringify(stateC));
assert.equal(JSON.parse(values.get(snapshotKey)).raw, JSON.stringify(stateB), 'snapshot anterior permanece preservado');
assert.ok(healthEvents.some(event => event.type === 'razao:storage-health' && /cópia de recuperação não foi atualizada/.test(event.detail.message)), 'falha de snapshot emite aviso visível para a interface');
failSnapshotWrites = false;
values.set(primaryKey, 'corrompido novamente');
assert.deepEqual(await storage.loadStateAsync(), stateB, 'recuperação usa o último snapshot realmente confirmado');
console.log('✓ Falha ao atualizar snapshot preserva o último snapshot válido sem falso sucesso de recuperação');

// When the last-known-good copy is invalid, the pre-restore snapshot remains a
// secondary recovery path.
values.set(primaryKey, '{inválido');
values.set(snapshotKey, '{snapshot inválido');
values.set(previousRestoreKey, JSON.stringify({
  format: 'orazao-pre-restore-snapshot',
  createdAt: new Date().toISOString(),
  existed: true,
  raw: JSON.stringify(stateA)
}));
assert.deepEqual(await storage.loadStateAsync(), stateA, 'cópia pré-restauração funciona como alternativa');
console.log('✓ Cópia pré-restauração é usada apenas como segunda alternativa');

// If all copies are invalid, fail closed instead of returning an empty state.
values.set(primaryKey, '{inválido');
values.set(snapshotKey, '{snapshot inválido');
values.set(previousRestoreKey, '{cópia inválida');
assert.throws(() => storage.loadState(), /Falha ao carregar o estado local e recuperar cópias/);
console.log('✓ Falha de todas as cópias é explícita e não vira estado vazio');

// A JSON document can be syntactically valid yet contain a corrupt current-schema
// transaction. It must be rejected before sanitizeState can drop/repair the row.
const currentState = {
  version: 4, accounts: [{ id: 'strict-acc', initialBalanceCents: 0 }],
  cards: [], categories: [{ id: 'strict-cat', type: 'despesa' }], auditLog: [], budgets: {}, settings: {},
  transactions: [{ id: 'strict-tx', amountCents: 100, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'strict-acc', categoryId: 'strict-cat' }]
};
assert.equal(await storage.saveState(currentState), true, 'estado do schema atual e estruturalmente consistente pode ser salvo');
const corruptCurrent = { ...currentState, transactions: [{ ...currentState.transactions[0], amountCents: 1.5 }] };
values.set(primaryKey, JSON.stringify(corruptCurrent));
assert.deepEqual(await storage.loadStateAsync(), currentState, 'registro de schema atual inválido recupera último snapshot íntegro');
assert.equal(values.get(primaryKey), JSON.stringify(currentState), 'linha inválida é substituída apenas após recuperação confirmada');
console.log('✓ Estado JSON válido mas financeiramente inválido recupera a cópia confirmada antes da sanitização');

assert.equal(await storage.saveState(null), true, 'null é o marcador explícito de limpeza legado');
assert.equal(await storage.loadStateAsync(), null, 'limpeza explícita permanece vazia');
assert.equal(values.has(snapshotKey), false, 'limpeza explícita remove a cópia recuperável');
console.log('✓ Limpeza explícita não ressuscita dados pelo snapshot');
console.warn = originalWarn;
console.error = originalError;
console.log('Web last-known-good checks: 5 scenarios passed, 0 failed');
