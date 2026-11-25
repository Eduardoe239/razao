// QA-CRYPTO (Volume 09), parte 2: envelope de chaves, senha errada, troca de senha e de código.
import { describe, expect, it } from 'vitest';
import { formatRecoveryCode } from '@/domain/vault-policy';
import { fromBase64, toBase64 } from './bytes';
import { VaultError } from './errors';
import { newArgon2Params, newPbkdf2Params } from './kdf';
import type { RecordContext } from './records';
import { openJson, sealJson } from './records';
import { generateRecoveryCode } from './recovery';
import type { VaultKeyHeader } from './vault-keys';
import {
  assertHeader,
  changePassword,
  createVaultKeys,
  rotateRecoveryCode,
  unlockVault,
  unlockWithPassword,
  unlockWithRecovery,
} from './vault-keys';

const leve = { kdf: () => newArgon2Params({ memoryKiB: 256 }) };
const ctx: RecordContext = { store: 'entities', workspaceId: 'espaco-pf', key: 'x', schemaVersion: 1 };

async function codigo(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof VaultError) return e.code;
    throw e;
  }
  return 'sem erro';
}

function trocarByte(b64: string): string {
  const b = fromBase64(b64);
  b[0] = (b[0] ?? 0) ^ 1;
  return toBase64(b);
}

