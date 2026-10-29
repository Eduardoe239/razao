import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditLedger } from '../src/domain/ledger.js';

const accounts = [
  { id: 'checking', initialBalanceCents: 100000 },
  { id: 'card', initialBalanceCents: 0 }
];
const transactions = [
  { id: 'salary', type: 'receita', status: 'pago', amountCents: 200000, accountId: 'checking' },
  { id: 'purchase', type: 'despesa', status: 'pago', amountCents: 50000, accountId: 'card' },
  { id: 'payment', type: 'transferencia', status: 'pago', amountCents: 50000, accountId: 'checking', toAccountId: 'card' }
];
assert.equal(auditLedger(accounts, transactions).valid, true, 'diagnóstico deve aceitar dados consistentes');
assert.equal(auditLedger(accounts, [...transactions, transactions[0]]).valid, false, 'diagnóstico deve detectar ID duplicado');
assert.equal(auditLedger(accounts, [{ ...transactions[0], accountId: 'missing' }]).valid, false, 'diagnóstico deve detectar conta inexistente');
assert.equal(auditLedger(accounts, [{ ...transactions[0], amountCents: 12.5 }]).valid, false, 'diagnóstico deve detectar valor fracionário de centavo');
const source = await readFile(new URL('../src/components/DiagnosticModal.jsx', import.meta.url), 'utf8');
assert.match(source, /auditLedger\(accounts, transactions, \{ virtualAccountIds:/, 'interface deve executar auditoria real do livro-razão e reconhecer cartões como destinos virtuais');
assert.doesNotMatch(source, /100% Operacional e Estável|100% Certificado/, 'interface não deve prometer certificação/saúde não comprovada');
console.log('Diagnóstico de integridade: 6 verificações aprovadas.');
