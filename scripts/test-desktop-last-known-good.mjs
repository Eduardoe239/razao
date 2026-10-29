import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// Loads the real Electron main process with controlled Electron APIs. Filesystem,
// IPC handlers, serialization, atomic writes and recovery logic remain real.
const require = createRequire(import.meta.url);
const Module = require('node:module');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'razao-last-good-'));
const handlers = new Map();
const ipcMain = {
  handle(name, fn) { handlers.set(name, fn); },
  on() {}
};
const app = {
  isPackaged: false,
  getPath(name) { assert.equal(name, 'userData'); return tempRoot; },
  getVersion() { return '1.22.0-beta.13'; },
  getName() { return 'O Razão'; },
  whenReady() { return { then() {} }; },
  on() {},
  quit() {}
};
const safeStorage = {
  isEncryptionAvailable() { return true; },
  encryptString(value) { return Buffer.from(value, 'utf8'); },
  decryptString(value) { return Buffer.from(value).toString('utf8'); }
};
class BrowserWindow {}
BrowserWindow.getAllWindows = () => [];
const electronStub = { app, BrowserWindow, ipcMain, dialog: {}, shell: {}, safeStorage };
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'electron') return electronStub;
  return originalLoad.call(this, request, parent, isMain);
};
try {
  require('../electron/main.cjs');
} finally {
  Module._load = originalLoad;
}

const event = { senderFrame: { url: 'http://127.0.0.1:5173' } };
const call = (name, ...args) => {
  const handler = handlers.get(name);
  assert.equal(typeof handler, 'function', `handler ${name} foi registrado`);
  return handler(event, ...args);
};
const dataDir = path.join(tempRoot, 'RazaoData');
const active = path.join(dataDir, 'razao_app_db.enc');
const latest = path.join(dataDir, 'razao_app_db.last-known-good.enc');
const makeState = (accountId, transactionId) => ({
  version: 4, schemaVersion: 4,
  accounts: [{ id: accountId, initialBalanceCents: 0, profileType: 'PF' }],
  cards: [], categories: [{ id: `cat-${accountId}`, name: 'Geral', type: 'despesa', profileType: 'PF' }],
  transactions: [{ id: transactionId, description: 'Fixture de teste', amountCents: 100, type: 'despesa', status: 'pago', date: '2026-10-28', accountId, categoryId: `cat-${accountId}`, profileType: 'PF' }],
  recurring: [], auditLog: [], budgets: {}, settings: {}
});
const first = makeState('account-1', 'tx-1');
const second = makeState('account-2', 'tx-2');
const restored = makeState('account-restored', 'tx-restored');

