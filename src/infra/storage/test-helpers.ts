// Apoio aos testes do armazenamento: banco em memória, chave de teste e dados sintéticos.
import 'fake-indexeddb/auto';
import { parseCivilDate } from '@/domain/civil-date';
import type { JournalEntry, LedgerAccount } from '@/domain/ledger';
import { money } from '@/domain/money';
import { openingBalance, transfer } from '@/domain/operations';
import { planoDeContas } from '@/domain/testing/fixtures';
import type { Db } from './db';
import { openRazaoDb } from './db';
import type { CommitInput } from './repository';
import { VaultRepository } from './repository';
import { initVault } from './vault-store';

let n = 0;

/** Relógio de teste: cada chamada avança 1 segundo, a partir de 10/03/2027. */
export function relogio(): () => string {
  let t = Date.UTC(2027, 2, 10, 12, 0, 0);
  return () => {
    t += 1000;
    return new Date(t).toISOString();
  };
}

export async function novoBanco(): Promise<{ db: Db; dek: CryptoKey; now: () => string }> {
  n++;
  const db = await openRazaoDb(`razao-teste-${String(n)}-${String(Math.random())}`);
  const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  const now = relogio();
  await initVault(db, { keys: { teste: true }, schemaVersion: 1, createdAt: now() });
  return { db, dek, now };
}

export function contasDe(ws: string): Record<string, LedgerAccount> {
  return planoDeContas(ws);
}

export function criarContas(ws: string, operationId = `${ws}-contas`): CommitInput {
  const contas = Object.values(contasDe(ws));
  return {
    operationId,
    entries: [],
    entities: contas.map((c) => ({ type: 'ledger-account', id: c.id, workspaceId: ws, data: { ...c } })),
    audit: {
      at: '2027-03-01T10:00:00.000Z',
      action: 'criar-contas',
      workspaceId: ws,
      target: 'plano de contas',
    },
  };
}

export function lookupDe(ws: string): Map<string, LedgerAccount> {
  return new Map(Object.values(contasDe(ws)).map((c) => [c.id, c]));
}

export function abertura(ws: string, operationId: string, data: string, centavos: number): CommitInput {
  const c = contasDe(ws);
  const entries: JournalEntry[] = openingBalance(
    { operationId, workspaceId: ws, date: parseCivilDate(data) },
    {
      account: c['banco'] as LedgerAccount,
      openingEquity: c['abertura'] as LedgerAccount,
      amount: money(centavos),
    },
  );
  return {
    operationId,
    entries,
    audit: { at: `${data}T12:00:00.000Z`, action: 'abertura', workspaceId: ws, target: 'banco' },
  };
}

export function transferencia(ws: string, operationId: string, data: string, centavos: number): CommitInput {
  const c = contasDe(ws);
  const entries = transfer(
    { operationId, workspaceId: ws, date: parseCivilDate(data) },
    { from: c['banco'] as LedgerAccount, to: c['digital'] as LedgerAccount, amount: money(centavos) },
  );
  return {
    operationId,
    entries,
    audit: { at: `${data}T12:00:00.000Z`, action: 'transferencia', workspaceId: ws, target: 'banco' },
  };
}

/** Repositório pronto, com plano de contas gravado no espaço. */
export async function repositorioPronto(ws = 'espaco-pf') {
  const base = await novoBanco();
  const repo = new VaultRepository(base.db, base.dek, 1, base.now);
  const state = await repo.loadWorkspace(ws);
  await repo.commit(state, criarContas(ws), lookupDe(ws));
  return { ...base, repo, state, ws };
}

/** Faz o put nativo de um conjunto falhar com o erro informado, a partir da N-ésima chamada. */
export function falharPut(store: string, erro: () => Error, aPartirDe = 1): () => void {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- guarda o método original para devolver depois
  const original = IDBObjectStore.prototype.put;
  let chamadas = 0;
  IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
    if (this.name === store && ++chamadas >= aPartirDe) throw erro();
    return original.apply(this, args);
  };
  return () => {
    IDBObjectStore.prototype.put = original;
  };
}

/** Contagem de registros por conjunto, para comparar antes e depois. */
export async function contagens(db: Db): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const s of [
    'vault',
    'entities',
    'journal',
    'operations',
    'audit',
    'snapshots',
    'quarantine',
  ] as const) {
    out[s] = await db.count(s);
  }
  return out;
}
