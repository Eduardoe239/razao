// Regras automáticas "descrição contém X → categoria Y" (CAT-003). A regra só sugere; a pessoa sempre pode trocar.

export type RuleScope = 'receita' | 'despesa' | 'ambas';

export interface CategoryRule {
  readonly id: string;
  readonly pattern: string;
  readonly categoryId: string;
  readonly scope: RuleScope;
  /** Menor número vale primeiro. */
  readonly priority: number;
  readonly active: boolean;
}

/** Sem acento, minúsculas e espaços simples: "POSTO  Shéll" e "posto shell" são o mesmo texto. */
export function normalizeText(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

/**
 * A primeira regra ativa, pela prioridade, cujo texto aparece na descrição e que vale para o tipo do lançamento.
 * `usable` diz se a categoria ainda existe e não está arquivada: regra para categoria que não serve é pulada,
 * então a sugestão nunca aponta para categoria inexistente.
 */
export function matchRule(
  rules: readonly CategoryRule[],
  description: string,
  kind: 'receita' | 'despesa',
  usable: (categoryId: string) => boolean,
): CategoryRule | undefined {
  const texto = normalizeText(description);
  if (!texto) return undefined;
  const ordem = [...rules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  return ordem.find((r) => {
    if (!r.active || (r.scope !== 'ambas' && r.scope !== kind)) return false;
    const alvo = normalizeText(r.pattern);
    return alvo.length > 0 && texto.includes(alvo) && usable(r.categoryId);
  });
}
