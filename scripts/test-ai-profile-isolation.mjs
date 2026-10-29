import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runPhase7Tests } from '../src/domain/phase7.test.js';

assert.equal(runPhase7Tests(), true, 'A suíte do motor preditivo e detector de anomalias deve passar');

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /state=\{\{ \.\.\.state, transactions: filteredTransactions, accounts, categories, cards, recurring: filteredRecurring, profileType: profileMode \}\}/, 'Painel preditivo deve receber transações e entidades do perfil ativo');
assert.match(app, /profileMode=\{profileMode\}[\s\S]*?key=\{profileMode\}/, 'Painel preditivo deve reinicializar ao trocar PF/PJ para não manter resposta antiga visível');

console.log('AI/profile isolation integration: 3 checks passed, 0 failed');
