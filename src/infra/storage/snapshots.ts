// Snapshots (Volume 05, seções 5.3 e 8.1; BKP-006): cópia fiel e cifrada do cofre antes de restauração,
// migração ou reparo. Restaurar é uma transação só: ou tudo volta, ou nada muda.
import type { CopiedStore, Db, SnapshotRow } from './db';
import { COPIED_STORES } from './db';
import { StorageError, abortQuietly, fromDomException } from './errors';
import { seal } from './sealing';

export type SnapshotReason = 'antes-de-restaurar' | 'antes-de-migrar' | 'antes-de-reparar' | 'manual';

/** Quantos snapshots automáticos de cada motivo ficam guardados (Volume 05, seção 8.1). */
export const KEEP_PER_REASON = 5;

export interface SnapshotSummary {
  readonly counts: Record<CopiedStore, number>;
}

async function copiar(db: Db) {
  const tx = db.transaction(COPIED_STORES, 'readonly');
  const records: SnapshotRow['records'][number][] = [];
  const counts = {} as Record<CopiedStore, number>;
  for (const store of COPIED_STORES) {
    const os = tx.objectStore(store);
    const [keys, values] = await Promise.all([os.getAllKeys(), os.getAll()]);
    counts[store] = keys.length;
    keys.forEach((key, i) => records.push({ store, key, value: values[i] }));
  }
  await tx.done;
  return { records, counts };
}

export async function createSnapshot(
  db: Db,
  dek: CryptoKey,
  reason: SnapshotReason,
  meta: { id: string; now: string; schemaVersion: number },
): Promise<SnapshotRow> {
  const { records, counts } = await copiar(db);
  const summary = await seal(
    dek,
    { store: 'snapshots', workspaceId: '*', key: meta.id, schemaVersion: meta.schemaVersion },
    {
      counts,
    } satisfies SnapshotSummary,
  );
  const row: SnapshotRow = {
    id: meta.id,
    createdAt: meta.now,
    reason,
    summary,
    records,
    schemaVersion: meta.schemaVersion,
  };
  let aberta: { abort(): void } | undefined;
  try {
    const tx = db.transaction('snapshots', 'readwrite');
    aberta = tx;
    const fim = tx.done;
    fim.catch(() => undefined);
    const existente = await tx.store.get(meta.id);
    if (existente) {
      tx.abort();
      throw new StorageError(
        'CONFLICT',
        'Já existe um snapshot com esse identificador; snapshots nunca são sobrescritos.',
      );
    }
    await tx.store.put(row, meta.id);
    // Retenção: os mais antigos do mesmo motivo saem, exceto os manuais, que só o usuário apaga.
    if (reason !== 'manual') {
      const doMotivo = (await tx.store.getAll()).filter((s) => s.reason === reason);
      doMotivo.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      for (const velho of doMotivo.slice(KEEP_PER_REASON)) await tx.store.delete(velho.id);
    }
    await fim;
  } catch (erro) {
    abortQuietly(aberta);
    throw fromDomException(erro);
  }
  return row;
}

export async function listSnapshots(db: Db): Promise<SnapshotRow[]> {
  const todos = await db.getAll('snapshots');
  return todos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Restaura um snapshot. Antes, o estado atual vira outro snapshot: nada é sobrescrito sem cópia (BKP-006).
 * A substituição é uma transação única; se a aba fechar no meio, o navegador desfaz tudo.
 */
export async function restoreSnapshot(
  db: Db,
  dek: CryptoKey,
  id: string,
  meta: { backupId: string; now: string; schemaVersion: number },
): Promise<void> {
  const alvo = await db.get('snapshots', id);
  if (!alvo) throw new StorageError('NOT_FOUND', 'Snapshot não encontrado.');
  await createSnapshot(db, dek, 'antes-de-restaurar', {
    id: meta.backupId,
    now: meta.now,
    schemaVersion: meta.schemaVersion,
  });
  let aberta: { abort(): void } | undefined;
  try {
    const tx = db.transaction(COPIED_STORES, 'readwrite');
    aberta = tx;
    const fim = tx.done;
    fim.catch(() => undefined);
    for (const store of COPIED_STORES) await tx.objectStore(store).clear();
    for (const r of alvo.records) {
      // O tipo exato de cada conjunto se perde na cópia; os valores são os mesmos que estavam gravados.
      await (tx.objectStore(r.store) as unknown as { put(v: unknown, k: IDBValidKey): Promise<unknown> }).put(
        r.value,
        r.key,
      );
    }
    await fim;
  } catch (erro) {
    abortQuietly(aberta);
    throw fromDomException(erro);
  }
}
