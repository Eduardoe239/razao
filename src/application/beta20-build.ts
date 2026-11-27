// BKP-008 e D-054: transforma a leitura da beta.20 em espaços novos do Razão, "Pessoal (beta.20)" e
// "Negócio (beta.20)", com lançamentos balanceados montados pelo próprio domínio. O que não fecha vai para a
// quarentena, com o motivo. Nada aqui grava: o resultado é a prévia e o conteúdo que será gravado.
import { isCivilDate, parseCivilDate } from '@/domain/civil-date';
import type { JournalEntry } from '@/domain/ledger';
import { balancesAt } from '@/domain/ledger';
import { money } from '@/domain/money';
import { recordFlow } from '@/domain/income-expense';
import { openingBalance, transfer } from '@/domain/operations';
import type { Beta20State } from './beta20-file';
import { beta20Cents } from './beta20-file';
import { formatBRL, formatStoredDate } from './format';
import type { Workspace, WorkspaceKind } from './model';
import type { BackupWorkspace, IdSource } from './ports';
import type { Registro } from './beta20-space';
import { Montagem, perfil, texto } from './beta20-space';

export interface Beta20AccountLine {
  readonly name: string;
  /** Saldo que a beta.20 mostrava (saldo inicial mais os pagos). */
  readonly beta20Cents: number;
  /** Saldo no Razão depois de importar. */
  readonly razaoCents: number;
}

export interface Beta20Space {
  readonly workspaceId: string;
  readonly kind: WorkspaceKind;
  readonly name: string;
  readonly accounts: readonly Beta20AccountLine[];
  readonly entries: number;
  readonly pending: number;
  readonly transfers: number;
  readonly invoicePayments: number;
  readonly categoriesCreated: readonly string[];
}

export interface Beta20QuarantineLine {
  readonly kind: WorkspaceKind;
  readonly label: string;
  readonly reason: string;
}

export interface Beta20Plan {
  readonly createdAt: string;
  readonly schemaVersion: number;
  readonly spaces: readonly Beta20Space[];
  readonly quarantine: readonly Beta20QuarantineLine[];
  readonly cancelled: number;
  readonly content: readonly BackupWorkspace[];
}

const FIM = parseCivilDate('2999-12-31');
const FATURA = 'Fatura de cartão (beta.20)';
export interface Beta20BuildDeps {
  readonly ids: IdSource;
  readonly now: string;
  readonly timeZone: string;
}

function rotulo(tx: Registro, cents: number | null): string {
  const desc = texto(tx['description'], 80) || 'Sem descrição';
  const data =
    typeof tx['date'] === 'string' && isCivilDate(tx['date']) ? ` · ${formatStoredDate(tx['date'])}` : '';
  return `Lançamento "${desc}"${cents ? ` · ${formatBRL(cents)}` : ''}${data}`;
}

