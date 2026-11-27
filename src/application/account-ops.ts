// Casos de uso das contas e dos espaços depois do primeiro acesso (CON-002, CON-004, CON-006, COF-007).
// Cada um monta a operação inteira, valida com o domínio e grava de uma vez só.
import type { CivilDate } from '@/domain/civil-date';
import { compareDates, isCivilDate } from '@/domain/civil-date';
import { DomainError } from '@/domain/errors';
import type { LedgerAccount } from '@/domain/ledger';
import { balancesAt } from '@/domain/ledger';
import { money } from '@/domain/money';
import { balanceAdjustment, transfer } from '@/domain/operations';
import { AppError } from './errors';
import type { Account, AccountKind, Workspace } from './model';
import { ENTITY, accountSchema, workspaceSchema } from './model';
import type { Clock, SessionPort, WorkspaceSnapshot } from './ports';
import { accountsOf, workspaceOf } from './session-read';

export interface OpsContext {
  readonly port: SessionPort;
  readonly clock: Clock;
}

export const DELETE_WORD = 'EXCLUIR';

export function domainSafe<T>(fn: () => T): T {
  try {
    return fn();
  } catch (erro) {
    if (erro instanceof DomainError) throw new AppError('INVALID', erro.message, { cause: erro });
    throw erro;
  }
}

/** LAN-012: a mesma operação de novo (clique duplo, reenvio) responde "repetida" antes de validar qualquer coisa. */
export function alreadyDone(c: OpsContext, workspaceId: string, operationId: string): Promise<boolean> {
  return c.port.hasOperation(workspaceId, operationId);
}

export function writable(port: SessionPort): void {
  if (port.safeMode) {
    throw new AppError(
      'SAFE_MODE',
      'O cofre está em modo seguro por causa de um registro danificado. Nada foi alterado. Abra Backup e segurança.',
    );
  }
}

const mesmoNome = (a: string, b: string) => a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');

export function contaDe(
  snap: WorkspaceSnapshot,
  accountId: string,
): { account: Account; ledger: LedgerAccount } {
  const account = accountsOf(snap).find((a) => a.id === accountId);
  const ledger = account ? snap.ledger.get(account.ledgerAccountId) : undefined;
  if (!account || !ledger)
    throw new AppError('INVALID', 'Conta não encontrada neste espaço. Nada foi alterado.');
  return { account, ledger };
}

function saldoHoje(snap: WorkspaceSnapshot, ws: Workspace, ledgerId: string, hoje: CivilDate): number {
  return domainSafe(() => balancesAt(snap.entries, snap.ledger, ws.id, hoje)).get(ledgerId) ?? 0;
}

function contaItens(account: Account, ledger: LedgerAccount) {
  const conta = accountSchema.safeParse(account);
  if (!conta.success) throw new AppError('INVALID', 'Dê um nome à conta, com até 60 caracteres.');
  return [
    { type: ENTITY.ledgerAccount, id: ledger.id, data: { ...ledger, name: conta.data.name } },
    { type: ENTITY.account, id: account.id, data: conta.data },
  ];
}

/** CON-002: muda nome e tipo. O histórico e o saldo não mudam. */
export async function updateAccount(
  c: OpsContext,
  workspaceId: string,
  input: { accountId: string; name: string; kind: AccountKind; operationId: string },
): Promise<'gravada' | 'repetida'> {
  writable(c.port);
  const snap = await c.port.load(workspaceId);
  const { account, ledger } = contaDe(snap, input.accountId);
  const nome = input.name.trim();
  const outra = accountsOf(snap).some((a) => a.id !== account.id && !a.archived && mesmoNome(a.name, nome));
  if (outra) throw new AppError('INVALID', `Já existe uma conta chamada "${nome}" neste espaço.`);
  const nova: Account = { ...account, name: nome, kind: input.kind };
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: [],
    items: contaItens(nova, ledger),
    audit: {
      action: 'conta.editar',
      target: `account/${account.id}`,
      after: { before: { name: account.name, kind: account.kind }, now: { name: nome, kind: input.kind } },
    },
  });
}

