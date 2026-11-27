// Filtros, totais e agrupamento da lista de lançamentos, com dados sintéticos (LAN-011).
import { describe, expect, it } from 'vitest';
import { parseCivilDate } from '@/domain/civil-date';
import type { FlowRow } from './entry-ops';
import {
  activeFilterCount,
  categoryName,
  categoryOptions,
  dayLabel,
  emptyFilter,
  filterFlows,
  flowTotals,
  groupByDay,
  lastCategory,
  monthLabel,
  shiftMonth,
} from './entry-list';
import type { Category } from './model';

const cat = (
  id: string,
  name: string,
  group: 'income' | 'expense',
  parentId: string | null = null,
): Category => ({
  id,
  name,
  group,
  parentId,
  ledgerAccountId: `l-${id}`,
  archived: false,
  createdAt: '2026-11-01T00:00:00Z',
});
const cats = [
  cat('ali', 'Alimentação', 'expense'),
  cat('mer', 'Mercado', 'expense', 'ali'),
  cat('far', 'Farmácia', 'expense'),
  cat('sal', 'Salário', 'income'),
  { ...cat('vel', 'Velha', 'expense'), archived: true },
];
const row = (p: Partial<FlowRow> & Pick<FlowRow, 'entryId'>): FlowRow => ({
  kind: 'despesa',
  date: parseCivilDate('2026-11-10'),
  status: 'realizado',
  accountId: 'banco',
  amountCents: 1000,
  parts: [{ categoryId: 'mer', amountCents: 1000 }],
  description: '',
  tags: [],
  note: '',
  edited: false,
  attachments: 0,
  ...p,
});
const rows = [
  row({ entryId: 'a' }),
  row({
    entryId: 'b',
    kind: 'receita',
    amountCents: 500000,
    parts: [{ categoryId: 'sal', amountCents: 500000 }],
  }),
  row({ entryId: 'c', date: parseCivilDate('2026-12-01'), status: 'pendente', amountCents: 150000 }),
  row({ entryId: 'd', date: parseCivilDate('2026-10-30'), accountId: 'carteira', tags: ['Viagem'] }),
  row({
    entryId: 'e',
    accountId: 'carteira',
    amountCents: 3000,
    parts: [
      { categoryId: 'far', amountCents: 1000 },
      { categoryId: 'mer', amountCents: 2000 },
    ],
    tags: ['viágem', 'casa'],
  }),
];
const ids = (r: readonly FlowRow[]) => r.map((x) => x.entryId).sort();

describe('[LAN-011] filtros e totais da lista', () => {
  it('[LAN-011] abas: o mês vale para Todos, Entradas e Saídas; A vencer mostra todo pendente', () => {
    const nov = emptyFilter('2026-11');
    expect(ids(filterFlows(rows, nov, cats))).toEqual(['a', 'b', 'e']);
    expect(ids(filterFlows(rows, { ...nov, tab: 'entradas' }, cats))).toEqual(['b']);
    expect(ids(filterFlows(rows, { ...nov, tab: 'saidas' }, cats))).toEqual(['a', 'e']);
    expect(ids(filterFlows(rows, { ...nov, tab: 'a-vencer' }, cats))).toEqual(['c']);
    expect(ids(filterFlows(rows, emptyFilter('2026-12'), cats))).toEqual(['c']);
  });

  it('[LAN-011] conta, categoria (a principal inclui as subcategorias), situação e tag sem acento', () => {
    const nov = emptyFilter('2026-11');
    expect(ids(filterFlows(rows, { ...nov, accountIds: ['carteira'] }, cats))).toEqual(['e']);
    expect(ids(filterFlows(rows, { ...nov, categoryIds: ['ali'] }, cats))).toEqual(['a', 'e']);
    expect(ids(filterFlows(rows, { ...nov, categoryIds: ['far'] }, cats))).toEqual(['e']);
    expect(ids(filterFlows(rows, { ...emptyFilter('2026-10'), tag: 'VIAGEM' }, cats))).toEqual(['d']);
    expect(ids(filterFlows(rows, { ...nov, tag: 'viagem' }, cats))).toEqual(['e']);
    expect(ids(filterFlows(rows, { ...emptyFilter('2026-12'), status: 'realizado' }, cats))).toEqual([]);
    expect(activeFilterCount({ ...nov, accountIds: ['x'], tag: ' t ', status: 'pendente' })).toBe(3);
    expect(activeFilterCount(nov)).toBe(0);
  });

  it('[LAN-011] totais: entradas, saídas e resultado só do realizado; pendente à parte, com sinal', () => {
    expect(flowTotals(rows)).toEqual({
      income: 500000,
      expense: -5000,
      result: 495000,
      pending: -150000,
      count: 5,
    });
    expect(flowTotals([])).toEqual({ income: 0, expense: 0, result: 0, pending: 0, count: 0 });
  });

  it('[LAN-011] agrupa por dia, do mais novo; pendente futuro diz a vencer e vencido diz atrasado', () => {
    const g = groupByDay(rows, parseCivilDate('2026-11-27'));
    expect(g.map((x) => [x.label, x.totalCents, x.rows.length])).toEqual([
      ['Ter, 1º de dezembro · a vencer', -150000, 1],
      ['Ter, 10 de novembro', 500000 - 1000 - 3000, 3],
      ['Sex, 30 de outubro', -1000, 1],
    ]);
    expect(groupByDay([rows[2] as FlowRow], parseCivilDate('2026-12-05'))[0]?.label).toBe(
      'Ter, 1º de dezembro · atrasado',
    );
    expect(dayLabel(parseCivilDate('2026-11-26'))).toBe('Qui, 26 de novembro');
    expect(dayLabel(parseCivilDate('2024-02-29'))).toBe('Qui, 29 de fevereiro');
  });

  it('[LAN-011] meses: nome, voltar e avançar atravessando o ano', () => {
    expect(monthLabel('2026-11')).toBe('Novembro de 2026');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', -23)).toBe('2024-12');
  });

  it('[CAT-001] escolha de categoria: só ativas e do tipo certo, principal antes das subcategorias', () => {
    expect(categoryOptions(cats, 'despesa').map((o) => o.label)).toEqual([
      'Alimentação',
      'Alimentação › Mercado',
      'Farmácia',
    ]);
    expect(categoryOptions(cats, 'receita').map((o) => o.label)).toEqual(['Salário']);
    expect(categoryName(cats, 'mer')).toBe('Alimentação › Mercado');
    expect(categoryName(cats, 'sumiu')).toBe('Sem categoria');
    expect(lastCategory(rows, 'despesa')).toBe('mer');
    expect(lastCategory(rows, 'receita')).toBe('sal');
    expect(lastCategory([], 'receita')).toBeUndefined();
  });
});