/** Monta a prévia e o conteúdo dos espaços novos. Lança AppError se o arquivo não tiver nada a importar. */
export function buildBeta20(state: Beta20State, d: Beta20BuildDeps): Beta20Plan {
  const contaPerfil = new Map(
    state.accounts.map((a) => [texto(a['id'], 200), perfil(a['profileType']) ?? 'PF']),
  );
  const cartoes = new Set(state.cards.map((c) => texto(c['id'], 200)));
  const categoriasBeta = new Map(state.categories.map((c) => [texto(c['id'], 200), texto(c['name'], 60)]));
  const perfis = new Set<WorkspaceKind>([...contaPerfil.values()]);
  for (const tx of state.transactions)
    perfis.add(perfil(tx['profileType']) ?? contaPerfil.get(texto(tx['accountId'], 200)) ?? 'PF');
  const espacos = new Map<WorkspaceKind, Montagem>();
  for (const kind of (['PF', 'PJ'] as const).filter((k) => perfis.has(k))) {
    const id = d.ids.newId();
    const ws: Workspace = {
      id,
      kind,
      name: kind === 'PF' ? 'Pessoal (beta.20)' : 'Negócio (beta.20)',
      currency: 'BRL',
      timeZone: d.timeZone,
      monthStartDay: 1,
      openingEquityId: d.ids.newId(),
      adjustmentEquityId: d.ids.newId(),
      feeExpenseId: d.ids.newId(),
      archived: false,
      createdAt: d.now,
      origin: { kind: 'beta20', at: state.createdAt },
    };
    espacos.set(kind, new Montagem(ws, d.ids, d.now));
  }
  const quarentena: Beta20QuarantineLine[] = [];
  const espacoDe = (k: WorkspaceKind) => espacos.get(k) ?? [...espacos.values()][0];
  const isolar = (k: WorkspaceKind, label: string, reason: string, original: unknown) => {
    const m = espacoDe(k);
    if (!m) return;
    m.quarentena(label, reason, original);
    quarentena.push({ kind: m.ws.kind, label, reason });
  };
  // A beta.20 mostrava: saldo inicial mais o efeito de cada lançamento pago.
  const saldoBeta = new Map<string, number>();
  for (const a of state.accounts) {
    const ini = a['initialBalanceCents'];
    saldoBeta.set(texto(a['id'], 200), typeof ini === 'number' && Number.isSafeInteger(ini) ? ini : 0);
  }
  for (const tx of state.transactions) {
    const v = beta20Cents(tx, state.schemaVersion);
    if (tx['status'] !== 'pago' || v === null) continue;
    const mexe = (id: unknown, sinal: number) => {
      const k = texto(id, 200);
      if (saldoBeta.has(k)) saldoBeta.set(k, (saldoBeta.get(k) ?? 0) + sinal * v);
    };
    const tipo = tx['type'] ?? 'despesa';
    if (tipo === 'receita') mexe(tx['accountId'], 1);
    if (tipo === 'despesa' || tipo === 'transferencia') mexe(tx['accountId'], -1);
    if (tipo === 'transferencia') mexe(tx['toAccountId'], 1);
  }
  // Contas: a abertura fica no dia do primeiro lançamento da conta (ou no dia do arquivo).
  const primeiroDia = new Map<string, string>();
  for (const tx of state.transactions) {
    const dia = tx['date'];
    if (typeof dia !== 'string' || !isCivilDate(dia)) continue;
    for (const id of [texto(tx['accountId'], 200), texto(tx['toAccountId'], 200)]) {
      const atual = primeiroDia.get(id);
      if (id && (!atual || dia < atual)) primeiroDia.set(id, dia);
    }
  }
  for (const a of state.accounts) {
    const id = texto(a['id'], 200);
    const m = espacoDe(contaPerfil.get(id) ?? 'PF');
    if (!m) continue;
    if (!id || m.contas.has(id)) {
      isolar(
        m.ws.kind,
        `Conta "${texto(a['name'], 60) || 'sem nome'}"`,
        'Conta sem identificador ou repetida no arquivo.',
        a,
      );
      continue;
    }
    m.conta(id, texto(a['name'], 60), saldoBeta.get(id) ?? 0);
    const ini = a['initialBalanceCents'];
    if (typeof ini === 'number' && Number.isSafeInteger(ini) && ini !== 0) {
      const conta = m.contas.get(id);
      const abertura = m.ledger.get(m.ws.openingEquityId);
      const dia = parseCivilDate(primeiroDia.get(id) ?? state.createdAt.slice(0, 10));
      if (conta && abertura) {
        m.guardar(
          openingBalance(m.ctx(dia), { account: conta.ledger, openingEquity: abertura, amount: money(ini) }),
        );
      }
    }
  }
  for (const c of state.cards) {
    isolar(
      perfil(c['profileType']) ?? 'PF',
      `Cartão "${texto(c['name'], 80) || 'sem nome'}"`,
      'Cartões chegam numa Alpha seguinte do Razão.',
      c,
    );
  }
  for (const r of state.recurring) {
    isolar(
      perfil(r['profileType']) ?? 'PF',
      `Recorrência "${texto(r['description'], 80) || 'sem descrição'}"`,
      'Recorrências ainda não existem no Razão.',
      r,
    );
  }
  if (Object.keys(state.budgets).length) {
    isolar('PF', 'Orçamento da beta.20', 'Orçamento ainda não existe no Razão.', state.budgets);
  }
  for (let i = 0; i < state.malformed; i++) {
    isolar('PF', 'Registro fora do formato', 'O item do arquivo nem é um registro; não dá para ler.', null);
  }
  let cancelados = 0;
  for (const tx of state.transactions) {
    if (tx['status'] === 'cancelado') {
      cancelados++;
      continue;
    }
    const cents = beta20Cents(tx, state.schemaVersion);
    const origem = texto(tx['accountId'], 200);
    const kind = perfil(tx['profileType']) ?? contaPerfil.get(origem) ?? 'PF';
    const fora = (reason: string) => {
      isolar(kind, rotulo(tx, cents), reason, tx);
    };
    const m = espacos.get(kind);
    const tipo = tx['type'] ?? 'despesa';
    const dia = tx['date'];
    if (!m) fora('O espaço deste lançamento não foi criado.');
    else if (tx['status'] !== 'pago' && tx['status'] !== 'pendente')
      fora('Situação desconhecida no arquivo.');
    else if (tipo !== 'receita' && tipo !== 'despesa' && tipo !== 'transferencia')
      fora('Tipo de lançamento desconhecido.');
    else if (cents === null) fora('Valor ausente, zero ou com mais precisão que centavos.');
    else if (typeof dia !== 'string' || !isCivilDate(dia)) fora('Data ausente ou inválida.');
    else if (cartoes.has(origem)) fora('Compra no cartão: cartões chegam numa Alpha seguinte do Razão.');
    else if (!m.contas.has(origem)) fora('A conta deste lançamento não existe no arquivo.');
    else if (contaPerfil.get(origem) !== kind)
      fora('O lançamento e a conta são de espaços diferentes (PF e PJ).');
    else {
      const conta = m.contas.get(origem);
      const status = tx['status'] === 'pago' ? 'realizado' : 'pendente';
      const descricao = texto(tx['description'], 200);
      const meta = descricao ? { description: descricao } : {};
      const destino = texto(tx['toAccountId'], 200);
      try {
        if (!conta) throw new Error('sem conta');
        if (tipo === 'transferencia' && cartoes.has(destino)) {
          // Pagamento de fatura: o dinheiro saiu da conta. Vira despesa, para o saldo da conta bater.
          const cat = m.categoria('expense', FATURA);
          m.guardar(
            recordFlow(m.ctx(dia), {
              kind: 'despesa',
              account: conta.ledger,
              parts: [{ category: cat, amount: money(cents) }],
              status,
              meta,
            }).add,
          );
          m.invoicePayments++;
        } else if (tipo === 'transferencia') {
          const para = m.contas.get(destino);
          if (!para || contaPerfil.get(destino) !== kind)
            fora('A conta de destino não existe no arquivo ou é de outro espaço.');
          else if (status === 'pendente') fora('Transferência a vencer: confirme no Razão e lance de novo.');
          else {
            m.guardar(transfer(m.ctx(dia), { from: conta.ledger, to: para.ledger, amount: money(cents) }));
            m.transfers++;
          }
        } else {
          const group = tipo === 'receita' ? 'income' : 'expense';
          const cat = m.categoria(group, categoriasBeta.get(texto(tx['categoryId'], 200)) ?? '');
          m.guardar(
            recordFlow(m.ctx(dia), {
              kind: tipo,
              account: conta.ledger,
              parts: [{ category: cat, amount: money(cents) }],
              status,
              meta,
            }).add,
          );
          if (status === 'pendente') m.pending++;
        }
      } catch (erro) {
        fora(`Não fechou como lançamento: ${erro instanceof Error ? erro.message : 'motivo desconhecido'}`);
      }
    }
  }
  const spaces: Beta20Space[] = [];
  const content: BackupWorkspace[] = [];
  for (const m of espacos.values()) {
    const saldos = balancesAt(m.entries, m.ledger, m.ws.id, FIM);
    spaces.push({
      workspaceId: m.ws.id,
      kind: m.ws.kind,
      name: m.ws.name,
      accounts: [...m.contas.values()].map((c) => ({
        name: c.name,
        beta20Cents: c.beta,
        razaoCents: saldos.get(c.ledger.id) ?? 0,
      })),
      entries: m.entries.filter((e) => e.kind !== 'abertura').length,
      pending: m.pending,
      transfers: m.transfers,
      invoicePayments: m.invoicePayments,
      categoriesCreated: m.criadas.filter((c) => c !== FATURA),
    });
    const meses = new Map<string, JournalEntry[]>();
    for (const e of m.entries) {
      const mes = e.date.slice(0, 7);
      const doMes = meses.get(mes);
      if (doMes) doMes.push(e);
      else meses.set(mes, [e]);
    }
    content.push({
      workspaceId: m.ws.id,
      entities: m.items,
      journal: [...meses]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, entries]) => ({ month, entries })),
      audit: [],
      operations: m.ops,
      origin: {
        action: 'importar.beta20',
        after: {
          fileCreatedAt: state.createdAt,
          checksum: state.checksum,
          schemaVersion: state.schemaVersion,
        },
      },
    });
  }
  return {
    createdAt: state.createdAt,
    schemaVersion: state.schemaVersion,
    spaces,
    quarantine: quarentena,
    cancelled: cancelados,
    content,
  };
}
