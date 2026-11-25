// Abertura do IndexedDB com os 8 conjuntos do Volume 05, seção 4.
// Os dados ficam cifrados; só as chaves (espaço, tipo, mês, id) ficam visíveis, como aprovado no Volume 05.
import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';

export const DB_NAME = 'razao';
/** Versão da estrutura do banco (conjuntos e índices). A versão dos dados fica no cabeçalho do cofre. */
export const DB_VERSION = 1;

export interface SealedValue {
  readonly iv: string;
  readonly ct: string;
}

/** Registro guardado: as chaves em claro, o conteúdo cifrado e um número de revisão contra gravação concorrente. */
export interface StoredRecord {
  readonly sealed: SealedValue;
  readonly rev: number;
}

export interface VaultRow {
  /** Cabeçalho de chaves (Volume 05, seção 3), em claro: não contém segredo. */
  readonly keys: unknown;
  /** Versão do formato dos dados, para as migrações (Volume 05, seção 6). */
  readonly schemaVersion: number;
  readonly createdAt: string;
}

export interface SnapshotRow {
  readonly id: string;
  readonly createdAt: string;
  readonly reason: string;
  /** Contagens e totais, cifrados. */
  readonly summary: SealedValue;
  /** Cópia fiel dos registros cifrados, conjunto por conjunto. */
  readonly records: readonly { store: CopiedStore; key: IDBValidKey; value: unknown }[];
  readonly schemaVersion: number;
}

export interface QuarantineRow {
  readonly id: string;
  readonly at: string;
  readonly store: string;
  readonly key: IDBValidKey;
  /** Os bytes originais, intactos, para análise. */
  readonly original: unknown;
  readonly problem: string;
}

export type WorkspaceMonthKey = [workspaceId: string, month: string];
export type EntityKey = [workspaceId: string, type: string, id: string];

export interface RazaoDb extends DBSchema {
  vault: { key: 'header'; value: VaultRow };
  entities: { key: EntityKey; value: StoredRecord };
  journal: { key: WorkspaceMonthKey; value: StoredRecord };
  operations: { key: [workspaceId: string, operationId: string]; value: StoredRecord };
  audit: { key: WorkspaceMonthKey; value: StoredRecord };
  attachments: { key: string; value: StoredRecord };
  snapshots: { key: string; value: SnapshotRow };
  quarantine: { key: string; value: QuarantineRow };
}

/** Conjuntos copiados por um snapshot e substituídos por uma restauração. */
export const COPIED_STORES = ['vault', 'entities', 'journal', 'operations', 'audit', 'attachments'] as const;
export type CopiedStore = (typeof COPIED_STORES)[number];

export type Db = IDBPDatabase<RazaoDb>;

export async function openRazaoDb(name = DB_NAME): Promise<Db> {
  return openDB<RazaoDb>(name, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('vault');
      db.createObjectStore('entities');
      db.createObjectStore('journal');
      db.createObjectStore('operations');
      db.createObjectStore('audit');
      db.createObjectStore('attachments');
      db.createObjectStore('snapshots');
      db.createObjectStore('quarantine');
    },
    // Outra aba abriu uma versão nova do banco: esta fecha para não travar a atualização.
    blocking() {
      // A interface trata o fechamento pedindo para recarregar (I-07).
    },
  });
}
