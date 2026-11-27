// Cofre aberto: casos de uso dos espaços e das contas da Alpha 1 (COF-004, COF-005, CON-001, CON-003).
// Cada caso de uso monta a operação inteira e grava de uma vez; a interface nunca fala com o armazenamento.
import type { CivilDate } from '@/domain/civil-date';
import type { LedgerAccount } from '@/domain/ledger';
import { balancesAt } from '@/domain/ledger';
import { money } from '@/domain/money';
import { openingBalance } from '@/domain/operations';
import { AppError } from './errors';
import type { Account, AccountKind, Workspace, WorkspaceKind } from './model';
import { ENTITY, accountSchema, workspaceSchema } from './model';
import { accountsOf, workspaceOf } from './session-read';
import type { OpsContext, WorkspaceFootprint } from './account-ops';
import * as ops from './account-ops';
import type { EntryOps } from './session-entries';
import { entryOps } from './session-entries';
import { runIntegrityCheck } from './integrity';
import { defaultCategoryItems } from './category-defaults';
import type { BackupFile, BackupPreview } from './backup';
import { createBackup, openBackup, restoreBackup } from './backup';
import { importNewSpaces, restoreAsNew } from './restore-new';
import type { Beta20Plan } from './beta20-build';
import { buildBeta20 } from './beta20-build';
import { readBeta20 } from './beta20-file';
import type {
  BackupFilePort,
  BackupScope,
  Clock,
  IdSource,
  RestorePoint,
  SessionPort,
  StorageIssue,
  StoredItem,
} from './ports';
import type { BackupStatus, Prefs } from './reminder';
import { PREF, backupStatus } from './reminder';
import type { WriteTracker } from './session-port';
import { anotando } from './session-port';
import type { SecurityOps } from './session-security';
import { securityOps } from './session-security';

export { WriteTracker } from './session-port';

export interface AccountView {
  readonly account: Account;
  /** Saldo realizado até hoje, em centavos (INV-01). */
  readonly balance: number;
}

export interface WorkspaceView {
  readonly workspace: Workspace;
  readonly accounts: readonly AccountView[];
  /** Soma das contas ativas do espaço. */
  readonly total: number;
  readonly asOf: CivilDate;
}

export interface NewWorkspace {
  readonly kind: WorkspaceKind;
  readonly name: string;
  readonly timeZone?: string;
}

export interface NewAccount {
  readonly name: string;
  readonly kind: AccountKind;
  /** Saldo de hoje, em centavos; pode ser negativo (cheque especial). */
  readonly openingCents: number;
  /** Gerado uma vez por formulário: clicar duas vezes não cria duas contas (INV-06). */
  readonly operationId: string;
}

const domainSafe = ops.domainSafe;

const ORDEM: Record<WorkspaceKind, number> = { PF: 0, PJ: 1 };

export interface SessionExtras {
  readonly file: BackupFilePort;
  readonly prefs: Prefs;
  readonly writes: WriteTracker;
}

export class VaultSession {
  private readonly port: SessionPort;

  constructor(
    port: SessionPort,
    private readonly clock: Clock,
    private readonly ids: IdSource,
    private readonly extras: SessionExtras,
  ) {
    this.port = anotando(port, extras.prefs, clock, extras.writes);
    this.security = securityOps(this.port, this.aberturaPorCodigo);
  }

  /** COF-003 e D-054: senha e código de recuperação. */
  readonly security: SecurityOps;
  private readonly aberturaPorCodigo: { recoveryCode: string | null } = { recoveryCode: null };

  /** O app marca quando o cofre foi aberto pelo código, para oferecer a troca (D-042, item 6). */
  markOpenedByRecovery(code: string): void {
    this.aberturaPorCodigo.recoveryCode = code;
  }

  private get backupDeps() {
    return {
      file: this.extras.file,
      clock: this.clock,
      ids: this.ids,
      onBackupDone: (iso: string) => {
        this.extras.prefs.setItem(PREF.lastBackup, iso);
      },
    };
  }

  /** BKP-001 e PERS-05. */
  async createBackup(scope: BackupScope, password: string, repeat: string): Promise<BackupFile> {
    return createBackup(this.backupDeps, this.port, {
      scope,
      password,
      repeat,
      allWorkspaceIds: await this.port.workspaceIds(),
    });
  }

  /** BKP-002. */
  openBackup(text: string, password: string): Promise<BackupPreview> {
    return openBackup(this.extras.file, text, password);
  }

  /** BKP-003. */
  restoreBackup(preview: BackupPreview): Promise<void> {
    return restoreBackup(this.backupDeps, this.port, preview);
  }

  /** D-046: cada espaço do backup entra como espaço novo, ao lado dos atuais. Devolve os ids novos. */
  restoreAsNew = (preview: BackupPreview) => restoreAsNew(this.backupDeps, this.port, preview);

