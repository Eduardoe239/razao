import { sanitizeAuditLog } from './auditLog.js';
/**
 * MÓDULO DE SANITIZAÇÃO DE DADOS (O RAZÃO 3.0)
 * Elimina conversão automática de status desconhecidos em "pago".
 * Rejeita ou marca estados inválidos rigorosamente.
 */

const VALID_STATUS = new Set(['pago', 'pendente', 'cancelado']);
const VALID_TYPES = new Set(['receita', 'despesa', 'transferencia']);
const DEFAULT_CATEGORY_TEMPLATES = [
  ['1', 'Alimentação', 'despesa'],
  ['2', 'Moradia', 'despesa'],
  ['3', 'Transporte', 'despesa'],
  ['4', 'Salário', 'receita'],
  ['5', 'Outras receitas', 'receita']
];

function createDefaultCategoriesForLegacyState() {
  return DEFAULT_CATEGORY_TEMPLATES.map(([id, name, type]) => ({ id: `cat-${id}`, name, type, profileType: 'PF' }));
}

export function isValidISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function sanitizeTransaction(t) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return null;
  const id = typeof t.id === 'string' && t.id.trim() ? t.id.trim().slice(0, 160) : null;
  if (!id) return null; // Sanitização nunca inventa um ID que não possa ser repetido.

  // Valores atuais são centavos inteiros. Um campo explícito inválido não pode
  // cair silenciosamente no caminho de compatibilidade `amount`.
  let amountCents;
  if (Object.prototype.hasOwnProperty.call(t, 'amountCents')) {
    if (!Number.isSafeInteger(t.amountCents) || t.amountCents < 0) return null;
    amountCents = t.amountCents;
  } else if (typeof t.amount === 'number' && Number.isFinite(t.amount) && t.amount >= 0) {
    const calculatedCents = t.amount * 100;
    amountCents = Math.round(calculatedCents);
    if (!Number.isSafeInteger(amountCents) || Math.abs(calculatedCents - amountCents) > 1e-6) return null;
  } else {
    return null;
  }

  // Validação de data calendário real
  if (t.date && !isValidISODate(t.date)) return null;

  // Rejeição de status ou tipo inválidos
  if (t.status && !VALID_STATUS.has(t.status)) return null;
  if (t.type && !VALID_TYPES.has(t.type)) return null;

  return {
    id,
    description: String(t.description || 'Lançamento').trim().slice(0, 500),
    amountCents,
    type: t.type || 'despesa',
    status: t.status || 'pago',
    date: t.date || new Date().toISOString().slice(0, 10),
    accountId: typeof t.accountId === 'string' && t.accountId.trim() ? t.accountId.trim() : undefined,
    toAccountId: typeof t.toAccountId === 'string' ? t.toAccountId : undefined,
    categoryId: typeof t.categoryId === 'string' && t.categoryId.trim() ? t.categoryId.trim() : undefined,
    installmentsTotal: t.installmentsTotal || 1,
    installmentIndex: t.installmentIndex || 1,
    installmentsGroup: t.installmentsGroup || null,
    // Metadados de negócio precisam sobreviver ao ciclo salvar/recarregar.
    // Sem eles, pagamentos de fatura deixam de ser vinculados após a hidratação.
    profileType: t.profileType === 'PJ' ? 'PJ' : (t.profileType === 'PF' ? 'PF' : undefined),
    linkedInvoiceKey: typeof t.linkedInvoiceKey === 'string' && /^\d{4}-\d{2}$/.test(t.linkedInvoiceKey) ? t.linkedInvoiceKey : undefined,
    linkedCardId: typeof t.linkedCardId === 'string' ? t.linkedCardId : undefined,
    idempotencyKey: typeof t.idempotencyKey === 'string' ? t.idempotencyKey : undefined,
    importedId: typeof t.importedId === 'string' ? t.importedId : undefined,
    source: ['ofx', 'csv', 'ocr', 'open_finance_demo', 'open_finance', 'balance_reconciliation_adjustment', 'recurring'].includes(t.source) ? t.source : undefined,
    recurringId: typeof t.recurringId === 'string' ? t.recurringId.slice(0, 160) : undefined,
    recurringOccurrenceDate: isValidISODate(t.recurringOccurrenceDate) ? t.recurringOccurrenceDate : undefined,
    reconciliationKey: typeof t.reconciliationKey === 'string' && t.reconciliationKey.length <= 400 ? t.reconciliationKey : undefined,
    reconciliationAdjustment: t.reconciliationAdjustment && typeof t.reconciliationAdjustment === 'object' && !Array.isArray(t.reconciliationAdjustment)
      ? {
          kind: ['income', 'expense', 'transfer'].includes(t.reconciliationAdjustment.kind) ? t.reconciliationAdjustment.kind : undefined,
          statementDate: isValidISODate(t.reconciliationAdjustment.statementDate) ? t.reconciliationAdjustment.statementDate : undefined,
          statementBalanceCents: Number.isSafeInteger(t.reconciliationAdjustment.statementBalanceCents) ? t.reconciliationAdjustment.statementBalanceCents : undefined,
          priorCalculatedBalanceCents: Number.isSafeInteger(t.reconciliationAdjustment.priorCalculatedBalanceCents) ? t.reconciliationAdjustment.priorCalculatedBalanceCents : undefined,
          priorDifferenceCents: Number.isSafeInteger(t.reconciliationAdjustment.priorDifferenceCents) ? t.reconciliationAdjustment.priorDifferenceCents : undefined,
          note: typeof t.reconciliationAdjustment.note === 'string' ? t.reconciliationAdjustment.note.slice(0, 200) : undefined
        }
      : undefined
  };
}

