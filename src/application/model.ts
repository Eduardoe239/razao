// Entidades da Alpha 1 guardadas no espaço: o espaço e as contas (Volume 05, seção 2).
// Tudo o que volta do armazenamento passa por estes esquemas antes de chegar à interface (SEC-06).
import { z } from 'zod';

export const WORKSPACE_KINDS = ['PF', 'PJ'] as const;
export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number];

export const workspaceSchema = z.object({
  id: z.string().min(1).max(200),
  kind: z.enum(WORKSPACE_KINDS),
  name: z.string().trim().min(1).max(80),
  currency: z.literal('BRL'),
  timeZone: z.string().min(1).max(64),
  /** Dia em que começa o mês financeiro (COF-004). */
  monthStartDay: z.number().int().min(1).max(28),
  /** Contas do livro-razão criadas com o espaço. */
  openingEquityId: z.string().min(1).max(200),
  adjustmentEquityId: z.string().min(1).max(200),
  feeExpenseId: z.string().min(1).max(200),
  archived: z.boolean(),
  createdAt: z.string().max(40),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const ACCOUNT_KINDS = [
  'corrente',
  'digital',
  'poupanca',
  'carteira',
  'dinheiro',
  'investimento',
] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  corrente: 'Conta corrente',
  digital: 'Conta digital',
  poupanca: 'Poupança',
  carteira: 'Carteira',
  dinheiro: 'Dinheiro',
  investimento: 'Investimento',
};

export const accountSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(60),
  kind: z.enum(ACCOUNT_KINDS),
  ledgerAccountId: z.string().min(1).max(200),
  archived: z.boolean(),
  createdAt: z.string().max(40),
});
export type Account = z.infer<typeof accountSchema>;

export const ledgerAccountDataSchema = z.object({
  id: z.string().min(1).max(200),
  workspaceId: z.string().min(1).max(200),
  group: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
  name: z.string().max(80),
});

/**
 * CAT-001: categoria é uma conta interna do grupo Receitas ou Despesas (Volume 04, seção 3.1).
 * Subcategoria aponta para a categoria pai, sempre do mesmo grupo e de um nível só.
 */
export const categorySchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(60),
  group: z.enum(['income', 'expense']),
  parentId: z.string().min(1).max(200).nullable(),
  ledgerAccountId: z.string().min(1).max(200),
  archived: z.boolean(),
  createdAt: z.string().max(40),
});
export type Category = z.infer<typeof categorySchema>;

/** CAT-003: "descrição contém X → categoria Y". Regra apagada fica com `removed`, porque item não se apaga. */
export const categoryRuleSchema = z.object({
  id: z.string().min(1).max(200),
  pattern: z.string().trim().min(2).max(80),
  categoryId: z.string().min(1).max(200),
  scope: z.enum(['receita', 'despesa', 'ambas']),
  priority: z.number().int().min(0).max(1_000_000),
  active: z.boolean(),
  removed: z.boolean(),
  createdAt: z.string().max(40),
});
export type CategoryRuleItem = z.infer<typeof categoryRuleSchema>;

/** IA-006: alerta dispensado não volta. Só o id do alerta e quando foi dispensado, cifrados no cofre. */
export const alertDismissalSchema = z.object({
  id: z.string().min(1).max(4000),
  at: z.string().max(40),
});

export const ENTITY = {
  workspace: 'workspace',
  account: 'account',
  ledgerAccount: 'ledger-account',
  category: 'category',
  categoryRule: 'category-rule',
  alertDismissal: 'alert-dismissal',
} as const;
