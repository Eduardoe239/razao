// Esquemas Zod do que volta do armazenamento (SEC-06). Tudo o que sai do disco é entrada externa:
// pode estar corrompido, adulterado ou ser de outra versão. Nada passa sem validação e limite de tamanho.
import { z } from 'zod';
import { isCivilDate } from '@/domain/civil-date';
import type { JournalEntry } from '@/domain/ledger';
import { MAX_AMOUNT } from '@/domain/money';

const id = z.string().min(1).max(200);
const civilDate = z
  .string()
  .refine(isCivilDate, 'data inválida')
  .transform((s) => s);

export const sealedSchema = z.object({
  iv: z.string().length(16),
  ct: z.string().min(1).max(20_000_000),
});

export const entryLineSchema = z.object({
  accountId: id,
  side: z.enum(['D', 'C']),
  amount: z.number().int().positive().max(MAX_AMOUNT),
});

function semVazios(links: {
  reverses?: string | undefined;
  replaces?: string | undefined;
  deletes?: string | undefined;
}): JournalEntry['links'] {
  return {
    ...(links.reverses === undefined ? {} : { reverses: links.reverses }),
    ...(links.replaces === undefined ? {} : { replaces: links.replaces }),
    ...(links.deletes === undefined ? {} : { deletes: links.deletes }),
  };
}

export const journalEntrySchema = z
  .object({
    entryId: id,
    operationId: id,
    workspaceId: id,
    date: civilDate,
    status: z.enum(['realizado', 'pendente']),
    kind: z.enum([
      'receita',
      'despesa',
      'transferencia',
      'compra_cartao',
      'pagamento_fatura',
      'estorno',
      'ajuste',
      'abertura',
      'titulo',
      'liquidacao',
      'retirada',
      'aporte',
    ]),
    currency: z.literal('BRL'),
    lines: z.array(entryLineSchema).min(2).max(500),
    links: z.object({ reverses: id.optional(), replaces: id.optional(), deletes: id.optional() }),
    meta: z.record(z.string().max(100), z.string().max(2000)),
  })
  // Sem chave opcional vazia: o formato do domínio não aceita "reverses: undefined".
  .transform((e): JournalEntry => ({ ...e, links: semVazios(e.links) }));

/** Página mensal do diário: os lançamentos de um mês de um espaço. */
export const journalPageSchema = z.object({
  workspaceId: id,
  month: z.string().regex(/^\d{4}-\d{2}$/),
  entries: z.array(journalEntrySchema).max(100_000),
});
export interface JournalPage {
  readonly workspaceId: string;
  readonly month: string;
  readonly entries: readonly JournalEntry[];
}

export const ledgerAccountSchema = z.object({
  id,
  workspaceId: id,
  group: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
});

/** Entidade genérica: o tipo diz qual esquema vale para os dados (contas, espaços etc.). */
export const entitySchema = z.object({
  type: z.string().min(1).max(50),
  id,
  workspaceId: id,
  data: z.record(z.string().max(100), z.unknown()),
});
export type StoredEntity = z.infer<typeof entitySchema>;

export const auditEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  at: z.string().max(40),
  action: z.string().min(1).max(100),
  workspaceId: id,
  operationId: id.optional(),
  target: z.string().max(200),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  reason: z.string().max(2000).optional(),
  prev: z.string().length(64),
  hash: z.string().length(64),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const auditPageSchema = z.object({
  workspaceId: id,
  month: z.string().regex(/^\d{4}-\d{2}$/),
  events: z.array(auditEventSchema).max(1_000_000),
});
export type AuditPage = z.infer<typeof auditPageSchema>;

export const operationRecordSchema = z.object({
  operationId: id,
  workspaceId: id,
  at: z.string().max(40),
  // Até 100 mil: mesclar categorias e recategorizar em lote mexem em muitos lançamentos de uma vez (D-049).
  entryIds: z.array(id).max(100_000),
});
export type OperationRecord = z.infer<typeof operationRecordSchema>;
