// Relógios do aparelho. O domínio nunca lê o relógio; a aplicação recebe estas funções (Volume 04).
import type { Clock } from '@/application/ports';
import type { CivilDate } from '@/domain/civil-date';
import { parseCivilDate } from '@/domain/civil-date';

/** Data civil de um instante num fuso, sem depender do fuso do aparelho. */
export function civilDateIn(ms: number, timeZone: string): CivilDate {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  return parseCivilDate(`${v('year')}-${v('month')}-${v('day')}`);
}

export const browserClock: Clock = {
  nowIso: () => new Date().toISOString(),
  nowMs: () => Date.now(),
  monotonicMs: () => performance.now(),
  today: (timeZone) => civilDateIn(Date.now(), timeZone),
  deviceTimeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
};
