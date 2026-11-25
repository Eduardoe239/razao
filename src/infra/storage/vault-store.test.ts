// Cabeçalho do cofre, cofre sumido, armazenamento persistente e esquemas de validação.
import { describe, expect, it } from 'vitest';
import { StorageError, fromDomException } from './errors';
import { journalPageSchema } from './schema';
import { novoBanco } from './test-helpers';
import { initVault, readVault, requestPersistence, updateVaultKeys, vaultPresence } from './vault-store';

describe('[PERS-06] cofre sumido nunca vira cofre novo por cima', () => {
  it('não grava um cofre novo onde já existe um', async () => {
    const { db } = await novoBanco();
    const original = await readVault(db);
    await expect(initVault(db, { keys: { outro: true }, schemaVersion: 1, createdAt: 'x' })).rejects.toThrow(
      StorageError,
    );
    expect(await readVault(db)).toEqual(original);
  });

  it('marca presente e cofre ausente: tela de recuperação', () => {
    expect(vaultPresence(true, true)).toBe('normal');
    expect(vaultPresence(true, false)).toBe('normal');
    expect(vaultPresence(false, false)).toBe('novo');
    expect(vaultPresence(false, true)).toBe('sumiu');
  });

  it('trocar as chaves não mexe na versão dos dados', async () => {
    const { db } = await novoBanco();
    await updateVaultKeys(db, { novo: 1 });
    expect(await readVault(db)).toMatchObject({ keys: { novo: 1 }, schemaVersion: 1 });
  });
});

describe('[PERS-01] pedir armazenamento persistente', () => {
  it('pede quando ainda não é persistente e informa o resultado', async () => {
    let pediu = false;
    const r = await requestPersistence({
      persisted: () => Promise.resolve(false),
      persist: () => {
        pediu = true;
        return Promise.resolve(true);
      },
      estimate: () => Promise.resolve({ usage: 50, quota: 1000 }),
    });
    expect(pediu).toBe(true);
    expect(r).toEqual({
      supported: true,
      persisted: true,
      usageBytes: 50,
      quotaBytes: 1000,
      lowSpace: false,
    });
  });

  it('navegador que nega, que falha ao pedir ou que não tem a função', async () => {
    const negado = await requestPersistence({
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    });
    expect(negado.persisted).toBe(false);
    const falha = await requestPersistence({
      persisted: () => Promise.resolve(false),
      persist: () => Promise.reject(new Error('x')),
    });
    expect(falha.persisted).toBe(false);
    expect((await requestPersistence(undefined)).supported).toBe(false);
  });

  it('avisa quando sobra menos de 10% de espaço', async () => {
    const r = await requestPersistence({
      persisted: () => Promise.resolve(true),
      persist: () => Promise.resolve(true),
      estimate: () => Promise.resolve({ usage: 950, quota: 1000 }),
    });
    expect(r.lowSpace).toBe(true);
  });
});

describe('[SEC-06] esquemas de validação do que volta do disco', () => {
  const linha = { accountId: 'a', side: 'D', amount: 1 };
  const entrada = {
    entryId: 'op/0',
    operationId: 'op',
    workspaceId: 'pf',
    date: '2027-03-01',
    status: 'realizado',
    kind: 'transferencia',
    currency: 'BRL',
    lines: [linha, { ...linha, side: 'C' }],
    links: {},
    meta: {},
  };

  it('aceita a página bem formada', () => {
    expect(
      journalPageSchema.safeParse({ workspaceId: 'pf', month: '2027-03', entries: [entrada] }).success,
    ).toBe(true);
  });

  it.each([
    ['data inexistente', { ...entrada, date: '2027-02-30' }],
    ['valor com centavos quebrados', { ...entrada, lines: [{ ...linha, amount: 1.5 }, linha] }],
    ['valor acima do limite', { ...entrada, lines: [{ ...linha, amount: 1e13 }, linha] }],
    ['moeda desconhecida', { ...entrada, currency: 'USD' }],
    ['tipo desconhecido', { ...entrada, kind: 'magica' }],
    ['uma linha só', { ...entrada, lines: [linha] }],
    ['texto gigante na observação', { ...entrada, meta: { obs: 'x'.repeat(3000) } }],
  ])('recusa %s', (_, e) => {
    expect(journalPageSchema.safeParse({ workspaceId: 'pf', month: '2027-03', entries: [e] }).success).toBe(
      false,
    );
  });
});

describe('[PERS-07] mensagens de erro do armazenamento', () => {
  it('falta de espaço tem mensagem própria; o resto vira falha de gravação desfeita', () => {
    expect(fromDomException(new DOMException('x', 'QuotaExceededError')).code).toBe('QUOTA_EXCEEDED');
    expect(fromDomException(new Error('x')).code).toBe('WRITE_FAILED');
    const proprio = new StorageError('CONFLICT', 'x');
    expect(fromDomException(proprio)).toBe(proprio);
  });
});
