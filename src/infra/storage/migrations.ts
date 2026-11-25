// Migrações de esquema (Volume 05, seção 6; NFR-010; INV-12).
// Snapshot antes, migrações puras em sequência, conferência antes e depois, e desfazer automático.
import type { Db } from './db';
import { StorageError, abortQuietly, fromDomException } from './errors';
import { openJson } from '../crypto/records';
import { chainEvent } from './audit';
import type { AuditEvent } from './schema';
import { digest, monthOf, seal } from './sealing';
import { createSnapshot, restoreSnapshot } from './snapshots';

const STORES = ['entities', 'journal', 'audit', 'operations'] as const;
type DataStore = (typeof STORES)[number];

export interface PlainRecord {
  readonly key: IDBValidKey;
  readonly value: unknown;
}
export type PlainVault = Record<DataStore, PlainRecord[]>;

export interface Migration {
  readonly from: number;
  readonly to: number;
  /** Função pura: recebe os dados de uma versão e devolve os da seguinte. */
  readonly migrate: (data: PlainVault) => PlainVault;
}

/** Contexto de cifra de cada registro, a partir da chave dele (o mesmo usado pelo repositório). */
function ctxFor(store: DataStore, key: IDBValidKey, schemaVersion: number) {
  const k = key as string[];
  const chave = store === 'entities' ? `${k[1] ?? ''}/${k[2] ?? ''}` : (k[1] ?? '');
  return { store, workspaceId: k[0] ?? '', key: chave, schemaVersion };
}

async function lerTudo(db: Db, dek: CryptoKey, version: number): Promise<PlainVault> {
  const tx = db.transaction(STORES, 'readonly');
  const brutos = await Promise.all(
    STORES.map(async (s) => {
      const os = tx.objectStore(s);
      const [keys, values] = await Promise.all([os.getAllKeys(), os.getAll()]);
      return keys.map((key, i) => ({
        s,
        key: key,
        rec: values[i] as { sealed: { iv: string; ct: string } },
      }));
    }),
  );
  await tx.done;
  const out: PlainVault = { entities: [], journal: [], audit: [], operations: [] };
  for (const lista of brutos) {
    for (const { s, key, rec } of lista) {
      out[s].push({ key, value: await openJson(dek, ctxFor(s, key, version), rec.sealed) });
    }
  }
  return out;
}

/** Conferência padrão: mesmas quantidades por conjunto e mesmo valor total por conta no diário. */
export function defaultVerify(antes: PlainVault, depois: PlainVault): string | null {
  // A auditoria ganha um evento de migração, então só os outros conjuntos precisam ter a mesma quantidade.
  for (const s of ['entities', 'journal', 'operations'] as const) {
    if (antes[s].length !== depois[s].length) return `Quantidade diferente em ${s}.`;
  }
  const eventos = (v: PlainVault) =>
    v.audit.reduce((n, r) => n + ((r.value as { events?: unknown[] }).events?.length ?? 0), 0);
  if (eventos(depois) < eventos(antes)) return 'A auditoria perdeu eventos.';
  const somas = (v: PlainVault) => {
    const m = new Map<string, number>();
    for (const { value } of v.journal) {
      const page = value as { entries?: { lines?: { accountId: string; side: string; amount: number }[] }[] };
      for (const e of page.entries ?? []) {
        for (const l of e.lines ?? [])
          m.set(l.accountId, (m.get(l.accountId) ?? 0) + (l.side === 'D' ? l.amount : -l.amount));
      }
    }
    return m;
  };
  const a = somas(antes);
  const b = somas(depois);
  if (a.size !== b.size) return 'Contas diferentes no diário.';
  for (const [conta, v] of a) if (b.get(conta) !== v) return `Saldo diferente na conta ${conta}.`;
  return null;
}

export interface MigrationOptions {
  readonly migrations: readonly Migration[];
  readonly targetVersion: number;
  readonly now: string;
  readonly snapshotId: string;
  readonly verify?: (antes: PlainVault, depois: PlainVault) => string | null;
}

