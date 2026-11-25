// Portas da aplicação (Volume 06, seção 2): o que a aplicação precisa do mundo de fora.
// A infraestrutura implementa; a aplicação e a interface só conhecem estes contratos.
import type { CivilDate } from '@/domain/civil-date';
import type { AccountLookup, JournalEntry } from '@/domain/ledger';

/** Situação do cofre neste navegador (PERS-06). */
export type VaultPresence = 'novo' | 'normal' | 'sumiu';

export type Credential = { readonly password: string } | { readonly recoveryCode: string };

/** Uma entidade guardada no espaço: o tipo diz qual esquema vale para os dados. */
export interface StoredItem {
  readonly type: string;
  readonly id: string;
  readonly data: Readonly<Record<string, unknown>>;
}

/** Tudo o que foi lido de um espaço, já validado e decifrado. */
export interface WorkspaceSnapshot {
  readonly workspaceId: string;
  readonly items: readonly StoredItem[];
  readonly entries: readonly JournalEntry[];
  readonly ledger: AccountLookup;
}

export interface AuditNote {
  readonly action: string;
  readonly target: string;
  readonly after?: unknown;
  readonly reason?: string;
}

export interface WorkspaceCommit {
  readonly operationId: string;
  readonly entries: readonly JournalEntry[];
  readonly items: readonly StoredItem[];
  readonly audit: AuditNote;
}

export interface StorageIssue {
  readonly store: string;
  readonly key: string;
  readonly reason: string;
}

export interface StorageStatus {
  readonly supported: boolean;
  readonly persisted: boolean;
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
  readonly lowSpace: boolean;
}

/** Cofre aberto: a única porta para ler e gravar dados. Toda leitura e gravação pede o espaço (Volume 05). */
export interface SessionPort {
  workspaceIds(): Promise<string[]>;
  load(workspaceId: string): Promise<WorkspaceSnapshot>;
  commit(workspaceId: string, op: WorkspaceCommit): Promise<'gravada' | 'repetida'>;
  /** COF-007: apaga tudo o que é do espaço, inclusive dos snapshots. Não tem volta. */
  deleteWorkspace(workspaceId: string): Promise<void>;
  /** Há registro em quarentena ou trilha quebrada: leitura sim, gravação não (BKP-006). */
  readonly safeMode: boolean;
  issues(): readonly StorageIssue[];
  /** Fecha o banco e esquece a chave. Depois disso nenhuma chamada funciona. */
  close(): void;
}

/** Cofre preparado e ainda não gravado: o código já existe, mas nada foi para o disco. */
export interface PreparedVault {
  readonly recoveryCode: string;
  /** Grava o cabeçalho e abre o cofre. Nunca grava por cima de um cofre existente (PERS-06). */
  save(): Promise<SessionPort>;
}

export interface UnlockAttempts {
  readonly failed: number;
  /** Instante (ms, relógio de parede) até quando novas tentativas esperam; 0 se não há espera. */
  readonly waitUntilMs: number;
}

export interface VaultPort {
  presence(): Promise<VaultPresence>;
  prepare(password: string): Promise<PreparedVault>;
  /** Lança VaultError WRONG_SECRET em segredo errado, sem dizer qual dos dois errou (SEC-11). */
  unlock(cred: Credential): Promise<SessionPort>;
  attempts(): UnlockAttempts;
  recordAttempt(ok: boolean, nowMs: number, waitMs: number): void;
  storageStatus(): Promise<StorageStatus>;
}

export interface Clock {
  /** Relógio de parede, em ISO 8601, para auditoria. */
  nowIso(): string;
  /** Relógio de parede, em ms. */
  nowMs(): number;
  /** Relógio monotônico (performance.now), para o bloqueio por inatividade. */
  monotonicMs(): number;
  /** Data civil de hoje no fuso do espaço. */
  today(timeZone: string): CivilDate;
  /** Fuso do aparelho, para sugerir ao criar um espaço. */
  deviceTimeZone(): string;
}

export interface IdSource {
  /** UUID v7: aleatório e ordenado no tempo (Volume 05, seção 2). */
  newId(): string;
}
