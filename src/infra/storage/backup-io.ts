// Leitura e gravação dos espaços para o backup (BKP-001 e BKP-003; Volume 05, seção 7.2).
// A importação cria antes um snapshot do estado atual, sela tudo fora da transação e grava numa transação só.
// Os eventos da auditoria voltam intactos, e um evento novo de restauração registra o resumo das páginas
// recifradas, para a conferência de páginas (T-10) continuar valendo.
import type { BackupWorkspace } from '@/application/ports';
import type { AuditInput } from './audit';
import { chainEvent } from './audit';
import type { Db, EntityKey, SealedValue, WorkspaceMonthKey } from './db';
import { StorageError, abortQuietly, fromDomException } from './errors';
import type { WorkspaceState } from './repository';
import type { AuditEvent } from './schema';
import { operationRecordSchema } from './schema';
import { digest, monthOf, openValid, seal } from './sealing';
import { createSnapshot } from './snapshots';

const ctx = (store: string, workspaceId: string, key: string, schemaVersion: number) => ({
  store,
  workspaceId,
  key,
  schemaVersion,
});

/** Monta o conteúdo de um espaço já carregado (e validado) pelo repositório. */
export async function exportWorkspace(
  db: Db,
  dek: CryptoKey,
  schemaVersion: number,
  st: WorkspaceState,
): Promise<BackupWorkspace> {
  const ws = st.workspaceId;
  const faixa = IDBKeyRange.bound([ws], [ws, []]);
  const tx = db.transaction('operations', 'readonly');
  const [keys, vals] = await Promise.all([tx.store.getAllKeys(faixa), tx.store.getAll(faixa)]);
  await tx.done;
  const operations = [];
  for (const [i, k] of keys.entries()) {
    const rec = vals[i];
    if (!rec) continue;
    const op = await openValid(
      dek,
      ctx('operations', ws, k[1], schemaVersion),
      rec.sealed,
      operationRecordSchema,
    );
    operations.push({ operationId: op.operationId, at: op.at, entryIds: op.entryIds });
  }
  return {
    workspaceId: ws,
    entities: [...st.entities.values()].map(({ entity }) => ({
      type: entity.type,
      id: entity.id,
      data: entity.data,
    })),
    journal: [...st.pages.values()].map(({ page }) => ({ month: page.month, entries: page.entries })),
    audit: [...st.auditPages.values()].map(({ page }) => ({ month: page.month, events: page.events })),
    operations,
  };
}

interface Gravacao {
  readonly store: 'entities' | 'journal' | 'operations' | 'audit';
  readonly key: EntityKey | WorkspaceMonthKey | [string, string];
  readonly sealed: SealedValue;
}

async function selarEspaco(
  dek: CryptoKey,
  schemaVersion: number,
  now: string,
  w: BackupWorkspace,
): Promise<Gravacao[]> {
  const ws = w.workspaceId;
  const out: Gravacao[] = [];
  for (const e of w.entities) {
    out.push({
      store: 'entities',
      key: [ws, e.type, e.id],
      sealed: await seal(dek, ctx('entities', ws, `${e.type}/${e.id}`, schemaVersion), {
        ...e,
        workspaceId: ws,
      }),
    });
  }
  for (const o of w.operations) {
    out.push({
      store: 'operations',
      key: [ws, o.operationId],
      sealed: await seal(dek, ctx('operations', ws, o.operationId, schemaVersion), { ...o, workspaceId: ws }),
    });
  }
  const digests: Record<string, string> = {};
  for (const p of w.journal) {
    const sealed = await seal(dek, ctx('journal', ws, p.month, schemaVersion), { workspaceId: ws, ...p });
    digests[p.month] = await digest(sealed);
    out.push({ store: 'journal', key: [ws, p.month], sealed });
  }
  // A trilha original continua; o evento de restauração entra no fim da corrente.
  const eventos = w.audit.flatMap((p) => p.events as unknown as AuditEvent[]).sort((a, b) => a.seq - b.seq);
  const ultimo = eventos.at(-1);
  const novo: AuditInput = {
    at: now,
    action: 'backup.restaurar',
    workspaceId: ws,
    target: `workspace/${ws}`,
    after: { journalPages: digests },
  };
  const evento = await chainEvent(novo, ultimo ? { seq: ultimo.seq, hash: ultimo.hash } : null);
  const porMes = new Map<string, AuditEvent[]>();
  for (const e of [...eventos, evento]) {
    const mes = monthOf(e.at);
    porMes.set(mes, [...(porMes.get(mes) ?? []), e]);
  }
  for (const [mes, events] of porMes) {
    out.push({
      store: 'audit',
      key: [ws, mes],
      sealed: await seal(dek, ctx('audit', ws, mes, schemaVersion), { workspaceId: ws, month: mes, events }),
    });
  }
  return out;
}

export async function importWorkspaces(
  db: Db,
  dek: CryptoKey,
  o: { schemaVersion: number; now: string; snapshotId: string; mode: 'cofre' | 'espacos' },
  data: readonly BackupWorkspace[],
): Promise<void> {
  if (data.length === 0)
    throw new StorageError('NOT_FOUND', 'O backup não tem nenhum espaço. Nada foi restaurado.');
  await createSnapshot(db, dek, 'antes-de-restaurar', {
    id: o.snapshotId,
    now: o.now,
    schemaVersion: o.schemaVersion,
  });
  const gravacoes: Gravacao[] = [];
  for (const w of data) gravacoes.push(...(await selarEspaco(dek, o.schemaVersion, o.now, w)));

  let aberta: { abort(): void } | undefined;
  try {
    const tx = db.transaction(['entities', 'journal', 'operations', 'audit', 'attachments'], 'readwrite');
    aberta = tx;
    const fim = tx.done;
    fim.catch(() => undefined);
    const stores = ['entities', 'journal', 'operations', 'audit'] as const;
    if (o.mode === 'cofre') {
      for (const s of [...stores, 'attachments'] as const) await tx.objectStore(s).clear();
    } else {
      for (const w of data) {
        const faixa = IDBKeyRange.bound([w.workspaceId], [w.workspaceId, []]);
        for (const s of stores) await tx.objectStore(s).delete(faixa);
      }
    }
    for (const g of gravacoes) {
      await (tx.objectStore(g.store) as unknown as { put(v: unknown, k: IDBValidKey): Promise<unknown> }).put(
        { sealed: g.sealed, rev: 1 },
        g.key,
      );
    }
    await fim;
  } catch (erro) {
    abortQuietly(aberta);
    throw fromDomException(erro);
  }
}
