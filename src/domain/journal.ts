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

export interface JournalUpdate {
  readonly operationId: string;
  readonly workspaceId: string;
  readonly add: readonly JournalEntry[];
  readonly replace: readonly JournalEntry[];
  readonly remove: readonly string[];
}

const soMetaMudou = (a: JournalEntry, b: JournalEntry) => sameEntry({ ...a, meta: {} }, { ...b, meta: {} });

/**
 * Aplica uma operação que também troca ou remove lançamentos (Volume 04, seção 7.4).
 * Só pendente é trocado ou removido de verdade (INV-02); de um realizado só o `meta` muda,
 * e qualquer outra correção é estorno. A identidade do lançamento trocado (entryId, operação, espaço) não muda.
 * Quem chama garante a idempotência pelo registro da operação, como no appendOperation.
 */
export function applyUpdate(journal: Journal, update: JournalUpdate, accounts: AccountLookup): Journal {
  const { add, replace, remove } = update;
  if (!add.length && !replace.length && !remove.length) {
    throw new DomainError('OPERATION_INVALID', 'Operação sem lançamentos.');
  }
  const tocados = new Set<string>();
  const unico = (id: string) => {
    if (tocados.has(id)) throw new DomainError('OPERATION_INVALID', `O lançamento ${id} aparece duas vezes.`);
    tocados.add(id);
  };
  const existente = (id: string): JournalEntry => {
    const e = journal.get(id);
    if (!e) throw new DomainError('OPERATION_INVALID', `O lançamento ${id} não existe.`);
    if (e.workspaceId !== update.workspaceId) {
      throw new DomainError('WORKSPACE_MISMATCH', 'Uma operação não grava em dois espaços (INV-09).');
    }
    return e;
  };
  for (const e of replace) {
    unico(e.entryId);
    const antes = existente(e.entryId);
    if (e.operationId !== antes.operationId || e.workspaceId !== antes.workspaceId) {
      throw new DomainError('OPERATION_INVALID', 'Trocar um lançamento não muda a identidade dele.');
    }
    if (antes.status !== 'pendente' && !soMetaMudou(antes, e)) {
      throw new DomainError('OPERATION_INVALID', 'Lançamento realizado só é corrigido por estorno (INV-11).');
    }
    validateEntry(e, accounts);
  }
  for (const id of remove) {
    unico(id);
    if (existente(id).status !== 'pendente') {
      throw new DomainError('OPERATION_INVALID', 'Lançamento realizado não é apagado; é estornado (INV-11).');
    }
  }
  for (const e of add) {
    unico(e.entryId);
    if (e.workspaceId !== update.workspaceId) {
      throw new DomainError('WORKSPACE_MISMATCH', 'Uma operação não grava em dois espaços (INV-09).');
    }
    if (journal.has(e.entryId)) {
      throw new DomainError('OPERATION_CONFLICT', `O lançamento ${e.entryId} já existe.`);
    }
    validateEntry(e, accounts);
  }
  const novo = new Map(journal);
  for (const id of remove) novo.delete(id);
  for (const e of replace) novo.set(e.entryId, e);
  for (const e of add) novo.set(e.entryId, e);
  return novo;
}
