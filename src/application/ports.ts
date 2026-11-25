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
  /** Versão do formato dos dados deste cofre (Volume 05, seção 6). */
  readonly schemaVersion: number;
  workspaceIds(): Promise<string[]>;
  load(workspaceId: string): Promise<WorkspaceSnapshot>;
  commit(workspaceId: string, op: WorkspaceCommit): Promise<'gravada' | 'repetida'>;
  /** COF-007: apaga tudo o que é do espaço, inclusive dos snapshots. Não tem volta. */
  deleteWorkspace(workspaceId: string): Promise<void>;
  /** BKP-001: tudo dos espaços pedidos, decifrado e validado, para ir ao arquivo de backup. */
  exportWorkspaces(workspaceIds: readonly string[]): Promise<BackupWorkspace[]>;
  /**
   * BKP-003: grava os espaços do backup. Antes, o estado atual vira um snapshot com o id dado.
   * "cofre" substitui todos os espaços; "espacos" substitui só os que vieram no arquivo.
   */
  importWorkspaces(
    data: readonly BackupWorkspace[],
    mode: 'cofre' | 'espacos',
    snapshotId: string,
  ): Promise<void>;
  /** Pontos de volta criados antes de cada restauração, do mais novo para o mais antigo. */
  restorePoints(): Promise<RestorePoint[]>;
  /** Volta a um ponto de restauração; o estado atual também vira snapshot antes. */
  undoRestore(snapshotId: string, backupId: string): Promise<void>;
  /** Há registro em quarentena ou trilha quebrada: leitura sim, gravação não (BKP-006). */
  readonly safeMode: boolean;
  issues(): readonly StorageIssue[];
  /** Fecha o banco e esquece a chave. Depois disso nenhuma chamada funciona. */
  close(): void;
}

/** Cofre preparado e ainda não gravado: o código já existe, mas nada foi para o disco. */
/** Conteúdo de um espaço dentro do backup: os mesmos registros do cofre, sem a cifra do cofre. */
export interface BackupWorkspace {
  readonly workspaceId: string;
  readonly entities: readonly StoredItem[];
  readonly journal: readonly { readonly month: string; readonly entries: readonly JournalEntry[] }[];
  /** Eventos da trilha de auditoria, intactos, para a corrente continuar conferindo depois. */
  readonly audit: readonly { readonly month: string; readonly events: readonly AuditEventData[] }[];
  readonly operations: readonly {
    readonly operationId: string;
    readonly at: string;
    readonly entryIds: readonly string[];
  }[];
}

export interface AuditEventData {
  readonly seq: number;
  readonly hash: string;
  readonly [campo: string]: unknown;
}

export interface RestorePoint {
  readonly id: string;
  readonly createdAt: string;
}

export type BackupScope =
  { readonly kind: 'cofre' } | { readonly kind: 'espaco'; readonly workspaceId: string };

/** Parte em claro do arquivo: dá para ler sem a senha, mas qualquer mudança faz a decifração falhar. */
export interface BackupHeader {
  readonly format: 'razao-backup';
  readonly formatVersion: 1;
  readonly schemaVersion: number;
  readonly createdAt: string;
  readonly appVersion: string;
  readonly scope: BackupScope;
}

export interface BackupOpened {
  readonly header: BackupHeader;
  /** Resumo cifrado; a aplicação valida o formato. */
  readonly manifest: unknown;
  readonly content: readonly BackupWorkspace[];
}

/** Arquivo .razao: cifra com a senha do backup e confere integridade e formato ao abrir (SEC-06). */
export interface BackupFilePort {
  write(input: {
    header: BackupHeader;
    manifest: unknown;
    content: readonly BackupWorkspace[];
    password: string;
  }): Promise<string>;
  /** Lança AppError com o motivo: arquivo que não é backup, versão nova, senha errada, adulterado ou incompleto. */
  read(text: string, password: string): Promise<BackupOpened>;
  /** Só o cabeçalho, sem senha, para dizer cedo se o arquivo é um backup do Razão. */
  peek(text: string): BackupHeader;
}

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
  /** PRIV-05: apaga o banco, as preferências, os caches e o service worker do site. */
  wipeAll(): Promise<void>;
}

/** Versão nova do app (SEC-05): avisa quando há uma esperando e aplica só quando pedida. */
export interface UpdatePort {
  /** Chama f quando houver versão nova esperando. Devolve a função que para de ouvir. */
  onAvailable(f: () => void): () => void;
  /** Ativa a versão nova e recarrega a página. */
  apply(): Promise<void>;
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
