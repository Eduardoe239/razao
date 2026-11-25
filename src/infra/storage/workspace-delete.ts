// COF-007: exclusão de um espaço. Apaga entidades, diário, operações, auditoria e anexos daquele espaço
// e tira os registros dele de cada snapshot (Volume 05, seção 8). Tudo numa transação só: ou apaga tudo, ou nada.
import type { CopiedStore, Db, SnapshotRow } from './db';
import { COPIED_STORES } from './db';
import { abortQuietly, fromDomException } from './errors';
import { seal } from './sealing';
import type { SnapshotSummary } from './snapshots';

const POR_ESPACO = ['entities', 'journal', 'operations', 'audit'] as const;

/** O registro pertence ao espaço quando a chave é [espaço, ...] ou, nos anexos, começa por "espaço/". */
function doEspaco(key: IDBValidKey, workspaceId: string): boolean {
  if (Array.isArray(key)) return key[0] === workspaceId;
  return typeof key === 'string' && key.startsWith(`${workspaceId}/`);
}

export async function deleteWorkspaceData(db: Db, dek: CryptoKey, workspaceId: string): Promise<void> {
  // Snapshots limpos e resumos recifrados antes da transação (a cifra não pode acontecer dentro dela).
  const snapshots = await db.getAll('snapshots');
  const limpos: SnapshotRow[] = [];
  for (const s of snapshots) {
    const records = s.records.filter((r) => !doEspaco(r.key, workspaceId));
    if (records.length === s.records.length) continue;
    const counts = Object.fromEntries(
      COPIED_STORES.map((st) => [st, records.filter((r) => r.store === st).length]),
    ) as Record<CopiedStore, number>;
    const summary = await seal(
      dek,
      { store: 'snapshots', workspaceId: '*', key: s.id, schemaVersion: s.schemaVersion },
      { counts } satisfies SnapshotSummary,
    );
    limpos.push({ ...s, records, summary });
  }

  let aberta: { abort(): void } | undefined;
  try {
    const tx = db.transaction([...POR_ESPACO, 'attachments', 'snapshots'], 'readwrite');
    aberta = tx;
    const fim = tx.done;
    fim.catch(() => undefined);
    const faixa = IDBKeyRange.bound([workspaceId], [workspaceId, []]);
    for (const store of POR_ESPACO) await tx.objectStore(store).delete(faixa);
    const anexos = tx.objectStore('attachments');
    for (const k of await anexos.getAllKeys()) if (doEspaco(k, workspaceId)) await anexos.delete(k);
    for (const s of limpos) await tx.objectStore('snapshots').put(s, s.id);
    await fim;
  } catch (erro) {
    abortQuietly(aberta);
    throw fromDomException(erro);
  }
}
