// Dinheiro em centavos inteiros com moeda explícita (Volume 04, seção 2.1).
// Nenhum número com casas decimais entra aqui: toda conta é feita em inteiros seguros.
import { DomainError, ensure } from './errors';

export type Currency = 'BRL';

export interface Money {
  readonly amount: number;
  readonly currency: Currency;
}

/** Maior valor aceito num registro: R$ 9.999.999.999,99. */
export const MAX_AMOUNT = 999_999_999_999;

function checkSafe(amount: number): void {
  ensure(
    Number.isSafeInteger(amount),
    'MONEY_INVALID',
    `Valor inválido: ${String(amount)} não é centavo inteiro.`,
  );
}

/** Cria um valor de registro, dentro do limite de ± R$ 9.999.999.999,99. */
export function money(amount: number, currency: Currency = 'BRL'): Money {
  checkSafe(amount);
  ensure(
    Math.abs(amount) <= MAX_AMOUNT,
    'MONEY_OUT_OF_RANGE',
    'Valor acima do limite de R$ 9.999.999.999,99.',
  );
  return { amount, currency };
}

/** Zero na moeda informada. */
export function zero(currency: Currency = 'BRL'): Money {
  return { amount: 0, currency };
}

/** Recusa somar ou comparar moedas diferentes. Hoje só existe BRL, mas o tipo já prevê outras. */
export function assertSameCurrency(a: Money, b: Money): void {
  const ca: string = a.currency;
  const cb: string = b.currency;
  if (ca !== cb) throw new DomainError('CURRENCY_MISMATCH', `Moedas diferentes: ${ca} e ${cb}.`);
}

// Totais (saldos, somas) podem passar do limite de um registro, mas nunca do inteiro seguro.
export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  const amount = a.amount + b.amount;
  checkSafe(amount);
  return { amount, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  const amount = a.amount - b.amount;
  checkSafe(amount);
  return { amount, currency: a.currency };
}

export function negate(a: Money): Money {
  return { amount: a.amount === 0 ? 0 : -a.amount, currency: a.currency };
}

export function sum(values: readonly Money[], currency: Currency = 'BRL'): Money {
  return values.reduce<Money>((acc, v) => add(acc, v), zero(currency));
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  return a.amount < b.amount ? -1 : a.amount > b.amount ? 1 : 0;
}

export function isZero(a: Money): boolean {
  return a.amount === 0;
}

/**
 * Divide um valor em partes iguais pelo maior resto (INV-07).
 * O resto de centavos vai para as primeiras partes, em ordem: R$ 100,00 em 3 = 33,34 + 33,33 + 33,33.
 */
export function allocateEqually(total: Money, parts: number): Money[] {
  ensure(
    Number.isInteger(parts) && parts >= 1 && parts <= 1000,
    'ALLOCATION_INVALID',
    'Número de partes inválido.',
  );
  checkSafe(total.amount);
  const sign = total.amount < 0 ? -1 : 1;
  const abs = Math.abs(total.amount);
  const base = Math.floor(abs / parts);
  const rest = abs - base * parts;
  return Array.from({ length: parts }, (_, i) => ({
    amount: sign * (base + (i < rest ? 1 : 0)) || 0,
    currency: total.currency,
  }));
}

/**
 * Divide um valor proporcionalmente a pesos inteiros, pelo maior resto (INV-07).
 * Empates no resto favorecem a parte que vem primeiro.
 */
export function allocateByWeights(total: Money, weights: readonly number[]): Money[] {
  ensure(weights.length >= 1 && weights.length <= 1000, 'ALLOCATION_INVALID', 'Número de partes inválido.');
  ensure(
    weights.every((w) => Number.isSafeInteger(w) && w >= 0),
    'ALLOCATION_INVALID',
    'Os pesos precisam ser inteiros não negativos.',
  );
  const totalWeight = weights.reduce((a, w) => a + w, 0);
  ensure(totalWeight > 0, 'ALLOCATION_INVALID', 'A soma dos pesos precisa ser maior que zero.');
  checkSafe(total.amount);

  // BigInt evita estouro em valor × peso.
  const sign = total.amount < 0 ? -1 : 1;
  const abs = BigInt(Math.abs(total.amount));
  const tw = BigInt(totalWeight);
  const bases = weights.map((w) => (abs * BigInt(w)) / tw);
  const remainders = weights.map((w, i) => ({ i, r: (abs * BigInt(w)) % tw }));
  let left = Number(abs - bases.reduce((a, b) => a + b, 0n));
  remainders.sort((x, y) => (x.r === y.r ? x.i - y.i : x.r > y.r ? -1 : 1));
  const extra = new Array<number>(weights.length).fill(0);
  for (const { i } of remainders) {
    if (left === 0) break;
    extra[i] = 1;
    left--;
  }
  return bases.map((b, i) => ({
    amount: sign * (Number(b) + (extra[i] ?? 0)) || 0,
    currency: total.currency,
  }));
}
