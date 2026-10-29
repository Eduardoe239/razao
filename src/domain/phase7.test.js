/**
 * SUÍTE DE TESTES DA FASE 7 (IA RAZÃO, CENÁRIOS WHAT-IF & ANOMALIAS)
 */

import { buildFinancialContext, queryAIAdvisor } from './aiContextEngine.js';
import { simulateScenarios } from './scenarioSimulator.js';
import { detectAnomalies } from './anomalyDetector.js';

export function runPhase7Tests() {
  console.log('==================================================');
  console.log('   O RAZÃO FASE 7 — TESTES DE IA & CENÁRIOS WHAT-IF   ');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const sampleState = {
    accounts: [{ id: 'acc-1', name: 'Conta Corrente', initialBalanceCents: 100000 }],
    cards: [{ id: 'card-1', name: 'Black Card', closingDay: 10, dueDay: 20 }],
    categories: [{ id: 'cat-1', name: 'Restaurante', type: 'despesa' }],
    budgets: { 'cat-1:2026-10': 10000 },
    transactions: [
      { id: 't1', type: 'receita', amountCents: 500000, status: 'pago', date: '2026-10-01', accountId: 'acc-1' },
      { id: 't2', type: 'despesa', amountCents: 12000, status: 'pago', date: '2026-10-10', accountId: 'acc-1', categoryId: 'cat-1', description: 'Jantar' },
      { id: 't3', type: 'despesa', amountCents: 12000, status: 'pago', date: '2026-10-11', accountId: 'acc-1', categoryId: 'cat-1', description: 'Jantar' }
    ]
  };

  // 1. Context Engine
  const ctx = buildFinancialContext(sampleState, '2026-10-28');
  assert(ctx.realizedCents === 576000, 'buildFinancialContext inclui saldo inicial e movimentos pagos até a data de referência');

  const purchaseQuery = queryAIAdvisor('Posso comprar um item de R$ 1000,00?', sampleState, '2026-10-28');
  assert(purchaseQuery.isSafe === true, 'queryAIAdvisor autorizou compra dentro do saldo disponível');

  // 2. Scenario Simulator
  const sim = simulateScenarios({ state: sampleState, todayISO: '2026-10-28', monthsAhead: 3 });
  assert(sim.monthlyProjections.length === 4, 'simulateScenarios gerou projeções para N+1 meses');
  assert(sim.summary.finalOptimisticCents >= sim.summary.finalConservativeCents, 'Cenário otimista é maior ou igual ao conservador');
  assert(sim.currentBalanceCents === 576000, 'simulateScenarios usa o saldo real do livro-razão, incluindo saldo inicial');
  assert(sim.monthlyProjections[0].expectedNetCents === 0, 'simulateScenarios não soma novamente lançamentos já pagos no mês corrente');

  // 3. Anomaly Detector
  const anoms = detectAnomalies(sampleState, '2026-10-28');
  assert(anoms.some(a => a.type === 'duplicate'), 'detectAnomalies identificou cobrança duplicada com sucesso');
  assert(anoms.some(a => a.type === 'budget_overrun_risk'), 'detectAnomalies identificou estouro de orçamento para a categoria');

  const scopedState = {
    profileType: 'PJ',
    categories: [
      { id: 'shared-cat', name: 'PJ Operacional', type: 'despesa', profileType: 'PJ' },
      { id: 'personal-cat', name: 'PF Pessoal', type: 'despesa', profileType: 'PF' }
    ],
    budgets: { 'PJ:shared-cat:2026-10': 10000, 'PF:personal-cat:2026-10': 100 },
    transactions: [
      { id: 'pj-expense', type: 'despesa', amountCents: 9000, status: 'pago', date: '2026-10-10', categoryId: 'shared-cat', profileType: 'PJ', description: 'PJ compra' },
      { id: 'pf-expense', type: 'despesa', amountCents: 50000, status: 'pago', date: '2026-10-10', categoryId: 'personal-cat', profileType: 'PF', description: 'PF compra' }
    ]
  };
  const pjAnomalies = detectAnomalies(scopedState, '2026-10-28', 'PJ');
  assert(pjAnomalies.some(a => a.type === 'budget_overrun_risk' && a.categoryId === 'shared-cat'), 'detectAnomalies lê orçamento PJ com chave escopada');
  assert(!pjAnomalies.some(a => a.categoryId === 'personal-cat'), 'detectAnomalies não expõe categorias/orçamentos PF no perfil PJ');
  const pfAnomalies = detectAnomalies({ ...scopedState, profileType: 'PF' }, '2026-10-28', 'PF');
  assert(pfAnomalies.some(a => a.categoryId === 'personal-cat'), 'detectAnomalies mantém o orçamento PF isolado do orçamento PJ');

  console.log('\n--------------------------------------------------');
  console.log(`RESULTADO DA FASE 7: ${passed} aprovados, ${failed} falhas`);
  console.log('--------------------------------------------------\n');

  return failed === 0;
}
