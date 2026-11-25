// Derivação da chave a partir da senha ou do código de recuperação (Volume 05, seção 3; D-041).
// Argon2id em WebAssembly (hash-wasm) e, se ele não carregar, PBKDF2-SHA256 do próprio navegador.
import { argon2id } from 'hash-wasm';
import { fromBase64, randomBytes, toBase64, utf8, wipe } from './bytes';
import { VaultError } from './errors';

export type KdfParams =
  | { alg: 'argon2id'; memoryKiB: number; iterations: number; parallelism: number; salt: string }
  | { alg: 'pbkdf2-sha256'; iterations: number; salt: string };

/** D-041: 64 MiB, 1 iteração, 1 linha de execução. */
export const ARGON2_DEFAULT = { memoryKiB: 65536, iterations: 1, parallelism: 1 } as const;
export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

export interface Argon2Cost {
  memoryKiB: number;
  iterations: number;
  parallelism: number;
}

export function newArgon2Params(overrides: Partial<Argon2Cost> = {}): KdfParams {
  return { alg: 'argon2id', ...ARGON2_DEFAULT, ...overrides, salt: toBase64(randomBytes(SALT_BYTES)) };
}

export function newPbkdf2Params(iterations = PBKDF2_ITERATIONS): KdfParams {
  return { alg: 'pbkdf2-sha256', iterations, salt: toBase64(randomBytes(SALT_BYTES)) };
}

/** A mesma senha digitada com acento composto ou decomposto vira os mesmos bytes. */
export function secretBytes(secret: string): Uint8Array<ArrayBuffer> {
  return utf8(secret.normalize('NFC'));
}

/** Argon2id puro, em bytes. Exposto para os testes conferirem os vetores de referência. */
export async function argon2idRaw(
  password: Uint8Array,
  salt: Uint8Array,
  p: Argon2Cost,
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const out = await argon2id({
      password,
      salt,
      memorySize: p.memoryKiB,
      iterations: p.iterations,
      parallelism: p.parallelism,
      hashLength: KEY_BYTES,
      outputType: 'binary',
    });
    return new Uint8Array(out);
  } catch (erro) {
    throw new VaultError('KDF_UNAVAILABLE', 'Não foi possível derivar a chave com Argon2id.', {
      cause: erro,
    });
  }
}

/** Deriva a chave que embrulha a chave dos dados. Ela só serve para embrulhar e nunca sai do navegador. */
export async function deriveWrappingKey(secret: string, params: KdfParams): Promise<CryptoKey> {
  const senha = secretBytes(secret);
  const salt = fromBase64(params.salt);
  try {
    if (params.alg === 'argon2id') {
      const bruta = await argon2idRaw(senha, salt, params);
      try {
        return await crypto.subtle.importKey('raw', bruta, 'AES-KW', false, ['wrapKey', 'unwrapKey']);
      } finally {
        wipe(bruta);
      }
    }
    const base = await crypto.subtle.importKey('raw', senha, 'PBKDF2', false, ['deriveKey']);
    return await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: params.iterations },
      base,
      { name: 'AES-KW', length: 256 },
      false,
      ['wrapKey', 'unwrapKey'],
    );
  } finally {
    wipe(senha);
  }
}

/** Confere se os parâmetros lidos de um cofre são aceitáveis antes de usar. */
export function validKdfParams(p: unknown): p is KdfParams {
  if (typeof p !== 'object' || p === null) return false;
  const k = p as Record<string, unknown>;
  const salt = typeof k['salt'] === 'string' && k['salt'].length >= 20;
  const inteiro = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  if (k['alg'] === 'argon2id') {
    return (
      salt &&
      inteiro(k['memoryKiB'], 8, 4_194_304) &&
      inteiro(k['iterations'], 1, 100) &&
      inteiro(k['parallelism'], 1, 16)
    );
  }
  if (k['alg'] === 'pbkdf2-sha256') return salt && inteiro(k['iterations'], 100_000, 10_000_000);
  return false;
}