try {
  let result = await call('desktop:saveState', first);
  assert.equal(result.success, true);
  assert.equal(result.recoverySnapshotUpdated, true);
  assert.equal(fs.existsSync(latest), true, 'primeira gravação gera cópia do último estado confirmado');
  const primaryBeforeRejectedWrite = fs.readFileSync(active, 'utf8');
  await assert.rejects(() => call('desktop:saveState', { accounts: [{ id: 'broken-account' }] }), /listas de contas e lançamentos/);
  assert.equal(fs.readFileSync(active, 'utf8'), primaryBeforeRejectedWrite, 'payload estruturalmente incompleto não altera o estado ativo');
  console.log('✓ Payload incompleto é rejeitado antes de substituir o estado confirmado');

  // Simulate a secondary-snapshot write failure while ensuring that the primary
  // financial save is still reported truthfully as successful.
  fs.unlinkSync(latest);
  fs.mkdirSync(latest);
  result = await call('desktop:saveState', second);
  assert.equal(result.success, true, 'falha no snapshot secundário não deve mascarar a gravação principal');
  assert.equal(result.recoverySnapshotUpdated, false);
  assert.match(result.recoveryWarning, /cópia de recuperação não pôde ser atualizada/);
  assert.equal(JSON.parse(Buffer.from(fs.readFileSync(active, 'utf8'), 'base64').toString('utf8')).state.transactions[0].id, 'tx-2');
  fs.rmdirSync(latest);
  result = await call('desktop:saveState', second);
  assert.equal(result.success, true);
  assert.equal(result.recoverySnapshotUpdated, true);
  fs.writeFileSync(active, '{arquivo principal corrompido');
  let loaded = await call('desktop:loadState');
  assert.equal(loaded.transactions[0].id, 'tx-2', 'corrupção recupera o estado salvo mais recente, não o estado inicial');
  assert.doesNotMatch(fs.readFileSync(active, 'utf8'), /arquivo principal corrompido/);
  console.log('✓ Falha no snapshot secundário não mascara a gravação e a corrupção recupera o último estado confirmado');

  fs.unlinkSync(active);
  loaded = await call('desktop:loadState');
  assert.equal(loaded.transactions[0].id, 'tx-2', 'arquivo principal ausente não deve parecer uma instalação vazia');
  console.log('✓ Arquivo principal ausente recupera o último estado confirmado em vez de iniciar vazio');

  result = await call('desktop:restoreStateWithRecovery', restored);
  assert.equal(result.success, true);
  assert.equal(result.recoverySnapshotCreated, true);
  assert.equal(result.recoverySnapshotUpdated, true);
  fs.writeFileSync(active, 'corrupção após restauração');
  loaded = await call('desktop:loadState');
  assert.equal(loaded.transactions[0].id, 'tx-restored', 'recovery prioritiza o último estado restaurado confirmado');
  console.log('✓ Uma restauração bem-sucedida atualiza o snapshot recente sem perder a cópia pré-restauração');

  const backups = await call('desktop:listRecoveryBackups');
  assert.ok(backups.some(item => item.id === 'razao_app_db.last-known-good.enc' && item.valid));
  assert.ok(backups.some(item => item.id.startsWith('razao_app_db.pre-restore-') && item.valid));
  const exported = await call('desktop:loadRecoveryBackup', 'razao_app_db.last-known-good.enc');
  assert.equal(exported.state.transactions[0].id, 'tx-restored');
  assert.throws(() => call('desktop:loadRecoveryBackup', '../razao_app_db.enc'), /Identificador de backup inválido/);
  console.log('✓ Gerenciador lista e carrega a cópia recente e mantém validação do identificador de arquivo');

  const strictState = {
    version: 4, schemaVersion: 4,
    accounts: [{ id: 'strict-account', initialBalanceCents: 0 }],
    cards: [], categories: [{ id: 'strict-category', type: 'despesa' }], auditLog: [], budgets: {}, settings: {},
    transactions: [{ id: 'strict-transaction', amountCents: 1234, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'strict-account', categoryId: 'strict-category' }]
  };
  result = await call('desktop:saveState', strictState);
  assert.equal(result.success, true);
  const badState = { ...strictState, transactions: [{ ...strictState.transactions[0], amountCents: 12.34 }] };
  const activeBeforeRejectedRestore = fs.readFileSync(active, 'utf8');
  const rejectedRestore = await call('desktop:restoreStateWithRecovery', badState);
  assert.equal(rejectedRestore.success, false, 'restauração de schema atual inválido precisa falhar fechado');
  assert.equal(fs.readFileSync(active, 'utf8'), activeBeforeRejectedRestore, 'restauração inválida não altera o arquivo principal');
  fs.writeFileSync(active, Buffer.from(JSON.stringify({ schemaVersion: 2, savedAt: new Date().toISOString(), state: badState }), 'utf8').toString('base64'));
  loaded = await call('desktop:loadState');
  assert.equal(loaded.transactions[0].id, 'strict-transaction', 'estado criptografado estruturalmente válido mas financeiramente inválido recupera o último snapshot íntegro');
  assert.equal(JSON.parse(Buffer.from(fs.readFileSync(active, 'utf8'), 'base64').toString('utf8')).state.transactions[0].amountCents, 1234);
  console.log('✓ Desktop rejeita restauração inválida e recupera estado semanticamente corrompido antes de o retornar');

  console.log('Desktop last-known-good tests: 5 scenarios passed, 0 failed');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
