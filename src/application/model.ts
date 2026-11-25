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

export const ENTITY = {
  workspace: 'workspace',
  account: 'account',
  ledgerAccount: 'ledger-account',
} as const;