describe('[COF-001] cofre com senha e código de recuperação', () => {
  it('a chave de uso nunca pode ser exportada', async () => {
    const { dek } = await createVaultKeys('senha forte', generateRecoveryCode(), leve);
    expect(dek.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', dek)).rejects.toThrow();
  });

  it('abre com a senha e com o código digitado de qualquer jeito, e os dois dão a mesma chave', async () => {
    const rec = generateRecoveryCode();
    const { header, dek } = await createVaultKeys('senha forte', rec, leve);
    const selado = await sealJson(dek, ctx, { ok: true });
    const pelaSenha = await unlockWithPassword(header, 'senha forte');
    const peloCodigo = await unlockWithRecovery(header, ` ${formatRecoveryCode(rec).toLowerCase()} `);
    expect(await openJson(pelaSenha, ctx, selado)).toEqual({ ok: true });
    expect(await openJson(peloCodigo, ctx, selado)).toEqual({ ok: true });
    expect(pelaSenha.extractable || peloCodigo.extractable).toBe(false);
  });

  it('senha errada e código errado ou malformado dão o mesmo erro, sem pista', async () => {
    const { header } = await createVaultKeys('senha forte', generateRecoveryCode(), leve);
    expect(await codigo(unlockWithPassword(header, 'senha fraca'))).toBe('WRONG_SECRET');
    expect(await codigo(unlockWithRecovery(header, generateRecoveryCode()))).toBe('WRONG_SECRET');
    expect(await codigo(unlockWithRecovery(header, 'curto'))).toBe('WRONG_SECRET');
  });

  it('chave embrulhada ou sal adulterados no cabeçalho não abrem', async () => {
    const { header } = await createVaultKeys('senha forte', generateRecoveryCode(), leve);
    const chaveTrocada = {
      ...header,
      password: { ...header.password, wrappedDek: trocarByte(header.password.wrappedDek) },
    };
    expect(await codigo(unlockWithPassword(chaveTrocada, 'senha forte'))).toBe('WRONG_SECRET');
    const salTrocado = {
      ...header,
      password: {
        ...header.password,
        kdf: { ...header.password.kdf, salt: trocarByte(header.password.kdf.salt) },
      },
    };
    expect(await codigo(unlockWithPassword(salTrocado, 'senha forte'))).toBe('WRONG_SECRET');
  });

  it('cabeçalho malformado é recusado como cabeçalho inválido, não como senha errada', async () => {
    const { header } = await createVaultKeys('senha forte', generateRecoveryCode(), leve);
    const casos: unknown[] = [
      { ...header, version: 2 },
      { ...header, password: { ...header.password, wrappedDek: `${'*'.repeat(54)}==` } },
      { ...header, password: { ...header.password, wrappedDek: toBase64(new Uint8Array(32)) } },
      { ...header, password: { ...header.password, kdf: { ...header.password.kdf, salt: '***' } } },
      { ...header, recovery: null },
      null,
    ];
    for (const c of casos)
      expect(await codigo(unlockWithPassword(c as VaultKeyHeader, 'senha forte'))).toBe('HEADER_INVALID');
  });

  it('o cabeçalho não guarda segredo em claro e volta íntegro depois de virar texto', async () => {
    const { header } = await createVaultKeys('senha-que-nao-pode-aparecer', generateRecoveryCode(), leve);
    const texto = JSON.stringify(header);
    expect(texto).not.toContain('senha-que-nao-pode-aparecer');
    expect(() => {
      assertHeader(JSON.parse(texto));
    }).not.toThrow();
  });

  it('com os parâmetros reais da D-041 também funciona', async () => {
    const { header, dek } = await createVaultKeys('senha forte', generateRecoveryCode());
    expect(header.password.kdf).toMatchObject({ alg: 'argon2id', memoryKiB: 65536, iterations: 1 });
    const reaberta = await unlockWithPassword(header, 'senha forte');
    expect(await openJson(reaberta, ctx, await sealJson(dek, ctx, 1))).toBe(1);
  }, 30_000);

  it('PBKDF2 funciona como plano B', async () => {
    const { header } = await createVaultKeys('senha forte', generateRecoveryCode(), {
      kdf: () => newPbkdf2Params(1000),
    });
    expect(header.password.kdf.alg).toBe('pbkdf2-sha256');
    await expect(unlockWithPassword(header, 'senha forte')).resolves.toBeDefined();
    expect(await codigo(unlockWithPassword(header, 'outra'))).toBe('WRONG_SECRET');
  });
});

describe('[COF-003] trocar a senha sem perder dados', () => {
  it('pela senha atual: a nova abre, a antiga não, o código continua valendo e os dados seguem legíveis', async () => {
    const rec = generateRecoveryCode();
    const { header, dek } = await createVaultKeys('senha antiga', rec, leve);
    const selado = await sealJson(dek, ctx, { saldo: 42 });
    const novo = await changePassword(header, { password: 'senha antiga' }, 'senha nova', leve);
    expect(await codigo(unlockWithPassword(novo, 'senha antiga'))).toBe('WRONG_SECRET');
    expect(await openJson(await unlockWithPassword(novo, 'senha nova'), ctx, selado)).toEqual({ saldo: 42 });
    expect(await openJson(await unlockWithRecovery(novo, rec), ctx, selado)).toEqual({ saldo: 42 });
    expect(novo.password.kdf.salt).not.toBe(header.password.kdf.salt);
  });

  it('o re-embrulho devolve só o cabeçalho; nenhuma chave sai dele, e o que se abre depois não é exportável', async () => {
    const { header } = await createVaultKeys('a', generateRecoveryCode(), leve);
    const novo = await changePassword(header, { password: 'a' }, 'b', leve);
    const visitar = (v: unknown): boolean =>
      v instanceof CryptoKey || (typeof v === 'object' && v !== null && Object.values(v).some(visitar));
    expect(visitar(novo)).toBe(false);
    expect((await unlockVault(novo, { password: 'b' })).extractable).toBe(false);
  });

  it('pelo código de recuperação, quando a senha foi esquecida', async () => {
    const rec = generateRecoveryCode();
    const { header } = await createVaultKeys('esquecida', rec, leve);
    const novo = await changePassword(header, { recoveryCode: rec }, 'lembrada', leve);
    await expect(unlockWithPassword(novo, 'lembrada')).resolves.toBeDefined();
  });

  it('senha atual errada não troca nada', async () => {
    const { header } = await createVaultKeys('certa', generateRecoveryCode(), leve);
    expect(await codigo(changePassword(header, { password: 'errada' }, 'nova', leve))).toBe('WRONG_SECRET');
  });

  it('não grava com custo abaixo do piso de escrita', async () => {
    const { header } = await createVaultKeys('a', generateRecoveryCode(), leve);
    const fraco = { kdf: () => newArgon2Params({ memoryKiB: 4 }) };
    expect(await codigo(changePassword(header, { password: 'a' }, 'b', fraco))).toBe('HEADER_INVALID');
  });
});

describe('[COF-001] trocar o código de recuperação depois de usar', () => {
  it('o código novo abre, o antigo não, e a senha continua valendo', async () => {
    const antigo = generateRecoveryCode();
    const { header } = await createVaultKeys('senha', antigo, leve);
    const novoCodigo = generateRecoveryCode();
    const novo = await rotateRecoveryCode(header, { recoveryCode: antigo }, novoCodigo, leve);
    expect(await codigo(unlockWithRecovery(novo, antigo))).toBe('WRONG_SECRET');
    await expect(unlockWithRecovery(novo, novoCodigo)).resolves.toBeDefined();
    await expect(unlockWithPassword(novo, 'senha')).resolves.toBeDefined();
  });

  it('código novo malformado é recusado antes de mexer em qualquer coisa', async () => {
    const { header } = await createVaultKeys('senha', generateRecoveryCode(), leve);
    expect(await codigo(rotateRecoveryCode(header, { password: 'senha' }, 'curto', leve))).toBe(
      'WRONG_SECRET',
    );
  });
});
