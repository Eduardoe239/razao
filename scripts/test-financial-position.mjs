import assert from 'node:assert/strict';
import {
  calculateCurrentBalanceCents,
  calculatePendingNetCents,
  getCurrentMonthPendingTransactions,
  getMonthPendingTransactions
} from '../src/domain/financialPosition.js';
import { simulateScenarios } from '../src/domain/scenarioSimulator.js';
import { buildFinancialContext } from '../src/domain/aiContextEngine.js';

const todayISO = '2026-10-28';
const state = {
  accounts: [
    { id: 'checking', initialBalanceCents: 100000 },
    { id: 'savings', initialBalanceCents: 50000 }
  ],
  transactions: [
    { id: 'paid-income', type: 'receita', amountCents: 200000, status: 'pago', date: '2026-10-01', accountId: 'checking' },
    { id: 'paid-expense', type: 'despesa', amountCents: 40000, status: 'pago', date: '2026-10-03', accountId: 'checking' },
    { id: 'paid-transfer', type: 'transferencia', amountCents: 10000, status: 'pago', date: '2026-10-04', accountId: 'checking', toAccountId: 'savings' },
    { id: 'future-marked-paid', type: 'receita', amountCents: 999999, status: 'pago', date: '2026-11-02', accountId: 'checking' },
    { id: 'overdue-pending', type: 'despesa', amountCents: 5000, status: 'pendente', date: '2026-10-05', accountId: 'checking' },
    { id: 'current-pending', type: 'despesa', amountCents: 20000, status: 'pendente', date: '2026-10-30', accountId: 'checking' },
    { id: 'future-income', type: 'receita', amountCents: 50000, status: 'pendente', date: '2026-11-10', accountId: 'checking' },
    { id: 'pending-transfer', type: 'transferencia', amountCents: 12000, status: 'pendente', date: '2026-10-29', accountId: 'checking', toAccountId: 'savings' },
    { id: 'invalid-date', type: 'receita', amountCents: 888888, status: 'pago', date: '2026-02-30', accountId: 'checking' }
  ]
};

assert.equal(calculateCurrentBalanceCents(state, todayISO), 310000,
  'saldo inclui saldos iniciais e movimentos pagos até a data, exclui movimento futuro inválido e neutraliza transferência');

const currentPending = getCurrentMonthPendingTransactions(state.transactions, todayISO);
assert.deepEqual(currentPending.map(tx => tx.id).sort(), ['current-pending', 'overdue-pending'],
  'mês atual inclui compromissos vencidos ainda pendentes e exclui transferências');
assert.equal(calculatePendingNetCents(currentPending), -25000,
  'fluxo pendente líquido usa centavos inteiros e não conta transferências internas');
assert.deepEqual(getMonthPendingTransactions(state.transactions, '2026-11').map(tx => tx.id), ['future-income'],
  'meses futuros incluem apenas compromissos pendentes daquele mês');

const simulation = simulateScenarios({ state, todayISO, monthsAhead: 1 });
assert.equal(simulation.currentBalanceCents, 310000, 'simulador parte do saldo atual calculado pelo livro-razão');
assert.equal(simulation.monthlyProjections[0].expectedNetCents, -25000,
  'simulador não soma movimentos pagos novamente e inclui compromissos pendentes atuais');
assert.equal(simulation.monthlyProjections[0].expectedBalanceCents, 285000,
  'saldo esperado do mês atual é saldo atual mais compromissos ainda pendentes');
assert.equal(simulation.monthlyProjections[1].expectedNetCents, 50000,
  'receita pendente futura entra uma vez no mês correto');
assert.equal(simulation.monthlyProjections[1].expectedBalanceCents, 335000,
  'saldo do mês futuro parte do saldo projetado anterior');

const context = buildFinancialContext(state, todayISO);
assert.equal(context.realizedCents, 310000, 'assistente usa posição atual real do livro-razão');
assert.equal(context.committedCents, 25000, 'assistente informa compromissos pendentes vencidos e atuais');
assert.equal(context.availableCents, 285000, 'saldo disponível desconta compromissos sem descontar movimentações pagas outra vez');

const legacy = { transactions: [
  { type: 'receita', amountCents: 8000, status: 'pago', date: '2026-10-01' },
  { type: 'despesa', amountCents: 3000, status: 'pago', date: '2026-10-02' }
] };
assert.equal(calculateCurrentBalanceCents(legacy, todayISO), 5000,
  'compatibilidade legada preserva fallback quando contas não são fornecidas');

console.log('Financial position / forecast: 12 assertions passed, 0 failed');
