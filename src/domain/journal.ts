// Diário de um espaço: guarda os lançamentos e garante a idempotência (INV-06).
import { DomainError } from './errors';
import type { AccountLookup, JournalEntry } from './ledger';
import { validateEntry } from './ledger';

export type Journal = ReadonlyMap<string, JournalEntry>;

export const emptyJournal: Journal = new Map();

function sameEntry(a: JournalEntry, b: JournalEntry): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Acrescenta os lançamentos de uma operação.
 * Repetir a mesma operação (clique duplo, recarga, reinício no meio) não grava nada de novo.
 * Uma operação repetida com conteúdo diferente é conflito e é recusada.
 */
export function appendOperation(
  journal: Journal,
  entries: readonly JournalEntry[],
  accounts: AccountLookup,
): Journal {
  if (entries.length === 0) throw new DomainError('OPERATION_INVALID', 'Operação sem lançamentos.');
  const operationId = entries[0]?.operationId ?? '';
  const workspaceId = entries[0]?.workspaceId ?? '';
  for (const e of entries) {
    if (e.operationId !== operationId) {
      throw new DomainError('OPERATION_INVALID', 'Lançamentos de operações diferentes na mesma gravação.');
    }
    if (e.workspaceId !== workspaceId) {
      throw new DomainError('WORKSPACE_MISMATCH', 'Uma operação não grava em dois espaços (INV-09).');
    }
    validateEntry(e, accounts);
  }

  const existentes = entries.map((e) => journal.get(e.entryId));
  if (existentes.every((x) => x !== undefined)) {
    entries.forEach((e, i) => {
      const anterior = existentes[i];
      if (anterior && !sameEntry(anterior, e)) {
        throw new DomainError(
          'OPERATION_CONFLICT',
          `A operação ${operationId} já foi gravada com outro conteúdo.`,
        );
      }
    });
    return journal;
  }
  if (existentes.some((x) => x !== undefined)) {
    throw new DomainError('OPERATION_CONFLICT', `A operação ${operationId} foi gravada pela metade.`);
  }

  const novo = new Map(journal);
  for (const e of entries) novo.set(e.entryId, e);
  return novo;
}
