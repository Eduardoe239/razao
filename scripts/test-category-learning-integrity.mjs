import assert from 'node:assert/strict';
import { loadLearningRules, recordCategoryRule, predictCategory } from '../src/domain/categoryLearning.js';

const data = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem(key) { return data.has(key) ? data.get(key) : null; },
  setItem(key, value) { data.set(key, String(value)); }
} });
const originalError = console.error;
console.error = () => {};
try {
  const first = recordCategoryRule('Mercado Central', 'cat-alimentacao');
  assert.equal(first.saved, true);
  const key = 'razao_category_rules_v14';
  assert.equal(JSON.parse(data.get(key)).mercado.categoryId, 'cat-alimentacao');

  const corrupt = '{corrupted learning rules';
  data.set(key, corrupt);
  assert.deepEqual(loadLearningRules(), {}, 'previsão degrade de forma segura sem regravar o catálogo');
  const rejected = recordCategoryRule('Mercado Novo', 'cat-other');
  assert.equal(rejected.saved, false);
  assert.match(rejected.reason, /JSON|position|Unexpected|propriedade|válid/i);
  assert.equal(data.get(key), corrupt, 'gravação deve preservar os bytes do catálogo corrompido');

  data.set(key, JSON.stringify({ bad: { categoryId: 123 } }));
  const malformed = data.get(key);
  const rejectedShape = recordCategoryRule('Mercado Novo', 'cat-other');
  assert.equal(rejectedShape.saved, false);
  assert.equal(data.get(key), malformed, 'estrutura inválida não pode ser substituída por regras parciais');

  data.set(key, JSON.stringify({ mercado: { categoryId: 'cat-alimentacao', count: 2 } }));
  const next = recordCategoryRule('Mercado Central', 'cat-alimentacao');
  assert.equal(next.saved, true);
  assert.equal(JSON.parse(data.get(key)).mercado.count, 3);
  assert.equal(predictCategory('Mercado Central', 'outros'), 'cat-alimentacao');
  console.log('Category-learning integrity: 9 assertions passed, 0 failed');
} finally {
  console.error = originalError;
  delete globalThis.localStorage;
}
