// QA-CRYPTO (Volume 09): vetores de referência, ida e volta, adulteração, AAD, senha errada e troca de senha.
import { describe, expect, it } from 'vitest';
import { formatRecoveryCode } from '@/domain/vault-policy';
import { fromBase64, fromUtf8, toBase64, utf8 } from './bytes';
import { VaultError } from './errors';
import {
  argon2idRaw,
  deriveWrappingKey,
  newArgon2Params,
  newPbkdf2Params,
  secretBytes,
  validKdfParams,
} from './kdf';
import { openBytes, openJson, recordAad, sealBytes, sealJson } from './records';
import { generateRecoveryCode } from './recovery';
import {
  assertHeader,
  changePassword,
  createVaultKeys,
  unlockWithPassword,
  unlockWithRecovery,
} from './vault-keys';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const deHex = (h: string) => new Uint8Array(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);
const leve = () => newArgon2Params({ memoryKiB: 256, iterations: 1 });

async function codigo(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof VaultError) return e.code;
    throw e;
  }
  return 'sem erro';
}

describe('[NFR-003] Argon2id confere com a implementação de referência em C', () => {
  // Vetores calculados com argon2-cffi (implementação de referência, versão 0x13).
  // O segundo é o vetor oficial do repositório de referência: "password" / "somesalt", m=64 MiB, t=2, p=1.
  const vetores = [
    [
      'senha-de-teste-sintetica',
      utf8('sal-sintetico-16'),
      65536,
      1,
      'cfef7d6283c506cd86ff310e6a51fd2845b4c0906aeb0a1a59c81b74905797b6',
    ],
    [
      'password',
      utf8('somesalt'),
      65536,
      2,
      '09316115d5cf24ed5a15a31a3ba326e5cf32edc24702987c02b6566f61913cf7',
    ],
    [
      'correto cavalo bateria grampo',
      deHex('000102030405060708090a0b0c0d0e0f'),
      256,
      3,
      '80e12a60200eafc826acbc498039bc6ac4a1e749585ca2aa956e3fff8eb29891',
    ],
    [
      'ção-ñ-ü',
      new Uint8Array(16),
      1024,
      2,
      '3a6bc8015f328c958dc2ebdecebe4fe5b4ec9e4aa895a5bf5fae5e18b92208f9',
    ],
  ] as const;

  for (const [senha, sal, memoria, iteracoes, esperado] of vetores) {
    it(`"${senha}" com ${String(memoria)} KiB e ${String(iteracoes)} iterações`, async () => {
      const r = await argon2idRaw(utf8(senha), sal, {
        memoryKiB: memoria,
        iterations: iteracoes,
        parallelism: 1,
      });
      expect(hex(r)).toBe(esperado);
    });
  }

  it('acento composto e decomposto dão a mesma senha', () => {
    expect(hex(secretBytes('ção'))).toBe(hex(secretBytes('ção')));
  });

  it('confere os parâmetros lidos de um cofre', () => {
    expect(validKdfParams(newArgon2Params())).toBe(true);
    expect(validKdfParams(newPbkdf2Params())).toBe(true);
    expect(validKdfParams({ ...newArgon2Params(), iterations: 0 })).toBe(false);
    expect(validKdfParams({ ...newPbkdf2Params(), iterations: 1000 })).toBe(false);
    expect(validKdfParams({ alg: 'md5' })).toBe(false);
    expect(validKdfParams(null)).toBe(false);
  });

  it('os parâmetros padrão são os da D-041', () => {
    expect(newArgon2Params()).toMatchObject({
      alg: 'argon2id',
      memoryKiB: 65536,
      iterations: 1,
      parallelism: 1,
    });
  });
});