export async function runMigrations(
  db: Db,
  dek: CryptoKey,
  o: MigrationOptions,
): Promise<'atual' | 'migrada'> {
  const vault = await db.get('vault', 'header');
  if (!vault) throw new StorageError('NOT_FOUND', 'Cofre não encontrado.');
  if (vault.schemaVersion > o.targetVersion) {
    throw new StorageError(
      'SCHEMA_TOO_NEW',
      'Estes dados são de uma versão mais nova do app. Atualize o app; nada foi alterado.',
    );
  }
  if (vault.schemaVersion === o.targetVersion) return 'atual';

  const verify = o.verify ?? defaultVerify;
  const antes = await lerTudo(db, dek, vault.schemaVersion);
  let dados = antes;
  for (let v = vault.schemaVersion; v < o.targetVersion; v++) {
    const passo = o.migrations.find((m) => m.from === v && m.to === v + 1);
    if (!passo)
      throw new StorageError(
        'MIGRATION_FAILED',
        `Falta a migração da versão ${String(v)} para ${String(v + 1)}.`,
      );
    dados = passo.migrate(dados);
  }
  const problema = verify(antes, dados);
  if (problema) throw new StorageError('MIGRATION_FAILED', `Migração cancelada antes de gravar: ${problema}`);

  await createSnapshot(db, dek, 'antes-de-migrar', {
    id: o.snapshotId,
    now: o.now,
    schemaVersion: vault.schemaVersion,
  });

  // Recifra tudo com a versão nova (ela faz parte do AAD). Primeiro o diário, para registrar na auditoria
  // o resumo das páginas novas; sem isso, a conferência de páginas (T-10) recusaria os dados migrados.
  const selados: { s: DataStore; key: IDBValidKey; sealed: { iv: string; ct: string } }[] = [];
  const resumos = new Map<string, Record<string, string>>();
  for (const r of dados.journal) {
    const sealed = await seal(dek, ctxFor('journal', r.key, o.targetVersion), r.value);
    selados.push({ s: 'journal', key: r.key, sealed });
    const [ws = '', mes = ''] = r.key as string[];
    resumos.set(ws, { ...(resumos.get(ws) ?? {}), [mes]: await digest(sealed) });
  }
  const audit = await registrarMigracao(
    dados.audit,
    resumos,
    o.now,
    `v${String(vault.schemaVersion)} → v${String(o.targetVersion)}`,
  );
  for (const s of ['entities', 'operations'] as const) {
    for (const r of dados[s])
      selados.push({ s, key: r.key, sealed: await seal(dek, ctxFor(s, r.key, o.targetVersion), r.value) });
  }
  for (const r of audit)
    selados.push({
      s: 'audit',
      key: r.key,
      sealed: await seal(dek, ctxFor('audit', r.key, o.targetVersion), r.value),
    });
  let aberta: { abort(): void } | undefined;
  try {
    const tx = db.transaction([...STORES, 'vault'], 'readwrite');
    aberta = tx;
    const fim = tx.done;
    fim.catch(() => undefined);
    for (const s of STORES) await tx.objectStore(s).clear();
    for (const x of selados) {
      await (tx.objectStore(x.s) as unknown as { put(v: unknown, k: IDBValidKey): Promise<unknown> }).put(
        { sealed: x.sealed, rev: 1 },
        x.key,
      );
    }
    await tx.objectStore('vault').put({ ...vault, schemaVersion: o.targetVersion }, 'header');
    await fim;
  } catch (erro) {
    abortQuietly(aberta);
    throw fromDomException(erro);
  }

  // Confere de novo, lendo do banco. Qualquer diferença volta ao snapshot sozinha.
  const relido = await lerTudo(db, dek, o.targetVersion).catch(() => null);
  const depois = relido ? verify(antes, relido) : 'não foi possível reler os dados migrados';
  if (depois) {
    await restoreSnapshot(db, dek, o.snapshotId, {
      backupId: `${o.snapshotId}-falha`,
      now: o.now,
      schemaVersion: vault.schemaVersion,
    });
    throw new StorageError('MIGRATION_FAILED', `Migração desfeita: ${depois}`);
  }
  return 'migrada';
}

/** Acrescenta, em cada espaço, um evento de migração encadeado com o resumo das páginas recifradas. */
async function registrarMigracao(
  paginas: readonly PlainRecord[],
  resumos: ReadonlyMap<string, Record<string, string>>,
  now: string,
  alvo: string,
): Promise<PlainRecord[]> {
  const porChave = new Map(
    paginas.map((p) => [
      JSON.stringify(p.key),
      { key: p.key, value: p.value as { workspaceId: string; month: string; events: AuditEvent[] } },
    ]),
  );
  for (const [ws, journalPages] of resumos) {
    const todos = [...porChave.values()]
      .filter((p) => p.value.workspaceId === ws)
      .flatMap((p) => p.value.events);
    const ultimo = todos.reduce<AuditEvent | null>((u, e) => (!u || e.seq > u.seq ? e : u), null);
    const evento = await chainEvent(
      { at: now, action: 'migracao', workspaceId: ws, target: alvo, after: { journalPages } },
      ultimo ? { seq: ultimo.seq, hash: ultimo.hash } : null,
    );
    const mes = monthOf(now);
    const chave = JSON.stringify([ws, mes]);
    const atual = porChave.get(chave)?.value ?? { workspaceId: ws, month: mes, events: [] };
    porChave.set(chave, { key: [ws, mes], value: { ...atual, events: [...atual.events, evento] } });
  }
  return [...porChave.values()];
}
