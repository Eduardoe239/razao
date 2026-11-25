// Regras do cofre que a interface aplica: força da senha, espera após erros, bloqueio e aviso do Safari.
import { AUTO_LOCK_DEFAULT_MINUTES, shouldLock, unlockDelaySeconds } from '@/domain/vault-policy';

export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordCheck {
  /** 0 a 4: barras preenchidas no medidor. */
  readonly score: 0 | 1 | 2 | 3 | 4;
  readonly ok: boolean;
  readonly message: string;
}

/**
 * Medidor simples e honesto: comprimento pesa mais que símbolos (frases longas são mais fortes).
 * Senha curta demais ou repetitiva é recusada; o resto só recebe orientação.
 */
export function checkPassword(password: string): PasswordCheck {
  const n = password.length;
  if (n === 0) return { score: 0, ok: false, message: 'Use uma frase que só você saiba.' };
  if (n < MIN_PASSWORD_LENGTH) {
    return { score: 1, ok: false, message: `Use pelo menos ${String(MIN_PASSWORD_LENGTH)} caracteres.` };
  }
  const distintos = new Set(password.toLowerCase()).size;
  if (distintos < 4) return { score: 1, ok: false, message: 'Evite repetir o mesmo caractere.' };
  const variedade = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (n >= 16 || (n >= 12 && variedade >= 3)) {
    return { score: 4, ok: true, message: 'Ótima. Frases longas são as mais fortes.' };
  }
  if (n >= 12 || variedade >= 3) {
    return {
      score: 3,
      ok: true,
      message: 'Boa. Frases longas são mais fortes que senhas curtas com símbolos.',
    };
  }
  return { score: 2, ok: true, message: 'Aceitável. Uma frase mais longa deixa o cofre mais forte.' };
}

/** SEC-11: quanto esperar depois da tentativa errada número "failed". */
export function waitAfterFailures(failed: number): number {
  return unlockDelaySeconds(failed) * 1000;
}

export { AUTO_LOCK_DEFAULT_MINUTES };

/** COF-002: bloqueia por inatividade ou aba oculta. Na dúvida, bloqueia. */
export function lockDue(
  lastActivityMs: number,
  hiddenSinceMs: number | null,
  nowMs: number,
  autoLockMinutes = AUTO_LOCK_DEFAULT_MINUTES,
): boolean {
  try {
    return shouldLock({ lastActivityMs, hiddenSinceMs, autoLockMinutes }, nowMs);
  } catch {
    return true;
  }
}

/**
 * PERS-03: Safari (iPhone, iPad e Mac) aberto como site, fora do modo app.
 * Chrome, Edge e Firefox no iPhone também usam o WebKit e têm a mesma regra de apagar dados.
 */
export function isSafariOutsideApp(userAgent: string, standalone: boolean): boolean {
  if (standalone) return false;
  const ios = /iPhone|iPad|iPod/.test(userAgent);
  const macSafari =
    /Macintosh/.test(userAgent) &&
    /Safari\//.test(userAgent) &&
    !/Chrome|Chromium|Edg|Firefox/.test(userAgent);
  return ios || macSafari;
}

/** iPad com iPadOS se apresenta como Mac; quem tem toque e diz Macintosh é iPad. */
export function looksLikeIos(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}
