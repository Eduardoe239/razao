// Leitura e escrita de valores em pt-BR (Volume 04, seção 2.1).
// Reescrito a partir do parseMoneyInputToCents da base histórica, agora sem passar por número decimal.
import type { Currency, Money } from './money';
import { MAX_AMOUNT } from './money';

export interface ParseOptions {
  allowNegative?: boolean;
  allowCurrencySymbol?: boolean;
}

export type ParseResult = { ok: true; value: Money } | { ok: false; reason: string };

const BRASILEIRO = /^(\d+|\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/;
const PONTO_DECIMAL = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Lê um valor digitado. Aceita 1234,56 · 1.234,56 · 1234.56 · R$ 1.234,56 (com a opção).
 * Recusa ambiguidades como "1.234" e mais de duas casas decimais, em vez de arredondar em silêncio.
 */
export function parseMoneyInput(
  text: string,
  options: ParseOptions = {},
  currency: Currency = 'BRL',
): ParseResult {
  let raw = text.trim().replace(/\s+/g, '');
  // O sinal pode vir antes ou depois do símbolo: "-R$ 10,00" e "R$ -10,00".
  let negativo = raw.startsWith('-');
  if (negativo) raw = raw.slice(1);
  if (options.allowCurrencySymbol) raw = raw.replace(/^R\$/i, '');
  if (!negativo && raw.startsWith('-')) {
    negativo = true;
    raw = raw.slice(1);
  }
  if (negativo && !options.allowNegative) return { ok: false, reason: 'O valor não pode ser negativo.' };
  if (!raw) return { ok: false, reason: 'Informe um valor.' };
  const sign = negativo ? -1 : 1;

  let inteiro: string;
  let decimais: string;
  if (raw.includes(',')) {
    const m = BRASILEIRO.exec(raw);
    if (!m) return { ok: false, reason: 'Use o formato 1234,56 ou 1.234,56, com até duas casas decimais.' };
    inteiro = (m[1] ?? '').replace(/\./g, '');
    decimais = m[2] ?? '';
  } else {
    const m = PONTO_DECIMAL.exec(raw);
    if (!m) return { ok: false, reason: 'Use até duas casas decimais. Para milhar, use o formato 1.234,00.' };
    inteiro = m[1] ?? '';
    decimais = m[2] ?? '';
  }

  // Mais dígitos que o limite já está fora do intervalo; evita converter textos enormes.
  const semZeros = inteiro.replace(/^0+(?=\d)/, '');
  if (semZeros.length > 13) return { ok: false, reason: 'Valor acima do limite de R$ 9.999.999.999,99.' };
  const centavos = Number(semZeros) * 100 + Number(decimais.padEnd(2, '0'));
  if (centavos > MAX_AMOUNT) return { ok: false, reason: 'Valor acima do limite de R$ 9.999.999.999,99.' };
  const amount = sign * centavos || 0;
  return { ok: true, value: { amount, currency } };
}

/** Escreve um valor como "R$ 1.234,56" (com espaço que não quebra linha), igual em todo navegador. */
export function formatMoney(value: Money): string {
  const negativo = value.amount < 0;
  const abs = Math.abs(value.amount);
  const reais = Math.floor(abs / 100).toString();
  const centavos = (abs % 100).toString().padStart(2, '0');
  const milhares = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$\u00a0${milhares},${centavos}`;
}
