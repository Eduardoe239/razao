// Envelope de chaves do cofre (Volume 05, seção 3; Volume 09; D-039 A-06).
// A chave dos dados (DEK) é aleatória e fica guardada duas vezes: embrulhada pela senha e pelo código de recuperação.
// A cópia de uso é sempre não exportável. Só a criação, a troca de senha e a troca de código desembrulham uma
// cópia exportável, que não sai da função e fica a cargo do coletor de lixo (o navegador não permite zerar uma CryptoKey).
import { normalizeRecoveryCode } from '@/domain/vault-policy';
import { fromBase64Strict, toBase64 } from './bytes';
import { VaultError } from './errors';
import type { KdfParams } from './kdf';
import { assertWriteKdfParams, chooseKdf, deriveWrappingKey, validKdfParams } from './kdf';

export interface KeySlot {
  readonly kdf: KdfParams;
  readonly wrappedDek: string;
}

export interface VaultKeyHeader {
  readonly version: 1;
  readonly password: KeySlot;
  readonly recovery: KeySlot;
}

export type Credential = { readonly password: string } | { readonly recoveryCode: string };

const DEK_ALG = { name: 'AES-GCM', length: 256 } as const;
const USO: KeyUsage[] = ['encrypt', 'decrypt'];
const WRAPPED_BYTES = 40;

export interface KdfOptions {
  /** Fonte dos parâmetros de derivação. Tudo passa pelo piso de escrita antes de ser usado. */
  readonly kdf?: () => KdfParams | Promise<KdfParams>;
}

const ERRO_SEGREDO = 'Senha ou código de recuperação incorreto.';

/** O código digitado é limpo antes de usar; código malformado conta como segredo errado. */
function recoverySecret(input: string): string {
  const code = normalizeRecoveryCode(input);
  if (!code) throw new VaultError('WRONG_SECRET', ERRO_SEGREDO);
  return code;
}

/** Embrulha uma chave com a KEK derivada do segredo. Também usado pelo arquivo de backup. */
export async function wrap(dek: CryptoKey, secret: string, kdf: KdfParams): Promise<KeySlot> {
  assertWriteKdfParams(kdf);
  const kek = await deriveWrappingKey(secret, kdf);
  const embrulhada = await crypto.subtle.wrapKey('raw', dek, kek, 'AES-KW');
  return { kdf, wrappedDek: toBase64(new Uint8Array(embrulhada)) };
}

/** Desembrulha; segredo errado vira WRONG_SECRET, nunca uma chave errada (AES-KW confere a integridade). */
export async function unwrap(slot: KeySlot, secret: string, extractable: boolean): Promise<CryptoKey> {
  const embrulhada = fromBase64Strict(slot.wrappedDek);
  if (embrulhada?.length !== WRAPPED_BYTES)
    throw new VaultError('HEADER_INVALID', 'Chave embrulhada inválida.');
  const kek = await deriveWrappingKey(secret, slot.kdf);
  try {
    // O AES-KW confere a integridade: senha errada faz o desembrulho falhar, nunca devolver chave errada.
    return await crypto.subtle.unwrapKey('raw', embrulhada, kek, 'AES-KW', DEK_ALG, extractable, USO);
  } catch (erro) {
    throw new VaultError('WRONG_SECRET', ERRO_SEGREDO, { cause: erro });
  }
}

function slotAndSecret(header: VaultKeyHeader, cred: Credential): [KeySlot, string] {
  return 'password' in cred
    ? [header.password, cred.password]
    : [header.recovery, recoverySecret(cred.recoveryCode)];
}

async function newKdf(options: KdfOptions): Promise<KdfParams> {
  return options.kdf ? options.kdf() : chooseKdf();
}

/** Confere que o slot novo abre com o segredo novo antes de devolver o cabeçalho (revisão da cripto, B4). */
async function verifySlot(slot: KeySlot, secret: string): Promise<void> {
  await unwrap(slot, secret, false);
}

/** COF-001: cria as chaves de um cofre novo e devolve a cópia de uso, não exportável. */
export async function createVaultKeys(
  password: string,
  recoveryCode: string,
  options: KdfOptions = {},
): Promise<{ header: VaultKeyHeader; dek: CryptoKey }> {
  const codigo = recoverySecret(recoveryCode);
  // A chave nasce exportável só para poder ser embrulhada; ela não sai desta função.
  const temporaria = await crypto.subtle.generateKey(DEK_ALG, true, USO);
  const header: VaultKeyHeader = {
    version: 1,
    password: await wrap(temporaria, password, await newKdf(options)),
    recovery: await wrap(temporaria, codigo, await newKdf(options)),
  };
  await verifySlot(header.recovery, codigo);
  const dek = await unwrap(header.password, password, false);
  return { header, dek };
}

/** COF-002: desbloqueia com a senha ou com o código de recuperação. A chave devolvida não é exportável. */
export async function unlockVault(header: VaultKeyHeader, cred: Credential): Promise<CryptoKey> {
  assertHeader(header);
  const [slot, segredo] = slotAndSecret(header, cred);
  return unwrap(slot, segredo, false);
}

export const unlockWithPassword = (header: VaultKeyHeader, password: string) =>
  unlockVault(header, { password });
export const unlockWithRecovery = (header: VaultKeyHeader, recoveryCode: string) =>
  unlockVault(header, { recoveryCode });

/**
 * COF-003: troca a senha sem recifrar nada, com a senha atual ou com o código de recuperação.
 * Devolve só o cabeçalho novo; nenhuma chave sai daqui. O mesmo caminho sobe o custo do Argon2id no futuro.
 */
export async function changePassword(
  header: VaultKeyHeader,
  current: Credential,
  newPassword: string,
  options: KdfOptions = {},
): Promise<VaultKeyHeader> {
  assertHeader(header);
  const [slot, segredo] = slotAndSecret(header, current);
  const exportavel = await unwrap(slot, segredo, true);
  const password = await wrap(exportavel, newPassword, await newKdf(options));
  await verifySlot(password, newPassword);
  return { ...header, password };
}

/**
 * Troca o código de recuperação (revisão da cripto, B3). Deve ser oferecida depois de toda recuperação,
 * porque o código usado pode ter ficado exposto.
 */
export async function rotateRecoveryCode(
  header: VaultKeyHeader,
  current: Credential,
  newRecoveryCode: string,
  options: KdfOptions = {},
): Promise<VaultKeyHeader> {
  assertHeader(header);
  const novo = recoverySecret(newRecoveryCode);
  const [slot, segredo] = slotAndSecret(header, current);
  const exportavel = await unwrap(slot, segredo, true);
  const recovery = await wrap(exportavel, novo, await newKdf(options));
  await verifySlot(recovery, novo);
  return { ...header, recovery };
}

/** Cabeçalho lido do armazenamento: versão conhecida, parâmetros dentro dos limites e chaves com 40 bytes. */
export function assertHeader(header: unknown): asserts header is VaultKeyHeader {
  const h = header as Partial<VaultKeyHeader> | null;
  const slotOk = (s: unknown) => {
    const x = s as { kdf?: unknown; wrappedDek?: unknown } | null | undefined;
    if (!x || !validKdfParams(x.kdf) || typeof x.wrappedDek !== 'string') return false;
    return fromBase64Strict(x.wrappedDek)?.length === WRAPPED_BYTES;
  };
  if (!h || h.version !== 1 || !slotOk(h.password) || !slotOk(h.recovery)) {
    throw new VaultError('HEADER_INVALID', 'Cabeçalho do cofre inválido ou de versão desconhecida.');
  }
}
