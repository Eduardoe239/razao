import { occurrenceDate, validateRecurringRule } from './recurring.js';

function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Materializes explicitly selected projected occurrences as pending real transactions.
 * Idempotency is enforced by both recurringId+date and a persisted idempotencyKey.
 */
export function materializeRecurringOccurrences({
  recurring = [], occurrences = [], transactions = [], accounts = [], categories = [],
  profileType = 'PF', createId = () => `tx-rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
} = {}) {
  if (!Array.isArray(occurrences) || !Array.isArray(recurring) || !Array.isArray(transactions)) {
    throw new Error('Dados de geração recorrente inválidos.');
  }
  const rulesById = new Map(recurring.filter(rule => rule && typeof rule.id === 'string').map(rule => [rule.id, rule]));
  const transactionKeys = new Set();
  for (const tx of transactions) {
    if (tx?.recurringId && tx?.recurringOccurrenceDate) transactionKeys.add(`${tx.recurringId}:${tx.recurringOccurrenceDate}`);
    if (tx?.idempotencyKey) transactionKeys.add(tx.idempotencyKey);
  }
  const accountIds = new Set(accounts.map(item => item?.id).filter(Boolean));
  const categoryIds = new Set(categories.map(item => item?.id).filter(Boolean));
  const requestedKeys = new Set();
  const added = [];
  const issues = [];
  let skipped = 0;

  for (const requested of occurrences) {
    const recurringId = requested?.recurringId;
    const date = requested?.recurringOccurrenceDate || requested?.date;
    if (typeof recurringId !== 'string' || !isValidISODate(date)) {
      skipped++; issues.push('Ocorrência com identificador ou data inválida.'); continue;
    }
    const occurrenceKey = `${recurringId}:${date}`;
    if (requestedKeys.has(occurrenceKey)) { skipped++; continue; }
    requestedKeys.add(occurrenceKey);
    const rule = rulesById.get(recurringId);
    if (!rule || !rule.active || (rule.profileType && rule.profileType !== profileType)) {
      skipped++; issues.push(`A regra recorrente ${recurringId} não está ativa neste perfil.`); continue;
    }
    const validation = validateRecurringRule({ ...rule, type: rule.type || 'despesa' });
    if (!validation.valid) { skipped++; issues.push(`Regra ${recurringId}: ${validation.reason}`); continue; }
    const parsed = new Date(`${date}T00:00:00Z`);
    const expectedDate = occurrenceDate(parsed.getUTCFullYear(), parsed.getUTCMonth(), rule.dayOfMonth);
    if (expectedDate !== date || (rule.startDate && date < rule.startDate) || (rule.endDate && date > rule.endDate)) {
      skipped++; issues.push(`A data ${date} não corresponde à vigência da regra ${recurringId}.`); continue;
    }
    const idempotencyKey = `recurring:${recurringId}:${date}`;
    if (transactionKeys.has(occurrenceKey) || transactionKeys.has(idempotencyKey)) { skipped++; continue; }
    if (!rule.accountId || !accountIds.has(rule.accountId)) {
      skipped++; issues.push(`A recorrência “${rule.description}” aponta para uma conta inexistente.`); continue;
    }
    if (rule.categoryId && !categoryIds.has(rule.categoryId)) {
      skipped++; issues.push(`A recorrência “${rule.description}” aponta para uma categoria inexistente.`); continue;
    }
    const txId = createId();
    if (typeof txId !== 'string' || !txId || transactions.some(tx => tx?.id === txId) || added.some(tx => tx.id === txId)) {
      skipped++; issues.push('Não foi possível criar um identificador único para o lançamento.'); continue;
    }
    const tx = {
      id: txId,
      description: rule.description.trim(),
      amountCents: rule.amountCents,
      type: rule.type || 'despesa',
      status: 'pendente',
      date,
      accountId: rule.accountId,
      ...(rule.categoryId ? { categoryId: rule.categoryId } : {}),
      profileType,
      source: 'recurring',
      recurringId,
      recurringOccurrenceDate: date,
      idempotencyKey
    };
    added.push(tx);
    transactionKeys.add(occurrenceKey);
    transactionKeys.add(idempotencyKey);
  }
  return { added, skipped, issues };
}
