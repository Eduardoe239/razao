/**
 * Livro-razão determinístico do Razão.
 * Valores sempre em centavos inteiros. Transferências são um único evento
 * com duas pernas (débito/crédito), não duas despesas/receitas independentes.
 */
const TYPES = new Set(['receita', 'despesa', 'transferencia']);
const STATUSES = new Set(['pago', 'pendente', 'cancelado']);

export function validateLedgerTransaction(tx) {
  if (!tx || typeof tx !== 'object') return { valid: false, reason: 'Lançamento inválido' };
  if (!tx.id || typeof tx.id !== 'string') return { valid: false, reason: 'Identificador obrigatório' };
  if (!TYPES.has(tx.type)) return { valid: false, reason: 'Tipo de lançamento inválido' };
  if (!STATUSES.has(tx.status)) return { valid: false, reason: 'Status de lançamento inválido' };
  if (!Number.isSafeInteger(tx.amountCents) || tx.amountCents <= 0) return { valid: false, reason: 'Valor deve ser positivo e expresso em centavos inteiros' };
  if (!tx.accountId || typeof tx.accountId !== 'string') return { valid: false, reason: 'Conta de origem obrigatória' };
  if (tx.type === 'transferencia') {
    if (!tx.toAccountId || typeof tx.toAccountId !== 'string') return { valid: false, reason: 'Conta de destino obrigatória para transferência' };
    if (tx.accountId === tx.toAccountId) return { valid: false, reason: 'Origem e destino da transferência devem ser diferentes' };
  }
  return { valid: true, reason: null };
}

/** Retorna o impacto de um evento em uma conta específica, em centavos. */
export function transactionImpactOnAccount(tx, accountId) {
  if (!tx || tx.status !== 'pago' || !accountId) return 0;
  const amount = Number.isSafeInteger(tx.amountCents) && tx.amountCents > 0 ? tx.amountCents : 0;
  if (!amount) return 0;
  if (tx.type === 'receita' && tx.accountId === accountId) return amount;
  if (tx.type === 'despesa' && tx.accountId === accountId) return -amount;
  if (tx.type === 'transferencia') {
    if (tx.accountId === accountId) return -amount;
    if (tx.toAccountId === accountId) return amount;
  }
  return 0;
}

export function accountLedger(account, transactions = []) {
  if (!account?.id) return { accountId: null, openingBalanceCents: 0, movementsCents: 0, balanceCents: 0, entries: [] };
  const entries = (Array.isArray(transactions) ? transactions : [])
    .filter(tx => transactionImpactOnAccount(tx, account.id) !== 0)
    .map(tx => ({ transactionId: tx.id, date: tx.date || null, description: tx.description || 'Lançamento', type: tx.type, status: tx.status, impactCents: transactionImpactOnAccount(tx, account.id) }));
  const openingBalanceCents = Number.isSafeInteger(account.initialBalanceCents) ? account.initialBalanceCents : 0;
  const movementsCents = entries.reduce((sum, entry) => sum + entry.impactCents, 0);
  return { accountId: account.id, openingBalanceCents, movementsCents, balanceCents: openingBalanceCents + movementsCents, entries };
}

export function auditLedger(accounts = [], transactions = [], options = {}) {
  const issues = [];
  const ids = new Set();
  for (const tx of Array.isArray(transactions) ? transactions : []) {
    const validation = validateLedgerTransaction(tx);
    if (!validation.valid) issues.push({ transactionId: tx?.id ?? null, reason: validation.reason });
    if (tx?.id && ids.has(tx.id)) issues.push({ transactionId: tx.id, reason: 'Identificador de lançamento duplicado' });
    if (tx?.id) ids.add(tx.id);
  }
  const accountIds = new Set((Array.isArray(accounts) ? accounts : []).map(a => a?.id).filter(Boolean));
  const virtualAccountIds = new Set(Array.isArray(options?.virtualAccountIds) ? options.virtualAccountIds.filter(id => typeof id === 'string' && id) : []);
  for (const tx of Array.isArray(transactions) ? transactions : []) {
    if (!tx || tx.status === 'cancelado') continue;
    if (tx.accountId && !accountIds.has(tx.accountId) && !virtualAccountIds.has(tx.accountId)) issues.push({ transactionId: tx.id ?? null, reason: `Conta de origem inexistente: ${tx.accountId}` });
    if (tx.type === 'transferencia' && tx.toAccountId && !accountIds.has(tx.toAccountId) && !virtualAccountIds.has(tx.toAccountId)) issues.push({ transactionId: tx.id ?? null, reason: `Conta de destino inexistente: ${tx.toAccountId}` });
  }
  return { valid: issues.length === 0, issues, checkedTransactions: Array.isArray(transactions) ? transactions.length : 0, checkedAccounts: Array.isArray(accounts) ? accounts.length : 0 };
}
