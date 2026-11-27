// As 5 áreas, iguais em PF e PJ, cada uma respondendo a uma pergunta (Volume 02, seção 6; Volume 08, seção 4).
import type { WorkspaceKind } from '@/application/model';
import type { IconName } from '../components/Icon';
import type { TabItem } from '../components/Tabs';

export type AreaId = 'inicio' | 'lancamentos' | 'contas' | 'planejamento' | 'ia';

/** Telas fora das 5 áreas, abertas pelo canto superior (Volume 02, seção 6). */
export type ExtraId = 'config';

export interface Area {
  readonly id: AreaId;
  readonly label: string;
  /** Rótulo curto da barra inferior do celular. */
  readonly short: string;
  readonly question: string;
  readonly icon: IconName;
  readonly subs: (kind: WorkspaceKind) => readonly TabItem[];
}

const t = (id: string, label: string): TabItem => ({ id, label });

export const AREAS: readonly Area[] = [
  {
    id: 'inicio',
    label: 'Início',
    short: 'Início',
    question: 'Como estou agora?',
    icon: 'home',
    subs: () => [
      t('visao-geral', 'Visão geral'),
      t('vencimentos', 'Vencimentos'),
      t('atividade', 'Atividade'),
    ],
  },
  {
    id: 'lancamentos',
    label: 'Lançamentos',
    short: 'Lançamentos',
    question: 'Para onde foi o dinheiro?',
    icon: 'list',
    subs: () => [
      t('todos', 'Todos'),
      t('entradas', 'Entradas'),
      t('saidas', 'Saídas'),
      t('a-vencer', 'A vencer'),
    ],
  },
  {
    id: 'contas',
    label: 'Contas e cartões',
    short: 'Contas',
    question: 'Onde está o dinheiro?',
    icon: 'wallet',
    subs: (k) =>
      k === 'PJ'
        ? [
            t('contas', 'Contas'),
            t('a-receber', 'A receber'),
            t('a-pagar', 'A pagar'),
            t('cartoes', 'Cartões'),
          ]
        : [t('contas', 'Contas'), t('cartoes', 'Cartões'), t('faturas', 'Faturas')],
  },
  {
    id: 'planejamento',
    label: 'Planejamento',
    short: 'Planejar',
    question: 'Vou fechar no azul?',
    icon: 'chart',
    subs: (k) => [
      t('orcamento', 'Orçamento'),
      t('previsao', 'Previsão'),
      k === 'PJ' ? t('obrigacoes', 'Obrigações') : t('metas', 'Metas'),
      t('relatorios', 'Relatórios'),
    ],
  },
  {
    id: 'ia',
    label: 'Razão IA',
    short: 'Razão IA',
    question: 'Me explica?',
    icon: 'spark',
    subs: () => [t('conversa', 'Conversa'), t('resumos', 'Resumos')],
  },
];

export interface Route {
  readonly area: AreaId | ExtraId;
  readonly sub: string;
}

export const HOME: Route = { area: 'inicio', sub: 'visao-geral' };

export const CONFIG: Route = { area: 'config', sub: 'espacos' };
export const BACKUP: Route = { area: 'config', sub: 'backup' };
/** Abas das configurações, no canto superior (Volume 02, seção 6). */
export const CATEGORIAS: Route = { area: 'config', sub: 'categorias' };
export const IA_CONFIG: Route = { area: 'config', sub: 'ia' };
export const CONFIG_SUBS: readonly TabItem[] = [
  t('backup', 'Backup e segurança'),
  t('espacos', 'Espaços'),
  t('categorias', 'Categorias e regras'),
  t('ia', 'Razão IA'),
];

export function areaOf(id: AreaId | ExtraId): Area {
  return AREAS.find((a) => a.id === id) ?? (AREAS[0] as Area);
}

/** Lê "#/contas/contas". Rota desconhecida ou que não existe no tipo de espaço volta para o Início. */
export function parseRoute(hash: string, kind: WorkspaceKind): Route {
  const [, area, sub] = hash.replace(/^#/, '').split('/');
  if (area === 'config') {
    const r = [BACKUP, CATEGORIAS, IA_CONFIG].find((x) => x.sub === sub);
    return r ?? CONFIG;
  }
  const a = AREAS.find((x) => x.id === area);
  if (!a) return HOME;
  const subs = a.subs(kind);
  const s = subs.find((x) => x.id === sub) ?? subs[0];
  return s ? { area: a.id, sub: s.id } : HOME;
}

export function routeHash(r: Route): string {
  return `#/${r.area}/${r.sub}`;
}
