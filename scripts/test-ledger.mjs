import assert from 'node:assert/strict';
import { runLedgerTests } from '../src/domain/ledger.test.js';
let passed = 0;
runLedgerTests((condition, message) => {
  assert.ok(condition, message);
  passed++;
});
console.log(`Livro-razão: ${passed} verificações aprovadas.`);
