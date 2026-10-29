import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../src/components/ImportReconciliationModal.jsx', import.meta.url), 'utf8');
assert.match(source, /DEMONSTRAÇÃO — NÃO É UMA CONEXÃO BANCÁRIA/, 'demo is explicitly labelled as not a real bank connection');
assert.match(source, /selected: false/, 'synthetic transactions are not preselected for import');
assert.match(source, /lançamentos demonstrativos começam desmarcados/, 'user-facing copy explains the safety default');
assert.match(source, /source: 'open_finance_demo'/, 'synthetic origin is marked in imported transaction metadata');
console.log('Open Finance demo safety: 4 checks passed');

const { readFileSync } = await import('node:fs');
const modalSource = readFileSync('src/components/ImportReconciliationModal.jsx', 'utf8');
assert.match(modalSource, /<button[\s\S]*?aria-pressed=\{isSelected\}[\s\S]*?setSelectedBank\(bank\)/, 'seleção de banco demonstrativo deve ser um botão acessível a teclado');
console.log('Open Finance demo keyboard control: 1 assertion passed');
