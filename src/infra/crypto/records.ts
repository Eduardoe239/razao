// Cifra de cada registro guardado: AES-256-GCM com vetor de 12 bytes aleatório e dados associados (AAD).
// O AAD amarra o registro ao lugar dele: mover um registro para outra chave, outro espaço ou outra versão
// do esquema faz a leitura falhar (Volume 05, seção 3).
import { fromBase64, fromUtf8, randomBytes, toBase64, utf8 } from './bytes';
import { VaultError } from './errors';

export interface SealedRecord {
  readonly iv: string;
  readonly ct: string;
}

export interface RecordContext {
  readonly store: string;
  readonly workspaceId: string;
  readonly key: string;
  readonly schemaVersion: number;
}

/**
 * Contexto do registro sem ambiguidade: uma lista em JSON com rótulo de versão, para que nenhum campo
 * com "|" ou outro separador possa se passar por outro contexto (revisão da cripto, M1).
 */
export function recordAad(ctx: RecordContext): string {
  return JSON.stringify(['razao-rec-v1', ctx.store, ctx.workspaceId, ctx.key, ctx.schemaVersion]);
}

export async function sealBytes(
  dek: CryptoKey,
  ctx: RecordContext,
  plain: Uint8Array<ArrayBuffer>,
): Promise<SealedRecord> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8(recordAad(ctx)) },
    dek,
    plain,
  );
  return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

export async function openBytes(
  dek: CryptoKey,
  ctx: RecordContext,
  sealed: SealedRecord,
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(sealed.iv), additionalData: utf8(recordAad(ctx)) },
      dek,
      fromBase64(sealed.ct),
    );
    return new Uint8Array(plain);
  } catch (erro) {
    // Nunca devolve vazio no lugar de erro: o registro vai para a quarentena (Volume 05).
    throw new VaultError('RECORD_TAMPERED', 'Registro corrompido, adulterado ou fora do lugar.', {
      cause: erro,
    });
  }
}

export async function sealJson(dek: CryptoKey, ctx: RecordContext, value: unknown): Promise<SealedRecord> {
  return sealBytes(dek, ctx, utf8(JSON.stringify(value)));
}

export async function openJson(dek: CryptoKey, ctx: RecordContext, sealed: SealedRecord): Promise<unknown> {
  const bytes = await openBytes(dek, ctx, sealed);
  try {
    return JSON.parse(fromUtf8(bytes)) as unknown;
  } catch (erro) {
    throw new VaultError('RECORD_TAMPERED', 'Registro com conteúdo ilegível.', { cause: erro });
  }
}
