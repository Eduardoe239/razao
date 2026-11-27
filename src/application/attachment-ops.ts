// LAN-009 e PRIV-08: comprovante anexado ao lançamento. O arquivo vai cifrado para o cofre na mesma
// operação que grava os dados dele; imagem só entra sem metadados, e o resultado é conferido antes.
import type { JournalEntry } from '@/domain/ledger';
import type { OpsContext } from './account-ops';
import { alreadyDone, writable } from './account-ops';
import { AppError } from './errors';
import type { FileKind } from './image-metadata';
import { MIME, imageMetadata, sniffKind, stripImageMetadata } from './image-metadata';
import type { AttachmentItem } from './model';
import { ENTITY, attachmentSchema } from './model';
import { attachmentsOf } from './session-read';

/** Até 5 MB por comprovante; aviso quando o total passar de 500 MB (Volume 05). */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ATTACHMENTS_WARN_BYTES = 500 * 1024 * 1024;
const MAX_NAME = 120;

export interface AttachmentInfo {
  readonly id: string;
  readonly name: string;
  readonly mime: AttachmentItem['mime'];
  readonly size: number;
  readonly createdAt: string;
}

const info = (a: AttachmentItem): AttachmentInfo => ({
  id: a.id,
  name: a.name,
  mime: a.mime,
  size: a.size,
  createdAt: a.createdAt,
});

/**
 * O primeiro lançamento da corrente de edições (links.replaces): o comprovante continua no lugar depois
 * de editar. O mapa é montado uma vez só, para a lista inteira não custar n² com 50 mil lançamentos.
 */
export function rootFinder(entries: Iterable<JournalEntry>): (entryId: string) => string {
  const anterior = new Map<string, string>();
  for (const e of entries) if (e.links.replaces !== undefined) anterior.set(e.entryId, e.links.replaces);
  const memo = new Map<string, string>();
  return (entryId) => {
    const visto = memo.get(entryId);
    if (visto !== undefined) return visto;
    let atual = entryId;
    const caminho = new Set<string>([atual]);
    // Para no primeiro, num ciclo (só em dado adulterado) ou num trecho já resolvido.
    for (;;) {
      const pronto = memo.get(atual);
      if (pronto !== undefined) {
        atual = pronto;
        break;
      }
      const prox = anterior.get(atual);
      if (prox === undefined || caminho.has(prox)) break;
      caminho.add(prox);
      atual = prox;
    }
    memo.set(entryId, atual);
    return atual;
  };
}

export const lineageRoot = (entries: Iterable<JournalEntry>, entryId: string) => rootFinder(entries)(entryId);

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

const EXT: Record<FileKind, string> = { jpeg: '.jpg', png: '.png', webp: '.webp', pdf: '.pdf' };

/** Nome guardado: sem caminho nem caractere de controle, com a extensão do tipo de verdade. */
export function cleanName(name: string, kind: FileKind): string {
  const base = (name.split(/[\\/]/).pop() ?? '')
    .replace(/[\p{Cc}\p{Cf}<>:"|?*]/gu, '')
    .replace(/\.[^.]{1,5}$/, '')
    .trim()
    .slice(0, MAX_NAME - 5);
  return `${base || 'comprovante'}${EXT[kind]}`;
}

/** Os bytes que vão para o cofre: tipo conferido, tamanho no limite e imagem sem metadados. */
export function prepareAttachment(bytes: Uint8Array): { kind: FileKind; bytes: Uint8Array } {
  const kind = sniffKind(bytes);
  if (!kind) {
    throw new AppError('INVALID', 'Aceito foto (JPG, PNG ou WebP) ou PDF. Este arquivo não é nenhum deles.');
  }
  let limpo = bytes;
  if (kind !== 'pdf') {
    try {
      limpo = stripImageMetadata(bytes, kind);
      if (imageMetadata(limpo, kind).length) throw new Error('sobrou metadado');
    } catch {
      throw new AppError(
        'INVALID',
        'Não deu para ler esta imagem. Tire a foto de novo ou use outro arquivo.',
      );
    }
  }
  if (limpo.length > MAX_ATTACHMENT_BYTES) {
    throw new AppError('INVALID', 'O comprovante passa de 5 MB. Use uma foto menor ou um PDF mais leve.');
  }
  return { kind, bytes: limpo };
}

export async function addAttachment(
  c: OpsContext,
  workspaceId: string,
  input: { attachmentId: string; entryId: string; name: string; bytes: Uint8Array; operationId: string },
): Promise<'gravada' | 'repetida'> {
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  writable(c.port);
  const { kind, bytes } = prepareAttachment(input.bytes);
  const snap = await c.port.load(workspaceId);
  if (!snap.entries.some((e) => e.entryId === input.entryId))
    throw new AppError('INVALID', 'Lançamento não encontrado neste espaço. Nada foi anexado.');
  const item = attachmentSchema.parse({
    id: input.attachmentId,
    entryId: lineageRoot(snap.entries, input.entryId),
    name: cleanName(input.name, kind),
    mime: MIME[kind],
    size: bytes.length,
    sha256: await sha256Hex(bytes),
    removed: false,
    createdAt: c.clock.nowIso(),
  });
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: [],
    items: [{ type: ENTITY.attachment, id: item.id, data: item }],
    putBlobs: [{ id: item.id, bytes }],
    audit: {
      action: 'comprovante.anexar',
      target: `entry/${item.entryId}`,
      after: { attachmentId: item.id, mime: item.mime, size: item.size },
    },
  });
}

