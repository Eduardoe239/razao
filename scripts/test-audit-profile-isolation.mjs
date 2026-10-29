import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditEventsForProfile, countUnclassifiedAuditEvents } from '../src/domain/auditLog.js';

const events = [
  { id: 'pf-1', profileType: 'PF', action: 'transaction_created' },
  { id: 'pj-1', profileType: 'PJ', action: 'transaction_created' },
  { id: 'unknown-1', action: 'transaction_updated', before: { description: 'PRIVATE MERCHANT' } },
  null
];
assert.deepEqual(auditEventsForProfile(events, 'PF').map(item => item.id), ['pf-1']);
assert.deepEqual(auditEventsForProfile(events, 'PJ').map(item => item.id), ['pj-1']);
assert.deepEqual(auditEventsForProfile(events, 'other'), []);
assert.equal(countUnclassifiedAuditEvents(events), 2);
assert.equal(auditEventsForProfile(null, 'PF').length, 0);
const history = fs.readFileSync('src/components/AuditHistoryPanel.jsx', 'utf8');
const integrity = fs.readFileSync('src/components/AuditIntegrityPanel.jsx', 'utf8');
assert.match(history, /auditEventsForProfile\(auditLog, profileMode\)/);
assert.match(history, /unclassifiedEvents > 0/);
assert.match(integrity, /auditEventsForProfile\(state\?\.auditLog, profileMode\)/);
assert.match(integrity, /entitiesForProfile\(state\?\.accounts, profileMode\)/);
assert.match(integrity, /entitiesForProfile\(state\?\.cards, profileMode\)/);
console.log('Audit profile isolation: 10 assertions passed, 0 failed');