/** CON-002: arquivar mantém o histórico e tira a conta das escolhas do dia a dia. Só com saldo zero. */
export async function setAccountArchived(
  c: OpsContext,
  workspaceId: string,
  input: { accountId: string; archived: boolean; operationId: string },
): Promise<'gravada' | 'repetida'> {
  writable(c.port);
  const snap = await c.port.load(workspaceId);
  const ws = workspaceOf(snap);
  const { account, ledger } = contaDe(snap, input.accountId);
  if (input.archived && saldoHoje(snap, ws, ledger.id, c.clock.today(ws.timeZone)) !== 0) {
    throw new AppError(
      'INVALID',
      'Só dá para arquivar uma conta com saldo zero. Transfira o dinheiro ou ajuste o saldo antes. Nada foi alterado.',
    );
  }
  if (!input.archived) {
    const repetida = accountsOf(snap).some(
      (a) => a.id !== account.id && !a.archived && mesmoNome(a.name, account.name),
    );
    if (repetida) {
      throw new AppError(
        'INVALID',
        `Já existe uma conta ativa chamada "${account.name}". Renomeie uma delas antes.`,
      );
    }
  }
  // Reativar tira a data de encerramento (CON-007).
  const semData: Account = { ...account };
  delete semData.closedAt;
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: [],
    items: contaItens(
      input.archived ? { ...account, archived: true } : { ...semData, archived: false },
      ledger,
    ),
    audit: { action: input.archived ? 'conta.arquivar' : 'conta.reativar', target: `account/${account.id}` },
  });
}

export interface ClosePreview {
  readonly balanceCents: number;
  /** Lançamentos a vencer na conta: precisam ser confirmados ou excluídos antes. */
  readonly pending: number;
  /** Contas que podem receber (ou mandar) a transferência final. */
  readonly targets: readonly { readonly id: string; readonly name: string }[];
}

/** CON-007: o que encerrar a conta pede, para a tela explicar antes do clique. */
export async function previewClose(
  c: OpsContext,
  workspaceId: string,
  accountId: string,
): Promise<ClosePreview> {
  const snap = await c.port.load(workspaceId);
  const ws = workspaceOf(snap);
  const { account, ledger } = contaDe(snap, accountId);
  return {
    balanceCents: saldoHoje(snap, ws, ledger.id, c.clock.today(ws.timeZone)),
    pending: snap.entries.filter(
      (e) => e.status === 'pendente' && e.lines.some((l) => l.accountId === ledger.id),
    ).length,
    targets: accountsOf(snap)
      .filter((a) => a.id !== account.id && !a.archived)
      .map((a) => ({ id: a.id, name: a.name })),
  };
}

/**
 * CON-007: encerrar só com saldo zero ou com transferência final. Com saldo, o dinheiro vai para outra conta
 * (ou vem dela, se o saldo é negativo) e a conta é arquivada na mesma operação. O bloqueio sempre diz por quê.
 */
export async function closeAccount(
  c: OpsContext,
  workspaceId: string,
  input: { accountId: string; toAccountId?: string; operationId: string },
): Promise<'gravada' | 'repetida'> {
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  writable(c.port);
  const snap = await c.port.load(workspaceId);
  const ws = workspaceOf(snap);
  const { account, ledger } = contaDe(snap, input.accountId);
  if (account.archived) throw new AppError('INVALID', 'Esta conta já está encerrada. Nada foi alterado.');
  const prev = await previewClose(c, workspaceId, account.id);
  if (prev.pending > 0) {
    throw new AppError(
      'INVALID',
      `A conta tem ${prev.pending === 1 ? '1 lançamento a vencer' : `${String(prev.pending)} lançamentos a vencer`}. Confirme ou exclua antes de encerrar. Nada foi alterado.`,
    );
  }
  const hoje = c.clock.today(ws.timeZone);
  const saldo = prev.balanceCents;
  let entries: ReturnType<typeof transfer> = [];
  let destino: string | undefined;
  if (saldo !== 0) {
    if (!input.toAccountId) {
      throw new AppError(
        'INVALID',
        'A conta ainda tem saldo. Escolha para qual conta o dinheiro vai antes de encerrar. Nada foi alterado.',
      );
    }
    const outra = contaDe(snap, input.toAccountId);
    if (outra.account.id === account.id || outra.account.archived) {
      throw new AppError('INVALID', 'Escolha uma conta ativa e diferente desta. Nada foi alterado.');
    }
    destino = outra.account.id;
    entries = domainSafe(() =>
      transfer(
        { operationId: input.operationId, workspaceId, date: hoje },
        saldo > 0
          ? { from: ledger, to: outra.ledger, amount: money(saldo) }
          : { from: outra.ledger, to: ledger, amount: money(-saldo) },
      ),
    );
  }
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries,
    items: contaItens({ ...account, archived: true, closedAt: hoje }, ledger),
    audit: {
      action: 'conta.encerrar',
      target: `account/${account.id}`,
      after: { balance: saldo, ...(destino ? { to: destino } : {}), date: hoje },
    },
  });
}

/** Data digitada (aaaa-mm-dd) que não pode ser futura: o que ainda não aconteceu não é realizado. */
export function dataAte(texto: string, hoje: CivilDate): CivilDate {
  if (!isCivilDate(texto)) throw new AppError('INVALID', 'Escolha uma data válida.');
  if (compareDates(texto, hoje) > 0) throw new AppError('INVALID', 'A data não pode ser depois de hoje.');
  return texto;
}

