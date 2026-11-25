// Derivação da chave a partir da senha ou do código de recuperação (Volume 05, seção 3; D-041).
// Argon2id em WebAssembly (hash-wasm) e, se ele não carregar, PBKDF2-SHA256 do próprio navegador.
import { argon2id } from 'hash-wasm';
import { fromBase64, fromBase64Strict, randomBytes, toBase64, utf8, wipe } from './bytes';
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

/**
 * Pisos e tetos de custo. Gravar exige o custo da D-041; ler aceita um pouco menos (mínimo da OWASP)
 * só como sanidade, e os tetos evitam que um arquivo de terceiro trave a aba.
 * Nos testes automatizados (modo "test"), o piso cai para o cofre ser criado rápido; o build de produção
 * nunca entra nesse modo, e os testes conferem os pisos de produção explicitamente.
 */
export interface KdfLimits {
  readonly argon2MinMemoryKiB: number;
  readonly argon2MaxMemoryKiB: number;
  readonly argon2MaxIterations: number;
  readonly argon2MaxParallelism: number;
  readonly pbkdf2MinIterations: number;
  readonly pbkdf2MaxIterations: number;
}

export const WRITE_LIMITS: KdfLimits = {
  argon2MinMemoryKiB: 65536,
  argon2MaxMemoryKiB: 1_048_576,
  argon2MaxIterations: 10,
  argon2MaxParallelism: 4,
  pbkdf2MinIterations: PBKDF2_ITERATIONS,
  pbkdf2MaxIterations: 5_000_000,
};

export const READ_LIMITS: KdfLimits = { ...WRITE_LIMITS, argon2MinMemoryKiB: 19456 };

const TEST_LIMITS: KdfLimits = { ...WRITE_LIMITS, argon2MinMemoryKiB: 8, pbkdf2MinIterations: 1000 };

const emTeste = import.meta.env.MODE === 'test';

export function writeLimits(): KdfLimits {
  return emTeste ? TEST_LIMITS : WRITE_LIMITS;
}

export function readLimits(): KdfLimits {
  return emTeste ? TEST_LIMITS : READ_LIMITS;
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

/**
 * Escolhe a derivação de um cofre novo: Argon2id da D-041 e, se o WebAssembly não funcionar neste
 * navegador, PBKDF2 com 600.000 iterações (Volume 05, seção 3).
 */
export async function chooseKdf(): Promise<KdfParams> {
  try {
    await argon2idRaw(utf8('teste'), new Uint8Array(SALT_BYTES), {
      memoryKiB: 8,
      iterations: 1,
      parallelism: 1,
    });
    return newArgon2Params();
  } catch {
    return newPbkdf2Params();
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

/** Confere parâmetros contra os limites: sal com pelo menos 16 bytes, custo entre o piso e o teto. */
export function validKdfParams(p: unknown, limits: KdfLimits = readLimits()): p is KdfParams {
  if (typeof p !== 'object' || p === null) return false;
  const k = p as Record<string, unknown>;
  const sal = typeof k['salt'] === 'string' ? fromBase64Strict(k['salt']) : null;
  if (!sal || sal.length < SALT_BYTES) return false;
  const inteiro = (v: unknown, min: number, max: number): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  if (k['alg'] === 'argon2id') {
    const m = k['memoryKiB'];
    const par = k['parallelism'];
    return (
      inteiro(m, limits.argon2MinMemoryKiB, limits.argon2MaxMemoryKiB) &&
      inteiro(k['iterations'], 1, limits.argon2MaxIterations) &&
      inteiro(par, 1, limits.argon2MaxParallelism) &&
      m >= 8 * par
    );
  }
  if (k['alg'] === 'pbkdf2-sha256') {
    return inteiro(k['iterations'], limits.pbkdf2MinIterations, limits.pbkdf2MaxIterations);
  }
  return false;
}

/** Nada é gravado com custo abaixo do piso de escrita (revisão da cripto, M2). */
export function assertWriteKdfParams(p: KdfParams, limits: KdfLimits = writeLimits()): void {
  if (!validKdfParams(p, limits)) {
    throw new VaultError('HEADER_INVALID', 'Parâmetros de derivação abaixo do mínimo ou fora do permitido.');
  }
}
