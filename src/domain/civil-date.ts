// Data civil (AAAA-MM-DD), sem hora e sem fuso (Volume 04, seção 2.2).
// Nunca passa por Date: a conta de dias usa o algoritmo de dias desde a era civil.
import { DomainError } from './errors';

declare const civilDateBrand: unique symbol;
export type CivilDate = string & { readonly [civilDateBrand]: true };

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;
const ANO_MIN = 1900;
const ANO_MAX = 2999;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  const dias = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dias[month - 1] ?? 0;
}

function pad(n: number, size: number): string {
  return n.toString().padStart(size, '0');
}

/** Monta a data a partir de ano, mês e dia, conferindo se ela existe. */
export function civilDate(year: number, month: number, day: number): CivilDate {
  const valida =
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= ANO_MIN &&
    year <= ANO_MAX &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month);
  if (!valida) {
    throw new DomainError(
      'DATE_INVALID',
      `Data inexistente: ${String(year)}-${String(month)}-${String(day)}.`,
    );
  }
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` as CivilDate;
}

/** Lê "AAAA-MM-DD" e recusa datas que não existem, como 2027-02-29. */
export function parseCivilDate(text: string): CivilDate {
  const m = FORMATO.exec(text);
  if (!m) throw new DomainError('DATE_INVALID', `Data fora do formato AAAA-MM-DD: "${text}".`);
  return civilDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

export function isCivilDate(text: string): text is CivilDate {
  try {
    parseCivilDate(text);
    return true;
  } catch {
    return false;
  }
}

export function dateParts(date: CivilDate): { year: number; month: number; day: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { year: y ?? 0, month: m ?? 0, day: d ?? 0 };
}

// Dias desde 1970-01-01, pelo algoritmo "days from civil" (H. Hinnant).
export function toDayNumber(date: CivilDate): number {
  const { year, month, day } = dateParts(date);
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromDayNumber(days: number): CivilDate {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return civilDate(year, month, day);
}

export function addDays(date: CivilDate, days: number): CivilDate {
  return fromDayNumber(toDayNumber(date) + days);
}

export function diffDays(from: CivilDate, to: CivilDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/**
 * Soma meses mantendo o dia, ou o último dia do mês quando ele não existe.
 * Ex.: 2027-01-31 + 1 mês = 2027-02-28. `anchorDay` permite manter o dia original numa série (dia 31 todo mês).
 */
export function addMonths(date: CivilDate, months: number, anchorDay?: number): CivilDate {
  const { year, month, day } = dateParts(date);
  const total = year * 12 + (month - 1) + months;
  const y = Math.floor(total / 12);
  const m = total - y * 12 + 1;
  const desejado = anchorDay ?? day;
  return civilDate(y, m, Math.min(desejado, daysInMonth(y, m)));
}

export function compareDates(a: CivilDate, b: CivilDate): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Sábado ou domingo. A 1.0 só sinaliza; não muda vencimentos (Volume 04, seção 2.2). */
export function isWeekend(date: CivilDate): boolean {
  // 1970-01-01 foi quinta-feira (4); 0 = domingo.
  const weekday = (((toDayNumber(date) + 4) % 7) + 7) % 7;
  return weekday === 0 || weekday === 6;
}

/** Formato de tela: dd/mm/aaaa (NFR-009). */
export function formatCivilDate(date: CivilDate): string {
  const { year, month, day } = dateParts(date);
  return `${pad(day, 2)}/${pad(month, 2)}/${pad(year, 4)}`;
}
