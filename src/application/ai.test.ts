// Razão IA nível 1 na aplicação: sugestão (IA-001), alertas (IA-006) e desligar (IA-013). Dados sintéticos.
import { describe, expect, it } from 'vitest';
import { parseCivilDate } from '@/domain/civil-date';
import { aiEnabled, computeAlerts, createSuggester, setAiEnabled } from './ai';
import type { FlowRow } from './entry-ops';
import type { Category, CategoryRuleItem } from './model';

const cat = (id: string, group: 'income' | 'expense' = 'expense', archived = false): Category => ({
  id,
  name: id,
  group,
  parentId: null,
  ledgerAccountId: `l-${id}`,
  archived,
  createdAt: '2026-11-01T00:00:00Z',
});
const cats = [cat('mercado'), cat('combustivel'), cat('velha', 'expense', true), cat('salario', 'income')];
const row = (p: Partial<FlowRow> & Pick<FlowRow, 'entryId'>): FlowRow => ({
  kind: 'despesa',
  date: parseCivilDate('2026-11-20'),
  status: 'realizado',
  accountId: 'banco',
  amountCents: 1000,
  parts: [{ categoryId: 'mercado', amountCents: 1000 }],
  description: 'Mercado Bom Preço',
  tags: [],
  note: '',
  edited: false,
  ...p,
});
const regra = (pattern: string, categoryId: string, priority = 0): CategoryRuleItem => ({
  id: `r-${pattern}`,
  pattern,
  categoryId,
  scope: 'despesa',
  priority,
  active: true,
  removed: false,
  createdAt: '2026-11-01T00:00:00Z',
});
const memoria = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v) };
};

describe('[IA-001] sugestão de categoria no espaço', () => {
  const rows = [
    row({ entryId: '1' }),
    row({
      entryId: '2',
      description: 'Posto Avenida',
      parts: [{ categoryId: 'combustivel', amountCents: 1000 }],
    }),
    row({
      entryId: '3',
      description: 'Posto Shell',
      parts: [{ categoryId: 'combustivel', amountCents: 1000 }],
    }),
    row({ entryId: '4', description: 'Antiga', parts: [{ categoryId: 'velha', amountCents: 1000 }] }),
  ];

  it('[IA-001] regra primeiro, depois histórico e palavras, sempre com o motivo', () => {
    const s = createSuggester(rows, cats, [regra('shell', 'mercado')], true);
    expect(s('POSTO SHELL', 'despesa')).toEqual({
      categoryId: 'mercado',
      why: 'pela sua regra "shell"',
      source: 'regra',
    });
    expect(s('mercado bom preco', 'despesa')).toMatchObject({ categoryId: 'mercado', source: 'historico' });
    expect(s('Posto Ipiranga', 'despesa')).toMatchObject({ categoryId: 'combustivel', source: 'palavras' });
    expect(s('Posto Ipiranga', 'despesa')?.why).toContain('"posto"');
    expect(s('Posto Ipiranga', 'receita')).toBeUndefined();
    expect(s('Antiga', 'despesa')).toBeUndefined();
  });

  it('[IA-013] com a IA desligada, só as regras da pessoa continuam valendo', () => {
    const s = createSuggester(rows, cats, [regra('shell', 'mercado')], false);
    expect(s('Mercado Bom Preço', 'despesa')).toBeUndefined();
    expect(s('Posto Shell', 'despesa')?.source).toBe('regra');
    const prefs = memoria();
    expect(aiEnabled(prefs)).toBe(true);
    setAiEnabled(prefs, false);
    expect(aiEnabled(prefs)).toBe(false);
    setAiEnabled(prefs, true);
    expect(aiEnabled(prefs)).toBe(true);
  });
});

describe('[IA-006] alertas priorizados', () => {
  const hoje = parseCivilDate('2026-11-27');
  const rows = [
    row({
      entryId: 'p1',
      status: 'pendente',
      date: parseCivilDate('2026-11-20'),
      description: 'Internet',
      amountCents: 9990,
    }),
    row({
      entryId: 'p2',
      status: 'pendente',
      date: parseCivilDate('2026-11-29'),
      description: 'Aluguel',
      amountCents: 150000,
    }),
    row({ entryId: 'd1', date: parseCivilDate('2026-11-25'), description: 'Uber' }),
    row({ entryId: 'd2', date: parseCivilDate('2026-11-26'), description: 'UBER' }),
    row({
      entryId: 'r1',
      kind: 'receita',
      status: 'pendente',
      date: parseCivilDate('2026-12-02'),
      amountCents: 500000,
      parts: [{ categoryId: 'salario', amountCents: 500000 }],
      description: 'Salário',
    }),
  ];
  const balances = [{ accountId: 'banco', name: 'Banco Azul', cents: 100000 }];

  it('[IA-006] no máximo 3, em ordem: atrasado, saldo no vermelho, vence logo; repetido fica de fora', () => {
    const a = computeAlerts({ rows, balances, today: hoje, dismissed: new Set() });
    expect(a.map((x) => x.kind)).toEqual(['atrasado', 'saldo-negativo', 'vence-logo']);
    expect(a[0]?.title).toBe('Internet está atrasado');
    expect(a[1]?.text).toContain('R$');
    expect(a[2]?.title).toBe('Aluguel vence em 29/11/2026');
  });

  it('[IA-006] dispensado não volta e abre espaço para o próximo; sem pendência, não inventa alerta', () => {
    const primeiro = computeAlerts({ rows, balances, today: hoje, dismissed: new Set() });
    const sem = new Set(primeiro.slice(0, 2).map((x) => x.id));
    const depois = computeAlerts({ rows, balances, today: hoje, dismissed: sem });
    expect(depois.map((x) => x.kind)).toEqual(['vence-logo', 'duplicado']);
    expect(depois.every((x) => !sem.has(x.id))).toBe(true);
    expect(
      computeAlerts({ rows: [row({ entryId: 'x' })], balances, today: hoje, dismissed: new Set() }),
    ).toEqual([]);
  });

  it('[IA-006] saldo positivo depois dos a vencer não gera alerta de vermelho', () => {
    const a = computeAlerts({
      rows,
      balances: [{ accountId: 'banco', name: 'Banco Azul', cents: 900000 }],
      today: hoje,
      dismissed: new Set(),
    });
    expect(a.map((x) => x.kind)).not.toContain('saldo-negativo');
  });
});
