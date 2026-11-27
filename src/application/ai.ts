// Razão IA nível 1 na aplicação (Volume 07, seção 2): sugestão de categoria (IA-001), alertas priorizados
// (IA-006) e a chave de ligar e desligar (IA-013). Tudo calculado no aparelho, sem rede.
import type { CivilDate } from '@/domain/civil-date';
import { addDays, diffDays } from '@/domain/civil-date';
import { matchRule, normalizeText } from '@/domain/category-rules';
import type { CategorySuggestion } from '@/domain/categorizer';
import { trainCategorizer } from '@/domain/categorizer';
import { signedCents } from './entry-list';
import type { FlowRow } from './entry-ops';
import { formatBRL, formatDate } from './format';
import type { Category, CategoryRuleItem } from './model';
import type { Prefs } from './reminder';

export const AI_PREF = 'razao:ia-nivel-1';

/** IA-013: ligada por padrão; desligar vale para este aparelho. */
export const aiEnabled = (prefs: Prefs): boolean => prefs.getItem(AI_PREF) !== 'desligada';
export function setAiEnabled(prefs: Prefs, on: boolean): void {
  prefs.setItem(AI_PREF, on ? 'ligada' : 'desligada');
}

export interface Suggestion {
  readonly categoryId: string;
  /** Por que sugeriu, em uma frase curta para a pessoa. */
  readonly why: string;
  readonly source: 'regra' | 'historico' | 'palavras';
}

export type Suggester = (description: string, kind: 'receita' | 'despesa') => Suggestion | undefined;

function porque(s: CategorySuggestion): string {
  if (s.reason.kind === 'historico') {
    return s.reason.times === 1
      ? 'você usou essa categoria da última vez com essa descrição'
      : `você usou essa categoria ${String(s.reason.times)} vezes com essa descrição`;
  }
  const palavras = s.reason.words.map((w) => `"${w}"`).join(', ');
  return `${s.reason.words.length === 1 ? 'a palavra' : 'as palavras'} ${palavras} aparecem em lançamentos parecidos`;
}

/**
 * Monta o sugeridor do espaço: primeiro as regras da pessoa (CAT-003), depois o histórico e as palavras
 * (IA-001), só com a IA ligada. Nunca devolve categoria arquivada, inexistente ou do outro tipo.
 */
export function createSuggester(
  rows: readonly FlowRow[],
  categories: readonly Category[],
  rules: readonly CategoryRuleItem[],
  aiOn: boolean,
): Suggester {
  const cats = new Map(categories.map((c) => [c.id, c]));
  const serve = (kind: 'receita' | 'despesa') => (id: string) => {
    const c = cats.get(id);
    return c !== undefined && !c.archived && c.group === (kind === 'receita' ? 'income' : 'expense');
  };
  const exemplos = (kind: 'receita' | 'despesa') =>
    rows
      .filter((r) => r.kind === kind && r.parts.length === 1 && r.description.trim())
      .map((r) => ({ description: r.description, categoryId: r.parts[0]?.categoryId ?? '' }));
  const modelos = aiOn
    ? { receita: trainCategorizer(exemplos('receita')), despesa: trainCategorizer(exemplos('despesa')) }
    : null;
  return (description, kind) => {
    const regra = matchRule(rules, description, kind, serve(kind));
    if (regra)
      return { categoryId: regra.categoryId, why: `pela sua regra "${regra.pattern}"`, source: 'regra' };
    const s = modelos?.[kind].suggest(description, serve(kind));
    return s ? { categoryId: s.categoryId, why: porque(s), source: s.reason.kind } : undefined;
  };
}

export type AlertKind = 'atrasado' | 'saldo-negativo' | 'vence-logo' | 'duplicado';

export interface AiAlert {
  /** Estável: o mesmo alerta tem o mesmo id, para o dispensado não voltar (IA-006). */
  readonly id: string;
  readonly kind: AlertKind;
  readonly tone: 'warning' | 'negative' | 'info';
  readonly title: string;
  readonly text: string;
  readonly entryIds: readonly string[];
}

export const MAX_ALERTS = 3;
const DIAS_VENCE = 3;
const DIAS_PREVISAO = 30;

/**
 * IA-006: no máximo 3 alertas, por prioridade: atrasado, saldo que vai ficar negativo, vence em breve e
 * possível repetido. Dispensado não volta. O tom é calmo e nunca positivo diante de número negativo.
 */
