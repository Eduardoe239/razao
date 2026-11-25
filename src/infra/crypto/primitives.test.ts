// QA-CRYPTO (Volume 09), parte 1: vetores de referência, derivação e cifra dos registros.
import { describe, expect, it } from 'vitest';
import { forAllAsync } from '@/domain/testing/prop';
import { fromBase64, fromBase64Strict, fromUtf8, toBase64, utf8 } from './bytes';
import { VaultError } from './errors';
import {
  READ_LIMITS,
  WRITE_LIMITS,
  argon2idRaw,
  assertWriteKdfParams,
  deriveWrappingKey,
  newArgon2Params,
  newPbkdf2Params,
  secretBytes,
  validKdfParams,
} from './kdf';
import type { RecordContext } from './records';
import { openBytes, openJson, recordAad, sealBytes, sealJson } from './records';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const deHex = (h: string) => new Uint8Array(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);
const seq = (n: number, start = 0) => new Uint8Array(Array.from({ length: n }, (_, i) => start + i));
const ctx: RecordContext = { store: 'entities', workspaceId: 'espaco-pf', key: 'conta-1', schemaVersion: 1 };

async function codigo(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof VaultError) return e.code;
    throw e;
  }
  return 'sem erro';
}

async function chaveDeTeste(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

describe('[NFR-003] vetores de referência', () => {
  // Calculados com argon2-cffi (implementação de referência em C, versão 0x13).
  // O segundo é o vetor oficial do repositório de referência: "password" / "somesalt", m=64 MiB, t=2, p=1.
  const argon = [
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
      seq(16),
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

  for (const [senha, sal, memoria, iteracoes, esperado] of argon) {
    it(`Argon2id "${senha}" com ${String(memoria)} KiB e ${String(iteracoes)} iterações`, async () => {
      const r = await argon2idRaw(utf8(senha), sal, {
        memoryKiB: memoria,
        iterations: iteracoes,
        parallelism: 1,
      });
      expect(hex(r)).toBe(esperado);
    });
  }

  it('AES-KW confere com o vetor da RFC 3394, seção 4.6', async () => {
    const kek = await crypto.subtle.importKey('raw', seq(32), 'AES-KW', false, ['wrapKey']);
    const dado = deHex('00112233445566778899aabbccddeeff000102030405060708090a0b0c0d0e0f');
    const chave = await crypto.subtle.importKey('raw', dado, 'AES-GCM', true, ['encrypt']);
    const embrulhada = await crypto.subtle.wrapKey('raw', chave, kek, 'AES-KW');
    expect(hex(new Uint8Array(embrulhada))).toBe(
      '28c9f404c4b810f4cbccb35cfb87f8263f5786e2d80ed326cbc7f0e71a99f43bfb988b9b7a02dd21',
    );
  });

  it('PBKDF2-SHA256 com 600.000 iterações confere com o Python (hashlib)', async () => {
    const base = await crypto.subtle.importKey('raw', utf8('senha-sintetica'), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: utf8('sal-sintetico-16'), iterations: 600_000 },
      base,
      256,
    );
    expect(hex(new Uint8Array(bits))).toBe(
      '0466960b86d03be6f1d1271d4a1523eae089b867b750ba55918d44b339930e9c',
    );
  }, 30_000);

  it('AES-256-GCM confere com o vetor do Python (cryptography)', async () => {
    const chave = await crypto.subtle.importKey('raw', seq(32), 'AES-GCM', false, ['encrypt']);
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: seq(12, 100), additionalData: utf8('entity|espaco-pf|conta-1') },
      chave,
      utf8('{"nome":"Conta sintética","saldo":12345}'),
    );
    expect(hex(new Uint8Array(ct))).toBe(
      '3339b009148c74a41c213086ae044a8e2bac72c922189a11c6f3806a88c2c92cfbcb7af17e21af3180255019af6e95e4f1e926fdb8d472c30b',
    );
  });
});

