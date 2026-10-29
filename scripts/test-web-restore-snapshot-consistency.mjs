import assert from 'node:assert/strict';

const values = new Map();
let failSnapshotWrites = false;
const events = [];
globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) {
    if (failSnapshotWrites && key === 'razao_app_state_v3.last-known-good') {
      const error = new Error('QuotaExceededError'); error.name = 'QuotaExceededError'; throw error;
    }
    values.set(key, String(value));
  },
  removeItem(key) { values.delete(key); },
  clear() { values.clear(); }
};
globalThis.window = { dispatchEvent(event) { events.push(event); return true; } };
const oldWarn = console.warn;
console.warn = () => {};

try {
  const storage = await import('../src/services/storage.js');
  const { localDb } = await import('../src/services/localDb.js');
  const primary = 'razao_app_state_v3';
  const snapshot = storage.getLastKnownGoodKey();
  const original = { accounts: [{ id: 'old' }], transactions: [{ id: 'old-tx', amount: 100 }] };
  const restored = { accounts: [{ id: 'restored' }], transactions: [{ id: 'restored-tx', amount: 9876 }] };

  assert.equal(await storage.saveState(original), true);
  const result = await storage.saveStateWithRecovery(restored);
  assert.equal(result.success, true, 'restauração é confirmada');
  assert.equal(result.recoverySnapshotUpdated, true, 'restauração atualiza o snapshot de último estado confirmado');
  assert.equal(JSON.parse(values.get(snapshot)).raw, JSON.stringify(restored));
  values.set(primary, '{corrompido');
  assert.deepEqual(await storage.loadStateAsync(), restored, 'corrupção após restauração recupera os dados restaurados, não o estado anterior');
  console.log('✓ Restauração atualiza last-known-good e não volta ao estado pré-restauração');

  values.clear();
  assert.equal(await localDb.saveState(original), true, 'adaptador de banco grava pela camada canônica');
  assert.equal(JSON.parse(values.get(snapshot)).raw, JSON.stringify(original), 'adaptador atualiza snapshot por meio da camada canônica');
  values.set(primary, '{corrompido');
  assert.deepEqual(await localDb.getState(), original, 'adaptador recupera usando a camada canônica');
  console.log('✓ RazaoLocalDatabase compartilha a camada de persistência e recuperação');

  values.set(primary, '{corrompido');
  values.set(snapshot, '{snapshot corrompido');
  values.set(storage.getPreRestoreBackupKey(), '{backup corrompido');
  await assert.rejects(() => localDb.getState(), /Falha ao carregar o estado local e recuperar cópias/, 'erro de leitura não pode virar null/estado vazio');
  console.log('✓ Erros de leitura do adaptador não são convertidos em banco vazio');

  values.clear();
  assert.equal(await storage.saveState(original), true);
  failSnapshotWrites = true;
  const degraded = await storage.saveStateWithRecovery(restored);
  assert.equal(degraded.success, true, 'estado restaurado principal permanece confirmado');
  assert.equal(degraded.recoverySnapshotUpdated, false, 'falha secundária é reportada separadamente');
  assert.match(degraded.recoveryWarning, /cópia do último estado confirmado não foi atualizada/);
  assert.equal(values.get(primary), JSON.stringify(restored));
  assert.equal(JSON.parse(values.get(snapshot)).raw, JSON.stringify(original), 'snapshot anterior não é falsamente declarado atualizado');
  assert.ok(events.some(event => /cópia do último estado confirmado não foi atualizada/.test(event.detail?.message || '')));
  console.log('✓ Falha de snapshot após restauração é reportada sem falsificar sucesso secundário');

  const invalidRestore = await storage.saveStateWithRecovery(null);
  assert.equal(invalidRestore.success, false, 'restauração de estado nulo é recusada');
  assert.match(invalidRestore.message, /objeto de estado válido/);
} finally {
  console.warn = oldWarn;
}
console.log('Web restore snapshot consistency: 4 scenarios passed, 0 failed');
