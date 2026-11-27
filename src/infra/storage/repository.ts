// Repositório de um espaço: carrega, valida e grava de forma atômica (Volume 05, seção 5).
// A cifra acontece antes da transação, porque o IndexedDB encerra a transação que espera outra coisa.
// Dentro dela só há leituras de revisão e gravações; se algo mudou no meio, a gravação é recusada.
import type { Journal } from '@/domain/journal';
import { addLoadedEntries, appendOperation, applyUpdate, emptyJournal } from '@/domain/journal';
import type { AccountLookup, JournalEntry, LedgerAccount } from '@/domain/ledger';
import type { AuditInput } from './audit';
import { chainEvent, verifyChain } from './audit';
import type { Db, EntityKey, SealedValue, StoredRecord } from './db';
import { StorageError, abortQuietly, fromDomException } from './errors';
import { blobKey, sealBlob } from './blobs';
import { quarantine } from './quarantine';
import type { AuditEvent, AuditPage, JournalPage, OperationRecord, StoredEntity } from './schema';
import { auditPageSchema, entitySchema, journalPageSchema, ledgerAccountSchema } from './schema';
import { digest, monthOf, openValid, seal } from './sealing';

export interface WorkspaceState {
  readonly workspaceId: string;
  readonly entities: Map<string, { entity: StoredEntity; rev: number }>;
  readonly pages: Map<string, { page: JournalPage; rev: number; digest: string }>;
  readonly auditPages: Map<string, { page: AuditPage; rev: number }>;
  journal: Journal;
  lastAudit: { seq: number; hash: string } | null;
}

export interface Problem {
  readonly store: string;
  readonly key: string;
  readonly reason: string;
}

export interface CommitInput {
  readonly operationId: string;
  readonly entries: readonly JournalEntry[];
  /** Pendentes trocados (mesmo entryId) e, de realizado, só o `meta` (Volume 04, seção 7.4). */
  readonly replace?: readonly JournalEntry[];
  /** Pendentes removidos do diário. */
  readonly remove?: readonly string[];
  readonly entities?: readonly StoredEntity[];
  /** LAN-009: arquivos de comprovante, gravados e apagados na mesma transação. */
  readonly putBlobs?: readonly { readonly id: string; readonly bytes: Uint8Array }[];
  readonly deleteBlobs?: readonly string[];
  readonly audit: AuditInput;
}

const entityKey = (e: { type: string; id: string }) => `${e.type}/${e.id}`;

export class VaultRepository {
  private safe = false;
  private readonly problems: Problem[] = [];

  constructor(
    private readonly db: Db,
    private readonly dek: CryptoKey,
    private readonly schemaVersion: number,
    private readonly now: () => string,
  ) {}

  /** Modo seguro: há registro em quarentena ou corrente quebrada; leitura sim, gravação não (BKP-006). */
  get safeMode(): boolean {
    return this.safe;
  }

  get issues(): readonly Problem[] {
    return this.problems;
  }

  private ctx(store: string, workspaceId: string, key: string) {
    return { store, workspaceId, key, schemaVersion: this.schemaVersion };
  }

  private async problem(store: string, key: IDBValidKey, original: unknown, reason: string): Promise<void> {
    this.safe = true;
    this.problems.push({ store, key: JSON.stringify(key), reason });
    await quarantine(this.db, { store, key, original, problem: reason, at: this.now() });
  }

