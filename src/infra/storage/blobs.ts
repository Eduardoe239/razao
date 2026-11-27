// Arquivos de comprovante (LAN-009; Volume 05, seção 4): cifrados com a chave do cofre, com o espaço e o id
// no contexto (AAD). A chave do registro é "espaço/id", para a exclusão do espaço achar os anexos dele.
import { openBytes, sealBytes } from '../crypto/records';
import type { Db, SealedValue, StoredRecord } from './db';
import { StorageError } from './errors';

export const blobKey = (workspaceId: string, id: string) => `${workspaceId}/${id}`;

/** Faixa das chaves dos anexos de um espaço. */
export const blobRange = (workspaceId: string) =>
  IDBKeyRange.bound(`${workspaceId}/`, `${workspaceId}/\uffff`);

const ctx = (schemaVersion: number, workspaceId: string, id: string) => ({
  store: 'attachments',
  workspaceId,
  key: id,
  schemaVersion,
});

export function sealBlob(
  dek: CryptoKey,
  schemaVersion: number,
  workspaceId: string,
  id: string,
  bytes: Uint8Array,
): Promise<SealedValue> {
  return sealBytes(dek, ctx(schemaVersion, workspaceId, id), new Uint8Array(bytes));
}

export async function openBlob(
  dek: CryptoKey,
  schemaVersion: number,
  workspaceId: string,
  id: string,
  rec: StoredRecord | undefined,
): Promise<Uint8Array> {
  const s = rec?.sealed;
  if (!s || typeof s.iv !== 'string' || typeof s.ct !== 'string')
    throw new StorageError('NOT_FOUND', 'O arquivo do comprovante não está no cofre.');
  return openBytes(dek, ctx(schemaVersion, workspaceId, id), s);
}

export async function readBlob(
  db: Db,
  dek: CryptoKey,
  schemaVersion: number,
  workspaceId: string,
  id: string,
): Promise<Uint8Array> {
  return openBlob(dek, schemaVersion, workspaceId, id, await db.get('attachments', blobKey(workspaceId, id)));
}

/** Ids dos anexos de um espaço, sem decifrar nada. */
export async function blobIds(db: Db, workspaceId: string): Promise<string[]> {
  const keys = await db.getAllKeys('attachments', blobRange(workspaceId));
  return keys.map((k) => k.slice(workspaceId.length + 1));
}

/** Todos os anexos do espaço, decifrados, um de cada vez para não segurar tudo cifrado na memória. */
export async function* eachBlob(
  db: Db,
  dek: CryptoKey,
  schemaVersion: number,
  workspaceId: string,
): AsyncGenerator<{ id: string; bytes: Uint8Array | null }> {
  for (const id of await blobIds(db, workspaceId)) {
    try {
      yield { id, bytes: await readBlob(db, dek, schemaVersion, workspaceId, id) };
    } catch {
      yield { id, bytes: null };
    }
  }
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}