export function sanitizeTransactions(transactions) {
  if (!Array.isArray(transactions)) return [];
  return transactions.map(sanitizeTransaction).filter(Boolean);
}

export function sanitizeState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    // Never substitute synthetic balances/transactions for malformed input.
    // The demo fixture remains available explicitly through getInitialState().
    return createFreshState();
  }

  const sanitizedTransactions = sanitizeTransactions(state.transactions);

  // Não instanciar o fixture de demonstração durante a sanitização.
  const sanitizedAccounts = Array.isArray(state.accounts) ? state.accounts : [];

  const sanitizedCategories = Array.isArray(state.categories) ? state.categories : createDefaultCategoriesForLegacyState();

  const sanitizedCards = Array.isArray(state.cards) ? state.cards : [];

  return {
    ...state,
    version: 4,
    schemaVersion: 4,
    accounts: sanitizedAccounts,
    categories: sanitizedCategories,
    cards: sanitizedCards,
    transactions: sanitizedTransactions,
    auditLog: sanitizeAuditLog(state.auditLog),
    budgets: state.budgets && typeof state.budgets === 'object' ? state.budgets : {},
    settings: state.settings && typeof state.settings === 'object' ? state.settings : {}
  };
}

/**
 * Estado inicial utilizável sem transações ou saldos fictícios.
 * Cria somente uma conta de saldo zero e categorias locais por perfil; não
 * cria cartões, lançamentos, renda ou despesas de demonstração.
 */
export function createFreshState() {
  const categoryTemplates = DEFAULT_CATEGORY_TEMPLATES;
  return {
    version: 4,
    schemaVersion: 4,
    accounts: [
      { id: 'acc-1', name: 'Minha conta principal', initialBalanceCents: 0, profileType: 'PF' },
      { id: 'acc-pj-1', name: 'Conta principal da empresa', initialBalanceCents: 0, profileType: 'PJ' }
    ],
    categories: categoryTemplates.flatMap(([id, name, type]) => [
      { id: `cat-${id}`, name, type, profileType: 'PF' },
      { id: `cat-pj-${id}`, name, type, profileType: 'PJ' }
    ]),
    cards: [],
    transactions: [],
    recurring: [],
    auditLog: [],
    budgets: {},
    settings: { categoryLearningRulesByProfile: { PF: {}, PJ: {} } }
  };
}

export function getInitialState() {
  return {
    version: 4,
    schemaVersion: 4,
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
    auditLog: [],
    transactions: [
      { id: 'tx-1', description: 'Salário Mensal', amountCents: 850000, type: 'receita', status: 'pago', date: '2026-10-05', accountId: 'acc-1', categoryId: 'cat-4' },
      { id: 'tx-2', description: 'Supermercado Mensal', amountCents: 125000, type: 'despesa', status: 'pago', date: '2026-10-12', accountId: 'acc-1', categoryId: 'cat-1' },
      { id: 'tx-3', description: 'Assinatura de Software', amountCents: 9900, type: 'despesa', status: 'pendente', date: '2026-10-28', accountId: 'acc-1', categoryId: 'cat-2' }
    ]
  };
}
