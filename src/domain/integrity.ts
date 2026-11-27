// BKP-007: conferência do diário inteiro, refeita do zero. Só aponta; quem decide o que fazer é a pessoa.
// Somas em bigint: 50 mil lançamentos no valor máximo passam do inteiro seguro do JavaScript.
import { activeEntries } from './income-expense';
import type { AccountLookup, JournalEntry } from './ledger';

export interface JournalCheck {
  readonly entries: number;
  /** Lançamentos em que débitos e créditos não são iguais (INV-08). */
  readonly unbalanced: readonly string[];
  /** Lançamentos com linha numa conta que não existe no espaço. */
  readonly unknownAccount: readonly string[];
  /** Lançamentos de outro espaço, ou com conta de outro espaço (INV-07). */
  readonly otherWorkspace: readonly string[];
  /** Débitos menos créditos do diário inteiro; zero quando fecha. */
  readonly difference: bigint;
  /** INV-11: os saldos dos lançamentos que valem são os mesmos do diário inteiro. */
  readonly activeMatchesFull: boolean;
}

function saldos(entries: Iterable<JournalEntry>): Map<string, bigint> {
  const m = new Map<string, bigint>();
  for (const e of entries) {
    if (e.status !== 'realizado') continue;
    for (const l of e.lines) {
      const v = BigInt(l.amount);
      m.set(l.accountId, (m.get(l.accountId) ?? 0n) + (l.side === 'D' ? v : -v));
    }
  }
  return m;
}

function mesmos(a: Map<string, bigint>, b: Map<string, bigint>): boolean {
  for (const k of new Set([...a.keys(), ...b.keys()]))
    if ((a.get(k) ?? 0n) !== (b.get(k) ?? 0n)) return false;
  return true;
}

export function checkJournal(
  entries: readonly JournalEntry[],
  ledger: AccountLookup,
  workspaceId: string,
): JournalCheck {
  const unbalanced: string[] = [];
  const unknownAccount: string[] = [];
  const otherWorkspace: string[] = [];
  let difference = 0n;
  for (const e of entries) {
    let d = 0n;
    let desconhecida = false;
    let outro = e.workspaceId !== workspaceId;
    for (const l of e.lines) {
      const v = BigInt(l.amount);
      d += l.side === 'D' ? v : -v;
      const conta = ledger.get(l.accountId);
      if (!conta) desconhecida = true;
      else if (conta.workspaceId !== workspaceId) outro = true;
    }
    difference += d;
    if (d !== 0n) unbalanced.push(e.entryId);
    if (desconhecida) unknownAccount.push(e.entryId);
    if (outro) otherWorkspace.push(e.entryId);
  }
  return {
    entries: entries.length,
    unbalanced,
    unknownAccount,
    otherWorkspace,
    difference,
    activeMatchesFull: mesmos(saldos(entries), saldos(activeEntries(entries))),
  };
}
