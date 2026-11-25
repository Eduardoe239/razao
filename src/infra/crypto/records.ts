// Cifra de cada registro guardado: AES-256-GCM com vetor de 12 bytes aleatório e dados associados (AAD).
// O AAD amarra o registro ao lugar dele: mover um registro para outra chave ou outro espaço faz a leitura falhar.
import { fromBase64, fromUtf8, randomBytes, toBase64, utf8 } from './bytes';
import { VaultError } from './errors';

export interface SealedRecord {
  readonly iv: string;
  readonly ct: string;
}

/** Contexto do registro: tipo, espaço e chave (Volume 05, seção 3). */
export function recordAad(type: string, workspaceId: string, key: string): string {
  return `${type}|${workspaceId}|${key}`;
}

export async function sealBytes(
  dek: CryptoKey,
  aad: string,
  plain: Uint8Array<ArrayBuffer>,
): Promise<SealedRecord> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8(aad) }, dek, plain);
  return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

export async function openBytes(
  dek: CryptoKey,
  aad: string,
  sealed: SealedRecord,
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(sealed.iv), additionalData: utf8(aad) },
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

export async function sealJson(dek: CryptoKey, aad: string, value: unknown): Promise<SealedRecord> {
  return sealBytes(dek, aad, utf8(JSON.stringify(value)));
}

export async function openJson(dek: CryptoKey, aad: string, sealed: SealedRecord): Promise<unknown> {
  return JSON.parse(fromUtf8(await openBytes(dek, aad, sealed))) as unknown;
}
