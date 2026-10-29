import assert from 'node:assert/strict';
import {
  calculateDashboardSummary,
  formatDashboardRangeLabel,
  getDashboardRange
} from '../src/domain/dashboardSummary.js';

const now = new Date(2026, 9, 28, 12, 0, 0); // 28/10/2026, horário local
const accounts = [{ id: 'checking', initialBalanceCents: 100000 }];
const transactions = [
  { id: 'salary-oct', type: 'receita', status: 'pago', amountCents: 300000, accountId: 'checking', date: '2026-10-05' },
  { id: 'rent-oct', type: 'despesa', status: 'pago', amountCents: 90000, accountId: 'checking', date: '2026-10-10' },
  { id: 'bill-pending', type: 'despesa', status: 'pendente', amountCents: 25000, accountId: 'checking', date: '2026-10-20' },
  { id: 'transfer', type: 'transferencia', status: 'pago', amountCents: 50000, accountId: 'checking', toAccountId: 'savings', date: '2026-10-21' },
  { id: 'old', type: 'receita', status: 'pago', amountCents: 70000, accountId: 'checking', date: '2026-09-15' },
  { id: 'future', type: 'receita', status: 'pago', amountCents: 80000, accountId: 'checking', date: '2026-11-02' },
  { id: 'cancelled', type: 'despesa', status: 'cancelado', amountCents: 20000, accountId: 'checking', date: '2026-10-12' }
];

const monthlyRange = getDashboardRange({ period: 'monthly', monthOffset: 0, now });
assert.equal(monthlyRange.startISO, '2026-10-01', 'mensal começa no primeiro dia do mês selecionado');
assert.equal(monthlyRange.endISO, '2026-10-31', 'mensal termina no último dia do mês selecionado');

const weeklyRange = getDashboardRange({ period: 'weekly', monthOffset: 0, now });
assert.equal(weeklyRange.startISO, '2026-10-26', 'semanal começa na segunda-feira');
assert.equal(weeklyRange.endISO, '2026-11-01', 'semanal termina no domingo mesmo cruzando de mês');

const quarterRange = getDashboardRange({ period: 'quarterly', monthOffset: 0, now });
assert.equal(quarterRange.startISO, '2026-08-01', 'trimestre inclui os dois meses anteriores');
assert.equal(quarterRange.endISO, '2026-10-31', 'trimestre termina no fim do mês selecionado');

const shifted = getDashboardRange({ period: 'monthly', monthOffset: 1, now });
assert.equal(shifted.monthKey, '2026-11', 'navegar adiante desloca o mês do painel');
assert.equal(shifted.startISO, '2026-11-01', 'navegação respeita limites do mês seguinte');

const summary = calculateDashboardSummary({ transactions, accounts, period: 'monthly', now, committedCents: 40000 });
assert.equal(summary.incomeCents, 300000, 'entradas consideram somente receitas pagas do período');
assert.equal(summary.expenseCents, 90000, 'saídas consideram somente despesas pagas do período');
assert.equal(summary.realizedCents, 210000, 'realizado é saldo líquido de receitas e despesas pagas');
assert.equal(summary.pendingNetCents, -25000, 'pendências são calculadas separadamente');
assert.equal(summary.projectedCents, 185000, 'previsto soma realizado e pendências líquidas');
assert.equal(summary.periodTransactions.some(tx => tx.id === 'transfer'), true, 'transferência permanece no período, mas não entra no cálculo de fluxo');
assert.equal(summary.periodTransactions.some(tx => tx.id === 'old'), false, 'lançamentos fora do intervalo não entram no resumo');
assert.equal(summary.periodTransactions.some(tx => tx.id === 'cancelled'), false, 'lançamentos cancelados ficam fora do resumo');
assert.equal(summary.netWorthCents, 100000 + 70000 + 300000 - 90000 - 50000, 'saldo atual deriva do livro-razão e ignora movimentações futuras');
assert.equal(summary.availableCents, summary.netWorthCents - 40000, 'disponível considera saldo das contas menos compromisso');
assert.match(formatDashboardRangeLabel(monthlyRange), /outubro de 2026/i, 'rótulo mensal identifica o mês selecionado');
assert.match(formatDashboardRangeLabel(weeklyRange), /26 de out/i, 'rótulo semanal mostra o intervalo mesmo quando cruza o mês');
console.log('Resumo do painel: 20 verificações aprovadas.');