/** CON-004: transferência entre contas do mesmo espaço, com tarifa opcional. Uma operação, duas pernas. */
export async function transferBetween(
  c: OpsContext,
  workspaceId: string,
  input: {
    fromId: string;
    toId: string;
    amountCents: number;
    feeCents: number;
    date: string;
    operationId: string;
  },
): Promise<'gravada' | 'repetida'> {
  writable(c.port);
  const snap = await c.port.load(workspaceId);
  const ws = workspaceOf(snap);
  const de = contaDe(snap, input.fromId);
  const para = contaDe(snap, input.toId);
  if (de.account.archived || para.account.archived) {
    throw new AppError('INVALID', 'Conta arquivada não recebe nem envia transferência. Reative-a antes.');
  }
  const data = dataAte(input.date, c.clock.today(ws.timeZone));
  const tarifa = snap.ledger.get(ws.feeExpenseId);
  const entries = domainSafe(() =>
    transfer(
      { operationId: input.operationId, workspaceId, date: data },
      {
        from: de.ledger,
        to: para.ledger,
        amount: money(input.amountCents),
        ...(input.feeCents ? { fee: money(input.feeCents), ...(tarifa ? { feeAccount: tarifa } : {}) } : {}),
      },
    ),
  );
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries,
    items: [],
    audit: {
      action: 'transferencia',
      target: `account/${de.account.id}`,
      after: { to: para.account.id, amount: input.amountCents, fee: input.feeCents, date: data },
    },
  });
}

/** CON-006: a pessoa informa o saldo certo de hoje; a diferença vira lançamento de ajuste, com motivo. */
export async function adjustBalance(
  c: OpsContext,
  workspaceId: string,
  input: { accountId: string; targetCents: number; reason: string; operationId: string },
): Promise<'gravada' | 'repetida'> {
  writable(c.port);
  const snap = await c.port.load(workspaceId);
  const ws = workspaceOf(snap);
  const { account, ledger } = contaDe(snap, input.accountId);
  if (account.archived) throw new AppError('INVALID', 'Reative a conta antes de ajustar o saldo.');
  const hoje = c.clock.today(ws.timeZone);
  const atual = saldoHoje(snap, ws, ledger.id, hoje);
  const delta = input.targetCents - atual;
  if (delta === 0) throw new AppError('INVALID', 'O saldo já é esse. Nada foi alterado.');
  const ajuste = snap.ledger.get(ws.adjustmentEquityId);
  if (!ajuste) throw new AppError('STORAGE', 'O espaço está incompleto. Nada foi alterado.');
  const entries = domainSafe(() =>
    balanceAdjustment(
      { operationId: input.operationId, workspaceId, date: hoje },
      { account: ledger, adjustmentEquity: ajuste, delta: money(delta), reason: input.reason },
    ),
  );
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries,
    items: [],
    audit: {
      action: 'ajuste',
      target: `account/${account.id}`,
      after: { from: atual, to: input.targetCents, delta },
      reason: input.reason.trim(),
    },
  });
}

/** COF-007: arquivar um espaço. Sempre fica pelo menos um espaço ativo. */
export async function setWorkspaceArchived(
  c: OpsContext,
  all: readonly Workspace[],
  input: { workspaceId: string; archived: boolean; operationId: string },
): Promise<'gravada' | 'repetida'> {
  writable(c.port);
  const ativos = all.filter((w) => !w.archived && w.id !== input.workspaceId);
  if (input.archived && ativos.length === 0) {
    throw new AppError('INVALID', 'Este é o único espaço ativo. Crie ou reative outro antes de arquivar.');
  }
  const snap = await c.port.load(input.workspaceId);
  const ws = workspaceSchema.parse({ ...workspaceOf(snap), archived: input.archived });
  return c.port.commit(input.workspaceId, {
    operationId: input.operationId,
    entries: [],
    items: [{ type: ENTITY.workspace, id: ws.id, data: ws }],
    audit: { action: input.archived ? 'espaco.arquivar' : 'espaco.reativar', target: `workspace/${ws.id}` },
  });
}

export interface WorkspaceFootprint {
  readonly accounts: number;
  readonly entries: number;
}

/** Quanto a exclusão vai apagar, para mostrar antes de confirmar (COF-007). */
export async function workspaceFootprint(c: OpsContext, workspaceId: string): Promise<WorkspaceFootprint> {
  const snap = await c.port.load(workspaceId);
  return { accounts: accountsOf(snap).length, entries: snap.entries.length };
}

/** COF-007: exclusão com a palavra digitada. Não tem volta. */
export async function deleteWorkspace(c: OpsContext, workspaceId: string, typed: string): Promise<void> {
  writable(c.port);
  if (typed.trim().toUpperCase() !== DELETE_WORD) {
    throw new AppError('INVALID', `Digite ${DELETE_WORD} para confirmar. Nada foi apagado.`);
  }
  await c.port.deleteWorkspace(workspaceId);
}
