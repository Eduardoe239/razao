import { describe, expect, it } from 'vitest';
import { DomainError } from './errors';
import { forAll } from './testing/prop';
import {
  HIDDEN_TAB_LOCK_MS,
  RECOVERY_ALPHABET,
  encodeRecoveryCode,
  formatRecoveryCode,
  normalizeRecoveryCode,
  shouldLock,
  unlockDelaySeconds,
  validAutoLockMinutes,
} from './vault-policy';

describe('[COF-002] bloqueio automático', () => {
  const base = { lastActivityMs: 0, hiddenSinceMs: null, autoLockMinutes: 5 };

  it('bloqueia depois de 5 minutos sem uso, não antes', () => {
    expect(shouldLock(base, 5 * 60_000 - 1)).toBe(false);
    expect(shouldLock(base, 5 * 60_000)).toBe(true);
  });

  it('respeita o tempo configurado de 1 a 30 minutos', () => {
    expect(shouldLock({ ...base, autoLockMinutes: 30 }, 29 * 60_000)).toBe(false);
    expect(shouldLock({ ...base, autoLockMinutes: 1 }, 60_000)).toBe(true);
    expect(validAutoLockMinutes(0)).toBe(false);
    expect(validAutoLockMinutes(31)).toBe(false);
    expect(validAutoLockMinutes(2.5)).toBe(false);
    expect(() => shouldLock({ ...base, autoLockMinutes: 0 }, 0)).toThrow(DomainError);
  });

  it('na dúvida, bloqueia: valor inválido ou relógio que voltou no tempo', () => {
    expect(shouldLock(base, Number.NaN)).toBe(true);
    expect(shouldLock({ ...base, lastActivityMs: Number.NaN }, 0)).toBe(true);
    expect(shouldLock({ ...base, lastActivityMs: 10_000 }, 5_000)).toBe(true);
    expect(shouldLock({ ...base, hiddenSinceMs: Number.NaN }, 1000)).toBe(true);
  });

  it('aba oculta por 5 minutos bloqueia mesmo com bloqueio configurado para 30', () => {
    const oculta = { lastActivityMs: 0, hiddenSinceMs: 1000, autoLockMinutes: 30 };
    expect(shouldLock(oculta, 1000 + HIDDEN_TAB_LOCK_MS - 1)).toBe(false);
    expect(shouldLock(oculta, 1000 + HIDDEN_TAB_LOCK_MS)).toBe(true);
  });
});

describe('[SEC-11] espera depois de senhas erradas', () => {
  it('sem espera até 4 erros; depois 30 s, 1 min, 2 min, 5 min e no máximo 15 min', () => {
    expect([0, 4, 5, 6, 7, 8, 9, 50].map(unlockDelaySeconds)).toEqual([0, 0, 30, 60, 120, 300, 900, 900]);
  });

  it('a espera nunca diminui com mais erros', () => {
    for (let n = 0; n < 40; n++)
      expect(unlockDelaySeconds(n + 1)).toBeGreaterThanOrEqual(unlockDelaySeconds(n));
  });
});

describe('[COF-001] código de recuperação', () => {
  it('15 bytes viram 24 caracteres do alfabeto, e zeros viram zeros', () => {
    expect(encodeRecoveryCode(new Uint8Array(15))).toBe('0'.repeat(24));
    expect(encodeRecoveryCode(new Uint8Array(15).fill(255))).toBe('Z'.repeat(24));
    expect(() => encodeRecoveryCode(new Uint8Array(14))).toThrow(DomainError);
  });

  it('usa só o alfabeto sem letras ambíguas e mostra em grupos de 6', () => {
    forAll('código de recuperação', (rng) => {
      const bytes = new Uint8Array(15).map(() => rng.int(0, 255));
      const c = encodeRecoveryCode(bytes);
      expect(c).toHaveLength(24);
      for (const ch of c) expect(RECOVERY_ALPHABET).toContain(ch);
      expect(formatRecoveryCode(c)).toMatch(/^[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}$/);
      expect(normalizeRecoveryCode(formatRecoveryCode(c).toLowerCase())).toBe(c);
    });
  });

  it('códigos diferentes para bytes diferentes', () => {
    const a = encodeRecoveryCode(new Uint8Array(15));
    const b = encodeRecoveryCode(new Uint8Array([1, ...new Array<number>(14).fill(0)]));
    expect(a).not.toBe(b);
  });

  it('aceita O, I e L digitados no lugar de 0 e 1, e recusa o que não é código', () => {
    expect(normalizeRecoveryCode('oooooo-iiiiii-llllll-000000')).toBe('000000111111111111000000');
    expect(normalizeRecoveryCode('curto')).toBeNull();
    expect(normalizeRecoveryCode('U'.repeat(24))).toBeNull();
    expect(normalizeRecoveryCode('*'.repeat(24))).toBeNull();
  });
});
