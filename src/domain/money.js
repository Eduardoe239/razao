/**
 * MÓDULO DE DINHEIRO E PRECISÃO MONETÁRIA (O RAZÃO 3.0)
 * Garante que todo cálculo no sistema utilize centavos inteiros (Integer Cents)
 * eliminando erros de ponto flutuante do JavaScript (IEEE 754).
 */

export function parseToCents(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value;
    return Math.round(value * 100);
  }
  let str = String(value).trim();
  // Se contiver vírgula, tratar pontos como separadores de milhar e vírgula como decimal
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  str = str.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(str);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function centsToFloat(amountCents) {
  if (!Number.isInteger(amountCents)) return 0;
  return amountCents / 100;
}

export function formatMoney(amountCents, currency = 'BRL', locale = 'pt-BR') {
  const floatVal = centsToFloat(amountCents);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(floatVal);
}

/**
 * Parses a user-entered monetary amount into integer cents without silently
 * rounding values that contain more than two decimal places. Accepts Brazilian
 * separators (1.234,56 / 1234,56) and an unambiguous decimal-point form (1234.56).
 * Optional flags support signed statement balances and a leading R$ marker.
 * Returns { valid, cents } or { valid: false, reason }.
 */
export function parseMoneyInputToCents(value, { allowNegative = false, allowCurrencySymbol = false } = {}) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return { valid: false, reason: 'Informe um valor monetário.' };
  }
  let raw = String(value).trim().replace(/\s+/g, '');
  if (allowCurrencySymbol) raw = raw.replace(/^R\$/i, '');
  if (!raw) return { valid: false, reason: 'Informe um valor monetário.' };

  let sign = 1;
  if (raw.startsWith('-')) {
    if (!allowNegative) return { valid: false, reason: 'O valor não pode ser negativo.' };
    sign = -1;
    raw = raw.slice(1);
  }
  if (!raw) return { valid: false, reason: 'Informe um valor monetário.' };

  let normalized;
  if (raw.includes(',')) {
    const validBrazilian = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw);
    if (!validBrazilian) {
      return { valid: false, reason: 'Use o formato brasileiro, como 1234,56 ou 1.234,56, com até duas casas decimais.' };
    }
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else {
    // Without a comma, decimal points are accepted only with one or two digits
    // after them. Thus "1.234" is rejected as ambiguous; use "1.234,00".
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
      return { valid: false, reason: 'Use até duas casas decimais. Para milhar, use o formato 1.234,00.' };
    }
    normalized = raw;
  }

  const amount = Number(normalized) * sign;
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(cents) || (!allowNegative && cents < 0)) {
    return { valid: false, reason: 'O valor está fora do intervalo permitido.' };
  }
  return { valid: true, cents };
}
