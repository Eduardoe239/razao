import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  civilDate,
  compareDates,
  daysInMonth,
  diffDays,
  formatCivilDate,
  fromDayNumber,
  isCivilDate,
  isWeekend,
  parseCivilDate,
  toDayNumber,
} from './civil-date';
import { DomainError } from './errors';
import { forAll } from './testing/prop';

const d = parseCivilDate;

describe('[NFR-013] data civil sem fuso nem hora', () => {
  it('lê datas válidas e recusa as que não existem', () => {
    expect(d('2028-02-29')).toBe('2028-02-29');
    expect(isCivilDate('2027-02-29')).toBe(false);
    expect(isCivilDate('2027-13-01')).toBe(false);
    expect(isCivilDate('2027-1-01')).toBe(false);
    expect(isCivilDate('1899-12-31')).toBe(false);
    expect(() => d('ontem')).toThrow(DomainError);
  });

  it('conhece anos bissextos', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2027, 4)).toBe(30);
  });

  it('1970-01-01 é o dia zero', () => {
    expect(toDayNumber(d('1970-01-01'))).toBe(0);
    expect(fromDayNumber(0)).toBe('1970-01-01');
    expect(toDayNumber(d('2000-03-01'))).toBe(11017);
  });

  it('fim de mês: 31/01/2027 + 1 mês cai em 28/02/2027 (Volume 04, seção 2.2)', () => {
    expect(addMonths(d('2027-01-31'), 1)).toBe('2027-02-28');
    expect(addMonths(d('2028-01-31'), 1)).toBe('2028-02-29');
    expect(addMonths(d('2027-03-31'), -1)).toBe('2027-02-28');
    expect(addMonths(d('2027-12-15'), 1)).toBe('2028-01-15');
  });

  it('com dia âncora, a série volta ao dia 31 depois de fevereiro', () => {
    expect(addMonths(d('2027-02-28'), 1, 31)).toBe('2027-03-31');
  });

  it('compara, soma dias e marca fim de semana', () => {
    expect(compareDates(d('2027-01-01'), d('2027-01-02'))).toBe(-1);
    expect(compareDates(d('2027-01-02'), d('2027-01-01'))).toBe(1);
    expect(compareDates(d('2027-01-01'), d('2027-01-01'))).toBe(0);
    expect(addDays(d('2027-12-31'), 1)).toBe('2028-01-01');
    expect(isWeekend(d('2026-11-28'))).toBe(true); // sábado
    expect(isWeekend(d('2026-11-29'))).toBe(true); // domingo
    expect(isWeekend(d('2026-11-25'))).toBe(false); // quarta
    expect(isWeekend(d('1969-12-28'))).toBe(true); // domingo antes de 1970
  });

  it('recusa partes que não formam data', () => {
    expect(() => civilDate(2027, 2, 30)).toThrow(DomainError);
    expect(() => civilDate(2027.5, 1, 1)).toThrow(DomainError);
  });

  it('ida e volta entre data e número do dia, em qualquer data de 1900 a 2999', () => {
    const inicio = toDayNumber(d('1900-01-01'));
    const fim = toDayNumber(d('2999-12-31'));
    forAll('dia ida e volta', (rng) => {
      const n = rng.int(inicio, fim);
      expect(toDayNumber(fromDayNumber(n))).toBe(n);
    });
  });

  it('somar n dias e medir a distância devolve n', () => {
    forAll('addDays e diffDays', (rng) => {
      const base = fromDayNumber(rng.int(0, 40000));
      const n = rng.int(-3000, 3000);
      expect(diffDays(base, addDays(base, n))).toBe(n);
    });
  });
});

describe('[NFR-009] datas em dd/mm/aaaa', () => {
  it('formata para a tela', () => {
    expect(formatCivilDate(d('2027-02-05'))).toBe('05/02/2027');
  });
});
