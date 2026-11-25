// Implementação real das portas do cofre: IndexedDB cifrado (I-03 e I-04) por trás do contrato da aplicação.
import { AppError } from '@/application/errors';
import { PREF } from '@/application/reminder';
import type {
  Credential,
  PreparedVault,
  SessionPort,
  StorageStatus,
  UnlockAttempts,
  VaultPort,
} from '@/application/ports';
import { SCHEMA_VERSION, guarded } from './app-errors';
import { generateRecoveryCode } from './crypto/recovery';
import { assertHeader, createVaultKeys, unlockVault } from './crypto/vault-keys';
import { IdbSession } from './idb-session';
import { uuidv7 } from './ids';
import type { Db } from './storage/db';
import { DB_NAME, openRazaoDb } from './storage/db';
import { runMigrations } from './storage/migrations';
import {
  VAULT_MARKER_KEY,
  initVault,
  readVault,
  requestPersistence,
  vaultPresence,
} from './storage/vault-store';

export { SCHEMA_VERSION, toAppError } from './app-errors';

/**
 * PERS-01 sem travar a tela: no Firefox o pedido abre uma pergunta ao usuário e a promessa só
 * termina quando ele responde. O cofre abre na hora; o resultado aparece no indicador (PERS-02).
 */
function pedirPersistencia(storage: StorageManager | undefined): void {
  void requestPersistence(storage).catch(() => undefined);
}

/** Apaga o banco inteiro. Se outra aba estiver com ele aberto, o navegador espera; aqui isso vira aviso. */
function apagarBanco(nome: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.deleteDatabase(nome);
    pedido.onsuccess = () => {
      resolve();
    };
    pedido.onerror = () => {
      reject(new AppError('STORAGE', 'Não foi possível apagar os dados. Nada foi apagado; tente de novo.'));
    };
    pedido.onblocked = () => {
      reject(
        new AppError('CONFLICT', 'O Razão está aberto em outra aba. Feche as outras abas e tente de novo.'),
      );
    };
  });
}

const ATTEMPTS_KEY = 'razao:tentativas';

/** Pequeno armazenamento de texto (localStorage no navegador); nunca guarda dado financeiro. */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AdapterOptions {
  readonly dbName?: string;
  readonly local: KeyValue;
  readonly storage?: StorageManager;
  readonly nowIso: () => string;
  readonly nowMs: () => number;
  /** Só para testes: parâmetros de derivação mais leves. */
  readonly kdf?: Parameters<typeof createVaultKeys>[2];
}

export function createVaultPort(o: AdapterOptions): VaultPort & { close(): Promise<void> } {
  const nome = o.dbName ?? DB_NAME;
  let banco: Promise<Db> | null = null;
  const abrir = () => (banco ??= openRazaoDb(nome));
  const fechar = async () => {
    const atual = banco;
    banco = null;
    if (atual) (await atual).close();
  };

  const lerTentativas = (): UnlockAttempts => {
    try {
      const v = JSON.parse(o.local.getItem(ATTEMPTS_KEY) ?? 'null') as Partial<UnlockAttempts> | null;
      const failed = Number.isSafeInteger(v?.failed) && (v?.failed ?? 0) >= 0 ? (v?.failed ?? 0) : 0;
      const waitUntilMs = Number.isFinite(v?.waitUntilMs) ? (v?.waitUntilMs ?? 0) : 0;
      return { failed, waitUntilMs };
    } catch {
      return { failed: 0, waitUntilMs: 0 };
    }
  };

  const sessao = (db: Db, dek: CryptoKey): SessionPort =>
    new IdbSession(db, dek, o.nowIso, () => {
      banco = null;
    });

  return {
    presence: () =>
      guarded(async () => {
        const row = await readVault(await abrir());
        return vaultPresence(row !== undefined, o.local.getItem(VAULT_MARKER_KEY) !== null);
      }),

    prepare: (password) =>
      guarded(async () => {
        const recoveryCode = generateRecoveryCode();
        const { header, dek } = await createVaultKeys(password, recoveryCode, o.kdf);
        const prepared: PreparedVault = {
          recoveryCode,
          save: () =>
            guarded(async () => {
              const db = await abrir();
              await initVault(db, { keys: header, schemaVersion: SCHEMA_VERSION, createdAt: o.nowIso() });
              o.local.setItem(VAULT_MARKER_KEY, '1');
              pedirPersistencia(o.storage);
              return sessao(db, dek);
            }),
        };
        return prepared;
      }),

    unlock: (cred: Credential) =>
      guarded(async () => {
        const db = await abrir();
        const row = await readVault(db);
        if (!row) throw new AppError('STORAGE', 'O cofre não foi encontrado neste navegador.');
        assertHeader(row.keys);
        const dek = await unlockVault(row.keys, cred);
        await runMigrations(db, dek, {
          migrations: [],
          targetVersion: SCHEMA_VERSION,
          now: o.nowIso(),
          snapshotId: uuidv7(o.nowMs()),
        });
        // PERS-01: a cada abertura o app pede de novo o armazenamento persistente.
        pedirPersistencia(o.storage);
        return sessao(db, dek);
      }),

    attempts: lerTentativas,

    recordAttempt(ok, nowMs, waitMs) {
      const valor = ok
        ? { failed: 0, waitUntilMs: 0 }
        : { failed: lerTentativas().failed + 1, waitUntilMs: nowMs + waitMs };
      o.local.setItem(ATTEMPTS_KEY, JSON.stringify(valor));
    },

    storageStatus: (): Promise<StorageStatus> => requestPersistence(o.storage),

    // Solta o banco (testes e troca de aba).
    close: fechar,

    async wipeAll() {
      await fechar();
      await apagarBanco(nome);
      for (const k of [VAULT_MARKER_KEY, ATTEMPTS_KEY, ...Object.values(PREF)]) o.local.removeItem(k);
      // Caches e service worker do site (o service worker chega no I-07; aqui já fica pronto).
      if (typeof caches !== 'undefined') for (const k of await caches.keys()) await caches.delete(k);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      }
    },
  };
}
