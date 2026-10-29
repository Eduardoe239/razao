const normalizeText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

function parseAmountFilter(value) {
  if (value === '' || value === null || value === undefined) return null;
  let raw = String(value).trim().replace(/R\$\s?/gi, '').replace(/\s/g, '');
  if (!raw) return null;
  if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw)) return NaN;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || Math.abs(amount) > Number.MAX_SAFE_INTEGER / 100) return NaN;
  return Math.round(amount * 100);
}

export function parseTransactionAmountFilter(value) {
  return parseAmountFilter(value);
}

export function filterTransactions(transactions = [], filters = {}, catalogs = {}) {
  const source = Array.isArray(transactions) ? transactions : [];
  const accounts = Array.isArray(catalogs.accounts) ? catalogs.accounts : [];
  const categories = Array.isArray(catalogs.categories) ? catalogs.categories : [];
  const accountNames = new Map(accounts.map(item => [item.id, item.name || item.bankName || item.id || 'Conta']));
  const categoryNames = new Map(categories.map(item => [item.id, item.name || item.id || 'Categoria']));
  const search = normalizeText(filters.search);
  const minCents = parseAmountFilter(filters.minAmount);
  const maxCents = parseAmountFilter(filters.maxAmount);
  const invalidAmountRange = Number.isNaN(minCents) || Number.isNaN(maxCents);

  let result = source.filter((tx) => {
    if (!tx || typeof tx !== 'object') return false;
    if (filters.type && filters.type !== 'todos' && tx.type !== filters.type) return false;
    if (filters.status && filters.status !== 'todos' && tx.status !== filters.status) return false;
    if (filters.accountId && filters.accountId !== 'todos' && tx.accountId !== filters.accountId && tx.toAccountId !== filters.accountId) return false;
    if (filters.categoryId && filters.categoryId !== 'todos' && tx.categoryId !== filters.categoryId) return false;
    if (filters.startDate && (typeof tx.date !== 'string' || tx.date < filters.startDate)) return false;
    if (filters.endDate && (typeof tx.date !== 'string' || tx.date > filters.endDate)) return false;
    if (search) {
      const haystack = normalizeText([
        tx.description,
        tx.type,
        tx.status,
        tx.date,
        categoryNames.get(tx.categoryId),
        accountNames.get(tx.accountId),
        accountNames.get(tx.toAccountId)
      ].filter(Boolean).join(' '));
      if (!haystack.includes(search)) return false;
    }
    if (filters.minAmount !== '' && filters.minAmount !== undefined && filters.minAmount !== null) {
      if (invalidAmountRange || !Number.isSafeInteger(tx.amountCents) || Math.abs(tx.amountCents) < minCents) return false;
    }
    if (filters.maxAmount !== '' && filters.maxAmount !== undefined && filters.maxAmount !== null) {
      if (invalidAmountRange || !Number.isSafeInteger(tx.amountCents) || Math.abs(tx.amountCents) > maxCents) return false;
    }
    return true;
  });

  const sortBy = filters.sortBy || 'date_desc';
  result.sort((a, b) => {
    let compared = 0;
    if (sortBy === 'date_asc') compared = String(a.date || '').localeCompare(String(b.date || ''));
    else if (sortBy === 'amount_asc') compared = (Number.isSafeInteger(a.amountCents) ? a.amountCents : 0) - (Number.isSafeInteger(b.amountCents) ? b.amountCents : 0);
    else if (sortBy === 'amount_desc') compared = (Number.isSafeInteger(b.amountCents) ? b.amountCents : 0) - (Number.isSafeInteger(a.amountCents) ? a.amountCents : 0);
    else if (sortBy === 'description_asc') compared = normalizeText(a.description).localeCompare(normalizeText(b.description));
    else compared = String(b.date || '').localeCompare(String(a.date || ''));
    if (compared !== 0) return compared;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
  return result;
}

function safeSpreadsheetText(value) {
  const text = String(value ?? '');
  // Prefix potential spreadsheet formulas after leading whitespace so CSV opening is safer.
  return /^[\s\u0000-\u001f]*[=+@\-]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  const safeValue = safeSpreadsheetText(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function formatCsvAmount(amountCents) {
  if (!Number.isSafeInteger(amountCents)) return '';
  return (amountCents / 100).toFixed(2).replace('.', ',');
}

export function transactionsToCSV(transactions = [], catalogs = {}) {
  const accounts = Array.isArray(catalogs.accounts) ? catalogs.accounts : [];
  const categories = Array.isArray(catalogs.categories) ? catalogs.categories : [];
  const accountNames = new Map(accounts.map(item => [item.id, item.name || item.bankName || item.id || 'Conta']));
  const categoryNames = new Map(categories.map(item => [item.id, item.name || item.id || 'Categoria']));
  const header = ['Data', 'Descrição', 'Tipo', 'Status', 'Conta de origem', 'Conta de destino', 'Categoria', 'Valor (R$)', 'Identificador'];
  const rows = (Array.isArray(transactions) ? transactions : []).map(tx => [
    tx?.date || '',
    tx?.description || '',
    tx?.type || '',
    tx?.status || '',
    accountNames.get(tx?.accountId) || tx?.accountId || '',
    accountNames.get(tx?.toAccountId) || tx?.toAccountId || '',
    categoryNames.get(tx?.categoryId) || tx?.categoryId || '',
    formatCsvAmount(tx?.amountCents),
    tx?.id || ''
  ]);
  return `\uFEFF${[header, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n')}`;
}