describe('[NFR-003] AES-256-GCM com AAD', () => {
  it('confere com o vetor calculado por outra implementação (Python cryptography)', async () => {
    const chave = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(Array.from({ length: 32 }, (_, i) => i)),
      'AES-GCM',
      false,
      ['encrypt', 'decrypt'],
    );
    const iv = new Uint8Array(Array.from({ length: 12 }, (_, i) => 100 + i));
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: utf8('entity|espaco-pf|conta-1') },
      chave,
      utf8('{"nome":"Conta sintética","saldo":12345}'),
    );
    expect(hex(new Uint8Array(ct))).toBe(
      '3339b009148c74a41c213086ae044a8e2bac72c922189a11c6f3806a88c2c92cfbcb7af17e21af3180255019af6e95e4f1e926fdb8d472c30b',
    );
  });

  it('ida e volta com qualquer conteúdo, e vetor novo a cada gravação', async () => {
    const { dek } = await createVaultKeys('senha forte', generateRecoveryCode(), { kdf: leve });
    const aad = recordAad('entity', 'espaco-pf', 'conta-1');
    const vetores = new Set<string>();
    for (let n = 0; n < 50; n++) {
      const dado = crypto.getRandomValues(new Uint8Array(n * 7));
      const selado = await sealBytes(dek, aad, dado);
      vetores.add(selado.iv);
      expect(hex(await openBytes(dek, aad, selado))).toBe(hex(dado));
    }
    expect(vetores.size).toBe(50);
    const obj = { conta: 'Banco sintético', saldo: 123456 };
    expect(await openJson(dek, aad, await sealJson(dek, aad, obj))).toEqual(obj);
  });

  it('um byte alterado faz a leitura falhar, em qualquer posição', async () => {
    const { dek } = await createVaultKeys('senha forte', generateRecoveryCode(), { kdf: leve });
    const aad = recordAad('entity', 'espaco-pf', 'conta-1');
    const selado = await sealBytes(dek, aad, utf8('dado sintético'));
    const ct = fromBase64(selado.ct);
    for (let i = 0; i < ct.length; i++) {
      const alterado = ct.slice();
      alterado[i] = (alterado[i] ?? 0) ^ 1;
      expect(await codigo(openBytes(dek, aad, { ...selado, ct: toBase64(alterado) }))).toBe(
        'RECORD_TAMPERED',
      );
    }
  });

  it('registro movido para outra chave ou outro espaço não abre (AAD)', async () => {
    const { dek } = await createVaultKeys('senha forte', generateRecoveryCode(), { kdf: leve });
    const selado = await sealJson(dek, recordAad('entity', 'espaco-pf', 'conta-1'), { saldo: 1 });
    expect(await codigo(openJson(dek, recordAad('entity', 'espaco-pj', 'conta-1'), selado))).toBe(
      'RECORD_TAMPERED',
    );
    expect(await codigo(openJson(dek, recordAad('entity', 'espaco-pf', 'conta-2'), selado))).toBe(
      'RECORD_TAMPERED',
    );
    expect(await codigo(openJson(dek, recordAad('journal', 'espaco-pf', 'conta-1'), selado))).toBe(
      'RECORD_TAMPERED',
    );
  });
});

