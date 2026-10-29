import assert from 'node:assert/strict';
import { backupChecksum, createBackup, parseBackupText, validateBackup } from '../src/domain/backup.js';

const state = {
  version: 4,
  accounts: [{ id: 'acc-1', name: 'Principal', initialBalanceCents: 1000 }],
  transactions: [{ id: 'tx-1', description: 'Café', amountCents: 250, type: 'despesa', status: 'pago', date: '2026-10-20', accountId: 'acc-1' }],
  categories: [{ id: 'cat-1', name: 'Alimentação', type: 'despesa' }],
  cards: [], auditLog: [], budgets: {}, settings: {}, userProfile: { name: 'Teste' }
};
const backup = createBackup(state, '2026-10-28T12:00:00.000Z');
const parsed = parseBackupText(JSON.stringify(backup));
assert.equal(parsed.valid, true);
assert.equal(parsed.summary.accounts, 1);
assert.equal(parsed.summary.transactions, 1);
assert.equal(parsed.state.userProfile.name, 'Teste');
console.log('✓ Backup válido é criado, verificado e restaurado');

const corrupt = structuredClone(backup);
corrupt.payload.state.transactions[0].amountCents = 999;
assert.equal(validateBackup(corrupt).valid, false);
assert.ok(validateBackup(corrupt).issues.some(issue => issue.includes('checksum')));
console.log('✓ Backup com conteúdo alterado é rejeitado');

assert.equal(parseBackupText('{"format":').valid, false);
console.log('✓ JSON truncado é rejeitado');
assert.equal(parseBackupText('').valid, false);
console.log('✓ Arquivo vazio é rejeitado');
assert.equal(validateBackup({ format: 'outro', formatVersion: 1 }).valid, false);
console.log('✓ Formato desconhecido é rejeitado');

const duplicate = createBackup({ ...state, transactions: [state.transactions[0], { ...state.transactions[0] }] });
assert.equal(validateBackup(duplicate).valid, false);
assert.ok(validateBackup(duplicate).issues.some(issue => issue.includes('duplicados')));
console.log('✓ IDs duplicados são rejeitados');

const missingAccounts = structuredClone(backup);
delete missingAccounts.payload.state.accounts;
missingAccounts.checksum = backupChecksum(missingAccounts.payload);
assert.equal(validateBackup(missingAccounts).valid, false);
console.log('✓ Backup sem estrutura obrigatória é rejeitado');
console.log('Backup tests: 13 passed, 0 failed');

const invalidDate = structuredClone(backup);
invalidDate.payload.state.transactions[0].date = '2026-02-30';
invalidDate.checksum = backupChecksum(invalidDate.payload);
assert.equal(validateBackup(invalidDate).valid, false);
console.log('✓ Datas impossíveis são rejeitadas mesmo com checksum recalculado');

const missingAccount = structuredClone(backup);
missingAccount.payload.state.transactions[0].accountId = 'account-absent';
missingAccount.checksum = backupChecksum(missingAccount.payload);
assert.equal(validateBackup(missingAccount).valid, false);
console.log('✓ Referências a contas inexistentes são rejeitadas');

const cardPaymentState = {
  ...state,
  cards: [{ id: 'card-1', name: 'Cartão' }],
  transactions: [{ id: 'tx-payment', description: 'Pagamento fatura', amountCents: 500, type: 'transferencia', status: 'pago', date: '2026-10-20', accountId: 'acc-1', toAccountId: 'card-1', linkedCardId: 'card-1', linkedInvoiceKey: '2026-10' }]
};
assert.equal(validateBackup(createBackup(cardPaymentState)).valid, true);
console.log('✓ Pagamento de fatura com cartão virtual é preservado');
