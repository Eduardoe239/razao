// Integração da aplicação com o cofre real (IndexedDB simulado): do cofre novo ao saldo, com dados sintéticos.
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { AppError } from '@/application/errors';
import { newArgon2Params } from './crypto/kdf';
import { VAULT_MARKER_KEY } from './storage/vault-store';
import { montar, proximo } from './test-helpers';
import { createVaultPort } from './vault-adapter';

async function cofreComContas() {
  const m = montar();
  expect(await m.app.presence()).toBe('novo');
  const pendente = await m.app.prepareVault('uma frase bem longa', 'uma frase bem longa');
  const s = await pendente.confirm();
  const pf = await s.createWorkspace({ kind: 'PF', name: 'Pessoal' });
  const pj = await s.createWorkspace({ kind: 'PJ', name: 'Norte Software ME' });
  await s.createAccount(pf.id, {
    name: 'Banco Azul',
    kind: 'corrente',
    openingCents: 927035,
    operationId: s.newOperationId(),
  });
  await s.createAccount(pj.id, {
    name: 'Conta PJ',
    kind: 'digital',
    openingCents: 150000,
    operationId: s.newOperationId(),
  });
  return { ...m, s, pf, pj, codigo: pendente.recoveryCode };
}

describe('cofre e espaços pela aplicação', () => {
  it('[COF-001] cria o cofre só depois da confirmação e reabre com a senha', async () => {
    const m = montar();
    const pendente = await m.app.prepareVault('uma frase bem longa', 'uma frase bem longa');
    // Antes de confirmar, nada foi gravado: o navegador continua sem cofre.
    expect(await m.app.presence()).toBe('novo');
    expect(pendente.recoveryCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{24}$/);
    const s = await pendente.confirm();
    expect(m.local.get(VAULT_MARKER_KEY)).toBe('1');
    s.lock();
    expect(await m.app.presence()).toBe('normal');
    const s2 = await m.app.unlock({ password: 'uma frase bem longa' });
    expect(await s2.workspaces()).toEqual([]);
  });

  it('[COF-001] recusa senha curta e senhas diferentes antes de criar qualquer coisa', async () => {
    const m = montar();
    await expect(m.app.prepareVault('curta', 'curta')).rejects.toThrow('pelo menos 8');
    await expect(m.app.prepareVault('uma frase bem longa', 'outra frase longa')).rejects.toThrow(
      'não são iguais',
    );
    expect(await m.app.presence()).toBe('novo');
  });

  it('[COF-004] cria PF e PJ com moeda, fuso e início do mês; pessoal vem primeiro', async () => {
    const { s } = await cofreComContas();
    const lista = await s.workspaces();
    expect(lista.map((w) => [w.kind, w.name, w.currency, w.timeZone, w.monthStartDay])).toEqual([
      ['PF', 'Pessoal', 'BRL', 'America/Fortaleza', 1],
      ['PJ', 'Norte Software ME', 'BRL', 'America/Fortaleza', 1],
    ]);
  });

  it('[CON-001] o saldo de hoje vira lançamento de abertura e [CON-003] o saldo sai dos lançamentos', async () => {
    const { s, pf } = await cofreComContas();
    const v = await s.view(pf.id);
    expect(v.accounts.map((a) => [a.account.name, a.balance])).toEqual([['Banco Azul', 927035]]);
    expect(v.total).toBe(927035);
  });

  it('[COF-005] cada espaço só mostra o que é dele', async () => {
    const { s, pf, pj } = await cofreComContas();
    const vpf = await s.view(pf.id);
    const vpj = await s.view(pj.id);
    expect(vpf.accounts.map((a) => a.account.name)).toEqual(['Banco Azul']);
    expect(vpj.accounts.map((a) => a.account.name)).toEqual(['Conta PJ']);
    expect(vpj.total).toBe(150000);
  });

  it('[CON-001] conta com nome repetido no mesmo espaço é recusada; no outro espaço pode', async () => {
    const { s, pf, pj } = await cofreComContas();
    await expect(
      s.createAccount(pf.id, {
        name: 'banco azul',
        kind: 'digital',
        openingCents: 0,
        operationId: s.newOperationId(),
      }),
    ).rejects.toThrow('Já existe uma conta');
    await s.createAccount(pj.id, {
      name: 'Banco Azul',
      kind: 'corrente',
      openingCents: 0,
      operationId: s.newOperationId(),
    });
    expect((await s.view(pj.id)).accounts).toHaveLength(2);
  });

  it('[COF-002] os dados sobrevivem ao bloqueio e voltam com a senha', async () => {
    const m = await cofreComContas();
    m.s.lock();
    await expect(m.s.view(m.pf.id)).rejects.toThrow('bloqueado');
    const s2 = await m.app.unlock({ password: 'uma frase bem longa' });
    expect((await s2.view(m.pf.id)).total).toBe(927035);
    expect((await s2.view(m.pj.id)).total).toBe(150000);
  });

  it('[COF-001] o código de recuperação também abre o cofre, com ou sem hífens e em minúsculas', async () => {
    const m = await cofreComContas();
    m.s.lock();
    const digitado = (m.codigo.match(/.{6}/g) ?? []).join('-').toLowerCase();
    const s2 = await m.app.unlock({ recoveryCode: digitado });
    expect((await s2.view(m.pf.id)).total).toBe(927035);
  });

  it('[SEC-11] erro não diz se foi senha ou código, e da 5ª falha em diante há espera', async () => {
    const m = await cofreComContas();
    m.s.lock();
    for (let i = 1; i <= 4; i++) {
      await expect(m.app.unlock({ password: 'senha errada aqui' })).rejects.toThrow(
        'Senha ou código de recuperação incorreto.',
      );
      expect(m.app.waitSeconds()).toBe(0);
    }
    await expect(m.app.unlock({ recoveryCode: 'X'.repeat(24) })).rejects.toThrow(
      'Senha ou código de recuperação incorreto.',
    );
    expect(m.app.waitSeconds()).toBe(30);
    // Durante a espera nem a senha certa é tentada.
    const r = m.app.unlock({ password: 'uma frase bem longa' });
    await expect(r).rejects.toBeInstanceOf(AppError);
    await expect(r).rejects.toThrow('Tente de novo em 30 segundos');
    m.avancar(31);
    const s2 = await m.app.unlock({ password: 'uma frase bem longa' });
    expect(m.app.waitSeconds()).toBe(0);
    expect(m.vault.attempts().failed).toBe(0);
    s2.lock();
  });

  it('[SEC-11] a contagem de falhas sobrevive a recarregar o app', async () => {
    const m = await cofreComContas();
    m.s.lock();
    for (let i = 0; i < 5; i++) await m.app.unlock({ password: 'errada errada' }).catch(() => undefined);
    const outra = montar(m.local, m.dbName);
    expect(outra.vault.attempts().failed).toBe(5);
    expect(outra.app.waitSeconds()).toBeGreaterThan(0);
  });

  it('[PERS-01] o pedido de armazenamento persistente não trava a criação nem o desbloqueio', async () => {
    let pedidos = 0;
    // Como no Firefox: o navegador pergunta ao usuário e a resposta nunca chega durante o teste.
    const storage = {
      persisted: () => Promise.resolve(false),
      persist: () => {
        pedidos++;
        return new Promise<boolean>(() => undefined);
      },
    } as unknown as StorageManager;
    const local = new Map<string, string>();
    const kv = {
      getItem: (k: string) => local.get(k) ?? null,
      setItem: (k: string, v: string) => local.set(k, v),
      removeItem: (k: string) => local.delete(k),
    };
    const vault = createVaultPort({
      dbName: `razao-persist-${String(proximo())}`,
      local: kv,
      storage,
      nowIso: () => '2027-03-10T12:00:00.000Z',
      nowMs: () => Date.UTC(2027, 2, 10, 12),
      kdf: { kdf: () => newArgon2Params({ memoryKiB: 256 }) },
    });
    const sessao = await (await vault.prepare('uma frase bem longa')).save();
    sessao.close();
    (await vault.unlock({ password: 'uma frase bem longa' })).close();
    await new Promise((r) => setTimeout(r, 0));
    expect(pedidos).toBe(2);
  });

  it('[PERS-06] marca de cofre sem banco abre como "sumiu", nunca como cofre novo', async () => {
    const local = new Map([[VAULT_MARKER_KEY, '1']]);
    const m = montar(local);
    expect(await m.app.presence()).toBe('sumiu');
  });

  it('[CON-001] a mesma operação de conta gravada duas vezes não duplica (INV-06)', async () => {
    const { s, pj, vault } = await cofreComContas();
    const op = s.newOperationId();
    await s.createAccount(pj.id, { name: 'Caixa', kind: 'dinheiro', openingCents: 5000, operationId: op });
    await expect(
      s.createAccount(pj.id, { name: 'Caixa 2', kind: 'dinheiro', openingCents: 5000, operationId: op }),
    ).resolves.toBe('repetida');
    const v = await s.view(pj.id);
    // A segunda chamada com a mesma operação não gravou nada.
    expect(v.accounts.map((a) => a.account.name)).toEqual(['Conta PJ', 'Caixa']);
    expect(v.total).toBe(155000);
    await vault.close();
  });
});