/** Comprovantes do lançamento (de qualquer versão dele), do mais antigo para o mais novo. */
export async function listAttachments(
  c: OpsContext,
  workspaceId: string,
  entryId: string,
): Promise<AttachmentInfo[]> {
  const snap = await c.port.load(workspaceId);
  const raiz = lineageRoot(snap.entries, entryId);
  return attachmentsOf(snap)
    .filter((a) => a.entryId === raiz)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(info);
}

/** O arquivo decifrado, conferido contra a impressão digital guardada (BKP-007). */
export async function readAttachment(
  c: OpsContext,
  workspaceId: string,
  attachmentId: string,
): Promise<{ info: AttachmentInfo; bytes: Uint8Array }> {
  const snap = await c.port.load(workspaceId);
  const a = attachmentsOf(snap).find((x) => x.id === attachmentId);
  if (!a) throw new AppError('INVALID', 'Comprovante não encontrado.');
  const bytes = await c.port.readBlob(workspaceId, a.id);
  if ((await sha256Hex(bytes)) !== a.sha256) {
    throw new AppError(
      'STORAGE',
      'O arquivo do comprovante não confere com o que foi guardado. Ele não foi aberto. Rode a verificação de integridade.',
    );
  }
  return { info: info(a), bytes };
}

/** Remover apaga o arquivo; os dados ficam marcados como removidos, para a trilha continuar fechando. */
export async function removeAttachment(
  c: OpsContext,
  workspaceId: string,
  input: { attachmentId: string; operationId: string },
): Promise<'gravada' | 'repetida'> {
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  writable(c.port);
  const snap = await c.port.load(workspaceId);
  const a = attachmentsOf(snap).find((x) => x.id === input.attachmentId);
  if (!a) throw new AppError('INVALID', 'Comprovante não encontrado. Nada foi removido.');
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: [],
    items: [{ type: ENTITY.attachment, id: a.id, data: { ...a, removed: true } }],
    deleteBlobs: [a.id],
    audit: { action: 'comprovante.remover', target: `entry/${a.entryId}`, after: { attachmentId: a.id } },
  });
}

/** Total guardado no espaço e se já passou do aviso de 500 MB. */
export async function attachmentUsage(
  c: OpsContext,
  workspaceId: string,
): Promise<{ count: number; bytes: number; warn: boolean }> {
  const lista = attachmentsOf(await c.port.load(workspaceId));
  const bytes = lista.reduce((s, a) => s + a.size, 0);
  return { count: lista.length, bytes, warn: bytes > ATTACHMENTS_WARN_BYTES };
}

/** Quantos comprovantes cada corrente de edições tem, para a lista mostrar o clipe. */
export function attachmentCounts(items: readonly AttachmentItem[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of items) m.set(a.entryId, (m.get(a.entryId) ?? 0) + 1);
  return m;
}
