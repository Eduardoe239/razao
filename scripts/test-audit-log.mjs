import assert from 'node:assert/strict';
import { appendAuditEvent, auditSnapshot, changedSnapshotFields, createAuditEvent, sanitizeAuditLog } from '../src/domain/auditLog.js';
import { sanitizeState } from '../src/domain/sanitize.js';

const tx = { id: 'tx-a', description: 'Mercado', amountCents: 2500, type: 'despesa', status: 'pago', date: '2026-10-01', accountId: 'acc-1', categoryId: 'cat-1', profileType: 'PF', secret: 'must-not-be-copied' };
const event = createAuditEvent({ eventId: 'ev-a', timestamp: '2026-10-28T12:00:00.000Z', action: 'transaction_created', entityId: tx.id, profileType: 'PF', after: tx, metadata: { screen: 'transactions', safeCount: 1, unsafe: { no: 'object' } } });
assert.equal(event.id, 'ev-a');
assert.equal(event.after.description, 'Mercado');
assert.equal('secret' in event.after, false);
assert.deepEqual(event.metadata, { screen: 'transactions', safeCount: 1 });
assert.equal(changedSnapshotFields(tx, { ...tx, amountCents: 3000 }).includes('amountCents'), true);
assert.equal(auditSnapshot(null), null);
let log = [];
for (let i = 0; i < 505; i++) log = appendAuditEvent(log, { ...event, id: `event-${i}` });
assert.equal(log.length, 500);
assert.equal(log[0].id, 'event-5');
const duplicateAndBad = sanitizeAuditLog([{ ...event }, { ...event }, { id: '', timestamp: 'no-date', action: 'unknown', profileType: '???' }]);
assert.equal(duplicateAndBad.length, 3, 'sanitização mantém duplicatas e registros suspeitos para o verificador');
const sanitizedState = sanitizeState({ auditLog: [event], transactions: [] });
assert.equal(sanitizedState.auditLog.length, 1);
assert.equal(sanitizeState({}).auditLog.length, 0);
for (const action of ['recurring_rule_created', 'recurring_rule_toggled', 'recurring_rule_deleted', 'budget_limit_set', 'budget_limit_removed']) {
  assert.ok((await import('../src/domain/auditLog.js')).AUDIT_ACTIONS.has(action), `ação de auditoria reconhecida: ${action}`);
}
const ruleEvent = createAuditEvent({ action: 'recurring_rule_created', entityType: 'recurring_rule', entityId: 'rec-1', after: { id: 'rec-1', description: 'Internet', amountCents: 8900, dayOfMonth: 10, active: true, startDate: '2026-10-01', profileType: 'PF' } });
assert.equal(ruleEvent.after.dayOfMonth, 10);
assert.equal(ruleEvent.after.active, true);
assert.equal(ruleEvent.after.startDate, '2026-10-01');
const budgetEvent = createAuditEvent({ action: 'budget_limit_set', entityType: 'budget', entityId: 'PF:cat-1:2026-10', after: { id: 'PF:cat-1:2026-10', categoryId: 'cat-1', monthKey: '2026-10', amountCents: 0, profileType: 'PF' } });
assert.equal(budgetEvent.after.amountCents, 0, 'limite zero deve continuar auditável');
assert.equal(budgetEvent.after.monthKey, '2026-10');
console.log('Audit log tests: 17 assertions passed, 0 failed');
