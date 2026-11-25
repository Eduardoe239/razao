// Implementação real das portas do cofre: IndexedDB cifrado (I-03 e I-04) por trás do contrato da aplicação.
import { AppError } from '@/application/errors';
import { ledgerAccountDataSchema } from '@/application/model';
import type {
  Credential,
  PreparedVault,
  SessionPort,
  StorageIssue,
  StorageStatus,
  StoredItem,
  UnlockAttempts,
  VaultPort,
  WorkspaceCommit,
  WorkspaceSnapshot,
} from '@/application/ports';
import type { LedgerAccount } from '@/domain/ledger';
import { VaultError } from './crypto/errors';
import { generateRecoveryCode } from './crypto/recovery';
import { assertHeader, createVaultKeys, unlockVault } from './crypto/vault-keys';
import { uuidv7 } from './ids';
import type { Db } from './storage/db';
import { DB_NAME, openRazaoDb } from './storage/db';
import { StorageError } from './storage/errors';
import { runMigrations } from './storage/migrations';
import { deleteWorkspaceData } from './storage/workspace-delete';
import type { WorkspaceState } from './storage/repository';
import { VaultRepository } from './storage/repository';
import {
  VAULT_MARKER_KEY,
  initVault,
  readVault,
  requestPersistence,
  vaultPresence,
} from './storage/vault-store';

/**
 * PERS-01 sem travar a tela: no Firefox o pedido abre uma pergunta ao usuário e a promessa só
 * termina quando ele responde. O cofre abre na hora; o resultado aparece no indicador (PERS-02).
 */
function pedirPersistencia(storage: StorageManager | undefined): void {
  void requestPersistence(storage).catch(() => undefined);
}

/** Versão do formato dos dados gravada no cofre. Sobe junto com cada migração nova. */
export const SCHEMA_VERSION = 1;
const ATTEMPTS_KEY = 'razao:tentativas';

/** Pequeno armazenamento de texto (localStorage no navegador); nunca guarda dado financeiro. */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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

/** Erros da infraestrutura viram erros que a interface sabe mostrar. */
export function toAppError(erro: unknown): unknown {
  if (erro instanceof AppError) return erro;
  if (erro instanceof VaultError) {
    if (erro.code === 'WRONG_SECRET') {
      return new AppError('WRONG_SECRET', 'Senha ou código de recuperação incorreto.', { cause: erro });
    }
    return new AppError('STORAGE', 'O cabeçalho do cofre está danificado. Nada foi alterado.', {
      cause: erro,
    });
  }
  if (erro instanceof StorageError) {
    const mapa = {
      QUOTA_EXCEEDED: 'QUOTA',
      CONFLICT: 'CONFLICT',
      SAFE_MODE: 'SAFE_MODE',
    } as const;
    const code = erro.code in mapa ? mapa[erro.code as keyof typeof mapa] : 'STORAGE';
    return new AppError(code, erro.message, { cause: erro });
  }
  return erro;
}

async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (erro) {
    throw toAppError(erro);
  }
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
  };
}

/** Sessão aberta sobre o repositório do I-04. Guarda em memória o estado de cada espaço lido. */
class IdbSession implements SessionPort {
  private readonly repo: VaultRepository;
  private readonly states = new Map<string, WorkspaceState>();
  private closed = false;

  constructor(
    private readonly db: Db,
    private readonly dek: CryptoKey,
    private readonly nowIso: () => string,
    private readonly onClose: () => void,
  ) {
    this.repo = new VaultRepository(db, dek, SCHEMA_VERSION, nowIso);
  }

  get safeMode(): boolean {
    return this.repo.safeMode;
  }

  issues(): readonly StorageIssue[] {
    return this.repo.issues;
  }

  private aberta(): void {
    if (this.closed) throw new AppError('STORAGE', 'O cofre está bloqueado. Desbloqueie para continuar.');
  }

  async workspaceIds(): Promise<string[]> {
    this.aberta();
    return guarded(async () => {
      const keys = await this.db.getAllKeys('entities');
      return [...new Set(keys.filter((k) => k[1] === 'workspace' && k[0] === k[2]).map((k) => k[0]))];
    });
  }

  private async state(workspaceId: string): Promise<WorkspaceState> {
    const atual = this.states.get(workspaceId);
    if (atual) return atual;
    const novo = await this.repo.loadWorkspace(workspaceId);
    this.states.set(workspaceId, novo);
    return novo;
  }

  async load(workspaceId: string): Promise<WorkspaceSnapshot> {
    this.aberta();
    return guarded(async () => snapshot(await this.state(workspaceId)));
  }

  async commit(workspaceId: string, op: WorkspaceCommit): Promise<'gravada' | 'repetida'> {
    this.aberta();
    return guarded(async () => {
      const st = await this.state(workspaceId);
      const contas = new Map(ledgerOf(st));
      for (const item of op.items) {
        const conta = ledgerItem(item);
        if (conta) contas.set(conta.id, conta);
      }
      return this.repo.commit(
        st,
        {
          operationId: op.operationId,
          entries: op.entries,
          entities: op.items.map((i) => ({ type: i.type, id: i.id, workspaceId, data: { ...i.data } })),
          audit: {
            at: this.nowIso(),
            action: op.audit.action,
            workspaceId,
            operationId: op.operationId,
            target: op.audit.target,
            after: op.audit.after,
            ...(op.audit.reason === undefined ? {} : { reason: op.audit.reason }),
          },
        },
        contas,
      );
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    this.aberta();
    if (this.repo.safeMode) {
      throw new AppError('SAFE_MODE', 'O cofre está em modo seguro. Nada foi apagado.');
    }
    await guarded(() => deleteWorkspaceData(this.db, this.dek, workspaceId));
    this.states.delete(workspaceId);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.states.clear();
    this.db.close();
    this.onClose();
  }
}

function ledgerItem(item: StoredItem): LedgerAccount | null {
  if (item.type !== 'ledger-account') return null;
  const r = ledgerAccountDataSchema.safeParse(item.data);
  return r.success ? { id: r.data.id, workspaceId: r.data.workspaceId, group: r.data.group } : null;
}

function ledgerOf(st: WorkspaceState): Map<string, LedgerAccount> {
  const m = new Map<string, LedgerAccount>();
  for (const { entity } of st.entities.values()) {
    const conta = ledgerItem(entity);
    if (conta?.workspaceId === st.workspaceId) m.set(conta.id, conta);
  }
  return m;
}

function snapshot(st: WorkspaceState): WorkspaceSnapshot {
  return {
    workspaceId: st.workspaceId,
    items: [...st.entities.values()].map(({ entity }) => ({
      type: entity.type,
      id: entity.id,
      data: entity.data,
    })),
    entries: [...st.journal.values()],
    ledger: ledgerOf(st),
  };
}