export function computeAlerts(input: {
  rows: readonly FlowRow[];
  balances: readonly { accountId: string; name: string; cents: number }[];
  today: CivilDate;
  dismissed: ReadonlySet<string>;
}): AiAlert[] {
  const { rows, today } = input;
  const nome = (r: FlowRow) => r.description || 'Um lançamento';
  const pendentes = rows.filter((r) => r.status === 'pendente');
  const todos: AiAlert[] = [];

  for (const r of pendentes.filter((x) => x.date < today).sort((a, b) => a.date.localeCompare(b.date))) {
    todos.push({
      id: `atrasado:${r.entryId}`,
      kind: 'atrasado',
      tone: 'negative',
      title: `${nome(r)} está atrasado`,
      text: `Venceu em ${formatDate(r.date)} e ainda não foi confirmado (${formatBRL(r.amountCents)}). Se já pagou, confirme para entrar no saldo.`,
      entryIds: [r.entryId],
    });
  }

  // Saldo previsto dia a dia com os a vencer da conta: o ponto mais baixo é o que importa,
  // mesmo que um recebimento depois devolva o saldo ao azul.
  const limite = addDays(today, DIAS_PREVISAO);
  for (const b of input.balances) {
    const futuros = pendentes
      .filter((r) => r.accountId === b.accountId && r.date <= limite)
      .sort((x, y) => x.date.localeCompare(y.date) || signedCents(x) - signedCents(y));
    let saldo = b.cents;
    let menor = { cents: b.cents, date: today };
    for (const r of futuros) {
      saldo += signedCents(r);
      if (saldo < menor.cents) menor = { cents: saldo, date: r.date < today ? today : r.date };
    }
    if (menor.cents < 0) {
      todos.push({
        id: `saldo-negativo:${b.accountId}:${futuros
          .map((r) => r.entryId)
          .sort()
          .join(',')}`,
        kind: 'saldo-negativo',
        tone: 'warning',
        title: `${b.name} pode ficar no vermelho`,
        text: `Com o que vence até lá, o saldo previsto chega a ${formatBRL(menor.cents)} em ${formatDate(menor.date)}.`,
        entryIds: futuros.map((r) => r.entryId),
      });
    }
  }

  const logo = addDays(today, DIAS_VENCE);
  for (const r of pendentes
    .filter((x) => x.date >= today && x.date <= logo)
    .sort((a, b) => a.date.localeCompare(b.date))) {
    todos.push({
      id: `vence-logo:${r.entryId}`,
      kind: 'vence-logo',
      tone: 'info',
      title: `${nome(r)} vence ${r.date === today ? 'hoje' : `em ${formatDate(r.date)}`}`,
      text: `${formatBRL(r.amountCents)} ${r.kind === 'receita' ? 'a receber' : 'a pagar'}.`,
      entryIds: [r.entryId],
    });
  }

  // Possível repetido: mesma conta, mesmo tipo e valor, datas a até 1 dia e descrições iguais ou vazias.
  const realizados = rows.filter((r) => r.status === 'realizado' && r.date >= addDays(today, -30));
  const vistos = new Set<string>();
  for (let i = 0; i < realizados.length; i++) {
    const a = realizados[i];
    if (!a) continue;
    for (let j = i + 1; j < realizados.length; j++) {
      const b = realizados[j];
      if (!b || vistos.has(b.entryId)) continue;
      const perto = Math.abs(diffDays(a.date, b.date)) <= 1;
      const mesmo = normalizeText(a.description) === normalizeText(b.description);
      if (
        a.accountId === b.accountId &&
        a.kind === b.kind &&
        a.amountCents === b.amountCents &&
        perto &&
        mesmo
      ) {
        vistos.add(b.entryId);
        const ids = [a.entryId, b.entryId].sort();
        todos.push({
          id: `duplicado:${ids.join(',')}`,
          kind: 'duplicado',
          tone: 'info',
          title: 'Pode ser um lançamento repetido',
          text: `${nome(a)}, ${formatBRL(a.amountCents)}, aparece duas vezes em ${formatDate(a.date)}${a.date === b.date ? '' : ` e ${formatDate(b.date)}`}. Se for o mesmo gasto, exclua um deles. O app não apaga nada sozinho.`,
          entryIds: ids,
        });
      }
    }
  }
  return todos.filter((x) => !input.dismissed.has(x.id)).slice(0, MAX_ALERTS);
}
