// Backup e restauração (BKP-001 a BKP-003, PERS-04, PERS-05; Volume 05, seção 7).
// O resumo (manifesto) é calculado do conteúdo; na geração, o arquivo é relido e conferido antes de entregar;
// na restauração, os dados gravados são recontados e, se não baterem, a restauração é desfeita sozinha.
import { z } from 'zod';
import { parseCivilDate } from '@/domain/civil-date';
import type { JournalEntry, LedgerAccount } from '@/domain/ledger';
import { balancesAt } from '@/domain/ledger';
import { AppError } from './errors';
import { ENTITY, workspaceSchema } from './model';
import type {
  BackupFilePort,
  BackupHeader,
  BackupScope,
  BackupWorkspace,
  Clock,
  IdSource,
  SessionPort,
  StoredItem,
} from './ports';
import { checkPassword } from './vault-rules';

export const APP_VERSION = '0.1.0-alpha';
const FIM_DOS_TEMPOS = parseCivilDate('2999-12-31');

const resumoSchema = z.object({
  workspaceId: z.string(),
  kind: z.enum(['PF', 'PJ']).nullable(),
  name: z.string().nullable(),
  counts: z.object({
    entities: z.number().int(),
    entries: z.number().int(),
    auditEvents: z.number().int(),
    operations: z.number().int(),
    attachments: z.number().int().optional(),
  }),
  balances: z.record(z.string(), z.number().int()),
  auditHead: z.string().nullable(),
});
export type WorkspaceSummary = z.infer<typeof resumoSchema>;

export const manifestSchema = z.object({
  backupId: z.string(),
  createdAt: z.string(),
  workspaces: z.array(resumoSchema),
});
export type BackupManifest = z.infer<typeof manifestSchema>;

const contaSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  group: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
});

/** Saldo de cada conta do livro-razão com todos os lançamentos realizados, qualquer que seja a data. */
function saldos(
  workspaceId: string,
  items: readonly StoredItem[],
  entries: readonly JournalEntry[],
): Record<string, number> {
  const contas = new Map<string, LedgerAccount>();
  for (const i of items) {
    if (i.type !== ENTITY.ledgerAccount) continue;
    const r = contaSchema.safeParse(i.data);
    if (r.success) contas.set(r.data.id, r.data);
  }
  try {
    return Object.fromEntries(
      [...balancesAt(entries, contas, workspaceId, FIM_DOS_TEMPOS)].sort(([a], [b]) => a.localeCompare(b)),
    );
  } catch {
    throw new AppError(
      'INVALID',
      'O backup tem lançamentos que não fecham com as contas. Nada foi restaurado.',
    );
  }
}

function identidade(workspaceId: string, items: readonly StoredItem[]) {
  const item = items.find((i) => i.type === ENTITY.workspace && i.id === workspaceId);
  const r = item ? workspaceSchema.safeParse(item.data) : null;
  return r?.success ? { kind: r.data.kind, name: r.data.name } : { kind: null, name: null };
}

