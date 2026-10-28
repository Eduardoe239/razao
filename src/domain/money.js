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
