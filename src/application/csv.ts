// Exportação CSV de uma lista de lançamentos (REL-006), no padrão brasileiro: ponto e vírgula,
// vírgula decimal e BOM para o Excel abrir os acentos certos. Toda célula passa pela neutralização (SEC-07).
import type { FlowRow } from './entry-ops';
import { categoryName } from './entry-list';
import { formatDate } from './format';
import type { Category } from './model';

/** Colunas documentadas em razao-docs/exportacao/csv-lancamentos.md. */
export const CSV_COLUMNS = [
  'Data',
  'Descrição',
  'Tipo',
  'Situação',
  'Conta',
  'Categoria',
  'Valor',
  'Tags',
  'Observação',
] as const;

/**
 * SEC-07: célula que começa com =, +, - ou @ (ou com tabulação ou retorno, que o Excel ignora antes de
 * olhar o primeiro caractere) ganha um apóstrofo na frente e é lida como texto, nunca como fórmula.
 */
export function neutralizeCell(valor: string): string {
  return /^[\s]*[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

/** Aspas quando a célula tem separador, aspas ou quebra de linha; aspas internas dobradas. */
function celula(valor: string): string {
  const seguro = neutralizeCell(valor);
  return /[";\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/** Sem sinal: o sentido está na coluna Tipo. Assim nenhum valor começa com "-" e vira fórmula. */
function reais(centavos: number): string {
  return `${String(Math.floor(centavos / 100))},${String(centavos % 100).padStart(2, '0')}`;
}

/**
 * Uma linha por categoria: o lançamento dividido em duas categorias vira duas linhas com o mesmo dia e a
 * mesma descrição, e a soma de cada categoria na planilha fecha com o app.
 */
export function flowsToCsv(
  rows: readonly FlowRow[],
  categories: readonly Category[],
  accountNames: ReadonlyMap<string, string>,
): string {
  const linhas = [CSV_COLUMNS.map(celula).join(';')];
  for (const r of rows) {
    for (const p of r.parts) {
      linhas.push(
        [
          formatDate(r.date),
          r.description,
          r.kind === 'receita' ? 'Entrada' : 'Saída',
          r.status === 'pendente' ? 'A vencer' : 'Realizado',
          accountNames.get(r.accountId) ?? '',
          categoryName(categories, p.categoryId),
          reais(p.amountCents),
          r.tags.join(', '),
          r.note,
        ]
          .map(celula)
          .join(';'),
      );
    }
  }
  return `\uFEFF${linhas.join('\r\n')}\r\n`;
}

/** "razao-lancamentos-pessoal-2026-11.csv": sem nome de conta nem valor no nome do arquivo. */
export function csvFileName(kind: 'PF' | 'PJ', periodo: string): string {
  return `razao-lancamentos-${kind === 'PF' ? 'pessoal' : 'negocio'}-${periodo}.csv`;
}