/** INV-12: o resumo de um espaço, calculado do conteúdo, para comparar antes e depois. */
export function summarize(w: BackupWorkspace): WorkspaceSummary {
  const entries = w.journal.flatMap((p) => p.entries);
  const eventos = w.audit.flatMap((p) => p.events).sort((a, b) => a.seq - b.seq);
  return {
    workspaceId: w.workspaceId,
    ...identidade(w.workspaceId, w.entities),
    counts: {
      entities: w.entities.length,
      entries: entries.length,
      auditEvents: eventos.length,
      operations: w.operations.length,
      ...(w.attachments?.length ? { attachments: w.attachments.length } : {}),
    },
    balances: saldos(w.workspaceId, w.entities, entries),
    auditHead: eventos.at(-1)?.hash ?? null,
  };
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface BackupFile {
  readonly fileName: string;
  readonly text: string;
  readonly manifest: BackupManifest;
}

export interface BackupPreview {
  readonly header: BackupHeader;
  readonly manifest: BackupManifest;
  readonly content: readonly BackupWorkspace[];
}

export interface BackupDeps {
  readonly file: BackupFilePort;
  readonly clock: Clock;
  readonly ids: IdSource;
  readonly onBackupDone: (iso: string) => void;
}

/** BKP-001 e PERS-05: gera, relê e confere. Só devolve o arquivo se tudo bater. */
export async function createBackup(
  d: BackupDeps,
  port: SessionPort,
  input: { scope: BackupScope; password: string; repeat: string; allWorkspaceIds: readonly string[] },
): Promise<BackupFile> {
  const forca = checkPassword(input.password);
  if (!forca.ok) throw new AppError('INVALID', forca.message);
  if (input.password !== input.repeat) throw new AppError('INVALID', 'As duas senhas não são iguais.');
  const ids = input.scope.kind === 'cofre' ? input.allWorkspaceIds : [input.scope.workspaceId];
  const content = await port.exportWorkspaces(ids);
  const createdAt = d.clock.nowIso();
  const manifest: BackupManifest = { backupId: d.ids.newId(), createdAt, workspaces: content.map(summarize) };
  const header: BackupHeader = {
    format: 'razao-backup',
    formatVersion: 1,
    schemaVersion: port.schemaVersion,
    createdAt,
    appVersion: APP_VERSION,
    scope: input.scope,
  };
  const text = await d.file.write({ header, manifest, content, password: input.password });

  // PERS-05: lê de volta com a mesma senha, valida e confere contagens, saldos e o fim da trilha.
  const lido = await openBackup(d.file, text, input.password);
  if (!igual(lido.manifest, manifest) || !igual(lido.content.map(summarize), manifest.workspaces)) {
    throw new AppError(
      'STORAGE',
      'O backup gerado não conferiu na releitura e foi descartado. Tente de novo.',
    );
  }
  d.onBackupDone(createdAt);
  const dia = createdAt.slice(0, 10);
  const alvo =
    input.scope.kind === 'cofre' ? 'cofre' : manifest.workspaces[0]?.kind === 'PJ' ? 'negocio' : 'pessoal';
  return { fileName: `razao-backup-${alvo}-${dia}.razao`, text, manifest };
}

/** BKP-002: decifra e valida; o resumo precisa bater com o conteúdo, senão o arquivo é recusado. */
export async function openBackup(
  file: BackupFilePort,
  text: string,
  password: string,
): Promise<BackupPreview> {
  const aberto = await file.read(text, password);
  const r = manifestSchema.safeParse(aberto.manifest);
  if (!r.success)
    throw new AppError('INVALID', 'O resumo do backup está fora do formato. Nada foi restaurado.');
  if (!igual(aberto.content.map(summarize), r.data.workspaces)) {
    throw new AppError('INVALID', 'As contagens do backup não batem com o conteúdo. Nada foi restaurado.');
  }
  if (
    aberto.header.scope.kind === 'espaco' &&
    (aberto.content.length !== 1 || aberto.content[0]?.workspaceId !== aberto.header.scope.workspaceId)
  ) {
    throw new AppError(
      'INVALID',
      'O backup diz ser de um espaço, mas traz outro conteúdo. Nada foi restaurado.',
    );
  }
  return { header: aberto.header, manifest: r.data, content: aberto.content };
}

/**
 * BKP-003: grava o backup (o estado atual vira snapshot antes) e reconta tudo.
 * Se contagens ou saldos não baterem com a prévia, desfaz sozinho e avisa.
 */
export async function restoreBackup(d: BackupDeps, port: SessionPort, preview: BackupPreview): Promise<void> {
  if (preview.header.schemaVersion > port.schemaVersion) {
    throw new AppError(
      'INVALID',
      'Este backup é de uma versão mais nova do Razão. Atualize o app antes de restaurar.',
    );
  }
  const snapshotId = d.ids.newId();
  const modo = preview.header.scope.kind === 'cofre' ? 'cofre' : 'espacos';
  await port.importWorkspaces(preview.content, modo, snapshotId);
  let problema: string | null = null;
  for (const esperado of preview.manifest.workspaces) {
    const snap = await port.load(esperado.workspaceId);
    const agora = {
      entities: snap.items.length,
      entries: snap.entries.length,
      balances: saldos(snap.workspaceId, snap.items, snap.entries),
    };
    if (agora.entities !== esperado.counts.entities || agora.entries !== esperado.counts.entries) {
      problema = 'as contagens não bateram';
    } else if (!igual(agora.balances, esperado.balances)) {
      problema = 'os saldos não bateram';
    }
  }
  if (!problema && port.safeMode) problema = 'a trilha de auditoria não conferiu';
  if (problema) {
    await port.undoRestore(snapshotId, d.ids.newId());
    throw new AppError(
      'STORAGE',
      `A restauração foi desfeita porque ${problema}. Seus dados estão como antes.`,
    );
  }
}

export interface PreviewLine {
  readonly workspaceId: string;
  readonly label: string;
  readonly kind: 'PF' | 'PJ' | null;
  readonly accounts: number;
  readonly entries: number;
  /** Soma dos saldos das contas do espaço no backup. */
  readonly total: number;
}

/** BKP-002: o que a prévia mostra de cada espaço: contas, lançamentos e total. */
export function describePreview(preview: BackupPreview): PreviewLine[] {
  return preview.manifest.workspaces.map((w) => {
    const conteudo = preview.content.find((c) => c.workspaceId === w.workspaceId);
    const contas = (conteudo?.entities ?? []).filter((e) => e.type === ENTITY.account);
    const total = contas.reduce((s, c) => {
      const ledger = (c.data as { ledgerAccountId?: unknown }).ledgerAccountId;
      return s + (typeof ledger === 'string' ? (w.balances[ledger] ?? 0) : 0);
    }, 0);
    return {
      workspaceId: w.workspaceId,
      label: w.kind === 'PJ' ? (w.name ?? 'Negócio') : (w.name ?? 'Pessoal'),
      kind: w.kind,
      accounts: contas.length,
      entries: w.counts.entries,
      total,
    };
  });
}
