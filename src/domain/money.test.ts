import { describe, expect, it } from 'vitest';
import { DomainError } from './errors';
import {
  MAX_AMOUNT,
  add,
  allocateByWeights,
  allocateEqually,
  compare,
  isZero,
  money,
  negate,
  subtract,
  sum,
  zero,
} from './money';
import { forAll } from './testing/prop';

const codigo = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    throw e;
  }
  return 'sem erro';
};

describe('[NFR-013] dinheiro em centavos inteiros', () => {
  it('aceita centavos inteiros dentro do limite', () => {
    expect(money(123456)).toEqual({ amount: 123456, currency: 'BRL' });
    expect(money(-MAX_AMOUNT).amount).toBe(-MAX_AMOUNT);
  });

  it('recusa casas decimais, NaN e infinito', () => {
    expect(codigo(() => money(10.5))).toBe('MONEY_INVALID');
    expect(codigo(() => money(Number.NaN))).toBe('MONEY_INVALID');
    expect(codigo(() => money(Number.POSITIVE_INFINITY))).toBe('MONEY_INVALID');
  });

  it('recusa valor acima de R$ 9.999.999.999,99', () => {
    expect(codigo(() => money(MAX_AMOUNT + 1))).toBe('MONEY_OUT_OF_RANGE');
  });

  it('soma, subtrai, compara e nega sem deixar -0', () => {
    const a = money(1050);
    const b = money(250);
    expect(add(a, b).amount).toBe(1300);
    expect(subtract(b, a).amount).toBe(-800);
    expect(compare(a, b)).toBe(1);
    expect(compare(b, a)).toBe(-1);
    expect(compare(a, a)).toBe(0);
    expect(Object.is(negate(zero()).amount, 0)).toBe(true);
    expect(isZero(sum([money(100), money(-100)]))).toBe(true);
  });

  it('não soma moedas diferentes', () => {
    const usd = { amount: 100, currency: 'USD' } as unknown as ReturnType<typeof money>;
    expect(codigo(() => add(money(100), usd))).toBe('CURRENCY_MISMATCH');
  });

  it('recusa total que passa do inteiro seguro', () => {
    const grande = { amount: Number.MAX_SAFE_INTEGER, currency: 'BRL' as const };
    expect(codigo(() => add(grande, money(1)))).toBe('MONEY_INVALID');
  });
});

describe('[LAN-007, CAR-003] divisão pelo maior resto (INV-07)', () => {
  it('R$ 100,00 em 3 vezes é 33,34 + 33,33 + 33,33', () => {
    expect(allocateEqually(money(10000), 3).map((m) => m.amount)).toEqual([3334, 3333, 3333]);
  });

  it('valor negativo divide do mesmo jeito', () => {
    expect(allocateEqually(money(-10000), 3).map((m) => m.amount)).toEqual([-3334, -3333, -3333]);
  });

  it('pesos: R$ 10,00 em 1:1:1 dá o centavo extra à primeira parte', () => {
    expect(allocateByWeights(money(1000), [1, 1, 1]).map((m) => m.amount)).toEqual([334, 333, 333]);
  });

  it('peso zero recebe zero', () => {
    expect(allocateByWeights(money(500), [0, 1]).map((m) => m.amount)).toEqual([0, 500]);
  });

  it('recusa partes e pesos inválidos', () => {
    expect(codigo(() => allocateEqually(money(100), 0))).toBe('ALLOCATION_INVALID');
    expect(codigo(() => allocateByWeights(money(100), [0, 0]))).toBe('ALLOCATION_INVALID');
    expect(codigo(() => allocateByWeights(money(100), [1.5]))).toBe('ALLOCATION_INVALID');
    expect(codigo(() => allocateByWeights(money(100), []))).toBe('ALLOCATION_INVALID');
  });

  it('INV-07: partes iguais somam o total ao centavo e diferem no máximo 1 centavo', () => {
    forAll('allocateEqually', (rng) => {
      const total = (rng.bool() ? 1 : -1) * rng.cents(MAX_AMOUNT);
      const partes = rng.int(1, 60);
      const r = allocateEqually(money(total), partes).map((m) => m.amount);
      expect(r).toHaveLength(partes);
      expect(r.reduce((a, b) => a + b, 0)).toBe(total);
      const abs = r.map(Math.abs);
      expect(Math.max(...abs) - Math.min(...abs)).toBeLessThanOrEqual(1);
      // O centavo a mais vai para as primeiras partes.
      for (let i = 1; i < abs.length; i++) expect(abs[i]).toBeLessThanOrEqual(abs[i - 1] ?? 0);
    });
  });

  it('INV-07: divisão por pesos soma o total e fica a menos de 1 centavo da parte exata', () => {
    forAll('allocateByWeights', (rng) => {
      const total = (rng.bool() ? 1 : -1) * rng.cents(MAX_AMOUNT);
      const pesos = Array.from({ length: rng.int(1, 12) }, () => rng.int(0, 1000));
      if (!pesos.some((p) => p > 0)) pesos[0] = 1;
      const r = allocateByWeights(money(total), pesos).map((m) => m.amount);
      expect(r.reduce((a, b) => a + b, 0)).toBe(total);
      const soma = pesos.reduce((a, b) => a + b, 0);
      r.forEach((v, i) => {
        const exato = (total * (pesos[i] ?? 0)) / soma;
        expect(Math.abs(v - exato)).toBeLessThan(1 + 1e-6);
      });
    });
  });
});
