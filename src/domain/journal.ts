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
 * Monta o diário a partir de lançamentos já gravados (abertura do cofre), numa passada só.
 * Cada lançamento é validado como na gravação; repetido igual é ignorado, repetido diferente é conflito.
 * Acrescentar um a um com appendOperation copiaria o diário inteiro a cada lançamento, e com 10 mil
 * lançamentos o desbloqueio passava do orçamento de 2 s (medição da I-08).
 */
export function addLoadedEntries(
  target: Map<string, JournalEntry>,
  entries: readonly JournalEntry[],
  accounts: AccountLookup,
): void {
  for (const e of entries) validateEntry(e, accounts);
  for (const e of entries) {
    const anterior = target.get(e.entryId);
    if (anterior && !sameEntry(anterior, e)) {
      throw new DomainError('OPERATION_CONFLICT', `O lançamento ${e.entryId} aparece com dois conteúdos.`);
    }
  }
  for (const e of entries) target.set(e.entryId, e);
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
