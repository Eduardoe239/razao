// Formatos de exibição do design system: "R$ 1.240,00", sinal com o caractere "−" (U+2212), datas dd/mm/aaaa.
import type { CivilDate } from '@/domain/civil-date';
import { formatCivilDate } from '@/domain/civil-date';
import { money } from '@/domain/money';
import { formatMoney, parseMoneyInput } from '@/domain/money-text';
import { formatRecoveryCode } from '@/domain/vault-policy';

export const MINUS = '−';

/** Centavos inteiros em texto. Com signed, valores positivos levam "+". */
export function formatBRL(cents: number, opts: { signed?: boolean } = {}): string {
  const texto = formatMoney(money(Math.abs(cents)));
  if (cents < 0) return `${MINUS}\u00a0${texto}`;
  if (opts.signed && cents > 0) return `+\u00a0${texto}`;
  return texto;
}

export type MoneyInput = { ok: true; cents: number } | { ok: false; reason: string };

/** Lê o que a pessoa digitou num campo de valor. Nunca arredonda em silêncio. */
export function readMoney(text: string, allowNegative = false): MoneyInput {
  const limpo = text.replace(/−/g, '-');
  const r = parseMoneyInput(limpo, { allowNegative, allowCurrencySymbol: true });
  return r.ok ? { ok: true, cents: r.value.amount } : { ok: false, reason: r.reason };
}

export function formatDate(date: CivilDate): string {
  return formatCivilDate(date);
}

/** O código aparece em 4 grupos de 6 (Volume 05, seção 3). */
export function recoveryGroups(code: string): string[] {
  return formatRecoveryCode(code).split('-');
}