  /** Lê tudo de um espaço. O que não abre ou não valida vai para a quarentena, intacto; nada é apagado. */
  async loadWorkspace(workspaceId: string): Promise<WorkspaceState> {
    const faixa = IDBKeyRange.bound([workspaceId], [workspaceId, []]);
    const tx = this.db.transaction(['entities', 'journal', 'audit'], 'readonly');
    const [entKeys, entVals, pagKeys, pagVals, audKeys, audVals] = await Promise.all([
      tx.objectStore('entities').getAllKeys(faixa),
      tx.objectStore('entities').getAll(faixa),
      tx.objectStore('journal').getAllKeys(faixa),
      tx.objectStore('journal').getAll(faixa),
      tx.objectStore('audit').getAllKeys(faixa),
      tx.objectStore('audit').getAll(faixa),
    ]);
    await tx.done;

    const state: WorkspaceState = {
      workspaceId,
      entities: new Map(),
      pages: new Map(),
      auditPages: new Map(),
      journal: emptyJournal,
      lastAudit: null,
    };

    for (const [i, key] of entKeys.entries()) {
      const rec = entVals[i] as StoredRecord;
      try {
        const e = await openValid(
          this.dek,
          this.ctx('entities', workspaceId, `${key[1]}/${key[2]}`),
          rec.sealed,
          entitySchema,
        );
        if (e.workspaceId !== workspaceId || e.type !== key[1] || e.id !== key[2])
          throw new Error('chave não confere');
        state.entities.set(entityKey(e), { entity: e, rev: rec.rev });
      } catch (erro) {
        await this.problem('entities', key, rec, motivo(erro));
      }
    }

    const eventos: AuditEvent[] = [];
    for (const [i, key] of audKeys.entries()) {
      const rec = audVals[i] as StoredRecord;
      try {
        const page = await openValid(
          this.dek,
          this.ctx('audit', workspaceId, key[1]),
          rec.sealed,
          auditPageSchema,
        );
        state.auditPages.set(key[1], { page, rev: rec.rev });
        eventos.push(...page.events);
      } catch (erro) {
        await this.problem('audit', key, rec, motivo(erro));
      }
    }
    eventos.sort((a, b) => a.seq - b.seq);
    const corrente = await verifyChain(eventos);
    if (!corrente.ok) {
      this.safe = true;
      this.problems.push({
        store: 'audit',
        key: workspaceId,
        reason: `Trilha de auditoria quebrada: ${corrente.reason}`,
      });
    }
    const ultimo = eventos.at(-1);
    state.lastAudit = ultimo ? { seq: ultimo.seq, hash: ultimo.hash } : null;
    const esperado = paginasConferidas(eventos);

    const contas = new Map<string, LedgerAccount>();
    for (const { entity } of state.entities.values()) {
      if (entity.type === 'ledger-account') {
        const r = ledgerAccountSchema.safeParse(entity.data);
        if (r.success) contas.set(r.data.id, r.data);
      }
    }
    const diario = new Map<string, JournalEntry>();
    for (const [i, key] of pagKeys.entries()) {
      const rec = pagVals[i] as StoredRecord;
      try {
        const page = await openValid(
          this.dek,
          this.ctx('journal', workspaceId, key[1]),
          rec.sealed,
          journalPageSchema,
        );
        const d = await digest(rec.sealed);
        // T-10: a página precisa ser a mesma que a auditoria registrou por último; versão antiga devolvida não passa.
        if (esperado.get(key[1]) !== d) throw new Error('página diferente da registrada na auditoria');
        addLoadedEntries(diario, page.entries, contas);
        state.pages.set(key[1], { page, rev: rec.rev, digest: d });
      } catch (erro) {
        await this.problem('journal', key, rec, motivo(erro));
      }
    }
    state.journal = diario;
    return state;
  }

  /** LAN-012: a operação já está no registro? Só a chave é lida; nada é decifrado. */
  async hasOperation(workspaceId: string, operationId: string): Promise<boolean> {
    return (await this.db.getKey('operations', [workspaceId, operationId])) !== undefined;
  }

