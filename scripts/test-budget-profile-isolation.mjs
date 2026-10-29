import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runBudgetTests } from '../src/domain/budget.test.js';

runBudgetTests(assert);
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /budgetForMonth\(state\.budgets,category\.id,todayISO\.slice\(0,7\),profileMode\)/, 'A interface deve consultar orçamento do perfil ativo');
assert.match(app, /setCategoryBudget\(prev\.budgets, budgetCategoryId, monthKey, cents, profileMode\)/, 'A interface deve salvar orçamento no perfil ativo');
assert.match(app, /setCategoryBudget\(prev\.budgets,category\.id,monthKey,null,profileMode\)/, 'A interface deve remover orçamento apenas do perfil ativo');
const anomalyDetector = readFileSync(new URL('../src/domain/anomalyDetector.js', import.meta.url), 'utf8');
assert.match(anomalyDetector, /budgetForMonth\(budgets, cat\.id, currentMonthKey, profile\)/, 'Detector deve usar orçamento escopado por perfil');
assert.match(anomalyDetector, /filter\(inProfile\)/, 'Detector deve filtrar transações e categorias pelo perfil ativo');
assert.match(app, /accounts, categories, cards, recurring: filteredRecurring, profileType: profileMode/, 'Painel preditivo deve receber apenas entidades do perfil ativo');
console.log('Budget/profile isolation and anomaly detector: 13 static assertions passed, 0 failed');
