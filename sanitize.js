/**
 * MÓDULO DE SANITIZAÇÃO DE DADOS (O RAZÃO 3.0)
 * Elimina conversão automática de status desconhecidos em "pago".
 * Rejeita ou marca estados inválidos rigorosamente.
 */

const VALID_STATUS = new Set(['pago', 'pendente']);
const VALID_TYPES = new Set(['receita', 'despesa', 'transferencia']);

export function isValidISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function sanitizeTransaction(t) {
  if (!t || typeof t !== 'object') return null;

  // Validação de data calendário real
  if (t.date && !isValidISODate(t.date)) return null;

  // Rejeição de status ou tipo inválidos
  if (t.status && !VALID_STATUS.has(t.status)) return null;
  if (t.type && !VALID_TYPES.has(t.type)) return null;

  return {
    id: t.id || String(Math.random()),
    description: String(t.description || 'Lançamento'),
    amountCents: Number.isInteger(t.amountCents) ? Math.max(0, t.amountCents) : Math.round((t.amount || 0) * 100),
    type: t.type || 'despesa',
    status: t.status || 'pago',
    date: t.date || new Date().toISOString().slice(0, 10),
    accountId: t.accountId || 'acc-1',
    toAccountId: t.toAccountId,
    categoryId: t.categoryId || 'cat-1',
    installmentsTotal: t.installmentsTotal || 1,
    installmentIndex: t.installmentIndex || 1,
    installmentsGroup: t.installmentsGroup || null
  };
}

export function sanitizeTransactions(transactions) {
  if (!Array.isArray(transactions)) return [];
  return transactions.map(sanitizeTransaction).filter(Boolean);
}

export function sanitizeState(state) {
  if (!state || typeof state !== 'object') {
    return getInitialState();
  }

  const sanitizedTransactions = sanitizeTransactions(state.transactions);

  const sanitizedAccounts = Array.isArray(state.accounts) && state.accounts.length > 0
    ? state.accounts
    : getInitialState().accounts;

  const sanitizedCategories = Array.isArray(state.categories) && state.categories.length > 0
    ? state.categories
    : getInitialState().categories;

  const sanitizedCards = Array.isArray(state.cards) && state.cards.length > 0
    ? state.cards
    : getInitialState().cards;

  return {
    version: 3,
    accounts: sanitizedAccounts,
    categories: sanitizedCategories,
    cards: sanitizedCards,
    transactions: sanitizedTransactions
  };
}

export function getInitialState() {
  return {
    version: 3,
    accounts: [
      { id: 'acc-1', name: 'Conta Principal', initialBalanceCents: 250000 },
      { id: 'acc-2', name: 'Reserva de Emergência', initialBalanceCents: 1000000 }
    ],
    categories: [
      { id: 'cat-1', name: 'Alimentação', type: 'despesa' },
      { id: 'cat-2', name: 'Moradia', type: 'despesa' },
      { id: 'cat-3', name: 'Transporte', type: 'despesa' },
      { id: 'cat-4', name: 'Salário', type: 'receita' },
      { id: 'cat-5', name: 'Investimentos', type: 'receita' }
    ],
    cards: [
      { id: 'card-1', name: 'Cartão Black Principal', limitCents: 1500000, closingDay: 10, dueDay: 20 }
    ],
    transactions: [
      { id: 'tx-1', description: 'Salário Mensal', amountCents: 850000, type: 'receita', status: 'pago', date: '2026-10-05', accountId: 'acc-1', categoryId: 'cat-4' },
      { id: 'tx-2', description: 'Supermercado Mensal', amountCents: 125000, type: 'despesa', status: 'pago', date: '2026-10-12', accountId: 'acc-1', categoryId: 'cat-1' },
      { id: 'tx-3', description: 'Assinatura de Software', amountCents: 9900, type: 'despesa', status: 'pendente', date: '2026-10-28', accountId: 'acc-1', categoryId: 'cat-2' }
    ]
  };
}