describe('[NFR-003] derivação da chave e limites de custo', () => {
  it('acento composto e decomposto dão a mesma senha', () => {
    expect(hex(secretBytes('ção'))).toBe(hex(secretBytes('ção')));
  });

  it('padrão da D-041 e piso de gravação de produção', () => {
    expect(newArgon2Params()).toMatchObject({
      alg: 'argon2id',
      memoryKiB: 65536,
      iterations: 1,
      parallelism: 1,
    });
    expect(validKdfParams(newArgon2Params(), WRITE_LIMITS)).toBe(true);
    expect(validKdfParams(newPbkdf2Params(), WRITE_LIMITS)).toBe(true);
    expect(validKdfParams(newArgon2Params({ memoryKiB: 65535 }), WRITE_LIMITS)).toBe(false);
    expect(validKdfParams(newPbkdf2Params(599_999), WRITE_LIMITS)).toBe(false);
    expect(() => {
      assertWriteKdfParams(newArgon2Params({ memoryKiB: 8 }), WRITE_LIMITS);
    }).toThrow(VaultError);
  });

  it('leitura aceita até o mínimo da OWASP e recusa custo absurdo, que travaria a aba', () => {
    expect(validKdfParams(newArgon2Params({ memoryKiB: 19456 }), READ_LIMITS)).toBe(true);
    expect(validKdfParams(newArgon2Params({ memoryKiB: 19455 }), READ_LIMITS)).toBe(false);
    expect(validKdfParams(newArgon2Params({ memoryKiB: 4_194_304 }), READ_LIMITS)).toBe(false);
    expect(validKdfParams(newArgon2Params({ iterations: 11 }), READ_LIMITS)).toBe(false);
    expect(validKdfParams(newArgon2Params({ parallelism: 5 }), READ_LIMITS)).toBe(false);
    expect(validKdfParams(newPbkdf2Params(5_000_001), READ_LIMITS)).toBe(false);
    expect(validKdfParams(newArgon2Params({ memoryKiB: 8, parallelism: 2 }))).toBe(false); // m < 8 × p
  });

  it('recusa sal curto, sal com base64 inválido e algoritmo desconhecido', () => {
    expect(validKdfParams({ ...newArgon2Params(), salt: toBase64(seq(15)) })).toBe(false);
    expect(validKdfParams({ ...newArgon2Params(), salt: '****************************' })).toBe(false);
    expect(validKdfParams({ alg: 'md5', salt: toBase64(seq(16)) })).toBe(false);
    expect(validKdfParams(null)).toBe(false);
  });

  it('a chave de embrulho não é exportável e só embrulha', async () => {
    const kek = await deriveWrappingKey('x', newArgon2Params({ memoryKiB: 256 }));
    expect(kek.extractable).toBe(false);
    expect([...kek.usages].sort()).toEqual(['unwrapKey', 'wrapKey']);
  });
});

describe('[NFR-003] cifra dos registros com AES-256-GCM', () => {
  it('ida e volta com conteúdo aleatório, e vetor novo a cada gravação', async () => {
    const dek = await chaveDeTeste();
    const vetores = new Set<string>();
    await forAllAsync(
      'selar e abrir',
      async (rng) => {
        const dado = new Uint8Array(rng.int(0, 2000)).map(() => rng.int(0, 255));
        const selado = await sealBytes(dek, ctx, dado);
        vetores.add(selado.iv);
        expect(hex(await openBytes(dek, ctx, selado))).toBe(hex(dado));
      },
      200,
    );
    expect(vetores.size).toBe(200);
    const obj = { conta: 'Banco sintético', saldo: 123456 };
    expect(await openJson(dek, ctx, await sealJson(dek, ctx, obj))).toEqual(obj);
  });

  it('um byte alterado no conteúdo ou no vetor faz a leitura falhar, em qualquer posição', async () => {
    const dek = await chaveDeTeste();
    const selado = await sealBytes(dek, ctx, utf8('dado sintético'));
    for (const campo of ['ct', 'iv'] as const) {
      const bytes = fromBase64(selado[campo]);
      for (let i = 0; i < bytes.length; i++) {
        const alterado = bytes.slice();
        alterado[i] = (alterado[i] ?? 0) ^ 1;
        expect(await codigo(openBytes(dek, ctx, { ...selado, [campo]: toBase64(alterado) }))).toBe(
          'RECORD_TAMPERED',
        );
      }
    }
  });

  it('registro movido de chave, espaço, conjunto ou versão do esquema não abre', async () => {
    const dek = await chaveDeTeste();
    const selado = await sealJson(dek, ctx, { saldo: 1 });
    for (const outro of [
      { ...ctx, workspaceId: 'espaco-pj' },
      { ...ctx, key: 'conta-2' },
      { ...ctx, store: 'journal' },
      { ...ctx, schemaVersion: 2 },
    ]) {
      expect(await codigo(openJson(dek, outro, selado))).toBe('RECORD_TAMPERED');
    }
  });

  it('o contexto não tem ambiguidade, mesmo com "|" dentro dos campos', () => {
    const a = recordAad({ ...ctx, workspaceId: 'a|b', key: 'c' });
    const b = recordAad({ ...ctx, workspaceId: 'a', key: 'b|c' });
    expect(a).not.toBe(b);
    expect(recordAad(ctx)).toBe('["razao-rec-v1","entities","espaco-pf","conta-1",1]');
  });

  it('chave errada não abre, e conteúdo que não é JSON vira erro, nunca vazio', async () => {
    const selado = await sealJson(await chaveDeTeste(), ctx, 1);
    expect(await codigo(openJson(await chaveDeTeste(), ctx, selado))).toBe('RECORD_TAMPERED');
    const dek = await chaveDeTeste();
    expect(await codigo(openJson(dek, ctx, await sealBytes(dek, ctx, utf8('não é json'))))).toBe(
      'RECORD_TAMPERED',
    );
  });
});

describe('[NFR-003] utilitários de bytes', () => {
  it('base64 e UTF-8 de ida e volta; base64 inválido vira null', () => {
    const b = crypto.getRandomValues(new Uint8Array(100));
    expect(hex(fromBase64(toBase64(b)))).toBe(hex(b));
    expect(fromBase64Strict('a*b=')).toBeNull();
    expect(fromBase64Strict('abc')).toBeNull();
    expect(fromUtf8(utf8('ção'))).toBe('ção');
  });
});