describe('[COF-001] cofre com senha e código de recuperação', () => {
  it('a chave de uso nunca pode ser exportada', async () => {
    const { dek } = await createVaultKeys('senha forte', generateRecoveryCode(), { kdf: leve });
    expect(dek.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', dek)).rejects.toThrow();
  });

  it('abre com a senha e com o código, e os dois dão a mesma chave', async () => {
    const codigoRec = generateRecoveryCode();
    const { header, dek } = await createVaultKeys('senha forte', codigoRec, { kdf: leve });
    const aad = recordAad('entity', 'espaco-pf', 'x');
    const selado = await sealJson(dek, aad, { ok: true });
    const pelaSenha = await unlockWithPassword(header, 'senha forte');
    const peloCodigo = await unlockWithRecovery(header, formatRecoveryCode(codigoRec).toLowerCase());
    expect(await openJson(pelaSenha, aad, selado)).toEqual({ ok: true });
    expect(await openJson(peloCodigo, aad, selado)).toEqual({ ok: true });
    expect(pelaSenha.extractable).toBe(false);
    expect(peloCodigo.extractable).toBe(false);
  });

  it('senha errada e código errado ou malformado dão o mesmo erro, sem pista', async () => {
    const { header } = await createVaultKeys('senha forte', generateRecoveryCode(), { kdf: leve });
    expect(await codigo(unlockWithPassword(header, 'senha fraca'))).toBe('WRONG_SECRET');
    expect(await codigo(unlockWithRecovery(header, generateRecoveryCode()))).toBe('WRONG_SECRET');
    expect(await codigo(unlockWithRecovery(header, 'curto'))).toBe('WRONG_SECRET');
  });

  it('o cabeçalho não guarda a senha nem a chave em claro', async () => {
    const { header } = await createVaultKeys('senha-que-nao-pode-aparecer', generateRecoveryCode(), {
      kdf: leve,
    });
    const texto = JSON.stringify(header);
    expect(texto).not.toContain('senha-que-nao-pode-aparecer');
    expect(() => {
      assertHeader(JSON.parse(texto));
    }).not.toThrow();
  });

  it('cabeçalho adulterado ou de versão desconhecida é recusado', async () => {
    const { header } = await createVaultKeys('senha forte', generateRecoveryCode(), { kdf: leve });
    expect(await codigo(unlockWithPassword({ ...header, version: 2 } as never, 'senha forte'))).toBe(
      'HEADER_INVALID',
    );
    const semSal = { ...header, password: { ...header.password, kdf: { ...header.password.kdf, salt: '' } } };
    expect(await codigo(unlockWithPassword(semSal, 'senha forte'))).toBe('HEADER_INVALID');
  });

  it('com os parâmetros reais da D-041 também funciona', async () => {
    const { header, dek } = await createVaultKeys('senha forte', generateRecoveryCode());
    expect(header.password.kdf).toMatchObject({ memoryKiB: 65536, iterations: 1 });
    const aad = recordAad('entity', 'espaco-pf', 'x');
    const reaberta = await unlockWithPassword(header, 'senha forte');
    expect(await openJson(reaberta, aad, await sealJson(dek, aad, 1))).toBe(1);
  }, 30_000);

  it('PBKDF2 funciona como plano B quando o Argon2id não estiver disponível', async () => {
    const { header } = await createVaultKeys('senha forte', generateRecoveryCode(), {
      kdf: () => newPbkdf2Params(100_000),
    });
    expect(header.password.kdf.alg).toBe('pbkdf2-sha256');
    await expect(unlockWithPassword(header, 'senha forte')).resolves.toBeDefined();
    expect(await codigo(unlockWithPassword(header, 'outra'))).toBe('WRONG_SECRET');
  });

  it('a chave de embrulho também não é exportável', async () => {
    const kek = await deriveWrappingKey('x', leve());
    expect(kek.extractable).toBe(false);
    expect(kek.usages.sort()).toEqual(['unwrapKey', 'wrapKey']);
  });
});

describe('[COF-003] trocar a senha sem perder dados', () => {
  it('pela senha atual: a nova abre, a antiga não, e os dados continuam legíveis', async () => {
    const rec = generateRecoveryCode();
    const { header, dek } = await createVaultKeys('senha antiga', rec, { kdf: leve });
    const aad = recordAad('entity', 'espaco-pf', 'x');
    const selado = await sealJson(dek, aad, { saldo: 42 });
    const novo = await changePassword(header, { password: 'senha antiga' }, 'senha nova', { kdf: leve });
    expect(await codigo(unlockWithPassword(novo, 'senha antiga'))).toBe('WRONG_SECRET');
    expect(await openJson(await unlockWithPassword(novo, 'senha nova'), aad, selado)).toEqual({ saldo: 42 });
    // O código de recuperação continua valendo.
    expect(await openJson(await unlockWithRecovery(novo, rec), aad, selado)).toEqual({ saldo: 42 });
    expect(novo.password.kdf.salt).not.toBe(header.password.kdf.salt);
  });

  it('pelo código de recuperação, quando a senha foi esquecida', async () => {
    const rec = generateRecoveryCode();
    const { header } = await createVaultKeys('esquecida', rec, { kdf: leve });
    const novo = await changePassword(header, { recoveryCode: rec }, 'lembrada', { kdf: leve });
    await expect(unlockWithPassword(novo, 'lembrada')).resolves.toBeDefined();
  });

  it('senha atual errada não troca nada', async () => {
    const { header } = await createVaultKeys('certa', generateRecoveryCode(), { kdf: leve });
    expect(await codigo(changePassword(header, { password: 'errada' }, 'nova', { kdf: leve }))).toBe(
      'WRONG_SECRET',
    );
  });
});

describe('[COF-001] utilitários de bytes', () => {
  it('base64 e UTF-8 de ida e volta', () => {
    const b = crypto.getRandomValues(new Uint8Array(100));
    expect(hex(fromBase64(toBase64(b)))).toBe(hex(b));
    expect(fromUtf8(utf8('ção'))).toBe('ção');
  });
});
