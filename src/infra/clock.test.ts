import { describe, expect, it } from 'vitest';
import { civilDateIn } from './clock';

describe('relógio', () => {
  it('[COF-004] a data de hoje segue o fuso do espaço, não o do aparelho', () => {
    // 02:30 UTC de 01/03/2027 ainda é 28/02 em Fortaleza (UTC-3).
    const ms = Date.UTC(2027, 2, 1, 2, 30);
    expect(civilDateIn(ms, 'America/Fortaleza')).toBe('2027-02-28');
    expect(civilDateIn(ms, 'UTC')).toBe('2027-03-01');
  });
});
