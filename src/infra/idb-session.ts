// Sessão aberta sobre o repositório do I-04: a porta SessionPort da aplicação.
import { AppError } from '@/application/errors';
import { ledgerAccountDataSchema } from '@/application/model';
import type {
  BackupWorkspace,
  RestorePoint,
  SessionPort,
  StorageIssue,
  StoredItem,
  WorkspaceCommit,
  WorkspaceSnapshot,
} from '@/application/ports';
import type { LedgerAccount } from '@/domain/ledger';
import { SCHEMA_VERSION, guarded } from './app-errors';
import { exportWorkspace, importWorkspaces } from './storage/backup-io';
import type { Db } from './storage/db';
import type { WorkspaceState } from './storage/repository';
import { VaultRepository } from './storage/repository';
import { listSnapshots, restoreSnapshot } from './storage/snapshots';
import { deleteWorkspaceData } from './storage/workspace-delete';

/** Sessão aberta sobre o repositório do I-04. Guarda em memória o estado de cada espaço lido. */
export class IdbSession implements SessionPort {
  private repo: VaultRepository;
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

  /** Depois de restaurar, tudo é lido de novo do banco, com um repositório novo. */
  private recomecar(): void {
    this.states.clear();
    this.repo = new VaultRepository(this.db, this.dek, SCHEMA_VERSION, this.nowIso);
  }

  async exportWorkspaces(workspaceIds: readonly string[]): Promise<BackupWorkspace[]> {
    this.aberta();
    return guarded(async () => {
      const out: BackupWorkspace[] = [];
      for (const id of workspaceIds)
        out.push(await exportWorkspace(this.db, this.dek, SCHEMA_VERSION, await this.state(id)));
      if (this.repo.safeMode) {
        throw new AppError(
          'SAFE_MODE',
          'Há um registro danificado no cofre, e o backup ficaria incompleto. Nada foi exportado.',
        );
      }
      return out;
    });
  }

  async importWorkspaces(
    data: readonly BackupWorkspace[],
    mode: 'cofre' | 'espacos',
    snapshotId: string,
  ): Promise<void> {
    this.aberta();
    try {
      await guarded(() =>
        importWorkspaces(
          this.db,
          this.dek,
          { schemaVersion: SCHEMA_VERSION, now: this.nowIso(), snapshotId, mode },
          data,
        ),
      );
    } finally {
      this.recomecar();
    }
  }

  async restorePoints(): Promise<RestorePoint[]> {
    this.aberta();
    const lista = await guarded(() => listSnapshots(this.db));
    return lista
      .filter((s) => s.reason === 'antes-de-restaurar')
      .map((s) => ({ id: s.id, createdAt: s.createdAt }));
  }

  async undoRestore(snapshotId: string, backupId: string): Promise<void> {
    this.aberta();
    try {
      await guarded(() =>
        restoreSnapshot(this.db, this.dek, snapshotId, {
          backupId,
          now: this.nowIso(),
          schemaVersion: SCHEMA_VERSION,
        }),
      );
    } finally {
      this.recomecar();
    }
  }

  get safeMode(): boolean {
    return this.repo.safeMode;
  }

  readonly schemaVersion = SCHEMA_VERSION;

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
          ...(op.replace ? { replace: op.replace } : {}),
          ...(op.remove ? { remove: op.remove } : {}),
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