  /**
   * Grava uma operação inteira numa transação só: lançamentos, entidades, registro da operação e auditoria.
   * Devolve "repetida" se a operação já tinha sido gravada (INV-06).
   */
  async commit(
    state: WorkspaceState,
    input: CommitInput,
    accounts: AccountLookup,
  ): Promise<'gravada' | 'repetida'> {
    if (this.safe)
      throw new StorageError(
        'SAFE_MODE',
        'O cofre está em modo seguro. Resolva a recuperação antes de gravar.',
      );
    const ws = state.workspaceId;
    const jaExiste = await this.db.get('operations', [ws, input.operationId]);
    if (jaExiste) return 'repetida';

    // 1. O domínio valida tudo antes de qualquer gravação.
    const troca = input.replace ?? [];
    const remove = input.remove ?? [];
    const novoJournal =
      troca.length || remove.length
        ? applyUpdate(
            state.journal,
            { operationId: input.operationId, workspaceId: ws, add: input.entries, replace: troca, remove },
            accounts,
          )
        : input.entries.length
          ? appendOperation(state.journal, input.entries, accounts)
          : state.journal;

    // 2. Monta e sela as páginas, entidades e o registro da operação, fora da transação.
    const doMes = new Map<string, JournalEntry[]>();
    const listaDoMes = (m: string): JournalEntry[] => {
      let lista = doMes.get(m);
      if (!lista) {
        lista = [...(state.pages.get(m)?.page.entries ?? [])];
        doMes.set(m, lista);
      }
      return lista;
    };
    const tirar = (id: string): void => {
      const antes = state.journal.get(id);
      if (!antes) return;
      const lista = listaDoMes(monthOf(antes.date));
      const i = lista.findIndex((e) => e.entryId === id);
      if (i >= 0) lista.splice(i, 1);
    };
    for (const id of remove) tirar(id);
    for (const e of troca) {
      const antes = state.journal.get(e.entryId);
      const lista = listaDoMes(monthOf(e.date));
      const i =
        antes && monthOf(antes.date) === monthOf(e.date)
          ? lista.findIndex((x) => x.entryId === e.entryId)
          : -1;
      if (i >= 0) lista[i] = e;
      else {
        tirar(e.entryId);
        lista.push(e);
      }
    }
    for (const e of input.entries) listaDoMes(monthOf(e.date)).push(e);
    const paginas = new Map<
      string,
      { page: JournalPage; rev: number; sealed: SealedValue; digest: string }
    >();
    for (const [m, entries] of doMes) {
      paginas.set(m, {
        page: { workspaceId: ws, month: m, entries },
        rev: state.pages.get(m)?.rev ?? 0,
        sealed: { iv: '', ct: '' },
        digest: '',
      });
    }
    const digests: Record<string, string> = {};
    for (const [m, p] of paginas) {
      p.sealed = await seal(this.dek, this.ctx('journal', ws, m), p.page);
      p.digest = await digest(p.sealed);
      digests[m] = p.digest;
    }
    const entidades = await Promise.all(
      (input.entities ?? []).map(async (e) => ({
        e,
        key: [ws, e.type, e.id] as EntityKey,
        rev: state.entities.get(entityKey(e))?.rev ?? 0,
        sealed: await seal(this.dek, this.ctx('entities', ws, entityKey(e)), e),
      })),
    );
    const blobs = await Promise.all(
      (input.putBlobs ?? []).map(async (b) => ({
        key: blobKey(ws, b.id),
        sealed: await sealBlob(this.dek, this.schemaVersion, ws, b.id, b.bytes),
      })),
    );
    const registro: OperationRecord = {
      operationId: input.operationId,
      workspaceId: ws,
      at: this.now(),
      entryIds: [...input.entries, ...troca].map((e) => e.entryId),
    };
    const opSelada = await seal(this.dek, this.ctx('operations', ws, input.operationId), registro);

    // 3. Evento de auditoria encadeado, com o resumo das páginas gravadas (T-10).
    const evento = await chainEvent(
      { ...input.audit, after: { ...(input.audit.after as object | undefined), journalPages: digests } },
      state.lastAudit,
    );
    const mesAudit = monthOf(evento.at);
    const audAtual = state.auditPages.get(mesAudit);
    const audPage: AuditPage = {
      workspaceId: ws,
      month: mesAudit,
      events: [...(audAtual?.page.events ?? []), evento],
    };
    const audSelada = await seal(this.dek, this.ctx('audit', ws, mesAudit), audPage);

    // 4. Transação única, só com conferência de revisão e gravação.
    let aberta: { abort(): void } | undefined;
    try {
      const tx = this.db.transaction(
        ['entities', 'journal', 'operations', 'audit', 'attachments'],
        'readwrite',
      );
      aberta = tx;
      const fim = tx.done;
      // Evita aviso de promessa rejeitada quando a própria função aborta a transação.
      fim.catch(() => undefined);
      const conferir = (atual: StoredRecord | undefined, esperado: number) => {
        if ((atual?.rev ?? 0) !== esperado) {
          tx.abort();
          throw new StorageError(
            'CONFLICT',
            'Os dados mudaram em outra aba. Nada foi gravado; recarregue e tente de novo.',
          );
        }
      };
      if (await tx.objectStore('operations').get([ws, input.operationId])) {
        tx.abort();
        return 'repetida';
      }
      for (const [mes, p] of paginas) {
        conferir(await tx.objectStore('journal').get([ws, mes]), p.rev);
        await tx.objectStore('journal').put({ sealed: p.sealed, rev: p.rev + 1 }, [ws, mes]);
      }
      for (const x of entidades) {
        conferir(await tx.objectStore('entities').get(x.key), x.rev);
        await tx.objectStore('entities').put({ sealed: x.sealed, rev: x.rev + 1 }, x.key);
      }
      conferir(await tx.objectStore('audit').get([ws, mesAudit]), audAtual?.rev ?? 0);
      await tx.objectStore('audit').put({ sealed: audSelada, rev: (audAtual?.rev ?? 0) + 1 }, [ws, mesAudit]);
      for (const b of blobs) await tx.objectStore('attachments').put({ sealed: b.sealed, rev: 1 }, b.key);
      for (const id of input.deleteBlobs ?? []) await tx.objectStore('attachments').delete(blobKey(ws, id));
      await tx.objectStore('operations').put({ sealed: opSelada, rev: 1 }, [ws, input.operationId]);
      await fim;
    } catch (erro) {
      abortQuietly(aberta);
      throw fromDomException(erro);
    }

    // 5. Só depois da confirmação o estado em memória muda.
    for (const [mes, p] of paginas) state.pages.set(mes, { page: p.page, rev: p.rev + 1, digest: p.digest });
    for (const x of entidades) state.entities.set(entityKey(x.e), { entity: x.e, rev: x.rev + 1 });
    state.auditPages.set(mesAudit, { page: audPage, rev: (audAtual?.rev ?? 0) + 1 });
    state.journal = novoJournal;
    state.lastAudit = { seq: evento.seq, hash: evento.hash };
    return 'gravada';
  }
}

/** Para cada mês, o resumo da página registrado pelo último evento de auditoria que gravou nela. */
function paginasConferidas(eventos: readonly AuditEvent[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of eventos) {
    const pags = (e.after as { journalPages?: Record<string, string> } | undefined)?.journalPages;
    if (pags) for (const [mes, d] of Object.entries(pags)) m.set(mes, d);
  }
  return m;
}

function motivo(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}
