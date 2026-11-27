// Busca global no espaço ativo (REL-005): descrição, valor, data, categoria, conta, tag e observação.
// O índice vive só na memória, montado quando a lista é lida; nada da busca é gravado no aparelho.
import { formatDate } from './format';
import type { FlowRow } from './entry-ops';
import { categoryName } from './entry-list';
import type { Category } from './model';

export interface SearchIndex {
  readonly rows: readonly FlowRow[];
  /** Um texto por lançamento, já sem acento e em minúsculas, na mesma ordem de `rows`. */
  readonly texts: readonly string[];
}

const SEM_ACENTO = /[\u0300-\u036f]/g;

export function normalizeSearch(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(SEM_ACENTO, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "126,40", "126.40", "1.234,56", "1234,56" e "1234": a pessoa digita do jeito que lembra. */
function valores(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const cent = String(centavos % 100).padStart(2, '0');
  const milhar = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${milhar},${cent} ${String(reais)},${cent} ${String(reais)}.${cent} ${String(reais)}`;
}

/** Monta o índice de uma vez; com 50 mil lançamentos leva poucas dezenas de milissegundos. */
export function buildSearchIndex(
  rows: readonly FlowRow[],
  categories: readonly Category[],
  accountNames: ReadonlyMap<string, string>,
): SearchIndex {
  const nomes = new Map<string, string>();
  const nomeCat = (id: string) => {
    let n = nomes.get(id);
    if (n === undefined) {
      n = categoryName(categories, id);
      nomes.set(id, n);
    }
    return n;
  };
  const texts = rows.map((r) => {
    const data = formatDate(r.date);
    const partes = r.parts.map((p) => `${nomeCat(p.categoryId)} ${valores(p.amountCents)}`).join(' ');
    return normalizeSearch(
      [
        r.description,
        valores(r.amountCents),
        data,
        data.slice(0, 5),
        partes,
        accountNames.get(r.accountId) ?? '',
        r.tags.join(' '),
        r.note,
        r.kind === 'receita' ? 'entrada receita' : 'saida despesa',
        r.status === 'pendente' ? 'a vencer pendente' : '',
      ].join(' | '),
    );
  });
  return { rows, texts };
}

/**
 * Cada palavra digitada precisa aparecer no lançamento: "mercado 26/11" acha o mercado do dia 26.
 * Devolve todos os que combinam, do mais novo para o mais antigo; a tela mostra os primeiros.
 */
export function searchFlows(index: SearchIndex, query: string): FlowRow[] {
  const palavras = normalizeSearch(query).split(' ').filter(Boolean);
  if (!palavras.length) return [];
  const achados: FlowRow[] = [];
  for (let i = 0; i < index.texts.length; i++) {
    const t = index.texts[i] ?? '';
    const r = index.rows[i];
    if (r && palavras.every((p) => t.includes(p))) achados.push(r);
  }
  return achados.sort((a, b) => b.date.localeCompare(a.date) || b.entryId.localeCompare(a.entryId));
}

/** Categorias cujo nome combina com a busca, para oferecer "ver na lista". */
export function searchCategories(categories: readonly Category[], query: string): Category[] {
  const q = normalizeSearch(query);
  if (q.length < 3) return [];
  return categories.filter((c) => !c.archived && normalizeSearch(c.name).includes(q)).slice(0, 3);
}
