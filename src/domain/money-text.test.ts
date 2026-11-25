import { describe, expect, it } from 'vitest';
import { MAX_AMOUNT, money } from './money';
import { formatMoney, parseMoneyInput } from './money-text';
import { forAll } from './testing/prop';

const centavos = (texto: string, opcoes = {}): number | string => {
  const r = parseMoneyInput(texto, opcoes);
  return r.ok ? r.value.amount : r.reason;
};

describe('[LAN-002] entrada de valor em formato brasileiro', () => {
  it.each([
    ['1234,56', 123456],
    ['1.234,56', 123456],
    ['1234.56', 123456],
    ['1234', 123400],
    ['0,5', 50],
    ['0,05', 5],
    ['  12,30 ', 1230],
    ['1.000.000,00', 100000000],
    ['9.999.999.999,99', MAX_AMOUNT],
  ])('"%s" vira %i centavos', (texto, esperado) => {
    expect(centavos(texto)).toBe(esperado);
  });

  it.each(['', 'abc', '1.234', '12,345', '1,2,3', '1.23.456,00', '12.', ',50', '10e3', '0x10'])(
    'recusa "%s" em vez de arredondar ou adivinhar',
    (texto) => {
      expect(typeof centavos(texto)).toBe('string');
    },
  );

  it('recusa negativo, a não ser que seja permitido', () => {
    expect(typeof centavos('-10,00')).toBe('string');
    expect(centavos('-10,00', { allowNegative: true })).toBe(-1000);
    expect(centavos('-0,00', { allowNegative: true })).toBe(0);
  });

  it('aceita o sinal antes ou depois do R$', () => {
    const op = { allowNegative: true, allowCurrencySymbol: true };
    expect(centavos('-R$ 10,00', op)).toBe(-1000);
    expect(centavos('R$ -10,00', op)).toBe(-1000);
    expect(typeof centavos('--10,00', op)).toBe('string');
    expect(typeof centavos('-R$ 10,00', { allowCurrencySymbol: true })).toBe('string');
  });

  it('aceita R$ quando permitido', () => {
    expect(typeof centavos('R$ 10,00')).toBe('string');
    expect(centavos('R$ 10,00', { allowCurrencySymbol: true })).toBe(1000);
  });

  it('recusa valor acima do limite, inclusive com muitos dígitos', () => {
    expect(typeof centavos('10.000.000.000,00')).toBe('string');
    expect(typeof centavos('99999999999999999999')).toBe('string');
  });

  it('aceita zeros à esquerda', () => {
    expect(centavos('0001,00')).toBe(100);
  });
});

describe('[NFR-009] valores em R$', () => {
  it.each([
    [0, 'R$\u00a00,00'],
    [5, 'R$\u00a00,05'],
    [123456, 'R$\u00a01.234,56'],
    [-123456, '-R$\u00a01.234,56'],
    [MAX_AMOUNT, 'R$\u00a09.999.999.999,99'],
  ])('%i centavos é "%s"', (valor, texto) => {
    expect(formatMoney(money(valor))).toBe(texto);
  });

  it('ida e volta: formatar e ler de novo dá o mesmo valor', () => {
    forAll('formatMoney ida e volta', (rng) => {
      const valor = (rng.bool() ? 1 : -1) * rng.cents(MAX_AMOUNT);
      const r = parseMoneyInput(formatMoney(money(valor)), {
        allowNegative: true,
        allowCurrencySymbol: true,
      });
      expect(r.ok && r.value.amount).toBe(valor);
    });
  });
});
