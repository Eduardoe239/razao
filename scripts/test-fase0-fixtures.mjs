import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCSV } from '../src/domain/importers.js';

const controlText = readFileSync(new URL('../fixtures/fase0-importacao-controle.csv', import.meta.url), 'utf8');
const control = parseCSV(controlText);
assert.equal(control.length, 20, 'fixture de controle deve conter 20 operações válidas');
assert.equal(control[0].amountCents, 12590, 'fixture deve preservar centavos BR');
assert.equal(control[1].amountCents, 245000, 'fixture deve converter receita em centavos');
assert.equal(control[0].date, '2026-10-28', 'fixture deve converter data DD/MM/YYYY');
assert.equal(control[0].type, 'despesa', 'sinal negativo deve importar despesa');
assert.equal(control[1].type, 'receita', 'valor positivo deve importar receita');
assert.equal(control[0].description, control[5].description, 'fixture inclui uma repetição intencional para o teste de conciliação');

const largeText = readFileSync(new URL('../fixtures/fase0-dados-volumosos-2000.csv', import.meta.url), 'utf8');
const large = parseCSV(largeText);
assert.equal(large.length, 2000, 'fixture volumosa deve conter exatamente 2.000 operações');
assert.equal(large.every(item => Number.isSafeInteger(item.amountCents) && item.amountCents > 0), true, 'todos os valores volumosos devem ser inteiros em centavos');
assert.equal(large.every(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date)), true, 'todas as datas volumosas devem estar normalizadas');
assert.equal(new Set(large.map(item => item.description)).size, 2000, 'fixture volumosa deve usar descrições únicas para rastreio');
assert.equal(large.filter(item => item.type === 'despesa').length > 1000, true, 'dataset volumoso inclui predominância de despesas realistas de teste');
console.log('Fase 0 import fixtures: 11 assertions passed, 0 failed (20 rows + 2,000 rows).');
