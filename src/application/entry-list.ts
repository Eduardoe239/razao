// Lista de lançamentos: filtros, totais, agrupamento por dia e nomes de categoria (LAN-011).
// Tudo puro e sem tela, para a interface só desenhar e os testes conferirem as contas.
import type { CivilDate } from '@/domain/civil-date';
import { parseCivilDate, toDayNumber } from '@/domain/civil-date';
import type { FlowRow } from './entry-ops';
import type { Category } from './model';

export type FlowTab = 'todos' | 'entradas' | 'saidas' | 'a-vencer';

export interface FlowFilter {
  /** aaaa-mm. A aba "A vencer" mostra todos os pendentes, de qualquer mês. */
  readonly month: string;
  readonly tab: FlowTab;
  readonly accountIds: readonly string[];
  /** Escolher uma principal inclui as subcategorias dela. */
  readonly categoryIds: readonly string[];
  readonly status: 'todos' | 'realizado' | 'pendente';
  readonly tag: string;
}

export const emptyFilter = (month: string, tab: FlowTab = 'todos'): FlowFilter => ({
  month,
  tab,
  accountIds: [],
  categoryIds: [],
  status: 'todos',
  tag: '',
});

/** Quantos filtros além do mês e da aba estão ligados (o número no botão "Filtros"). */
export function activeFilterCount(f: FlowFilter): number {
  return (
    (f.accountIds.length ? 1 : 0) +
    (f.categoryIds.length ? 1 : 0) +
    (f.status !== 'todos' ? 1 : 0) +
    (f.tag.trim() ? 1 : 0)
  );
}

/** Receita soma, despesa subtrai. */
export const signedCents = (r: FlowRow): number => (r.kind === 'receita' ? r.amountCents : -r.amountCents);

const semAcento = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

export function filterFlows(
  rows: readonly FlowRow[],
  f: FlowFilter,
  categories: readonly Category[],
): FlowRow[] {
  const cats = new Set(f.categoryIds);
  for (const c of categories) if (c.parentId && cats.has(c.parentId)) cats.add(c.id);
  const contas = new Set(f.accountIds);
  const tag = semAcento(f.tag);
  return rows.filter((r) => {
    if (f.tab === 'a-vencer') {
      if (r.status !== 'pendente') return false;
    } else {
      if (!r.date.startsWith(`${f.month}-`)) return false;
      if (f.tab === 'entradas' && r.kind !== 'receita') return false;
      if (f.tab === 'saidas' && r.kind !== 'despesa') return false;
    }
    if (f.status !== 'todos' && r.status !== f.status) return false;
    if (contas.size && !contas.has(r.accountId)) return false;
    if (cats.size && !r.parts.some((p) => cats.has(p.categoryId))) return false;
    if (tag && !r.tags.some((t) => semAcento(t) === tag)) return false;
    return true;
  });
}

export interface FlowTotals {
  /** Só realizados: o que já entrou e saiu. */
  readonly income: number;
  readonly expense: number;
  readonly result: number;
  /** Pendentes, com sinal: o que ainda vai entrar ou sair. */
  readonly pending: number;
  readonly count: number;
}

export function flowTotals(rows: readonly FlowRow[]): FlowTotals {
  let income = 0;
  let expense = 0;
  let pending = 0;
  for (const r of rows) {
    if (r.status === 'pendente') pending += signedCents(r);
    else if (r.kind === 'receita') income += r.amountCents;
    else expense += r.amountCents;
  }
  return {
    income,
    expense: expense === 0 ? 0 : -expense,
    result: income - expense,
    pending,
    count: rows.length,
  };
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** "Qui, 26 de novembro"; o dia 1 vira "1º". */
export function dayLabel(date: CivilDate): string {
  const n = toDayNumber(date);
  const semana = DIAS[(((n + 4) % 7) + 7) % 7] ?? '';
  const [, mes = '1', dia = '1'] = date.split('-');
  const d = Number(dia);
  return `${semana}, ${d === 1 ? '1º' : String(d)} de ${MESES[Number(mes) - 1] ?? ''}`;
}

/** "Novembro de 2026". */
export function monthLabel(month: string): string {
  const [ano = '', mes = '1'] = month.split('-');
  const nome = MESES[Number(mes) - 1] ?? '';
  return `${nome.charAt(0).toLocaleUpperCase('pt-BR')}${nome.slice(1)} de ${ano}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [ano = '2000', mes = '1'] = month.split('-');
  const total = Number(ano) * 12 + Number(mes) - 1 + delta;
  return `${String(Math.floor(total / 12))}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export const monthOfDate = (date: CivilDate): string => date.slice(0, 7);

export interface DayGroup {
  readonly date: CivilDate;
  readonly label: string;
  readonly totalCents: number;
  readonly rows: readonly FlowRow[];
}

/** Do dia mais novo para o mais antigo; pendente de data futura diz "a vencer". */
export function groupByDay(rows: readonly FlowRow[], today: CivilDate): DayGroup[] {
  const grupos = new Map<string, FlowRow[]>();
  for (const r of [...rows].sort((a, b) => b.date.localeCompare(a.date))) {
    const lista = grupos.get(r.date) ?? [];
    lista.push(r);
    grupos.set(r.date, lista);
  }
  return [...grupos].map(([d, lista]) => {
    const date = parseCivilDate(d);
    const pendentes = lista.every((r) => r.status === 'pendente');
    const sufixo = pendentes ? (d > today ? ' · a vencer' : ' · atrasado') : '';
    return {
      date,
      label: dayLabel(date) + sufixo,
      totalCents: lista.reduce((t, r) => t + signedCents(r), 0),
      rows: lista,
    };
  });
}

/** "Transporte › Combustível". Categoria que sumiu aparece como "Sem categoria", nunca some da lista. */
export function categoryName(categories: readonly Category[], id: string): string {
  const c = categories.find((x) => x.id === id);
  if (!c) return 'Sem categoria';
  const pai = c.parentId ? categories.find((x) => x.id === c.parentId) : undefined;
  return pai ? `${pai.name} › ${c.name}` : c.name;
}

export interface CategoryOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Categorias para escolher num lançamento: só as ativas e do tipo certo (CAT-001: receita só oferece receita).
 * A principal com subcategorias aparece antes delas; cada uma pode ser escolhida.
 */
export function categoryOptions(
  categories: readonly Category[],
  kind: 'receita' | 'despesa',
): CategoryOption[] {
  const grupo = kind === 'receita' ? 'income' : 'expense';
  const ativas = categories.filter((c) => c.group === grupo && !c.archived);
  const out: CategoryOption[] = [];
  for (const pai of ativas.filter((c) => c.parentId === null)) {
    out.push({ value: pai.id, label: pai.name });
    for (const f of ativas.filter((c) => c.parentId === pai.id)) {
      out.push({ value: f.id, label: `${pai.name} › ${f.name}` });
    }
  }
  return out;
}

/** A categoria usada no lançamento mais recente do tipo, para já vir escolhida no próximo. */
export function lastCategory(rows: readonly FlowRow[], kind: 'receita' | 'despesa'): string | undefined {
  const r = [...rows].filter((x) => x.kind === kind).sort((a, b) => b.date.localeCompare(a.date))[0];
  return r?.parts.length === 1 ? r.parts[0]?.categoryId : undefined;
}