  /** BKP-008: lê o arquivo da beta.20 e monta a prévia, sem gravar nada. */
  previewBeta20 = (text: string): Beta20Plan =>
    buildBeta20(readBeta20(text), {
      ids: this.ids,
      now: this.clock.nowIso(),
      timeZone: this.clock.deviceTimeZone(),
    });

  /** BKP-008: grava os espaços da prévia e reconta; se não bater, desfaz. */
  importBeta20 = (plan: Beta20Plan) => importNewSpaces(this.backupDeps, this.port, plan.content);

  restorePoints(): Promise<RestorePoint[]> {
    return this.port.restorePoints();
  }

  undoRestore(snapshotId: string): Promise<void> {
    return this.port.undoRestore(snapshotId, this.ids.newId());
  }

  /** PERS-02 e PERS-04: data do último backup e lembrete. */
  backupStatus(persisted: boolean): BackupStatus {
    return backupStatus(this.extras.prefs, this.clock.nowMs(), persisted);
  }

  setReminderDays(days: number): void {
    this.extras.prefs.setItem(PREF.intervalDays, String(days));
  }

  get safeMode(): boolean {
    return this.port.safeMode;
  }

  issues(): readonly StorageIssue[] {
    return this.port.issues();
  }

  /** Espaços do cofre: pessoal primeiro, depois negócio. */
  async workspaces(): Promise<Workspace[]> {
    const ids = await this.port.workspaceIds();
    const lista: Workspace[] = [];
    for (const id of ids) lista.push(workspaceOf(await this.port.load(id)));
    // Os de sempre primeiro; os que vieram de backup ou da beta.20 depois (D-054).
    const extra = (w: Workspace) => (w.origin ? 1 : 0);
    return lista.sort(
      (a, b) =>
        extra(a) - extra(b) || ORDEM[a.kind] - ORDEM[b.kind] || a.createdAt.localeCompare(b.createdAt),
    );
  }

  /** COF-004: cria o espaço com moeda, fuso e início do mês, e as contas internas do livro-razão. */
  async createWorkspace(input: NewWorkspace): Promise<Workspace> {
    this.assertWritable();
    const existente = (await this.workspaces()).find((w) => w.kind === input.kind && !w.origin);
    if (existente) {
      const nome = input.kind === 'PF' ? 'Pessoal' : 'Negócio';
      throw new AppError(
        'INVALID',
        existente.archived
          ? `O espaço ${nome} está arquivado. Reative-o em Espaços.`
          : `Já existe um espaço ${nome} neste cofre.`,
      );
    }
    const id = this.ids.newId();
    const agora = this.clock.nowIso();
    const ws: Workspace = {
      id,
      kind: input.kind,
      name: input.name.trim(),
      currency: 'BRL',
      timeZone: input.timeZone ?? this.clock.deviceTimeZone(),
      monthStartDay: 1,
      openingEquityId: this.ids.newId(),
      adjustmentEquityId: this.ids.newId(),
      feeExpenseId: this.ids.newId(),
      archived: false,
      createdAt: agora,
    };
    const valido = workspaceSchema.safeParse(ws);
    if (!valido.success) throw new AppError('INVALID', 'Dê um nome ao espaço, com até 80 caracteres.');
    const interna = (lid: string, group: LedgerAccount['group'], name: string): StoredItem => ({
      type: ENTITY.ledgerAccount,
      id: lid,
      data: { id: lid, workspaceId: id, group, name },
    });
    await this.port.commit(id, {
      operationId: this.ids.newId(),
      entries: [],
      items: [
        { type: ENTITY.workspace, id, data: valido.data },
        interna(ws.openingEquityId, 'equity', 'Saldos de abertura'),
        interna(ws.adjustmentEquityId, 'equity', 'Ajustes de saldo'),
        interna(ws.feeExpenseId, 'expense', 'Tarifas bancárias'),
        ...defaultCategoryItems(valido.data, [], this.ids, agora),
      ],
      audit: { action: 'espaco.criar', target: `workspace/${id}`, after: { kind: ws.kind } },
    });
    return valido.data;
  }

  /** CON-003: saldo de cada conta e o total do espaço, derivados dos lançamentos até hoje. */
  async view(workspaceId: string): Promise<WorkspaceView> {
    const snap = await this.port.load(workspaceId);
    const workspace = workspaceOf(snap);
    const asOf = this.clock.today(workspace.timeZone);
    const saldos = domainSafe(() => balancesAt(snap.entries, snap.ledger, workspaceId, asOf));
    const accounts = accountsOf(snap)
      .map((account) => ({ account, balance: saldos.get(account.ledgerAccountId) ?? 0 }))
      .sort((a, b) => a.account.createdAt.localeCompare(b.account.createdAt));
    const total = accounts.filter((a) => !a.account.archived).reduce((s, a) => s + a.balance, 0);
    return { workspace, accounts, total: money(total).amount, asOf };
  }

