// Categorias padrão de PF e PJ (CAT-001, D-049). Cada uma é uma conta interna do grupo Receitas ou Despesas.
import type { LedgerAccount } from '@/domain/ledger';
import type { OpsContext } from './account-ops';
import { writable } from './account-ops';
import type { Category, Workspace } from './model';
import { ENTITY } from './model';
import type { IdSource, StoredItem } from './ports';
import { categoriesOf, workspaceOf } from './session-read';

type Arvore = readonly (string | readonly [string, readonly string[]])[];

/** Nome usado para a categoria que fica na conta interna de tarifas do espaço. */
export const TARIFAS = 'Tarifas bancárias';

const PADRAO: Record<Workspace['kind'], { income: Arvore; expense: Arvore }> = {
  PF: {
    income: ['Salário', 'Renda extra', 'Rendimentos', 'Retirada do negócio', 'Outras receitas'],
    expense: [
      ['Moradia', ['Aluguel', 'Contas da casa']],
      ['Alimentação', ['Mercado', 'Restaurantes e delivery']],
      ['Transporte', ['Combustível', 'Apps e ônibus']],
      ['Saúde', ['Farmácia', 'Consultas e plano']],
      'Educação',
      'Lazer',
      'Compras',
      'Assinaturas',
      TARIFAS,
      'Impostos e taxas',
      'Aporte no negócio',
      'Outros gastos',
    ],
  },
  PJ: {
    income: ['Vendas', 'Serviços prestados', 'Rendimentos', 'Outras receitas'],
    expense: [
      'Fornecedores e mercadorias',
      'Impostos (DAS)',
      'Salários e encargos',
      'Aluguel e contas',
      'Marketing',
      'Software e assinaturas',
      'Contador',
      'Transporte',
      TARIFAS,
      'Outros gastos',
    ],
  },
};

const chave = (nome: string, pai: string | null) => `${pai ?? ''}/${nome.toLocaleLowerCase('pt-BR')}`;

/**
 * Itens das categorias padrão que ainda faltam no espaço. "Tarifas bancárias" usa a conta interna de tarifas
 * que o espaço já tem, a mesma das transferências. Uma categoria que a pessoa já criou com o mesmo nome fica como está.
 */
export function defaultCategoryItems(
  ws: Workspace,
  existentes: readonly Category[],
  ids: IdSource,
  agora: string,
): StoredItem[] {
  const tem = new Map(existentes.map((c) => [`${c.group}:${chave(c.name, c.parentId)}`, c]));
  const usaTarifas = existentes.some((c) => c.ledgerAccountId === ws.feeExpenseId);
  const itens: StoredItem[] = [];
  const criar = (group: Category['group'], nome: string, parentId: string | null): string => {
    const ja = tem.get(`${group}:${chave(nome, parentId)}`);
    if (ja) return ja.id;
    const tarifas = group === 'expense' && parentId === null && nome === TARIFAS && !usaTarifas;
    const ledgerId = tarifas ? ws.feeExpenseId : ids.newId();
    const id = ids.newId();
    if (!tarifas) {
      const ledger: LedgerAccount = { id: ledgerId, workspaceId: ws.id, group };
      itens.push({ type: ENTITY.ledgerAccount, id: ledgerId, data: { ...ledger, name: nome } });
    }
    const cat: Category = {
      id,
      name: nome,
      group,
      parentId,
      ledgerAccountId: ledgerId,
      archived: false,
      createdAt: agora,
    };
    itens.push({ type: ENTITY.category, id, data: cat });
    return id;
  };
  for (const group of ['income', 'expense'] as const) {
    for (const no of PADRAO[ws.kind][group]) {
      if (typeof no === 'string') criar(group, no, null);
      else {
        const pai = criar(group, no[0], null);
        for (const filho of no[1]) criar(group, filho, pai);
      }
    }
  }
  return itens;
}

/**
 * Espaços criados na Alpha 1 ainda não têm categorias. Cria as padrão uma vez só: a operação tem identificador
 * fixo por espaço, então repetir não duplica nada.
 */
export async function ensureDefaultCategories(
  c: OpsContext,
  ids: IdSource,
  workspaceId: string,
): Promise<'gravada' | 'repetida' | 'nada'> {
  writable(c.port);
  const snap = await c.port.load(workspaceId);
  const ws = workspaceOf(snap);
  const itens = defaultCategoryItems(ws, categoriesOf(snap), ids, c.clock.nowIso());
  if (!itens.length) return 'nada';
  return c.port.commit(workspaceId, {
    operationId: `categorias-padrao:${workspaceId}`,
    entries: [],
    items: itens,
    audit: { action: 'categoria.padrao', target: `workspace/${workspaceId}`, after: { count: itens.length } },
  });
}
