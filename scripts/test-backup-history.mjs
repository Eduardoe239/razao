import assert from 'node:assert/strict';
import { listLocalBackupHistory, loadLocalBackup, recordLocalBackup } from '../src/services/backupHistory.js';
import { getInitialState } from '../src/domain/sanitize.js';
import { createBackup } from '../src/domain/backup.js';
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}
globalThis.localStorage = new MemoryStorage();
const state = getInitialState();
let result = recordLocalBackup(state, 'Cópia de teste');
assert.equal(result.saved, true);
let list = listLocalBackupHistory();
assert.equal(list.length, 1);
assert.equal(list[0].valid, true);
assert.equal(list[0].label, 'Cópia de teste');
const loaded = loadLocalBackup(list[0].id);
assert.equal(loaded.state.accounts.length, state.accounts.length);
assert.equal(loaded.state.transactions.length, state.transactions.length);
for (let i = 0; i < 7; i += 1) recordLocalBackup({ ...state, userProfile: { name: `Usuário ${i}` } }, `Cópia ${i}`);
list = listLocalBackupHistory();
assert.equal(list.length, 5, 'histórico limita retenção a cinco cópias');
assert.equal(list[0].label, 'Cópia 6');
assert.throws(() => loadLocalBackup('id-inexistente'), /não existe mais/);
// Corrupted/oversized catalogs must not cause unbounded parsing or unbounded UI entries.
localStorage.setItem('razao_backup_history_v1', '{');
assert.throws(() => listLocalBackupHistory(), /corrompido.*preservado/);
const corruptCatalog = localStorage.getItem('razao_backup_history_v1');
assert.equal(recordLocalBackup(state, 'Não sobrescrever corrupção').saved, false, 'falha de catálogo impede gravação posterior');
assert.equal(localStorage.getItem('razao_backup_history_v1'), corruptCatalog, 'catálogo corrompido deve permanecer intacto');
localStorage.setItem('razao_backup_history_v1', 'x'.repeat(3 * 1024 * 1024 + 1));
assert.throws(() => listLocalBackupHistory(), /excede o limite/);
const oversizedCatalog = localStorage.getItem('razao_backup_history_v1');
assert.equal(recordLocalBackup(state, 'Não sobrescrever catálogo grande').saved, false);
assert.equal(localStorage.getItem('razao_backup_history_v1'), oversizedCatalog, 'catálogo acima do limite deve permanecer intacto');
localStorage.setItem('razao_backup_history_v1', JSON.stringify(Array.from({ length: 7 }, (_, i) => ({ id: `catalog-${i}`, createdAt: new Date().toISOString(), backupText: JSON.stringify(createBackup(state)), label: `Cópia ${i}` }))));
assert.equal(listLocalBackupHistory().length, 5, 'catálogo local não deve renderizar mais de cinco itens mesmo se estiver adulterado');
console.log('Backup history tests: 15 assertions passed, 0 failed');
