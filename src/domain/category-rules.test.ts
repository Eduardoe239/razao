// Regras "descrição contém X → categoria Y" (CAT-003).
import { describe, expect, it } from 'vitest';
import type { CategoryRule } from './category-rules';
import { matchRule, normalizeText } from './category-rules';
import { forAll } from './testing/prop';

const regra = (
  id: string,
  pattern: string,
  categoryId: string,
  extra: Partial<CategoryRule> = {},
): CategoryRule => ({
  id,
  pattern,
  categoryId,
  scope: 'despesa',
  priority: 0,
  active: true,
  ...extra,
});
const sempre = () => true;

describe('[CAT-003] regras automáticas', () => {
  it('[CAT-003] ignora maiúsculas, acentos e espaços repetidos', () => {
    expect(normalizeText('  POSTO   Shéll  Ação ')).toBe('posto shell acao');
    expect(
      matchRule([regra('r1', 'posto shell', 'combustivel')], 'Pgto POSTO  SHÉLL 123', 'despesa', sempre)?.id,
    ).toBe('r1');
  });

  it('[CAT-003] a de menor prioridade vale primeiro; desempate pelo id', () => {
    const regras = [
      regra('b', 'ifood', 'delivery', { priority: 2 }),
      regra('a', 'if', 'outros', { priority: 1 }),
      regra('c', 'ifood', 'lazer', { priority: 1 }),
    ];
    expect(matchRule(regras, 'IFOOD *Pedido', 'despesa', sempre)?.id).toBe('a');
    expect(matchRule(regras.slice(0, 1).concat(regras[2] ?? []), 'IFOOD', 'despesa', sempre)?.id).toBe('c');
  });

  it('[CAT-003] pula regra desligada, do outro tipo, de texto vazio ou para categoria que não serve', () => {
    const regras = [
      regra('off', 'uber', 'transporte', { active: false }),
      regra('rec', 'uber', 'renda', { scope: 'receita' }),
      regra('vazia', '   ', 'x'),
      regra('arquivada', 'uber', 'velha', { priority: 1 }),
      regra('boa', 'uber', 'apps', { priority: 2 }),
    ];
    expect(matchRule(regras, 'Uber viagem', 'despesa', (id) => id !== 'velha')?.id).toBe('boa');
    expect(matchRule(regras, 'Uber repasse', 'receita', sempre)?.id).toBe('rec');
    expect(matchRule(regras, '   ', 'despesa', sempre)).toBeUndefined();
    expect(matchRule([regra('amb', 'pix', 'x', { scope: 'ambas' })], 'pix', 'receita', sempre)?.id).toBe(
      'amb',
    );
  });

  it('[CAT-003] propriedade: nunca sugere categoria que não serve, e a sugerida casa com a descrição', () => {
    forAll('regra nunca aponta para categoria que não serve', (rng) => {
      const palavras = ['mercado', 'posto', 'uber', 'ifood', 'farmácia', 'luz'];
      const cats = ['c1', 'c2', 'c3', 'c4'];
      const serve = new Set(cats.filter(() => rng.bool()));
      const regras = Array.from({ length: rng.int(0, 8) }, (_, i) =>
        regra(`r${String(i)}`, rng.pick(palavras), rng.pick(cats), {
          priority: rng.int(0, 5),
          active: rng.int(0, 4) > 0,
          scope: rng.pick(['receita', 'despesa', 'ambas'] as const),
        }),
      );
      const descricao = `${rng.pick(palavras).toUpperCase()} compra ${String(rng.int(1, 99))}`;
      const kind = rng.bool() ? 'receita' : 'despesa';
      const r = matchRule(regras, descricao, kind, (id) => serve.has(id));
      if (r) {
        expect(serve.has(r.categoryId)).toBe(true);
        expect(r.active).toBe(true);
        expect(normalizeText(descricao)).toContain(normalizeText(r.pattern));
        expect(['ambas', kind]).toContain(r.scope);
      }
    });
  });
});
