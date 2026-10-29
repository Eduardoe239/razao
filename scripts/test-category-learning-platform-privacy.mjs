import assert from 'node:assert/strict';
import { filterCategoryRuleMap, loadLearningRules, predictCategory, recordCategoryRule, updateCategoryRuleMap } from '../src/domain/categoryLearning.js';

let reads = 0;
let writes = 0;
Object.defineProperty(globalThis, 'window', { configurable: true, value: { electronAPI: { isDesktop: true } } });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem() { reads += 1; throw new Error('Desktop must not read renderer localStorage'); },
  setItem() { writes += 1; throw new Error('Desktop must not write renderer localStorage'); }
} });

try {
  assert.deepEqual(loadLearningRules(), {}, 'desktop não lê regras privadas do localStorage do renderer');
  const rejected = recordCategoryRule('Fornecedor confidencial', 'cat-pj');
  assert.equal(rejected.saved, false, 'gravação auxiliar em texto claro é desativada no desktop');
  assert.equal(reads, 0, 'nenhuma leitura de localStorage no desktop');
  assert.equal(writes, 0, 'nenhuma escrita de localStorage no desktop');

  const pfRules = updateCategoryRuleMap({}, 'Mercado Central', 'cat-pf', '2026-10-28T12:00:00.000Z');
  const pjRules = updateCategoryRuleMap({}, 'Fornecedor Confidencial', 'cat-pj', '2026-10-28T12:00:01.000Z');
  const categories = [
    { id: 'cat-pf', profileType: 'PF', name: 'Alimentação' },
    { id: 'cat-pj', profileType: 'PJ', name: 'Fornecedores' }
  ];
  const onlyPF = filterCategoryRuleMap({ ...pfRules, ...pjRules }, categories, 'PF');
  const onlyPJ = filterCategoryRuleMap({ ...pfRules, ...pjRules }, categories, 'PJ');
  assert.deepEqual(Object.keys(onlyPF), ['mercado'], 'regras PF não incorporam categorias PJ');
  assert.deepEqual(Object.keys(onlyPJ), ['fornecedor'], 'regras PJ não incorporam categorias PF');
  assert.equal(predictCategory('Mercado Central', 'default', onlyPF), 'cat-pf');
  assert.equal(predictCategory('Fornecedor Confidencial', 'default', onlyPF), 'default', 'previsão PF não utiliza regra PJ');
  assert.equal(predictCategory('Fornecedor Confidencial', 'default', onlyPJ), 'cat-pj');
  console.log('Category learning platform privacy: 10 assertions passed, 0 failed');
} finally {
  delete globalThis.window;
  delete globalThis.localStorage;
}
