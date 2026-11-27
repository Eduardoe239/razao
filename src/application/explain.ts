// "Explicar" da Razão IA nível 1 (IA-004; J-06 e J-12): a composição de um número pelo livro-razão, com a
// frase montada por modelo de texto. Nenhum número é inventado: cada linha soma lançamentos que a pessoa abre.
import type { CivilDate } from '@/domain/civil-date';
import { addDays, parseCivilDate } from '@/domain/civil-date';
import { activeEntries } from '@/domain/income-expense';
import type { AccountLookup, JournalEntry, LedgerAccount } from '@/domain/ledger';
import { balancesAt, signedEffect } from '@/domain/ledger';
import { categoryName, signedCents } from './entry-list';
import type { FlowRow } from './entry-ops';
import { formatBRL, formatDate } from './format';
import type { Account, Category, Workspace } from './model';

export interface ExplainItem {
  readonly entryId: string;
  readonly label: string;
  readonly date: CivilDate;
  readonly amountCents: number;
}

export interface ExplainGroup {
  readonly key: string;
  readonly label: string;
  readonly totalCents: number;
  readonly items: readonly ExplainItem[];
}

export interface Explanation {
  readonly title: string;
  readonly sentence: string;
  /** Saldo antes do período e no fim dele; ausentes quando o número não é um saldo (total de um mês). */
  readonly opening?: { readonly label: string; readonly cents: number };
  readonly closing?: { readonly label: string; readonly cents: number };
  readonly groups: readonly ExplainGroup[];
  readonly pending: { readonly count: number; readonly cents: number };
  readonly method: string;
}

const verbo = (d: number) => (d > 0 ? 'subiu' : d < 0 ? 'caiu' : 'não mudou');
const ordem = (a: ExplainGroup, b: ExplainGroup) =>
  Math.abs(b.totalCents) - Math.abs(a.totalCents) || a.label.localeCompare(b.label);

function principal(groups: readonly ExplainGroup[], sinal: number): string {
  const g = groups.filter((x) => Math.sign(x.totalCents) === sinal).sort(ordem)[0];
  return g ? `. O que mais pesou foi ${g.label} (${formatBRL(Math.abs(g.totalCents))})` : '';
}

export interface ExplainInput {
  readonly workspace: Workspace;
  readonly entries: readonly JournalEntry[];
  readonly ledger: AccountLookup;
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  /** Conta a explicar; sem conta, explica o total do espaço (todas as contas ativas). */
  readonly accountId?: string | undefined;
  readonly from: CivilDate;
  readonly to: CivilDate;
}

/**
 * Por que o saldo mudou entre `from` e `to` (J-06). Cada lançamento realizado que mexeu na conta entra no grupo
 * da contrapartida: a categoria, a outra conta (transferência), o saldo de abertura ou o ajuste. Transferência
 * entre duas contas do espaço não entra no total do espaço, porque não muda o total.
 */
