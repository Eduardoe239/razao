import assert from 'node:assert/strict';
import { CURRENT_SCHEMA_VERSION, migrateData } from '../src/domain/migrations.js';
import { backupChecksum, createBackup, parseBackupText } from '../src/domain/backup.js';

const empty = migrateData(null);
assert.equal(empty.version, 4, 'estado vazio tem versão interna 4');
assert.equal(empty.schemaVersion, 4, 'estado vazio tem schemaVersion 4');
assert.deepEqual(empty.accounts, [], 'estado vazio não contém contas fictícias');
assert.deepEqual(empty.transactions, [], 'estado vazio não contém lançamentos fictícios');

const v1 = migrateData({
  schemaVersion: 1,
  accounts: [{ id: 'a1', name: 'Principal', initialBalanceCents: 0 }],
  categories: [{ id: 'c1', name: 'Alimentação', type: 'despesa' }],
  cards: [],
  transactions: [
    { id: 't1', amount: 50.5, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'a1', categoryId: 'c1' },
    { id: 't2', amount: 50, type: 'receita', status: 'pago', date: '2026-10-28', accountId: 'a1', categoryId: 'c1' }
  ],
  settings: { currency: 'BRL' },
  userProfile: { name: 'Fixture' }
});
assert.equal(v1.transactions[0].amountCents, 5050, 'schema v1 converte 50,50 BRL para centavos');
assert.equal(v1.transactions[1].amountCents, 5000, 'schema v1 trata valor inteiro sem confundi-lo com centavos');
assert.equal('amount' in v1.transactions[0], false, 'campo monetário ambíguo legado sai do formato corrente');
assert.equal(v1.version, CURRENT_SCHEMA_VERSION);
assert.equal(v1.schemaVersion, CURRENT_SCHEMA_VERSION);
assert.deepEqual(v1.userProfile, { name: 'Fixture' }, 'migração preserva dados não financeiros conhecidos');

const v2 = migrateData({
  schemaVersion: 2,
  accounts: [{ id: 'a1', initialBalanceCents: 0 }],
  categories: [{ id: 'c1', type: 'despesa' }],
  cards: [],
  transactions: [
    { id: 't1', amountCents: 8000, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'a1', categoryId: 'c1' },
    { id: 't2', amount: 1250, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'a1', categoryId: 'c1' },
    { id: 't3', amount: 12.5, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'a1', categoryId: 'c1' }
  ]
});
assert.deepEqual(v2.transactions.map(t => t.amountCents), [8000, 1250, 1250], 'migração v2 mantém a regra monetária histórica sem alterar amountCents');
assert.equal(v2.schemaVersion, 4);

const v3 = migrateData({
  version: 3,
  accounts: [{ id: 'a1', initialBalanceCents: 1000 }],
  categories: [{ id: 'c1', type: 'despesa' }],
  cards: [],
  transactions: [{ id: 't1', amountCents: 825, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'a1', categoryId: 'c1' }]
});
assert.equal(v3.transactions[0].amountCents, 825, 'migração v3 preserva centavos');
assert.equal(v3.schemaVersion, 4, 'migração v3 conclui no schema 4');

assert.throws(() => migrateData({ version: 3, transactions: [{ id: 't1', amount: 10 }] }), /exige amountCents explícito/, 'schema v3 ambíguo não estima unidade monetária');
assert.throws(() => migrateData({ version: 4, transactions: [{ id: 't1', amountCents: 1.2 }] }), /amountCents inteiro/, 'schema atual com centavos fracionários é recusado');
assert.throws(() => migrateData({ schemaVersion: 5, version: 5 }), /não suportada/, 'schema futuro desconhecido é recusado sem downgrade');
assert.throws(() => migrateData({ schemaVersion: 3, version: 4 }), /inconsistente/, 'versões internas conflitantes são recusadas');
assert.throws(() => migrateData({ schemaVersion: '4', version: 4 }), /não suportada/, 'schema não é aceito como string numericamente coercível');

const legacyBackup = createBackup({
  version: 1,
  accounts: [{ id: 'a1', name: 'Principal', initialBalanceCents: 0 }],
  categories: [{ id: 'c1', name: 'Alimentação', type: 'despesa' }],
  cards: [], auditLog: [], budgets: {}, settings: {},
  transactions: [{ id: 't1', description: 'Mercado', amount: 23.45, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'a1', categoryId: 'c1' }]
});
const imported = parseBackupText(JSON.stringify(legacyBackup));
assert.equal(imported.valid, true, `backup v1 completo deve migrar: ${(imported.issues || []).join('; ')}`);
assert.equal(imported.state.version, 4, 'backup importado entrega estado corrente');
assert.equal(imported.state.schemaVersion, 4, 'backup importado entrega schemaVersion corrente');
assert.equal(imported.state.transactions[0].amountCents, 2345, 'backup v1 preserva valor convertido');
assert.equal(imported.state.transactions.length, 1, 'backup migrado preserva contagem de lançamentos');

const inconsistentBackup = structuredClone(legacyBackup);
inconsistentBackup.payload.schemaVersion = 3;
// Recalcular checksum para isolar a verificação de conflito de versões.
inconsistentBackup.checksum = backupChecksum(inconsistentBackup.payload);
const inconsistentResult = parseBackupText(JSON.stringify(inconsistentBackup));
assert.equal(inconsistentResult.valid, false, 'versão do envelope divergente da versão do estado é recusada');
assert.ok(inconsistentResult.issues.some(issue => /inconsistente/.test(issue)), 'recusa explica o conflito de schema');

assert.throws(() => migrateData({ schemaVersion: 1, accounts: [], transactions: [{ id: 'tx-precise', amount: 1.239 }] }), /mais precisão que centavos/);
console.log('Schema migration pipeline: 20 assertions passed, 0 failed');
