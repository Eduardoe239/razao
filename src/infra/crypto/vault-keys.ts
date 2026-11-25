// Envelope de chaves do cofre (Volume 05, seção 3; Volume 09; D-039 A-06).
// A chave dos dados (DEK) é aleatória e fica guardada duas vezes: embrulhada pela senha e pelo código de recuperação.
// A cópia de uso é sempre não exportável. Só a troca de senha desembrulha uma cópia exportável, que é descartada em seguida.
import { normalizeRecoveryCode } from '@/domain/vault-policy';
import { fromBase64, toBase64 } from './bytes';
import { VaultError } from './errors';
import type { KdfParams } from './kdf';
import { deriveWrappingKey, newArgon2Params, validKdfParams } from './kdf';

export interface VaultKeyHeader {
  readonly version: 1;
  readonly password: { readonly kdf: KdfParams; readonly wrappedDek: string };
  readonly recovery: { readonly kdf: KdfParams; readonly wrappedDek: string };
}

const DEK_ALG = { name: 'AES-GCM', length: 256 } as const;
const USO: KeyUsage[] = ['encrypt', 'decrypt'];

export interface CreateOptions {
  /** Só para testes: troca os parâmetros do Argon2id por outros mais leves. */
  readonly kdf?: () => KdfParams;
}

async function wrap(dek: CryptoKey, secret: string, kdf: KdfParams) {
  const kek = await deriveWrappingKey(secret, kdf);
  const embrulhada = await crypto.subtle.wrapKey('raw', dek, kek, 'AES-KW');
  return { kdf, wrappedDek: toBase64(new Uint8Array(embrulhada)) };
}

/** O código digitado é limpo antes de usar; código malformado conta como segredo errado. */
function recoverySecret(input: string): string {
  const code = normalizeRecoveryCode(input);
  if (!code) throw new VaultError('WRONG_SECRET', 'Senha ou código de recuperação incorreto.');
  return code;
}

async function unwrap(
  slot: VaultKeyHeader['password'],
  secret: string,
  extractable: boolean,
): Promise<CryptoKey> {
  const kek = await deriveWrappingKey(secret, slot.kdf);
  try {
    // O AES-KW confere a integridade: senha errada faz o desembrulho falhar, nunca devolver chave errada.
    return await crypto.subtle.unwrapKey(
      'raw',
      fromBase64(slot.wrappedDek),
      kek,
      'AES-KW',
      DEK_ALG,
      extractable,
      USO,
    );
  } catch (erro) {
    throw new VaultError('WRONG_SECRET', 'Senha ou código de recuperação incorreto.', { cause: erro });
  }
}

/** COF-001: cria as chaves de um cofre novo e devolve a cópia de uso, não exportável. */
export async function createVaultKeys(
  password: string,
  recoveryCode: string,
  options: CreateOptions = {},
): Promise<{ header: VaultKeyHeader; dek: CryptoKey }> {
  const novoKdf = options.kdf ?? (() => newArgon2Params());
  // A chave nasce exportável só para poder ser embrulhada; ela não sai desta função.
  const temporaria = await crypto.subtle.generateKey(DEK_ALG, true, USO);
  const header: VaultKeyHeader = {
    version: 1,
    password: await wrap(temporaria, password, novoKdf()),
    recovery: await wrap(temporaria, recoverySecret(recoveryCode), novoKdf()),
  };
  const dek = await unwrap(header.password, password, false);
  return { header, dek };
}

/** COF-002: desbloqueia com a senha. */
export async function unlockWithPassword(header: VaultKeyHeader, password: string): Promise<CryptoKey> {
  assertHeader(header);
  return unwrap(header.password, password, false);
}

/** Desbloqueia com o código de recuperação, do jeito que a pessoa digitou. */
export async function unlockWithRecovery(header: VaultKeyHeader, recoveryCode: string): Promise<CryptoKey> {
  assertHeader(header);
  return unwrap(header.recovery, recoverySecret(recoveryCode), false);
}

/**
 * COF-003: troca a senha sem recifrar nada. Aceita a senha atual ou o código de recuperação.
 * A DEK é desembrulhada como exportável só aqui, embrulhada com a nova senha e descartada.
 * O mesmo caminho serve para subir o custo do Argon2id no futuro.
 */
export async function changePassword(
  header: VaultKeyHeader,
  current: { password: string } | { recoveryCode: string },
  newPassword: string,
  options: CreateOptions = {},
): Promise<VaultKeyHeader> {
  assertHeader(header);
  const slot = 'password' in current ? header.password : header.recovery;
  const segredo = 'password' in current ? current.password : recoverySecret(current.recoveryCode);
  const exportavel = await unwrap(slot, segredo, true);
  const novoKdf = options.kdf ?? (() => newArgon2Params());
  return { ...header, password: await wrap(exportavel, newPassword, novoKdf()) };
}

export function assertHeader(header: unknown): asserts header is VaultKeyHeader {
  const h = header as Partial<VaultKeyHeader> | null;
  const slotOk = (s: unknown) => {
    const x = s as { kdf?: unknown; wrappedDek?: unknown } | null | undefined;
    return !!x && validKdfParams(x.kdf) && typeof x.wrappedDek === 'string' && x.wrappedDek.length === 56;
  };
  if (!h || h.version !== 1 || !slotOk(h.password) || !slotOk(h.recovery)) {
    throw new VaultError('HEADER_INVALID', 'Cabeçalho do cofre inválido ou de versão desconhecida.');
  }
}
