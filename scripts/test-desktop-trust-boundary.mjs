import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Module = require('node:module');
const handlers = new Map();
const ipcMain = { handle(name, fn) { handlers.set(name, fn); }, on() {} };
const app = {
  isPackaged: true,
  getPath(name) { assert.equal(name, 'userData'); return '/tmp/razao-trust-boundary'; },
  getVersion() { return '1.22.0-beta.18'; },
  getName() { return 'O Razão'; },
  whenReady() { return { then() {} }; }, on() {}, quit() {}
};
class BrowserWindow {}
BrowserWindow.getAllWindows = () => [];
const electronStub = { app, BrowserWindow, ipcMain, dialog: {}, shell: {}, safeStorage: { isEncryptionAvailable: () => true, encryptString: value => Buffer.from(value, 'utf8'), decryptString: value => Buffer.from(value).toString('utf8') } };
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'electron') return electronStub;
  return originalLoad.call(this, request, parent, isMain);
};
try { require('../electron/main.cjs'); } finally { Module._load = originalLoad; }

const entry = path.resolve(process.cwd(), 'dist', 'index.html');
const trusted = { senderFrame: { url: pathToFileURL(entry).href } };
const lookalike = { senderFrame: { url: pathToFileURL(path.resolve(process.cwd(), 'attacker', 'dist', 'index.html')).href } };
const missingFrame = { senderFrame: null };
const handler = handlers.get('desktop:saveState');
assert.equal(typeof handler, 'function');
await assert.rejects(() => handler(lookalike, { accounts: [], transactions: [] }), /Origem IPC não autorizada/,
  'um HTML local que apenas compartilha o sufixo dist/index.html não pode chamar IPC');
await assert.rejects(() => handler(missingFrame, { accounts: [], transactions: [] }), /Origem IPC não autorizada/,
  'frame ausente não pode chamar IPC');
await assert.rejects(() => handler(trusted, { accounts: [] }), /listas de contas e lançamentos/,
  'estado sem lista de lançamentos precisa ser rejeitado antes de gravar');
await assert.rejects(() => handler(trusted, { version: 4, accounts: [{ id: 'acc-1' }], cards: [], categories: [], transactions: [{ id: 'tx-1', amountCents: 1.5, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'acc-1' }], auditLog: [] }), /valor inválido em centavos/,
  'estado atual com valor financeiro inválido precisa ser recusado antes da gravação');
await assert.rejects(() => handler(trusted, { version: 4, accounts: [{ id: 'acc-1', initialBalanceCents: 0 }], cards: [], categories: [], transactions: [], recurring: [{ id: 'r1', description: 'Regra', amountCents: 100, dayOfMonth: 10, accountId: 'missing' }], auditLog: [] }), /referencia conta inexistente/, 'regra recorrente não pode referenciar conta inexistente');
await assert.rejects(() => handler(trusted, { version: 4, accounts: [{ id: 'acc-1', initialBalanceCents: 0 }], cards: [], categories: [], transactions: [], budgets: { 'PF:cat-1:2026-10': 1.5 }, auditLog: [] }), /orçamento .* inteiro não negativo em centavos/, 'orçamento com fração de centavo deve ser recusado');
await assert.rejects(() => handler(trusted, { version: 4, accounts: [{ id: 'acc-1', initialBalanceCents: 0 }], cards: [{ id: 'card-1', limitCents: 3.2 }], categories: [], transactions: [], auditLog: [] }), /limite inválido em centavos/, 'limite de cartão fracionário deve ser recusado');
await assert.rejects(() => handler(trusted, { version: 4, schemaVersion: 3, accounts: [], cards: [], categories: [], transactions: [], auditLog: [] }), /divergentes/, 'IPC recusa versão interna de schema divergente');
const transferBase = { version: 4, schemaVersion: 4, accounts: [{ id: 'acc-1', initialBalanceCents: 0, profileType: 'PF' }], cards: [{ id: 'card-1', profileType: 'PF' }], categories: [], transactions: [], auditLog: [] };
await assert.rejects(() => handler(trusted, { ...transferBase, transactions: [{ id: 'bad-transfer', amountCents: 100, type: 'transferencia', status: 'pago', date: '2026-10-28', accountId: 'acc-1', toAccountId: 'card-1', profileType: 'PF' }] }), /conta de destino inexistente/, 'IPC não pode aceitar cartão como destino de transferência bancária');
await assert.doesNotReject(() => handler(trusted, { ...transferBase, transactions: [{ id: 'invoice-payment', amountCents: 100, type: 'transferencia', status: 'pago', date: '2026-10-28', accountId: 'acc-1', toAccountId: 'card-1', linkedCardId: 'card-1', linkedInvoiceKey: '2026-10', profileType: 'PF' }] }), 'IPC deve aceitar pagamento de fatura com destino de cartão e vínculo corretos');

let checks = 12; // asserts de fronteira IPC acima
// Integração simulada da migração de JSON legado: não exclui a única fonte se
// o estado não puder ser validado e só remove o legado após dois arquivos
// protegidos terem sido confirmados.
const root = '/tmp/razao-trust-boundary';
const dataDir = path.join(root, 'RazaoData');
const legacyPath = path.join(dataDir, 'razao_app_db.json');
const encryptedPath = path.join(dataDir, 'razao_app_db.enc');
const snapshotPath = path.join(dataDir, 'razao_app_db.last-known-good.enc');
const loadHandler = handlers.get('desktop:loadState');
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(legacyPath, JSON.stringify({ version: 3, accounts: [{ id: 'acc-legacy' }], transactions: [] }), 'utf8');
const legacyLoaded = await loadHandler(trusted);
assert.equal(legacyLoaded.accounts[0].id, 'acc-legacy', 'migração nativa devolve estado legado validado');
assert.equal(fs.existsSync(encryptedPath), true, 'migração grava estado protegido');
assert.equal(fs.existsSync(snapshotPath), true, 'migração cria cópia de recuperação protegida');
assert.equal(fs.existsSync(legacyPath), false, 'legado só é removido depois de gravar estado protegido e snapshot');
checks += 4;

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(legacyPath, JSON.stringify({ version: 3, accounts: [], transactions: 'corrupt' }), 'utf8');
await assert.rejects(() => loadHandler(trusted), /listas de contas e lançamentos/, 'estado legado inválido é recusado antes de qualquer conversão');
assert.equal(fs.existsSync(legacyPath), true, 'estado legado inválido permanece intacto para recuperação manual');
assert.equal(fs.existsSync(encryptedPath), false, 'estado legado inválido não gera arquivo protegido parcial');
checks += 3;
fs.rmSync(root, { recursive: true, force: true });
console.log(`Desktop trust boundary: ${checks} checks passed, 0 failed`);
