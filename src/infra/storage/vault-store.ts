// Cabeçalho do cofre no banco e presença do cofre (PERS-01, PERS-06, PERS-02).
import type { Db, VaultRow } from './db';
import { StorageError, abortQuietly, fromDomException } from './errors';

/** Grava o cabeçalho de um cofre novo. Nunca grava por cima de um cofre que já existe (PERS-06). */
export async function initVault(db: Db, row: VaultRow): Promise<void> {
  let aberta: { abort(): void } | undefined;
  try {
    const tx = db.transaction('vault', 'readwrite');
    aberta = tx;
    const fim = tx.done;
    fim.catch(() => undefined);
    if (await tx.store.get('header')) {
      tx.abort();
      throw new StorageError('CONFLICT', 'Já existe um cofre neste navegador; ele não será substituído.');
    }
    await tx.store.put(row, 'header');
    await fim;
  } catch (erro) {
    abortQuietly(aberta);
    throw fromDomException(erro);
  }
}

export async function readVault(db: Db): Promise<VaultRow | undefined> {
  return db.get('vault', 'header');
}

/** Atualiza só o cabeçalho de chaves (troca de senha ou de código), sem mexer nos dados. */
export async function updateVaultKeys(db: Db, keys: unknown): Promise<void> {
  let aberta: { abort(): void } | undefined;
  try {
    const tx = db.transaction('vault', 'readwrite');
    aberta = tx;
    const fim = tx.done;
    fim.catch(() => undefined);
    const atual = await tx.store.get('header');
    if (!atual) throw new StorageError('NOT_FOUND', 'Cofre não encontrado.');
    await tx.store.put({ ...atual, keys }, 'header');
    await fim;
  } catch (erro) {
    abortQuietly(aberta);
    throw fromDomException(erro);
  }
}

// Marca simples, sem dado nenhum, que lembra que este navegador já teve um cofre (Volume 09, PERS-06).
export const VAULT_MARKER_KEY = 'razao:cofre-existe';

export type VaultPresence = 'novo' | 'normal' | 'sumiu';

/** Se a marca existe mas o cofre não, o navegador apagou os dados: a tela é de recuperação, nunca de cofre novo. */
export function vaultPresence(hasVault: boolean, markerPresent: boolean): VaultPresence {
  if (hasVault) return 'normal';
  return markerPresent ? 'sumiu' : 'novo';
}

export interface StorageManagerLike {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
}

export interface StorageStatus {
  readonly supported: boolean;
  readonly persisted: boolean;
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
  /** Menos de 10% livre: avisar e sugerir backup (Volume 05, seção 8.1). */
  readonly lowSpace: boolean;
}

/** PERS-01: pede armazenamento persistente. O navegador pode negar; o resultado vai para o indicador (PERS-02). */
export async function requestPersistence(sm: StorageManagerLike | undefined): Promise<StorageStatus> {
  if (!sm?.persist || !sm.persisted) {
    return { supported: false, persisted: false, usageBytes: null, quotaBytes: null, lowSpace: false };
  }
  let persisted = await sm.persisted();
  if (!persisted) {
    try {
      persisted = await sm.persist();
    } catch {
      persisted = false;
    }
  }
  const vazio: { usage?: number; quota?: number } = {};
  const est = sm.estimate ? await sm.estimate().catch(() => vazio) : vazio;
  const usage = est.usage ?? null;
  const quota = est.quota ?? null;
  const lowSpace = usage !== null && quota !== null && quota > 0 && (quota - usage) / quota < 0.1;
  return { supported: true, persisted, usageBytes: usage, quotaBytes: quota, lowSpace };
}
