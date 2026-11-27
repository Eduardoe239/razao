// D-046 e D-054: "restaurar como espaço novo" e a importação da beta.20 gravam espaços novos ao lado dos atuais.
// Os identificadores são todos trocados, a trilha de auditoria começa do zero registrando a origem, e depois
// de gravar o app reconta tudo; se algo não bater, desfaz sozinho e os espaços atuais ficam como estavam.
import type { BackupDeps, BackupPreview } from './backup';
import { summarize } from './backup';
import { AppError } from './errors';
import { ENTITY, workspaceSchema } from './model';
import type { BackupWorkspace, IdSource, SessionPort } from './ports';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const CAMPO_ID = /^(id|.+Id|reverses|replaces|deletes|operationId|entryIds?)$/;

/** Todos os identificadores do espaço: os campos de id e os dos lançamentos e operações. */
function coletar(valor: unknown, chave: string, achados: Set<string>): void {
  if (typeof valor === 'string') {
    if (CAMPO_ID.test(chave)) for (const m of valor.matchAll(UUID)) achados.add(m[0].toLowerCase());
    return;
  }
  if (Array.isArray(valor)) {
    for (const v of valor) coletar(v, chave, achados);
    return;
  }
  if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) coletar(v, k, achados);
  }
}

function trocar(valor: unknown, mapa: ReadonlyMap<string, string>): unknown {
  if (typeof valor === 'string') return valor.replace(UUID, (m) => mapa.get(m.toLowerCase()) ?? m);
  if (Array.isArray(valor)) return valor.map((v) => trocar(v, mapa));
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, trocar(v, mapa)]));
  }
  return valor;
}

/** dd/mm de uma data aaaa-mm-dd. */
const diaMes = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

/**
 * O mesmo espaço com identificadores novos em tudo, nome "(restaurado em dd/mm)" e sem a trilha antiga.
 * Os comprovantes vão junto, com os ids novos.
 */
export function asNewWorkspace(
  w: BackupWorkspace,
  ids: IdSource,
  o: { today: string; backupId: string; backupCreatedAt: string },
): BackupWorkspace {
  const achados = new Set<string>([w.workspaceId.toLowerCase()]);
  coletar({ entities: w.entities, journal: w.journal, operations: w.operations }, '', achados);
  for (const a of w.attachments ?? []) coletar(a.id, 'id', achados);
  const mapa = new Map([...achados].map((id) => [id, ids.newId()]));
  const novoId = mapa.get(w.workspaceId.toLowerCase()) ?? ids.newId();
  const entities = (trocar(w.entities, mapa) as BackupWorkspace['entities']).map((e) => {
    if (e.type !== ENTITY.workspace) return e;
    const ws = workspaceSchema.parse(e.data);
    const base =
      ws.kind === 'PF' && !ws.origin ? 'Pessoal' : ws.name.replace(/ \(restaurado em [^)]*\)$/, '');
    const name = `${base.slice(0, 55)} (restaurado em ${diaMes(o.today)})`;
    return { ...e, data: { ...ws, name, origin: { kind: 'backup' as const, at: o.backupCreatedAt } } };
  });
  return {
    workspaceId: novoId,
    entities,
    journal: trocar(w.journal, mapa) as BackupWorkspace['journal'],
    audit: [],
    operations: trocar(w.operations, mapa) as BackupWorkspace['operations'],
    ...(w.attachments?.length
      ? {
          attachments: w.attachments.map((a) => ({ id: mapa.get(a.id.toLowerCase()) ?? a.id, data: a.data })),
        }
      : {}),
    origin: {
      action: 'backup.restaurar-como-novo',
      after: { backupId: o.backupId, backupCreatedAt: o.backupCreatedAt, fromWorkspace: w.workspaceId },
    },
  };
}

/**
 * Grava os espaços novos (o estado atual vira ponto de volta antes) e reconta: contagens e saldos precisam
 * bater com o que foi montado. Se não baterem, desfaz e avisa.
 */
export async function importNewSpaces(
  d: Pick<BackupDeps, 'ids'>,
  port: SessionPort,
  content: readonly BackupWorkspace[],
): Promise<void> {
  if (content.length === 0)
    throw new AppError('INVALID', 'Não há nenhum espaço para criar. Nada foi gravado.');
  const existentes = new Set(await port.workspaceIds());
  if (content.some((w) => existentes.has(w.workspaceId))) {
    throw new AppError('CONFLICT', 'Um dos espaços já existe neste cofre. Nada foi gravado.');
  }
  const esperado = content.map(summarize);
  const snapshotId = d.ids.newId();
  await port.importWorkspaces(content, 'espacos', snapshotId);
  let problema: string | null = null;
  for (const e of esperado) {
    const snap = await port.load(e.workspaceId);
    const agora = summarize({
      workspaceId: snap.workspaceId,
      entities: snap.items,
      journal: [{ month: '', entries: snap.entries }],
      audit: [],
      operations: [],
    });
    if (agora.counts.entities !== e.counts.entities || agora.counts.entries !== e.counts.entries) {
      problema = 'as contagens não bateram';
    } else if (JSON.stringify(agora.balances) !== JSON.stringify(e.balances)) {
      problema = 'os saldos não bateram';
    }
  }
  if (!problema && port.safeMode) problema = 'a trilha de auditoria não conferiu';
  if (problema) {
    await port.undoRestore(snapshotId, d.ids.newId());
    throw new AppError('STORAGE', `Nada foi criado porque ${problema}. Seus dados estão como antes.`);
  }
}

/** D-046: cada espaço do backup vira um espaço novo, ao lado dos atuais. Devolve os ids novos. */
export async function restoreAsNew(
  d: Pick<BackupDeps, 'ids' | 'clock'>,
  port: SessionPort,
  preview: BackupPreview,
): Promise<string[]> {
  if (preview.header.schemaVersion > port.schemaVersion) {
    throw new AppError(
      'INVALID',
      'Este backup é de uma versão mais nova do Razão. Atualize o app antes de restaurar.',
    );
  }
  const today = d.clock.today(d.clock.deviceTimeZone());
  const novos = preview.content.map((w) =>
    asNewWorkspace(w, d.ids, {
      today,
      backupId: preview.manifest.backupId,
      backupCreatedAt: preview.manifest.createdAt,
    }),
  );
  await importNewSpaces(d, port, novos);
  return novos.map((w) => w.workspaceId);
}
