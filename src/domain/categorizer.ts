// Categorizador da Razão IA nível 1 (IA-001; Volume 07, seção 2): histórico exato e, depois, as palavras da
// descrição (Naive Bayes treinado só com os lançamentos do próprio espaço). As regras da pessoa vêm antes,
// fora daqui. Determinístico, sem rede e sem modelo de linguagem; sempre diz por que sugeriu.
import { normalizeText } from './category-rules';

export interface TrainingExample {
  readonly description: string;
  readonly categoryId: string;
}

export type SuggestionReason =
  | { readonly kind: 'historico'; readonly times: number }
  | { readonly kind: 'palavras'; readonly words: readonly string[]; readonly confidence: number };

export interface CategorySuggestion {
  readonly categoryId: string;
  readonly reason: SuggestionReason;
}

export interface Categorizer {
  suggest(description: string, usable: (categoryId: string) => boolean): CategorySuggestion | undefined;
}

/** Confiança mínima para sugerir pelas palavras: abaixo disso, melhor não sugerir nada. */
export const MIN_CONFIDENCE = 0.6;
/** Uma categoria só entra no modelo de palavras depois de aparecer em pelo menos este número de lançamentos. */
export const MIN_EXAMPLES = 2;

const PALAVRAS_VAZIAS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'no',
  'na',
  'para',
  'com',
  'por',
  'pag',
  'pagto',
  'compra',
]);

/** Palavras que contam: sem acento, minúsculas, ao menos 3 letras, sem números puros (valores e datas mudam). */
export function tokens(description: string): string[] {
  return [
    ...new Set(
      normalizeText(description)
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 3 && !/^\d+$/.test(t) && !PALAVRAS_VAZIAS.has(t)),
    ),
  ];
}

/**
 * Treina com os exemplos dados (os lançamentos de um tipo, receita ou despesa, de um espaço).
 * Retreinar é só chamar de novo: cada lançamento salvo, aceito ou corrigido entra no próximo treino.
 */
export function trainCategorizer(examples: readonly TrainingExample[]): Categorizer {
  const historico = new Map<string, Map<string, number>>();
  const docs = new Map<string, number>();
  const contagem = new Map<string, Map<string, number>>();
  const totalPalavras = new Map<string, number>();
  const vocabulario = new Set<string>();
  for (const e of examples) {
    const chave = normalizeText(e.description);
    if (!chave) continue;
    const h = historico.get(chave) ?? new Map<string, number>();
    h.set(e.categoryId, (h.get(e.categoryId) ?? 0) + 1);
    historico.set(chave, h);
    docs.set(e.categoryId, (docs.get(e.categoryId) ?? 0) + 1);
    const c = contagem.get(e.categoryId) ?? new Map<string, number>();
    for (const t of tokens(e.description)) {
      c.set(t, (c.get(t) ?? 0) + 1);
      totalPalavras.set(e.categoryId, (totalPalavras.get(e.categoryId) ?? 0) + 1);
      vocabulario.add(t);
    }
    contagem.set(e.categoryId, c);
  }
  const nDocs = [...docs.values()].reduce((a, b) => a + b, 0);
  const V = Math.max(vocabulario.size, 1);

  return {
    suggest(description, usable) {
      const chave = normalizeText(description);
      if (!chave) return undefined;
      // 1. Histórico exato: a mesma descrição já foi lançada antes. Vale a categoria mais usada (empate: a de id menor).
      const h = historico.get(chave);
      if (h) {
        const melhor = [...h.entries()]
          .filter(([id]) => usable(id))
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
        if (melhor) return { categoryId: melhor[0], reason: { kind: 'historico', times: melhor[1] } };
      }
      // 2. Palavras: Naive Bayes multinomial com suavização de Laplace, em logaritmo para não estourar.
      const palavras = tokens(description).filter((t) => vocabulario.has(t));
      if (!palavras.length || nDocs === 0) return undefined;
      const candidatos = [...docs.entries()].filter(([id, n]) => n >= MIN_EXAMPLES && usable(id));
      if (!candidatos.length) return undefined;
      const logs = candidatos.map(([id, n]) => {
        const c = contagem.get(id);
        const total = totalPalavras.get(id) ?? 0;
        let lp = Math.log(n / nDocs);
        for (const t of palavras) lp += Math.log(((c?.get(t) ?? 0) + 1) / (total + V));
        return { id, lp };
      });
      const maior = Math.max(...logs.map((x) => x.lp));
      const soma = logs.reduce((s, x) => s + Math.exp(x.lp - maior), 0);
      const topo = [...logs].sort((a, b) => b.lp - a.lp || a.id.localeCompare(b.id))[0];
      if (!topo) return undefined;
      const confianca = 1 / soma;
      // Só sugere quando a categoria vencedora já viu alguma dessas palavras e a confiança é alta.
      const conhecidas = palavras.filter((t) => (contagem.get(topo.id)?.get(t) ?? 0) > 0);
      if (confianca < MIN_CONFIDENCE || !conhecidas.length) return undefined;
      return {
        categoryId: topo.id,
        reason: { kind: 'palavras', words: conhecidas, confidence: Math.round(confianca * 100) / 100 },
      };
    },
  };
}
