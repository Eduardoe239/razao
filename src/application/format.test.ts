import { describe, expect, it } from 'vitest';
import { parseCivilDate } from '@/domain/civil-date';
import { formatBRL, formatDate, readMoney, recoveryGroups } from './format';

describe('formatos da interface', () => {
  it('[NFR-009] valores em R$ com o sinal tipográfico do design system', () => {
    expect(formatBRL(124000)).toBe('R$\u00a01.240,00');
    expect(formatBRL(-18742)).toBe('−\u00a0R$\u00a0187,42');
    expect(formatBRL(5, { signed: true })).toBe('+\u00a0R$\u00a00,05');
    expect(formatBRL(0, { signed: true })).toBe('R$\u00a00,00');
  });

  it('[NFR-009] datas em dd/mm/aaaa', () => {
    expect(formatDate(parseCivilDate('2027-03-09'))).toBe('09/03/2027');
  });

  it('[CON-001] lê o valor digitado sem arredondar e aceita o sinal tipográfico', () => {
    expect(readMoney('R$ 9.270,35')).toEqual({ ok: true, cents: 927035 });
    expect(readMoney('−150,00', true)).toEqual({ ok: true, cents: -15000 });
    expect(readMoney('-150,00')).toMatchObject({ ok: false });
    expect(readMoney('1,234')).toMatchObject({ ok: false });
  });

  it('[COF-001] código de recuperação em 4 grupos de 6', () => {
    expect(recoveryGroups('0123456789ABCDEFGHJKMNPQ')).toEqual(['012345', '6789AB', 'CDEFGH', 'JKMNPQ']);
  });
});
