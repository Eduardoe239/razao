// Busca (REL-005) e exportação CSV (REL-006, SEC-07), com dados sintéticos.
import { describe, expect, it } from 'vitest';
import { parseCivilDate } from '@/domain/civil-date';
import { CSV_COLUMNS, csvFileName, flowsToCsv, neutralizeCell } from './csv';
import type { FlowRow } from './entry-ops';
import type { Category } from './model';
import { buildSearchIndex, searchCategories, searchFlows } from './search';

const cat = (id: string, name: string, parentId: string | null = null): Category => ({
  id,
  name,
  group: id === 'sal' ? 'income' : 'expense',
  parentId,
  ledgerAccountId: `l-${id}`,
  archived: false,
  createdAt: '2026-11-01T00:00:00Z',
});
const cats = [
  cat('ali', 'Alimentação'),
  cat('mer', 'Mercado', 'ali'),
  cat('far', 'Farmácia'),
  cat('sal', 'Salário'),
];
const contas = new Map([
  ['banco', 'Banco Azul'],
  ['cart', 'Carteira'],
]);
const row = (p: Partial<FlowRow> & Pick<FlowRow, 'entryId'>): FlowRow => ({
  kind: 'despesa',
  date: parseCivilDate('2026-11-26'),
  status: 'realizado',
  accountId: 'banco',
  amountCents: 12640,
  parts: [{ categoryId: 'mer', amountCents: 12640 }],
  description: 'Feira do sábado',
  tags: [],
  note: '',
  edited: false,
  attachments: 0,
  ...p,
});

describe('[REL-005] busca no espaço ativo', () => {
  const rows = [
    row({ entryId: '1' }),
    row({
      entryId: '2',
      description: 'Posto Avenida',
      amountCents: 123456,
      parts: [{ categoryId: 'far', amountCents: 123456 }],
      accountId: 'cart',
    }),
    row({
      entryId: '3',
      kind: 'receita',
      description: 'SALÁRIO',
      amountCents: 410000,
      parts: [{ categoryId: 'sal', amountCents: 410000 }],
      date: parseCivilDate('2026-11-05'),
      tags: ['Trabalho'],
      note: 'Empresa Norte',
    }),
  ];
  const idx = buildSearchIndex(rows, cats, contas);
  const ids = (q: string) => searchFlows(idx, q).map((r) => r.entryId);

  it('[REL-005] descrição sem acento nem maiúscula, categoria, conta, tag, observação e várias palavras', () => {
    expect(ids('salario')).toEqual(['3']);
    expect(ids('FEIRA')).toEqual(['1']);
    expect(ids('alimentacao')).toEqual(['1']);
    expect(ids('carteira')).toEqual(['2']);
    expect(ids('trabalho')).toEqual(['3']);
    expect(ids('norte')).toEqual(['3']);
    expect(ids('feira mercado')).toEqual(['1']);
    expect(ids('feira farmacia')).toEqual([]);
    expect(ids('   ')).toEqual([]);
    expect(ids('a vencer')).toEqual([]);
  });

  it('[REL-005] valor do jeito que a pessoa lembra e data com ou sem ano', () => {
    expect(ids('126,40')).toEqual(['1']);
    expect(ids('1.234,56')).toEqual(['2']);
    expect(ids('1234,56')).toEqual(['2']);
    expect(ids('1234.56')).toEqual(['2']);
    expect(ids('05/11')).toEqual(['3']);
    expect(ids('26/11/2026')).toEqual(['2', '1']);
  });

  it('[REL-005] 50 mil lançamentos: índice e busca em menos de 300 ms', () => {
    const muitos = Array.from({ length: 50_000 }, (_, i) =>
      row({
        entryId: String(i).padStart(6, '0'),
        description: `Compra ${String(i)} loja ${String(i % 97)}`,
        amountCents: 100 + (i % 9000),
        date: parseCivilDate(`202${String(i % 6)}-${String((i % 12) + 1).padStart(2, '0')}-10`),
      }),
    );
    const inicio = performance.now();
    const grande = buildSearchIndex(muitos, cats, contas);
    const montar = performance.now() - inicio;
    const t0 = performance.now();
    const achados = searchFlows(grande, 'loja 42');
    const buscar = performance.now() - t0;
    expect(achados.length).toBeGreaterThan(0);
    // "42" também casa com valores e números; o que importa é não perder nenhum da loja 42.
    const daLoja = muitos.filter((r) => r.description.endsWith('loja 42')).length;
    expect(achados.filter((r) => r.description.endsWith('loja 42'))).toHaveLength(daLoja);
    expect(buscar).toBeLessThan(300);
    expect(montar).toBeLessThan(2000);
  });

  it('[REL-005] categorias com o nome buscado, a partir de 3 letras', () => {
    expect(searchCategories(cats, 'mer').map((c) => c.id)).toEqual(['mer']);
    expect(searchCategories(cats, 'me')).toEqual([]);
  });
});

describe('[REL-006] exportação CSV', () => {
  it('[SEC-07] célula que começa com =, +, -, @, tabulação ou retorno vira texto', () => {
    for (const perigo of ['=SOMA(A1)', '+5', '-2+3', '@cmd', '\t=1', '\r=1', '  =HYPERLINK("x")']) {
      expect(neutralizeCell(perigo).startsWith("'")).toBe(true);
    }
    for (const ok of ['Mercado', '126,40', 'e-mail', 'R$ 5', '']) expect(neutralizeCell(ok)).toBe(ok);
  });

  it('[REL-006] cabeçalho, BOM, ponto e vírgula, vírgula decimal, uma linha por categoria e aspas', () => {
    const csv = flowsToCsv(
      [
        row({
          entryId: '1',
          description: '=HIPERLINK("http://x";"clique")',
          parts: [
            { categoryId: 'mer', amountCents: 9240 },
            { categoryId: 'far', amountCents: 3400 },
          ],
          tags: ['casa', 'feira'],
          note: 'linha 1\nlinha 2',
        }),
        row({
          entryId: '2',
          kind: 'receita',
          status: 'pendente',
          description: '-500',
          parts: [{ categoryId: 'sal', amountCents: 50 }],
        }),
      ],
      cats,
      contas,
    );
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const linhas = csv.slice(1).split('\r\n');
    expect(linhas[0]).toBe(CSV_COLUMNS.join(';'));
    expect(linhas[1]).toBe(
      `26/11/2026;"'=HIPERLINK(""http://x"";""clique"")";Saída;Realizado;Banco Azul;Alimentação › Mercado;92,40;casa, feira;"linha 1\nlinha 2"`,
    );
    expect(linhas[2]).toContain(';Farmácia;34,00;');
    expect(linhas[3]).toBe("26/11/2026;'-500;Entrada;A vencer;Banco Azul;Salário;0,50;;");
    expect(linhas[4]).toBe('');
    expect(csvFileName('PJ', '2026-11')).toBe('razao-lancamentos-negocio-2026-11.csv');
  });
});
