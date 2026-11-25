// QA-CRYPTO: o que acontece quando o Argon2id em WebAssembly não funciona neste navegador.
import { describe, expect, it, vi } from 'vitest';
import { utf8 } from './bytes';
import { VaultError } from './errors';
import { argon2idRaw, chooseKdf } from './kdf';
import { generateRecoveryCode } from './recovery';
import { createVaultKeys, unlockWithPassword } from './vault-keys';

vi.mock('hash-wasm', () => ({
  argon2id: () => Promise.reject(new Error('WebAssembly indisponível')),
}));

describe('[NFR-003] plano B quando o Argon2id falha', () => {
  it('a falha vira KDF_UNAVAILABLE, nunca uma chave vazia', async () => {
    await expect(
      argon2idRaw(utf8('x'), new Uint8Array(16), { memoryKiB: 8, iterations: 1, parallelism: 1 }),
    ).rejects.toSatisfy((e: unknown) => e instanceof VaultError && e.code === 'KDF_UNAVAILABLE');
  });

  it('o cofre novo é criado com PBKDF2 de 600.000 iterações e abre normalmente', async () => {
    const escolhido = await chooseKdf();
    expect(escolhido).toMatchObject({ alg: 'pbkdf2-sha256', iterations: 600_000 });
    const { header } = await createVaultKeys('senha forte', generateRecoveryCode());
    expect(header.password.kdf.alg).toBe('pbkdf2-sha256');
    await expect(unlockWithPassword(header, 'senha forte')).resolves.toBeDefined();
  }, 60_000);
});