  /**
   * CON-001: cria a conta; o saldo de hoje vira lançamento de abertura, nunca um número solto.
   * Devolve "repetida" quando a mesma operação já tinha sido gravada (clique duplo): nada muda.
   */
  async createAccount(workspaceId: string, input: NewAccount): Promise<'gravada' | 'repetida'> {
    this.assertWritable();
    const snap = await this.port.load(workspaceId);
    const ws = workspaceOf(snap);
    const nome = input.name.trim();
    const repetido = accountsOf(snap).some(
      (a) => !a.archived && a.name.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'),
    );
    if (repetido) throw new AppError('INVALID', `Já existe uma conta chamada "${nome}" neste espaço.`);
    const id = this.ids.newId();
    const ledgerId = this.ids.newId();
    const account: Account = {
      id,
      name: nome,
      kind: input.kind,
      ledgerAccountId: ledgerId,
      archived: false,
      createdAt: this.clock.nowIso(),
    };
    const valida = accountSchema.safeParse(account);
    if (!valida.success) throw new AppError('INVALID', 'Dê um nome à conta, com até 60 caracteres.');
    const ledger: LedgerAccount = { id: ledgerId, workspaceId, group: 'asset' };
    const abertura = snap.ledger.get(ws.openingEquityId);
    if (!abertura) throw new AppError('STORAGE', 'O espaço está incompleto. Nada foi alterado.');
    const entries =
      input.openingCents === 0
        ? []
        : domainSafe(() =>
            openingBalance(
              { operationId: input.operationId, workspaceId, date: this.clock.today(ws.timeZone) },
              { account: ledger, openingEquity: abertura, amount: money(input.openingCents) },
            ),
          );
    return this.port.commit(workspaceId, {
      operationId: input.operationId,
      entries,
      items: [
        { type: ENTITY.ledgerAccount, id: ledgerId, data: { ...ledger, name: nome } },
        { type: ENTITY.account, id, data: valida.data },
      ],
      audit: {
        action: 'conta.criar',
        target: `account/${id}`,
        after: { name: nome, kind: input.kind, opening: input.openingCents },
      },
    });
  }

  private get ctx(): OpsContext {
    return { port: this.port, clock: this.clock };
  }

  /** Receitas, despesas e categorias do espaço (Alpha 2a). */
  get entries(): EntryOps {
    return entryOps(this.ctx, this.ids, this.extras.prefs);
  }

  updateAccount(workspaceId: string, input: Parameters<typeof ops.updateAccount>[2]) {
    return ops.updateAccount(this.ctx, workspaceId, input);
  }

  setAccountArchived(workspaceId: string, input: Parameters<typeof ops.setAccountArchived>[2]) {
    return ops.setAccountArchived(this.ctx, workspaceId, input);
  }

  /** CON-007: encerrar com saldo zero ou com transferência final. */
  previewClose = (ws: string, accountId: string) => ops.previewClose(this.ctx, ws, accountId);
  closeAccount = (ws: string, input: Parameters<typeof ops.closeAccount>[2]) =>
    ops.closeAccount(this.ctx, ws, input);
  /** BKP-007: relê tudo do disco e confere; nunca corrige. */
  checkIntegrity = () => runIntegrityCheck(this.ctx);

  transfer(workspaceId: string, input: Parameters<typeof ops.transferBetween>[2]) {
    return ops.transferBetween(this.ctx, workspaceId, input);
  }

  adjustBalance(workspaceId: string, input: Parameters<typeof ops.adjustBalance>[2]) {
    return ops.adjustBalance(this.ctx, workspaceId, input);
  }

  async setWorkspaceArchived(workspaceId: string, archived: boolean) {
    return ops.setWorkspaceArchived(this.ctx, await this.workspaces(), {
      workspaceId,
      archived,
      operationId: this.ids.newId(),
    });
  }

  workspaceFootprint(workspaceId: string): Promise<WorkspaceFootprint> {
    return ops.workspaceFootprint(this.ctx, workspaceId);
  }

  deleteWorkspace(workspaceId: string, typed: string): Promise<void> {
    return ops.deleteWorkspace(this.ctx, workspaceId, typed);
  }

  /** Hoje no fuso do espaço, para o valor inicial dos campos de data. */
  today(workspace: Workspace): string {
    return this.clock.today(workspace.timeZone);
  }

  newOperationId(): string {
    return this.ids.newId();
  }

  lock(): void {
    this.port.close();
  }

  private assertWritable(): void {
    if (this.port.safeMode) {
      throw new AppError(
        'SAFE_MODE',
        'O cofre está em modo seguro por causa de um registro danificado. Nada foi alterado. Abra Backup e segurança.',
      );
    }
  }
}