export function explainBalance(input: ExplainInput): Explanation {
  const { ledger, accounts, categories } = input;
  const porLedger = new Map(accounts.map((a) => [a.ledgerAccountId, a]));
  const catLedger = new Map(categories.map((c) => [c.ledgerAccountId, c]));
  const alvo = input.accountId ? accounts.find((a) => a.id === input.accountId) : undefined;
  const alvos = new Set(
    alvo ? [alvo.ledgerAccountId] : accounts.filter((a) => !a.archived).map((a) => a.ledgerAccountId),
  );
  const nome = (l: LedgerAccount): string => {
    const cat = catLedger.get(l.id);
    if (cat) return categoryName(categories, cat.id);
    const conta = porLedger.get(l.id);
    if (conta) return `Transferência · ${conta.name}`;
    if (l.id === input.workspace.openingEquityId) return 'Saldo de abertura';
    if (l.id === input.workspace.adjustmentEquityId) return 'Ajustes de saldo';
    if (l.id === input.workspace.feeExpenseId) return 'Tarifas bancárias';
    return 'Outros';
  };
  const ativos = activeEntries(input.entries);
  const grupos = new Map<string, { label: string; total: number; items: ExplainItem[] }>();
  let pendentes = 0;
  let pendentesValor = 0;
  for (const e of ativos) {
    const minhas = e.lines.filter((l) => alvos.has(l.accountId));
    if (!minhas.length) continue;
    const efeito = minhas.reduce((s, l) => s + signedEffect(l, ledger.get(l.accountId)?.group ?? 'asset'), 0);
    if (e.status === 'pendente') {
      // A vencer ou atrasado: ainda fora do saldo, mostrado à parte.
      pendentes += 1;
      pendentesValor += efeito;
      continue;
    }
    if (e.date <= input.from || e.date > input.to || efeito === 0) continue;
    // Contrapartidas: as linhas fora das contas explicadas, do lado oposto ao efeito.
    const fora = e.lines.filter((l) => !alvos.has(l.accountId));
    const lado = minhas[0]?.side;
    const opostas = fora.filter((l) => l.side !== lado);
    const base = opostas.length ? opostas : fora;
    const somaBase = base.reduce((s, l) => s + l.amount, 0) || 1;
    let restante = efeito;
    base.forEach((l, i) => {
      const parte = i === base.length - 1 ? restante : Math.round((efeito * l.amount) / somaBase);
      restante -= parte;
      const conta = ledger.get(l.accountId);
      const chave = l.accountId;
      const g = grupos.get(chave) ?? { label: conta ? nome(conta) : 'Outros', total: 0, items: [] };
      g.total += parte;
      g.items.push({
        entryId: e.entryId,
        label: e.meta['description'] || g.label,
        date: e.date,
        amountCents: parte,
      });
      grupos.set(chave, g);
    });
  }
  const antes = balancesAt(input.entries, ledger, input.workspace.id, input.from);
  const depois = balancesAt(input.entries, ledger, input.workspace.id, input.to);
  const somar = (m: ReadonlyMap<string, number>) => [...alvos].reduce((s, id) => s + (m.get(id) ?? 0), 0);
  const abertura = somar(antes);
  const fecho = somar(depois);
  const delta = fecho - abertura;
  const groups = [...grupos]
    .map(([key, g]) => ({
      key,
      label: g.label,
      totalCents: g.total,
      items: g.items.sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .filter((g) => g.totalCents !== 0 || g.items.length > 0)
    .sort(ordem);
  const entrou = groups.filter((g) => g.totalCents > 0).reduce((s, g) => s + g.totalCents, 0);
  const saiu = -groups.filter((g) => g.totalCents < 0).reduce((s, g) => s + g.totalCents, 0);
  const quem = alvo ? alvo.name : 'O total do espaço';
  const sentence =
    delta === 0 && !groups.length
      ? `${alvo ? `O saldo de ${alvo.name}` : 'O total do espaço'} não mudou entre ${formatDate(addDays(input.from, 1))} e ${formatDate(input.to)}.`
      : `${alvo ? `O saldo de ${quem}` : quem} ${verbo(delta)} ${formatBRL(Math.abs(delta))}: entraram ${formatBRL(entrou)} e saíram ${formatBRL(saiu)}${principal(groups, Math.sign(delta) || -1)}.`;
  return {
    title: alvo ? `Por que o saldo de ${alvo.name} mudou` : 'Por que o total mudou',
    sentence,
    opening: { label: `Saldo em ${formatDate(input.from)}`, cents: abertura },
    closing: { label: `Saldo em ${formatDate(input.to)}`, cents: fecho },
    groups,
    pending: { count: pendentes, cents: pendentesValor },
    method:
      'Soma dos lançamentos realizados no período, um por um. Toque numa linha para ver quais. O texto é montado pelo próprio app, sem internet.',
  };
}

/**
 * Total de uma lista filtrada (J-12): quanto entrou e saiu, por categoria, com os lançamentos de cada uma.
 * Lançamento dividido entra em cada categoria com a parte dele.
 */
export function explainFlows(
  rows: readonly FlowRow[],
  categories: readonly Category[],
  periodo: string,
): Explanation {
  const grupos = new Map<string, { total: number; items: ExplainItem[] }>();
  let pendentes = 0;
  let pendentesValor = 0;
  for (const r of rows) {
    if (r.status === 'pendente') {
      pendentes += 1;
      pendentesValor += signedCents(r);
      continue;
    }
    const sinal = r.kind === 'receita' ? 1 : -1;
    for (const p of r.parts) {
      const g = grupos.get(p.categoryId) ?? { total: 0, items: [] };
      g.total += sinal * p.amountCents;
      g.items.push({
        entryId: r.entryId,
        label: r.description || categoryName(categories, p.categoryId),
        date: r.date,
        amountCents: sinal * p.amountCents,
      });
      grupos.set(p.categoryId, g);
    }
  }
  const groups = [...grupos]
    .map(([key, g]) => ({
      key,
      label: categoryName(categories, key),
      totalCents: g.total,
      items: g.items.sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort(ordem);
  const entrou = groups.filter((g) => g.totalCents > 0).reduce((s, g) => s + g.totalCents, 0);
  const saiu = -groups.filter((g) => g.totalCents < 0).reduce((s, g) => s + g.totalCents, 0);
  const resultado = entrou - saiu;
  const maiorSaida = groups.filter((g) => g.totalCents < 0).sort(ordem)[0];
  const sentence = groups.length
    ? `Em ${periodo}, entraram ${formatBRL(entrou)} e saíram ${formatBRL(saiu)}, resultado de ${formatBRL(resultado, { signed: true })}${maiorSaida ? `. A maior saída foi ${maiorSaida.label} (${formatBRL(-maiorSaida.totalCents)})` : ''}.`
    : `Em ${periodo}, nada foi realizado com estes filtros.`;
  return {
    title: 'O que compõe estes totais',
    sentence,
    groups,
    pending: { count: pendentes, cents: pendentesValor },
    method:
      'Soma dos lançamentos realizados que estão na lista, com os filtros da tela. Toque numa categoria para ver quais. O texto é montado pelo próprio app, sem internet.',
  };
}

/** Do início do mês de `today` até hoje: `from` é o último dia do mês anterior (o saldo de partida). */
export function monthToDate(today: CivilDate): { from: CivilDate; to: CivilDate } {
  return { from: addDays(parseCivilDate(`${today.slice(0, 7)}-01`), -1), to: today };
}
