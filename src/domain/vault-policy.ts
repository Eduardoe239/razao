// Regras do cofre que não dependem de criptografia: bloqueio, espera após erros e código de recuperação.
// Volume 05, seção 3; Volume 09, SEC-11; COF-001 e COF-002.
import { ensure } from './errors';

export const AUTO_LOCK_DEFAULT_MINUTES = 5;
export const AUTO_LOCK_MIN_MINUTES = 1;
export const AUTO_LOCK_MAX_MINUTES = 30;
/** Aba oculta por esse tempo também bloqueia, seja qual for a configuração (Volume 09, T-04). */
export const HIDDEN_TAB_LOCK_MS = 5 * 60_000;

export function validAutoLockMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= AUTO_LOCK_MIN_MINUTES && minutes <= AUTO_LOCK_MAX_MINUTES;
}

export interface ActivityState {
  /** Instante da última interação, em milissegundos. */
  readonly lastActivityMs: number;
  /** Instante em que a aba ficou oculta, ou null se está visível. */
  readonly hiddenSinceMs: number | null;
  readonly autoLockMinutes: number;
}

/**
 * COF-002: o cofre bloqueia por inatividade ou por aba oculta tempo demais. O instante "agora" vem de fora
 * e deve ser de relógio monotônico (performance.now). Na dúvida, bloqueia: valor inválido ou relógio que
 * voltou no tempo contam como tempo esgotado (revisão da cripto, B6).
 */
export function shouldLock(state: ActivityState, nowMs: number): boolean {
  ensure(
    validAutoLockMinutes(state.autoLockMinutes),
    'OPERATION_INVALID',
    'Tempo de bloqueio fora de 1 a 30 minutos.',
  );
  const esgotou = (desde: number, limite: number) => {
    const passou = nowMs - desde;
    return !(passou >= 0 && passou < limite);
  };
  if (esgotou(state.lastActivityMs, state.autoLockMinutes * 60_000)) return true;
  return state.hiddenSinceMs !== null && esgotou(state.hiddenSinceMs, HIDDEN_TAB_LOCK_MS);
}

/**
 * SEC-11: espera depois de senhas erradas seguidas. Até 4 erros não há espera;
 * do 5º em diante ela cresce até 15 minutos.
 */
export function unlockDelaySeconds(failedAttempts: number): number {
  if (failedAttempts < 5) return 0;
  const tabela = [30, 60, 120, 300];
  return tabela[failedAttempts - 5] ?? 900;
}

// Código de recuperação: 24 caracteres do alfabeto base32 de Crockford = 120 bits (15 bytes).
// O alfabeto não tem I, L, O nem U; quem digitar O, I ou L recebe 0 ou 1, que é o que estava escrito.
export const RECOVERY_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const RECOVERY_BYTES = 15;
export const RECOVERY_LENGTH = 24;

/** Transforma 15 bytes aleatórios nos 24 caracteres do código. */
export function encodeRecoveryCode(bytes: Uint8Array): string {
  ensure(
    bytes.length === RECOVERY_BYTES,
    'OPERATION_INVALID',
    'O código de recuperação precisa de 15 bytes.',
  );
  let bits = 0;
  let acumulado = 0;
  let saida = '';
  for (const b of bytes) {
    acumulado = (acumulado << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      saida += RECOVERY_ALPHABET.charAt((acumulado >> bits) & 31);
    }
    acumulado &= (1 << bits) - 1;
  }
  return saida;
}

/** Limpa o que a pessoa digitou. Devolve null se não for um código válido. */
export function normalizeRecoveryCode(input: string): string | null {
  const limpo = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (limpo.length !== RECOVERY_LENGTH) return null;
  for (const c of limpo) if (!RECOVERY_ALPHABET.includes(c)) return null;
  return limpo;
}

/** Mostra o código em 4 grupos de 6, mais fácil de copiar à mão. */
export function formatRecoveryCode(code: string): string {
  return code.match(/.{1,6}/g)?.join('-') ?? code;
}
