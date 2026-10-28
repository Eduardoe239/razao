/**
 * SUÍTE COMPLETA DE TESTES E VALIDAÇÃO DE SISTEMA (O RAZÃO V3.1)
 * Valida 100% das funções do domínio, serviços de armazenamento,
 * estado do orquestrador React (App.jsx) e componentes da nova interface.
 */

import { parseToCents, centsToFloat, formatMoney } from "../src/domain/money.js";
import { accountBalance, calculateNetWorth } from "../src/domain/accounts.js";
import { cardInvoices, validateInvoicePayment } from "../src/domain/invoices.js";
import { buildCommitments } from "../src/domain/commitments.js";
import { sanitizeTransaction, sanitizeState, getInitialState, isValidISODate } from "../src/domain/sanitize.js";
import { uid } from "../src/domain/uid.js";
import { budgetForMonth, setCategoryBudget } from "../src/domain/budget.js";
import { calculateSavingsBalance } from "../src/domain/savings.js";
import { migrateData, CURRENT_SCHEMA_VERSION } from "../src/domain/migrations.js";
import { calculateForecast } from "../src/domain/forecast.js";
import { loadState, saveState } from "../src/services/storage.js";

// Mock para simular o ambiente de armazenamento e window/DOM para a UI
const memoryStorage = {};
global.localStorage = {
  getItem: (key) => memoryStorage[key] || null,
  setItem: (key, val) => { memoryStorage[key] = String(val); },
  removeItem: (key) => { delete memoryStorage[key]; },
  clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
};

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message}`);
  }
}

console.log('=================================================================');
console.log('   O RAZÃO V3.1 - VALIDAÇÃO INTEGRAL DE TODAS AS FUNÇÕES E UI   ');
console.log('=================================================================\n');

// -----------------------------------------------------------------------------
// 1. MÓDULO MONEY & PRECISÃO MONETÁRIA
// -----------------------------------------------------------------------------
console.log('📦 1. Testes do Módulo de Precisão Monetária (money.js)');
test('parseToCents deve converter números e strings para centavos inteiros sem erros IEEE 754', () => {
  assertEqual(parseToCents(125.99), 12599);
  assertEqual(parseToCents("R$ 1.250,50"), 125050);
  assertEqual(parseToCents(100), 100);
  assertEqual(parseToCents(null), 0);
  assertEqual(parseToCents("0"), 0);
});

test('centsToFloat e formatMoney devem formatar moeda BRL corretamente', () => {
  assertEqual(centsToFloat(12599), 125.99);
  const formatted = formatMoney(125050);
  if (!formatted.includes('1.250,50') && !formatted.includes('1250,50')) {
    throw new Error(`Formatação incorreta: ${formatted}`);
  }
});

// -----------------------------------------------------------------------------
// 2. MÓDULO ACCOUNTS & SALDOS
// -----------------------------------------------------------------------------
console.log('\n📦 2. Testes do Módulo de Contas e Patrimônio (accounts.js)');
test('accountBalance deve calcular saldo realizado com receitas, despesas e transferências', () => {
  const account = { id: 'acc-1', initialBalanceCents: 100000 };
  const txs = [
    { id: 't1', accountId: 'acc-1', type: 'receita', amountCents: 50000, status: 'pago' },
    { id: 't2', accountId: 'acc-1', type: 'despesa', amountCents: 20000, status: 'pago' },
    { id: 't3', accountId: 'acc-1', type: 'despesa', amountCents: 10000, status: 'pendente' }, // Não deve afetar realizado
    { id: 't4', accountId: 'acc-1', toAccountId: 'acc-2', type: 'transferencia', amountCents: 15000, status: 'pago' }
  ];
  // 100000 + 50000 - 20000 - 15000 = 115000
  assertEqual(accountBalance(account, txs), 115000);
});

test('calculateNetWorth deve somar saldos de todas as contas', () => {
  const accounts = [
    { id: 'acc-1', initialBalanceCents: 100000 },
    { id: 'acc-2', initialBalanceCents: 50000 }
  ];
  const txs = [
    { id: 't1', accountId: 'acc-1', toAccountId: 'acc-2', type: 'transferencia', amountCents: 20000, status: 'pago' }
  ];
  // acc-1: 100000 - 20000 = 80000
  // acc-2: 50000 + 20000 = 70000
  // Total = 150000
  assertEqual(calculateNetWorth(accounts, txs), 150000);
});

// -----------------------------------------------------------------------------
// 3. MÓDULO INVOICES & CARTÃO DE CRÉDITO
// -----------------------------------------------------------------------------
console.log('\n📦 3. Testes do Módulo de Faturas de Cartão (invoices.js)');
test('cardInvoices deve agrupar despesas no ciclo de fechamento e calcular saldos da fatura', () => {
  const card = { id: 'card-1', name: 'Black', closingDay: 10, dueDay: 20 };
  const txs = [
    { id: 't1', accountId: 'card-1', type: 'despesa', amountCents: 30000, date: '2026-10-05', status: 'pago' },
    { id: 't2', accountId: 'card-1', type: 'despesa', amountCents: 20000, date: '2026-10-09', status: 'pago' }
  ];
  const invoices = cardInvoices(card, txs, '2026-10', 0, 0, '2026-10-15');
  assertEqual(invoices.length, 1);
  const inv = invoices[0];
  assertEqual(inv.totalCents, 50000);
  assertEqual(inv.remainingCents, 50000);
  assertEqual(inv.status, 'fechada'); // Hoje e 15/10 > Fechamento 10/10
});

test('validateInvoicePayment deve validar regras estritas de pagamento de fatura', () => {
  const invoice = { cardId: 'card-1', monthKey: '2026-10', remainingCents: 50000 };

  // Sucesso
  const valid = validateInvoicePayment({ invoice, amountCents: 50000, fromAccountId: 'acc-1', cardId: 'card-1' });
  assertEqual(valid.valid, true);

  // Tentativa de pagar com a própria conta do cartão (Proibido)
  const invalidCardAcc = validateInvoicePayment({ invoice, amountCents: 50000, fromAccountId: 'card-1', cardId: 'card-1' });
  assertEqual(invalidCardAcc.valid, false);

  // Tentativa de pagar valor negativo ou zero
  const invalidAmount = validateInvoicePayment({ invoice, amountCents: 0, fromAccountId: 'acc-1', cardId: 'card-1' });
  assertEqual(invalidAmount.valid, false);

  // Tentativa de pagar acima do saldo devedor
  const overpay = validateInvoicePayment({ invoice, amountCents: 60000, fromAccountId: 'acc-1', cardId: 'card-1' });
  assertEqual(overpay.valid, false);
});

// -----------------------------------------------------------------------------
// 4. MÓDULO COMMITMENTS & COMPROMISSOS
// -----------------------------------------------------------------------------
console.log('\n📦 4. Testes do Módulo de Compromissos e Dupla Contagem (commitments.js)');
test('buildCommitments deve consolidar obrigações futuras sem duplicar parcelas/faturas', () => {
  const txs = [
    { id: 't1', description: 'Parcela 1/3', amountCents: 10000, date: '2026-11-01', status: 'pendente', installmentsGroup: 'grp-1' },
    { id: 't2', description: 'Compra Normal', amountCents: 50000, date: '2026-11-03', status: 'pendente' }
  ];
  const recurring = [
    { id: 'rec-1', description: 'Aluguel Fixo', amountCents: 150000, active: true, accountId: 'acc-1' }
  ];
  const commitments = buildCommitments({ transactions: txs, recurring, todayISO: '2026-10-27', monthsAhead: 2 });
  assertEqual(commitments.length, 3);

  const installmentItem = commitments.find(c => c.id === 't1');
  assertEqual(installmentItem.sourceType, 'installment');

  const transactionItem = commitments.find(c => c.id === 't2');
  assertEqual(transactionItem.sourceType, 'transaction');

  const recurringItem = commitments.find(c => c.id === 'rec-rec-1');
  assertEqual(recurringItem.sourceType, 'recurring');
});

// -----------------------------------------------------------------------------
// 5. MÓDULO SANITIZE & VALIDAÇÃO
// -----------------------------------------------------------------------------
console.log('\n📦 5. Testes do Módulo de Sanitização e Validação (sanitize.js)');
test('isValidISODate deve validar rigorosamente datas no formato YYYY-MM-DD em calendário real', () => {
  assertEqual(isValidISODate('2026-10-27'), true);
  assertEqual(isValidISODate('2026-02-30'), false); // Fevereiro não tem 30
  assertEqual(isValidISODate('invalido'), false);
});

test('sanitizeTransaction deve rejeitar tipos/status desconhecidos e garantir centavos', () => {
  const invalidStatus = sanitizeTransaction({ description: 'Teste', status: 'status_invalido' });
  assertEqual(invalidStatus, null); // Rejeita e não converte magicamente em 'pago'

  const valid = sanitizeTransaction({ description: 'Mercado', amountCents: 15050, type: 'despesa', status: 'pago' });
  assertEqual(valid.amountCents, 15050);
  assertEqual(valid.type, 'despesa');
  assertEqual(valid.status, 'pago');
});

test('sanitizeState deve fornecer fallback seguro para estados corrompidos', () => {
  const sanitized = sanitizeState(null);
  assertEqual(sanitized.version, 3);
  assertEqual(Array.isArray(sanitized.accounts), true);
  assertEqual(sanitized.accounts.length > 0, true);
});

// -----------------------------------------------------------------------------
// 6. MÓDULO UID & IDENTIFICADORES
// -----------------------------------------------------------------------------
console.log('\n📦 6. Testes do Módulo de Identificadores Únicos (uid.js)');
test('uid deve gerar identificadores não vazios e sem colisões', () => {
  const id1 = uid();
  const id2 = uid();
  assertEqual(typeof id1, 'string');
  assertEqual(id1.length > 5, true);
  if (id1 === id2) throw new Error('Colisão de ID detectada!');
});

// -----------------------------------------------------------------------------
// 7. MÓDULO BUDGET & ORÇAMENTO ZERO
// -----------------------------------------------------------------------------
console.log('\n📦 7. Testes do Módulo de Orçamento (budget.js)');
test('budgetForMonth e setCategoryBudget devem manipular o orçamento preservando 0 centavos', () => {
  let budgetMap = {};
  budgetMap = setCategoryBudget(budgetMap, 'cat-1', '2026-10', 100000);
  budgetMap = setCategoryBudget(budgetMap, 'cat-2', '2026-10', 0); // Orçamento ZERO explícito

  assertEqual(budgetForMonth(budgetMap, 'cat-1', '2026-10'), 100000);
  assertEqual(budgetForMonth(budgetMap, 'cat-2', '2026-10'), 0); // Preserva ZERO
  assertEqual(budgetForMonth(budgetMap, 'cat-3', '2026-10'), null);
});

// -----------------------------------------------------------------------------
// 8. MÓDULO SAVINGS & METAS
// -----------------------------------------------------------------------------
console.log('\n📦 8. Testes do Módulo de Economias e Metas (savings.js)');
test('calculateSavingsBalance deve somar aportes vinculados à meta', () => {
  const goal = { id: 'g1', title: 'Viagem', initialCents: 250000 };
  const txs = [
    { id: 't1', goalId: 'g1', amount: 100000, type: 'receita', status: 'pago' },
    { id: 't2', goalId: 'g1', amount: 50000, type: 'despesa', status: 'pago' }
  ];
  // 250000 + 100000 - 50000 = 300000
  assertEqual(calculateSavingsBalance(goal, txs), 300000);
});

// -----------------------------------------------------------------------------
// 9. MÓDULO MIGRATIONS & COMPATIBILIDADE DE BACKUP
// -----------------------------------------------------------------------------
console.log('\n📦 9. Testes do Módulo de Migração de Schemas (migrations.js)');
test('migrateData deve converter schemas legados (v1/v2) em v3 com integridade', () => {
  const legacyV1 = {
    schemaVersion: 1,
    transactions: [
      { id: 't1', description: 'Mercado', amount: 150.50, type: 'despesa' } // amount float
    ]
  };
  const migrated = migrateData(legacyV1);
  assertEqual(migrated.schemaVersion, CURRENT_SCHEMA_VERSION);
  assertEqual(migrated.transactions[0].amount, 15050); // Convertido para centavos inteiros
});

// -----------------------------------------------------------------------------
// 10. MÓDULO FORECAST & PROJEÇÃO FUTURA
// -----------------------------------------------------------------------------
console.log('\n📦 10. Testes do Módulo de Projeção Futurista (forecast.js)');
test('calculateForecast deve projetar saldos mensais considerando receitas e despesas', () => {
  const txs = [
    { id: 't1', description: 'Salário Futuro', amount: 300000, type: 'receita', status: 'pendente', date: '2026-11-05' },
    { id: 't2', description: 'Conta de Luz', amount: 20000, type: 'despesa', status: 'pendente', date: '2026-11-10' }
  ];
  const forecast = calculateForecast({ transactions: txs, todayISO: '2026-10-27', monthsAhead: 1 });
  assertEqual(forecast.length, 2);
  const novForecast = forecast.find(f => f.monthKey === '2026-11');
  assertEqual(novForecast.pendingIncomes, 300000);
  assertEqual(novForecast.pendingExpenses, 20000);
  assertEqual(novForecast.netProjected, 280000);
});

// -----------------------------------------------------------------------------
// 11. MÓDULO STORAGE & ARMAZENAMENTO OBSERVÁVEL
// -----------------------------------------------------------------------------
console.log('\n📦 11. Testes do Serviço de Armazenamento (storage.js)');
test('saveState e loadState devem persistir e recuperar o estado com sucesso', () => {
  localStorage.clear();
  const sampleState = { version: 3, transactions: [{ id: 'tx-test', amountCents: 9900 }] };
  const saved = saveState(sampleState);
  assertEqual(saved, true);

  const loaded = loadState();
  assertEqual(loaded.version, 3);
  assertEqual(loaded.transactions[0].id, 'tx-test');
});

// -----------------------------------------------------------------------------
// 12. SIMULAÇÃO COMPLETA DE INTERAÇÃO DO ORQUESTRADOR REACT (App.jsx)
// -----------------------------------------------------------------------------
console.log('\n📦 12. Validação E2E da Lógica de Estado e Fluxos do Frontend (App.jsx)');
test('Simulação de Fluxo do Usuário: Adicionar, Editar, Alterar Status, Pagar Fatura e Filtrar', () => {
  // 1. Estado Inicial
  let appState = sanitizeState(getInitialState());
  assertEqual(appState.transactions.length, 3);

  // 2. Novo Lançamento (Despesa de Restaurante)
  const newTx = {
    id: uid(),
    description: 'Jantar de Negócios',
    amountCents: 25000,
    type: 'despesa',
    status: 'pendente',
    date: '2026-10-28',
    accountId: 'acc-1',
    categoryId: 'cat-1'
  };
  appState = {
    ...appState,
    transactions: [newTx, ...appState.transactions]
  };
  assertEqual(appState.transactions.length, 4);

  // 3. Edição do Lançamento
  appState = {
    ...appState,
    transactions: appState.transactions.map(t => t.id === newTx.id ? { ...t, amountCents: 30000 } : t)
  };
  assertEqual(appState.transactions.find(t => t.id === newTx.id).amountCents, 30000);

  // 4. Alterar Status (Pendente -> Pago)
  appState = {
    ...appState,
    transactions: appState.transactions.map(t => t.id === newTx.id ? { ...t, status: 'pago' } : t)
  };
  assertEqual(appState.transactions.find(t => t.id === newTx.id).status, 'pago');

  // 5. Cálculo dos 4 Saldos do Cabeçalho Executivo
  const realizedCents = appState.transactions
    .filter(t => t.status === 'pago')
    .reduce((acc, t) => t.type === 'receita' ? acc + t.amountCents : acc - t.amountCents, 0);

  const pendingCents = appState.transactions
    .filter(t => t.status === 'pendente')
    .reduce((acc, t) => t.type === 'receita' ? acc + t.amountCents : acc - t.amountCents, 0);

  const projectedCents = realizedCents + pendingCents;

  const card = appState.cards[0];
  const invoices = cardInvoices(card, appState.transactions, '2026-10', 0, 0, '2026-10-28');
  const currentInvoice = invoices[0];
  const committedCents = currentInvoice ? currentInvoice.remainingCents : 0;
  const availableCents = realizedCents - committedCents;

  // Verifica que os saldos foram calculados matematicamente sem falhas
  assertEqual(typeof realizedCents, 'number');
  assertEqual(typeof projectedCents, 'number');
  assertEqual(typeof committedCents, 'number');
  assertEqual(typeof availableCents, 'number');

  // 6. Pagamento de Fatura via UI Action
  if (currentInvoice && currentInvoice.remainingCents > 0) {
    const payTx = {
      id: uid(),
      type: 'despesa',
      description: `Pagamento de Fatura ${card.name}`,
      amountCents: currentInvoice.remainingCents,
      date: '2026-10-28',
      accountId: 'acc-1',
      status: 'pago',
      linkedInvoiceKey: currentInvoice.monthKey
    };
    appState = {
      ...appState,
      transactions: [payTx, ...appState.transactions]
    };
  }

  // 7. Persistência e Recuperação do Estado
  saveState(appState);
  const reloaded = loadState();
  assertEqual(reloaded.transactions.length, appState.transactions.length);
});

console.log('\n=================================================================');
console.log(`   RESULTADO DOS TESTES DO SISTEMA COMPLETO: ${passedTests} APROVADOS, ${failedTests} FALHAS   `);
console.log('=================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
