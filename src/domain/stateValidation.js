import { isValidISODate } from './sanitize.js';

const VALID_TYPES = new Set(['receita', 'despesa', 'transferencia']);
const VALID_STATUSES = new Set(['pago', 'pendente', 'cancelado']);
const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Structural gate for persisted financial state. It deliberately validates before
 * sanitizeState: malformed transactions must not be silently filtered and then
 * autosaved over the only remaining copy. Legacy states may omit fields that the
 * current sanitizer can migrate, but present invalid values and unstable IDs fail.
 */
export function validateStateStructure(value, { requireCurrentSchema = Number(value?.version) >= 4, allowProfileMigration = false } = {}) {
  const issues = [];
  if (!isRecord(value)) return { valid: false, issues: ['O estado deve ser um objeto JSON.'] };
  // Schema metadata is part of the persistence contract. Missing schemaVersion
  // is accepted for pre-beta.18 states so the boot migrator can upgrade them;
  // explicit but invalid/conflicting declarations are never silently ignored.
  for (const field of ['version', 'schemaVersion']) {
    if (value[field] === undefined || value[field] === null) continue;
    if (!Number.isInteger(value[field]) || value[field] < 1 || value[field] > 4) {
      issues.push(`A propriedade ${field} contém uma versão de schema não suportada.`);
    }
  }
  if (value.version !== undefined && value.version !== null
      && value.schemaVersion !== undefined && value.schemaVersion !== null
      && value.version !== value.schemaVersion) {
    issues.push('As propriedades version e schemaVersion estão divergentes.');
  }
  if (!Array.isArray(value.accounts)) { if (requireCurrentSchema) issues.push('A lista de contas está ausente ou inválida.'); else return { valid: true, issues: [] }; }
  if (!Array.isArray(value.transactions)) { if (requireCurrentSchema) issues.push('A lista de lançamentos está ausente ou inválida.'); else return { valid: true, issues: [] }; }
  if (value.categories !== undefined && !Array.isArray(value.categories)) issues.push('A lista de categorias é inválida.');
  if (value.cards !== undefined && !Array.isArray(value.cards)) issues.push('A lista de cartões é inválida.');
  if (value.auditLog !== undefined && !Array.isArray(value.auditLog)) issues.push('O histórico de auditoria é inválido.');
  if (value.recurring !== undefined && !Array.isArray(value.recurring)) issues.push('A lista de recorrências é inválida.');
  if (value.budgets !== undefined && !isRecord(value.budgets)) issues.push('O mapa de orçamentos é inválido.');
  if (!Array.isArray(value.accounts) || !Array.isArray(value.transactions)) return { valid: false, issues };

  const validateEntities = (items, label) => {
    const ids = new Set();
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!isRecord(item)) {
        issues.push(`${label} ${index + 1} não é um objeto válido.`);
        continue;
      }
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      if (!id) issues.push(`${label} ${index + 1} não possui identificador estável.`);
      else if (ids.has(id)) issues.push(`Identificador duplicado em ${label.toLowerCase()}: ${id}.`);
      else ids.add(id);
    }
    return ids;
  };

  const accountIds = validateEntities(value.accounts, 'Conta');
  const cardIds = Array.isArray(value.cards) ? validateEntities(value.cards, 'Cartão') : new Set();
  const categoryIds = validateEntities(value.categories || [], 'Categoria');
  const accountById = new Map(value.accounts.filter(isRecord).map(item => [item.id, item]));
  const cardById = new Map((Array.isArray(value.cards) ? value.cards : []).filter(isRecord).map(item => [item.id, item]));
  const categoryById = new Map((value.categories || []).filter(isRecord).map(item => [item.id, item]));
  const transactionIds = new Set();

  value.accounts.forEach((account, index) => {
    if (!isRecord(account)) return;
    if (account.initialBalanceCents !== undefined && !Number.isSafeInteger(account.initialBalanceCents)) {
      issues.push(`A conta ${account.id || index + 1} possui saldo inicial que não está em centavos inteiros.`);
    }
    if (account.profileType !== undefined && !['PF', 'PJ'].includes(account.profileType)) issues.push(`A conta ${account.id || index + 1} possui perfil inválido.`);
  });
  (value.cards || []).forEach((card, index) => {
    if (!isRecord(card)) return;
    if (card.limitCents !== undefined && (!Number.isSafeInteger(card.limitCents) || card.limitCents < 0)) issues.push(`O cartão ${card.id || index + 1} possui limite inválido em centavos.`);
    if (card.closingDay !== undefined && (!Number.isInteger(card.closingDay) || card.closingDay < 1 || card.closingDay > 31)) issues.push(`O cartão ${card.id || index + 1} possui dia de fechamento inválido.`);
    if (card.dueDay !== undefined && (!Number.isInteger(card.dueDay) || card.dueDay < 1 || card.dueDay > 31)) issues.push(`O cartão ${card.id || index + 1} possui dia de vencimento inválido.`);
    if (card.profileType !== undefined && !['PF', 'PJ'].includes(card.profileType)) issues.push(`O cartão ${card.id || index + 1} possui perfil inválido.`);
  });
  (value.categories || []).forEach((category, index) => {
    if (!isRecord(category)) return;
    if (category.profileType !== undefined && !['PF', 'PJ'].includes(category.profileType)) issues.push(`A categoria ${category.id || index + 1} possui perfil inválido.`);
    if (category.type !== undefined && !['receita', 'despesa'].includes(category.type)) issues.push(`A categoria ${category.id || index + 1} possui tipo inválido.`);
  });

  value.transactions.forEach((tx, index) => {
    const label = `Lançamento ${index + 1}`;
    if (!isRecord(tx)) { issues.push(`${label} não é um objeto válido.`); return; }
    const id = typeof tx.id === 'string' ? tx.id.trim() : '';
    if (!id) issues.push(`${label} não possui identificador estável.`);
    else if (transactionIds.has(id)) issues.push(`Identificador de lançamento duplicado: ${id}.`);
    else transactionIds.add(id);

    if (tx.amountCents !== undefined) {
      if (!Number.isSafeInteger(tx.amountCents) || tx.amountCents < 0) issues.push(`${label} possui valor inválido em centavos.`);
    } else if (requireCurrentSchema || (tx.amount !== undefined && (!Number.isFinite(tx.amount) || tx.amount < 0))) {
      issues.push(`${label} não possui valor monetário válido.`);
    }
    if (tx.type !== undefined && !VALID_TYPES.has(tx.type)) issues.push(`${label} possui tipo financeiro inválido.`);
    if (requireCurrentSchema && !VALID_TYPES.has(tx.type)) issues.push(`${label} não possui tipo financeiro válido para o schema atual.`);
    if (tx.status !== undefined && !VALID_STATUSES.has(tx.status)) issues.push(`${label} possui situação inválida.`);
    if (requireCurrentSchema && !VALID_STATUSES.has(tx.status)) issues.push(`${label} não possui situação válida para o schema atual.`);
    if (tx.date !== undefined && !isValidISODate(tx.date)) issues.push(`${label} possui data inválida.`);
    if (requireCurrentSchema && !isValidISODate(tx.date)) issues.push(`${label} não possui data válida para o schema atual.`);
    if (tx.accountId !== undefined && (typeof tx.accountId !== 'string' || !tx.accountId.trim())) issues.push(`${label} possui conta/cartão de origem inválido.`);
    if (requireCurrentSchema && (typeof tx.accountId !== 'string' || !tx.accountId.trim())) issues.push(`${label} não possui conta/cartão de origem.`);
    if (tx.accountId && !accountIds.has(tx.accountId) && !cardIds.has(tx.accountId)) issues.push(`${label} referencia uma conta ou cartão inexistente: ${tx.accountId}.`);
    if (tx.profileType !== undefined && !['PF', 'PJ'].includes(tx.profileType)) issues.push(`${label} possui perfil financeiro inválido.`);
    if (tx.profileType && tx.accountId) {
      const source = accountById.get(tx.accountId) || cardById.get(tx.accountId);
      if (!allowProfileMigration && source?.profileType && source.profileType !== tx.profileType) issues.push(`${label} cruza perfis financeiros na conta/cartão de origem.`);
    }
    if (tx.categoryId && !categoryIds.has(tx.categoryId)) issues.push(`${label} referencia uma categoria inexistente: ${tx.categoryId}.`);
    if (tx.profileType && tx.categoryId) {
      const category = categoryById.get(tx.categoryId);
      if (!allowProfileMigration && category?.profileType && category.profileType !== tx.profileType) issues.push(`${label} cruza perfis financeiros na categoria.`);
    }
    if (tx.linkedCardId && !cardIds.has(tx.linkedCardId)) issues.push(`${label} referencia um cartão vinculado inexistente.`);
    if (tx.profileType && tx.linkedCardId) {
      const linkedCard = cardById.get(tx.linkedCardId);
      if (!allowProfileMigration && linkedCard?.profileType && linkedCard.profileType !== tx.profileType) issues.push(`${label} cruza perfis financeiros no cartão vinculado.`);
    }
    if (tx.type === 'transferencia') {
      if (typeof tx.toAccountId !== 'string' || !tx.toAccountId.trim()) {
        if (requireCurrentSchema) issues.push(`${label} não possui conta de destino para a transferência.`);
      } else {
        const isInvoicePayment = typeof tx.linkedInvoiceKey === 'string' && /^\d{4}-\d{2}$/.test(tx.linkedInvoiceKey);
        const destination = isInvoicePayment ? cardById.get(tx.toAccountId) : accountById.get(tx.toAccountId);
        if (tx.toAccountId === tx.accountId || !destination) {
          issues.push(isInvoicePayment
            ? `${label} possui destino de fatura inválido: o cartão não existe.`
            : `${label} possui destino de transferência inválido: a conta de destino não existe.`);
        } else if (tx.profileType && !allowProfileMigration && destination.profileType && destination.profileType !== tx.profileType) {
          issues.push(`${label} cruza perfis financeiros no destino.`);
        }
      }
    }  });

  if (Array.isArray(value.recurring)) {
    const recurringIds = new Set();
    value.recurring.forEach((rule, index) => {
      const label = `Regra recorrente ${index + 1}`;
      if (!isRecord(rule)) { issues.push(`${label} não é um objeto válido.`); return; }
      if (typeof rule.id !== 'string' || !rule.id.trim()) issues.push(`${label} não possui identificador estável.`);
      else if (recurringIds.has(rule.id)) issues.push(`Identificador recorrente duplicado: ${rule.id}.`);
      else recurringIds.add(rule.id);
      if (rule.amountCents !== undefined && (!Number.isSafeInteger(rule.amountCents) || rule.amountCents <= 0)) issues.push(`${label} possui valor inválido em centavos.`);
      if (rule.type !== undefined && !['receita', 'despesa'].includes(rule.type)) issues.push(`${label} possui tipo inválido.`);
      if (rule.dayOfMonth !== undefined && (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth < 1 || rule.dayOfMonth > 31)) issues.push(`${label} possui dia do mês inválido.`);
      if (rule.active !== undefined && typeof rule.active !== 'boolean') issues.push(`${label} possui estado ativa/pausada inválido.`);
      if (rule.profileType !== undefined && !['PF', 'PJ'].includes(rule.profileType)) issues.push(`${label} possui perfil inválido.`);
      if (rule.accountId !== undefined && (typeof rule.accountId !== 'string' || !accountIds.has(rule.accountId))) issues.push(`${label} referencia uma conta inexistente.`);
      if (rule.categoryId !== undefined && (typeof rule.categoryId !== 'string' || !categoryIds.has(rule.categoryId))) issues.push(`${label} referencia uma categoria inexistente.`);
      if (!allowProfileMigration && rule.profileType && rule.accountId && accountById.get(rule.accountId)?.profileType && accountById.get(rule.accountId).profileType !== rule.profileType) issues.push(`${label} cruza perfis financeiros na conta.`);
      if (!allowProfileMigration && rule.profileType && rule.categoryId && categoryById.get(rule.categoryId)?.profileType && categoryById.get(rule.categoryId).profileType !== rule.profileType) issues.push(`${label} cruza perfis financeiros na categoria.`);
      if (rule.startDate !== undefined && !isValidISODate(rule.startDate)) issues.push(`${label} possui data inicial inválida.`);
      if (rule.endDate !== undefined && !isValidISODate(rule.endDate)) issues.push(`${label} possui data final inválida.`);
      if (isValidISODate(rule.startDate) && isValidISODate(rule.endDate) && rule.endDate < rule.startDate) issues.push(`${label} termina antes de começar.`);
    });
  }

  if (isRecord(value.budgets)) {
    for (const [key, amountCents] of Object.entries(value.budgets)) {
      if (!key.trim()) issues.push('O mapa de orçamentos possui uma chave vazia.');
      if (amountCents !== null && (!Number.isSafeInteger(amountCents) || amountCents < 0)) {
        issues.push(`O orçamento ${key} deve ser um número inteiro não negativo de centavos.`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export function assertValidStateStructure(value, options) {
  const result = validateStateStructure(value, options);
  if (!result.valid) throw new Error(`Estado financeiro recusado: ${result.issues.join(' ')}`);
  return value;
}
