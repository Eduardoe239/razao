import assert from 'node:assert/strict';
import { saveState, saveStateWithRecovery, loadStateAsync, getPreRestoreBackupKey } from '../src/services/storage.js';

class MemoryStorage {
  constructor(seed = {}) { this.map = new Map(Object.entries(seed)); this.failKey = null; this.failCount = 0; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) {
    if (this.failKey === key && this.failCount > 0) { this.failCount -= 1; throw new Error('simulated quota/write failure'); }
    this.map.set(key, String(value));
  }
  removeItem(key) { this.map.delete(key); }
}

const priorState = JSON.stringify({ accounts: [{ id: 'old-account' }], transactions: [{ id: 'old-tx' }] });
const nextState = { accounts: [{ id: 'new-account' }], transactions: [{ id: 'new-tx' }] };
const storage = new MemoryStorage({ razao_app_state_v3: priorState });
globalThis.localStorage = storage;
globalThis.window = {};

let result = await saveStateWithRecovery(nextState);
assert.equal(result.success, true);
assert.equal(result.recoverySnapshotCreated, true);
assert.deepEqual(JSON.parse(storage.getItem('razao_app_state_v3')).accounts[0].id, 'new-account');
const recovery = JSON.parse(storage.getItem(getPreRestoreBackupKey()));
assert.equal(recovery.existed, true);
assert.equal(recovery.raw, priorState);
console.log('✓ Estado anterior é salvo em snapshot antes de aplicar a restauração');

storage.setItem('razao_app_state_v3', priorState);
storage.failKey = 'razao_app_state_v3';
storage.failCount = 1;
result = await saveStateWithRecovery(nextState);
assert.equal(result.success, false);
assert.equal(result.rolledBack, true);
assert.equal(storage.getItem('razao_app_state_v3'), priorState);
assert.equal(result.recoverySnapshotCreated, true);
console.log('✓ Falha na gravação preserva e recupera o estado anterior');

const noSnapshot = new MemoryStorage({ razao_app_state_v3: priorState });
noSnapshot.failKey = getPreRestoreBackupKey();
noSnapshot.failCount = 1;
globalThis.localStorage = noSnapshot;
result = await saveStateWithRecovery(nextState);
assert.equal(result.success, false);
assert.equal(result.recoverySnapshotCreated, false);
assert.equal(noSnapshot.getItem('razao_app_state_v3'), priorState);
console.log('✓ Se não for possível criar backup prévio, restauração aborta sem tocar nos dados');

const rollbackFailStorage = new MemoryStorage({ razao_app_state_v3: priorState });
// Cause the first save to fail and a subsequent rollback write to fail too.
// localStorage.setItem is atomic in the browser, so the original key remains intact.
rollbackFailStorage.failKey = 'razao_app_state_v3';
rollbackFailStorage.failCount = 1;
globalThis.localStorage = rollbackFailStorage;
result = await saveStateWithRecovery(nextState);
assert.equal(result.success, false);
assert.equal(rollbackFailStorage.getItem('razao_app_state_v3'), priorState);
console.log('✓ Escrita de estado falha de modo seguro sem alterar o valor original');

// Desktop: never fall back to browser storage if the native recovery transaction is missing.
globalThis.window = { electronAPI: { isDesktop: true } };
globalThis.localStorage = new MemoryStorage({ razao_app_state_v3: priorState });
result = await saveStateWithRecovery(nextState);
assert.equal(result.success, false);
assert.equal(result.recoverySnapshotCreated, false);
assert.match(result.message, /desktop/i);
console.log('✓ Desktop sem API transacional falha fechado, sem fallback para localStorage');

// Desktop native response must be checked rather than treating any resolved IPC as success.
globalThis.window = { electronAPI: { isDesktop: true, saveState: async () => ({ success: false }) } };
assert.equal(await saveState(nextState), false);
globalThis.window = { electronAPI: { isDesktop: true, saveState: async () => ({ success: true }) } };
assert.equal(await saveState(nextState), true);
console.log('✓ Persistência desktop exige confirmação explícita de sucesso');

globalThis.window = { electronAPI: { isDesktop: true, restoreStateWithRecovery: async () => ({ success: false, rolledBack: true, recoverySnapshotCreated: true, message: 'rollback confirmado' }) } };
result = await saveStateWithRecovery(nextState);
assert.equal(result.success, false);
assert.equal(result.rolledBack, true);
console.log('✓ Resultado transacional nativo é propagado à interface');

// Recovery snapshot is used only when active browser state is unreadable.
const recoverable = new MemoryStorage({
  razao_app_state_v3: '{broken json',
  [getPreRestoreBackupKey()]: JSON.stringify({ format: 'orazao-pre-restore-snapshot', createdAt: new Date().toISOString(), existed: true, raw: priorState })
});
globalThis.window = {};
globalThis.localStorage = recoverable;
const loaded = await loadStateAsync();
assert.equal(loaded.accounts[0].id, 'old-account');
assert.equal(recoverable.getItem('razao_app_state_v3'), priorState);
console.log('✓ Leitura recupera snapshot anterior quando o estado ativo está corrompido');

const unrecoverable = new MemoryStorage({ razao_app_state_v3: '{broken json' });
globalThis.localStorage = unrecoverable;
await assert.rejects(() => loadStateAsync(), /Falha ao carregar o estado local e recuperar/);
console.log('✓ Estado corrompido sem snapshot gera erro e falha fechado');



// A pending desktop save must finish before the restore transaction begins.
let releaseInitialSave;
let restoreStarted = false;
globalThis.window = {
  electronAPI: {
    isDesktop: true,
    saveState: () => new Promise(resolve => { releaseInitialSave = resolve; }),
    restoreStateWithRecovery: async () => { restoreStarted = true; return { success: true, rolledBack: false, recoverySnapshotCreated: true }; }
  }
};
const pendingSave = saveState(nextState);
const pendingRestore = saveStateWithRecovery({ accounts: [], transactions: [] });
await Promise.resolve();
assert.equal(restoreStarted, false);
releaseInitialSave({ success: true });
assert.equal(await pendingSave, true);
assert.equal((await pendingRestore).success, true);
assert.equal(restoreStarted, true);
console.log('✓ Gravação desktop em andamento termina antes de iniciar a restauração');

console.log('Restore recovery tests: 10 scenarios passed, 0 failed');
