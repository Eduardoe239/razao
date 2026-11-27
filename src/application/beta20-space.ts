// BKP-008: um espaço novo sendo montado a partir da beta.20 (itens, contas, categorias, lançamentos e quarentena).
import type { CivilDate } from '@/domain/civil-date';
import { normalizeText } from '@/domain/category-rules';
import type { JournalEntry, LedgerAccount } from '@/domain/ledger';
import { defaultCategoryItems } from './category-defaults';
import type { AccountKind, Category, ImportQuarantineItem, Workspace, WorkspaceKind } from './model';
import { ENTITY } from './model';
import type { IdSource, StoredItem } from './ports';

type Registro = Record<string, unknown>;
export type { Registro };

export const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const perfil = (v: unknown): WorkspaceKind | null => (v === 'PJ' ? 'PJ' : v === 'PF' ? 'PF' : null);

function tipoDaConta(nome: string): AccountKind {
  const n = normalizeText(nome);
  if (n.includes('carteira')) return 'carteira';
  if (n.includes('poupanc')) return 'poupanca';
  if (n.includes('invest')) return 'investimento';
  if (n.includes('dinheiro')) return 'dinheiro';
  return 'corrente';
}

/** Um espaço sendo montado: itens, lançamentos e as contas da beta.20 já ligadas às do Razão. */
export class Montagem {
  readonly items: StoredItem[] = [];
  readonly entries: JournalEntry[] = [];
  readonly ops: { operationId: string; at: string; entryIds: string[] }[] = [];
  readonly ledger = new Map<string, LedgerAccount>();
  readonly contas = new Map<string, { ledger: LedgerAccount; name: string; beta: number }>();
  readonly categorias = new Map<string, LedgerAccount>();
  readonly criadas: string[] = [];
  readonly nomesConta = new Set<string>();
  pending = 0;
  transfers = 0;
  invoicePayments = 0;

  constructor(
    readonly ws: Workspace,
    private readonly ids: IdSource,
    private readonly now: string,
  ) {
    const interna = (id: string, group: LedgerAccount['group'], name: string) => {
      this.guardarLedger({ id, workspaceId: ws.id, group }, name);
    };
    this.items.push({ type: ENTITY.workspace, id: ws.id, data: ws });
    interna(ws.openingEquityId, 'equity', 'Saldos de abertura');
    interna(ws.adjustmentEquityId, 'equity', 'Ajustes de saldo');
    interna(ws.feeExpenseId, 'expense', 'Tarifas bancárias');
    for (const item of defaultCategoryItems(ws, [], ids, now)) {
      this.items.push(item);
      const d = item.data as { id: string; group: LedgerAccount['group'] };
      if (item.type === ENTITY.ledgerAccount)
        this.ledger.set(d.id, { id: d.id, workspaceId: ws.id, group: d.group });
    }
    for (const item of this.items) {
      if (item.type !== ENTITY.category) continue;
      const c = item.data as Category;
      const l = this.ledger.get(c.ledgerAccountId);
      if (l) this.categorias.set(`${c.group}:${normalizeText(c.name)}`, l);
    }
  }

  private guardarLedger(l: LedgerAccount, name: string): void {
    this.ledger.set(l.id, l);
    this.items.push({ type: ENTITY.ledgerAccount, id: l.id, data: { ...l, name } });
  }

  conta(betaId: string, nomeBeta: string, betaCents: number): void {
    let nome = (nomeBeta || 'Conta da beta.20').slice(0, 55);
    for (let i = 2; this.nomesConta.has(normalizeText(nome)); i++)
      nome = `${nomeBeta.slice(0, 50)} (${String(i)})`;
    this.nomesConta.add(normalizeText(nome));
    const ledger: LedgerAccount = { id: this.ids.newId(), workspaceId: this.ws.id, group: 'asset' };
    this.guardarLedger(ledger, nome);
    const id = this.ids.newId();
    this.items.push({
      type: ENTITY.account,
      id,
      data: {
        id,
        name: nome,
        kind: tipoDaConta(nome),
        ledgerAccountId: ledger.id,
        archived: false,
        createdAt: this.now,
      },
    });
    this.contas.set(betaId, { ledger, name: nome, beta: betaCents });
  }

  /** Categoria pelo nome (sem acento nem maiúscula); se não existir, é criada no nível de cima. */
  categoria(group: 'income' | 'expense', nome: string): LedgerAccount {
    const limpo = nome.slice(0, 60) || (group === 'income' ? 'Outras receitas' : 'Outros gastos');
    const chave = `${group}:${normalizeText(limpo)}`;
    const ja = this.categorias.get(chave);
    if (ja) return ja;
    const ledger: LedgerAccount = { id: this.ids.newId(), workspaceId: this.ws.id, group };
    this.guardarLedger(ledger, limpo);
    const id = this.ids.newId();
    const cat: Category = {
      id,
      name: limpo,
      group,
      parentId: null,
      ledgerAccountId: ledger.id,
      archived: false,
      createdAt: this.now,
    };
    this.items.push({ type: ENTITY.category, id, data: cat });
    this.categorias.set(chave, ledger);
    this.criadas.push(limpo);
    return ledger;
  }

  ctx(date: CivilDate) {
    return { operationId: this.ids.newId(), workspaceId: this.ws.id, date };
  }

  guardar(novos: readonly JournalEntry[]): void {
    const primeiro = novos[0];
    if (!primeiro) return;
    this.entries.push(...novos);
    this.ops.push({ operationId: primeiro.operationId, at: this.now, entryIds: novos.map((e) => e.entryId) });
  }

  quarentena(label: string, reason: string, original: unknown): void {
    const id = this.ids.newId();
    const item: ImportQuarantineItem = {
      id,
      source: 'beta20',
      label: label.slice(0, 200),
      reason: reason.slice(0, 300),
      original: JSON.stringify(original ?? null).slice(0, 4000),
      createdAt: this.now,
    };
    this.items.push({ type: ENTITY.importQuarantine, id, data: item });
  }
}
