import { describe, expect, it } from 'vitest';
import { AREAS, HOME, parseRoute, routeHash } from './nav';

describe('navegação em 5 áreas', () => {
  it('[COF-005] as mesmas 5 áreas em PF e PJ, com as sub-abas próprias do PJ', () => {
    expect(AREAS.map((a) => a.label)).toEqual([
      'Início',
      'Lançamentos',
      'Contas e cartões',
      'Planejamento',
      'Razão IA',
    ]);
    const contas = AREAS.find((a) => a.id === 'contas');
    expect(contas?.subs('PF').map((s) => s.label)).toEqual(['Contas', 'Cartões', 'Faturas']);
    expect(contas?.subs('PJ').map((s) => s.label)).toEqual(['Contas', 'A receber', 'A pagar', 'Cartões']);
    const plan = AREAS.find((a) => a.id === 'planejamento');
    expect(plan?.subs('PJ').map((s) => s.id)).toContain('obrigacoes');
    expect(plan?.subs('PF').map((s) => s.id)).toContain('metas');
  });

  it('[COF-005] rota de outro tipo de espaço cai na primeira sub-aba; rota desconhecida volta ao Início', () => {
    expect(parseRoute('#/contas/faturas', 'PJ')).toEqual({ area: 'contas', sub: 'contas' });
    expect(parseRoute('#/contas/a-pagar', 'PJ')).toEqual({ area: 'contas', sub: 'a-pagar' });
    expect(parseRoute('#/qualquer/coisa', 'PF')).toEqual(HOME);
    expect(parseRoute('', 'PF')).toEqual(HOME);
    expect(routeHash({ area: 'ia', sub: 'resumos' })).toBe('#/ia/resumos');
    expect(parseRoute('#/config/categorias', 'PJ')).toEqual({ area: 'config', sub: 'categorias' });
    expect(parseRoute('#/config/outra', 'PF')).toEqual({ area: 'config', sub: 'espacos' });
  });
});
