/**
 * Reconciliação local de extratos.
 * A heurística sugere correspondências, mas não altera dados: a decisão final
 * é aplicada separadamente por applyReconciliationDecisions().
 */

const VALID_TYPES = new Set(['receita', 'despesa', 'transferencia']);

export function isValidReconciliationDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeDescription(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function calculateSimilarity(valueA, valueB) {
  const a = normalizeDescription(valueA);
  const b = normalizeDescription(valueB);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const wordsA = new Set(a.split(/\s+/).filter(word => word.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter(word => word.length > 2));
  if (!wordsA.size || !wordsB.size) return 0;
  let intersection = 0;
  for (const word of wordsA) if (wordsB.has(word)) intersection++;
  const dice = (2 * intersection) / (wordsA.size + wordsB.size);
  if (a.includes(b) || b.includes(a)) return Math.max(dice, 0.75);
  return dice;
}

function dayDistance(dateA, dateB) {
  if (!isValidReconciliationDate(dateA) || !isValidReconciliationDate(dateB)) return Infinity;
  const a = Date.parse(`${dateA}T00:00:00.000Z`);
  const b = Date.parse(`${dateB}T00:00:00.000Z`);
  return Math.round(Math.abs(a - b) / 86400000);
}

function validImportedItem(item) {
  return Boolean(item && typeof item === 'object'
    && typeof item.description === 'string' && item.description.trim().length > 0
    && Number.isSafeInteger(item.amountCents) && item.amountCents > 0
    && VALID_TYPES.has(item.type)
    && isValidReconciliationDate(item.date));
}

/**
 * Sugere status para cada lançamento importado.
 * status: duplicate | match_pending | review | invalid | unique.
 * Somente um ID de extrato exato é bloqueado como duplicata; similaridade textual
 * nunca apaga silenciosamente uma movimentação potencialmente legítima.
 */
export function reconcileTransactions(importedList = [], existingTransactions = [], options = {}) {
  if (!Array.isArray(importedList)) return [];
  const existing = Array.isArray(existingTransactions) ? existingTransactions : [];
  const seenImportIds = new Map();
  const scopedAccountId = options.accountId;
  const scopedProfileType = options.profileType === 'PJ' ? 'PJ' : (options.profileType === 'PF' ? 'PF' : null);

  return importedList.map((rawItem, index) => {
    const imported = {
      ...rawItem,
      ...(scopedAccountId ? { accountId: scopedAccountId } : {})
    };

    if (!validImportedItem(imported)) {
      return {
        ...imported,
        reconciliationStatus: 'invalid',
        matchedWithId: null,
        confidence: 0,
        reason: 'Dados incompletos ou inválidos: confira descrição, valor, tipo e data.'
      };
    }

    const importId = typeof imported.importedId === 'string' ? imported.importedId.trim() : '';
    if (importId && seenImportIds.has(importId)) {
      return {
        ...imported,
        reconciliationStatus: 'duplicate',
        matchedWithId: `batch-${seenImportIds.get(importId)}`,
        confidence: 100,
        reason: 'O mesmo identificador de extrato aparece mais de uma vez neste arquivo.'
      };
    }
    if (importId) seenImportIds.set(importId, index);

    const exactIdMatch = importId && existing.find(transaction => {
      if (transaction?.importedId !== importId || transaction.status === 'cancelado') return false;
      // Não permitir que um registro de outro perfil, ou sem perfil conhecido,
      // seja tratado como duplicata do perfil que está sendo importado.
      if (scopedProfileType && transaction.profileType !== scopedProfileType) return false;
      if (scopedAccountId && transaction.accountId && transaction.accountId !== scopedAccountId) return false;
      return true;
    });
    if (exactIdMatch) {
      return {
        ...imported,
        reconciliationStatus: 'duplicate',
        matchedWithId: exactIdMatch.id,
        confidence: 100,
        reason: 'Identificador de transação do extrato já registrado nesta conta.'
      };
    }

    const sameAmountDateType = existing.filter(transaction => {
      if (!transaction || transaction.status === 'cancelado') return false;
      if (scopedProfileType && transaction.profileType !== scopedProfileType) return false;
      if (transaction.amountCents !== imported.amountCents || transaction.type !== imported.type) return false;
      if (scopedAccountId && transaction.accountId && transaction.accountId !== scopedAccountId) return false;
      return dayDistance(imported.date, transaction.date) <= 3;
    });

    if (sameAmountDateType.length === 0) {
      return {
        ...imported,
        reconciliationStatus: 'unique',
        matchedWithId: null,
        confidence: 0,
        reason: 'Nenhum lançamento equivalente foi localizado no histórico.'
      };
    }

    const ranked = sameAmountDateType
      .map(transaction => ({ transaction, similarity: calculateSimilarity(imported.description, transaction.description) }))
      .sort((a, b) => b.similarity - a.similarity);
    const likely = ranked.filter(candidate => candidate.similarity >= 0.5);

    if (likely.length === 1 && likely[0].transaction.status === 'pendente') {
      const { transaction, similarity } = likely[0];
      return {
        ...imported,
        reconciliationStatus: 'match_pending',
        matchedWithId: transaction.id,
        confidence: Math.min(100, Math.round(80 + similarity * 20)),
        reason: 'Correspondência provável com lançamento pendente; a confirmação irá baixá-lo, sem criar outro lançamento.'
      };
    }

    return {
      ...imported,
      reconciliationStatus: 'review',
      reviewKind: likely.length === 1 ? 'possible_duplicate' : 'ambiguous_match',
      matchedWithId: ranked[0]?.transaction?.id || null,
      confidence: ranked[0] ? Math.round(ranked[0].similarity * 70) : 25,
      reason: likely.length === 1
        ? 'Possível duplicata por descrição, valor e data próxima. Confira o extrato; a heurística não bloqueia a importação.'
        : likely.length > 1
          ? 'Mais de um lançamento pode corresponder a este registro; revise antes de importar.'
          : 'Há lançamentos com mesmo valor, tipo e data próxima, mas a descrição não confirma a correspondência.'
    };
  });
}

/**
 * Aplica somente decisões selecionadas pelo usuário. Baixas de pendências são
 * atualizadas in-place; itens novos são adicionados. A função é pura e segura
 * para testes, prévias e chamadas repetidas com estado atualizado.
 */
export function applyReconciliationDecisions({
  existingTransactions = [],
  selectedItems = [],
  accountId,
  categoryId,
  profileType = 'PF',
  accounts,
  categories,
  createId
} = {}) {
  const transactions = Array.isArray(existingTransactions) ? [...existingTransactions] : [];
  const items = Array.isArray(selectedItems) ? selectedItems : [];
  const summary = { transactions, addedCount: 0, settledCount: 0, skippedCount: 0, issues: [] };
  const idFactory = typeof createId === 'function' ? createId : (() => null);
  const effectiveProfileType = profileType === 'PJ' ? 'PJ' : 'PF';
  const suppliedAccounts = Array.isArray(accounts) ? accounts : null;
  const suppliedCategories = Array.isArray(categories) ? categories : null;
  const processedImportIds = new Set();

  for (const item of items) {
    if (item?.selected === false || item?.reconciliationStatus === 'duplicate' || item?.reconciliationStatus === 'invalid') {
      summary.skippedCount++;
      continue;
    }
    if (!validImportedItem(item)) {
      summary.skippedCount++;
      summary.issues.push('Um item selecionado contém dados inválidos e foi ignorado.');
      continue;
    }
    if (!accountId || typeof accountId !== 'string' || (suppliedAccounts && !suppliedAccounts.some(account => account?.id === accountId && account.profileType === effectiveProfileType))) {
      summary.skippedCount++;
      summary.issues.push('Nenhuma conta de destino válida para o perfil ativo foi selecionada.');
      continue;
    }
    const selectedCategoryId = item.categoryId || categoryId || '';
    if (suppliedCategories && selectedCategoryId && !suppliedCategories.some(category => category?.id === selectedCategoryId && category.profileType === effectiveProfileType)) {
      summary.skippedCount++;
      summary.issues.push('A categoria selecionada não pertence ao perfil ativo; item ignorado.');
      continue;
    }

    const importId = typeof item.importedId === 'string' ? item.importedId.trim() : '';
    const repeatedInBatch = importId && processedImportIds.has(importId);
    const repeatedInHistory = importId && transactions.some(transaction =>
      transaction?.profileType === effectiveProfileType && transaction?.importedId === importId
      && transaction.accountId === accountId && transaction.status !== 'cancelado'
    );
    if (repeatedInBatch || repeatedInHistory) {
      summary.skippedCount++;
      summary.issues.push('Identificador do extrato já processado; item ignorado para evitar duplicidade.');
      continue;
    }
    if (importId) processedImportIds.add(importId);

    if (item.reconciliationStatus === 'match_pending') {
      const matchIndex = transactions.findIndex(transaction => transaction?.id === item.matchedWithId);
      const match = matchIndex >= 0 ? transactions[matchIndex] : null;
      if (!match || match.profileType !== effectiveProfileType || match.status !== 'pendente' || match.type !== item.type || match.amountCents !== item.amountCents
          || (match.accountId && match.accountId !== accountId)) {
        summary.skippedCount++;
        summary.issues.push('A pendência correspondente mudou desde a análise; atualize a conciliação e tente novamente.');
        continue;
      }
      transactions[matchIndex] = {
        ...match,
        status: 'pago',
        date: item.date,
        ...(importId ? { importedId: importId } : {}),
        ...(item.source ? { source: item.source } : {})
      };
      summary.settledCount++;
      continue;
    }

    const id = idFactory();
    if (typeof id !== 'string' || !id.trim() || transactions.some(transaction => transaction?.id === id)) {
      summary.skippedCount++;
      summary.issues.push('Não foi possível gerar um ID único para um lançamento novo.');
      continue;
    }

    transactions.unshift({
      id,
      description: item.description.trim(),
      amountCents: item.amountCents,
      type: item.type,
      date: item.date,
      status: 'pago',
      accountId,
      ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
      profileType: effectiveProfileType,
      ...(importId ? { importedId: importId } : {}),
      ...(item.source ? { source: item.source } : {})
    });
    summary.addedCount++;
  }

  return summary;
}
