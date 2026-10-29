import assert from 'node:assert/strict';
import { parseBackupText, serializeHistoricalBackup } from '../src/domain/backup.js';

const state = {
  version: 4,
  schemaVersion: 4,
  accounts: [{ id: 'acc-export', name: 'Conta para exportação', initialBalanceCents: 15000 }],
  transactions: [{ id: 'tx-export', description: 'Compra de teste', amountCents: 4200, type: 'despesa', status: 'pago', date: '2026-10-28', accountId: 'acc-export', categoryId: 'cat-export' }],
  categories: [{ id: 'cat-export', name: 'Compras', type: 'despesa' }],
  cards: [], auditLog: [], budgets: {}, settings: {}
};
const originalDate = '2026-10-20T15:30:00.000Z';
const text = serializeHistoricalBackup(state, originalDate);
const parsed = parseBackupText(text);
assert.equal(parsed.valid, true, 'o arquivo exportado deve passar na validação padrão de importação');
assert.equal(parsed.summary.createdAt, originalDate, 'a data histórica deve ser preservada no arquivo exportado');
assert.equal(parsed.state.accounts[0].id, 'acc-export', 'a conta deve ser preservada');
assert.equal(parsed.state.transactions[0].amountCents, 4200, 'o valor em centavos deve ser preservado');
assert.equal(parsed.state.transactions.length, 1, 'o número de lançamentos deve ser preservado');
assert.throws(() => serializeHistoricalBackup({ ...state, transactions: [{ ...state.transactions[0], accountId: 'missing' }] }, originalDate), /não pode ser exportado/);
const duplicateState = structuredClone(state);
duplicateState.accounts.push({ ...duplicateState.accounts[0] });
assert.throws(() => serializeHistoricalBackup(duplicateState, originalDate), /não pode ser exportado/);
assert.equal(parseBackupText(serializeHistoricalBackup(state, 'not-a-date')).valid, true, 'data ausente ou inválida deve produzir um envelope válido sem adulterar o estado');
console.log('Historical backup export: 8 assertions passed, 0 failed');
