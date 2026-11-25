// Contas e espaços depois do primeiro acesso, pela aplicação e com o cofre real (IndexedDB simulado).
import { describe, expect, it } from 'vitest';
import type { VaultSession } from '@/application/session';
import { forAllAsync } from '@/domain/testing/prop';
import { cofreAberto } from './test-helpers';

async function tresContas() {
  const { s, m } = await cofreAberto();
  const ws = await s.createWorkspace({ kind: 'PF', name: 'Pessoal' });
  const nova = (name: string, openingCents: number) =>
    s.createAccount(ws.id, { name, kind: 'corrente', openingCents, operationId: s.newOperationId() });
  await nova('Banco A', 100000);
  await nova('Banco B', 50000);
  await nova('Carteira', 0);
  const ids = async () =>
    Object.fromEntries((await s.view(ws.id)).accounts.map((a) => [a.account.name, a.account.id]));
  return { s, m, ws, ids: await ids() };
}

const saldos = async (s: VaultSession, wsId: string) =>
  Object.fromEntries((await s.view(wsId)).accounts.map((a) => [a.account.name, a.balance]));

describe('contas depois do primeiro acesso', () => {
  it('[CON-004] transferência move o dinheiro sem mudar o total; só a tarifa sai do espaço', async () => {
    const { s, ws, ids } = await tresContas();
    await s.transfer(ws.id, {
      fromId: ids['Banco A'] ?? '',
      toId: ids['Banco B'] ?? '',
      amountCents: 30000,
      feeCents: 250,
      date: '2027-03-10',
      operationId: s.newOperationId(),
    });
    expect(await saldos(s, ws.id)).toEqual({ 'Banco A': 69750, 'Banco B': 80000, Carteira: 0 });
    expect((await s.view(ws.id)).total).toBe(149750);
  });

  it('[CON-004] propriedade: qualquer sequência de transferências conserva o total menos as tarifas', async () => {
    const { s, ws, ids } = await tresContas();
    const nomes = Object.keys(ids);
    let tarifas = 0;
    await forAllAsync(
      'transferências conservam o total',
      async (rng) => {
        const de = nomes[rng.int(0, 2)] ?? '';
        const para = nomes[(nomes.indexOf(de) + rng.int(1, 2)) % 3] ?? '';
        const fee = rng.bool() ? rng.int(1, 500) : 0;
        await s.transfer(ws.id, {
          fromId: ids[de] ?? '',
          toId: ids[para] ?? '',
          amountCents: rng.int(1, 20000),
          feeCents: fee,
          date: '2027-03-10',
          operationId: s.newOperationId(),
        });
        tarifas += fee;
        expect((await s.view(ws.id)).total).toBe(150000 - tarifas);
      },
      60,
    );
  });

  it('[CON-004] recusa conta igual, valor zero, data futura e conta arquivada', async () => {
    const { s, ws, ids } = await tresContas();
    const base = {
      fromId: ids['Banco A'] ?? '',
      toId: ids['Banco B'] ?? '',
      amountCents: 100,
      feeCents: 0,
      date: '2027-03-10',
    };
    const op = () => s.newOperationId();
    await expect(s.transfer(ws.id, { ...base, toId: base.fromId, operationId: op() })).rejects.toThrow(
      'contas diferentes',
    );
    await expect(s.transfer(ws.id, { ...base, amountCents: 0, operationId: op() })).rejects.toThrow(
      'maior que zero',
    );
    await expect(s.transfer(ws.id, { ...base, date: '2027-03-11', operationId: op() })).rejects.toThrow(
      'depois de hoje',
    );
    await expect(s.transfer(ws.id, { ...base, date: '2027-02-30', operationId: op() })).rejects.toThrow(
      'data válida',
    );
    await s.setAccountArchived(ws.id, {
      accountId: ids['Carteira'] ?? '',
      archived: true,
      operationId: op(),
    });
    await expect(
      s.transfer(ws.id, { ...base, toId: ids['Carteira'] ?? '', operationId: op() }),
    ).rejects.toThrow('arquivada');
    expect((await s.view(ws.id)).total).toBe(150000);
  });

  it('[CON-006] ajuste leva o saldo ao valor informado, com motivo obrigatório', async () => {
    const { s, ws, ids } = await tresContas();
    const conta = ids['Banco A'] ?? '';
    await expect(
      s.adjustBalance(ws.id, {
        accountId: conta,
        targetCents: 99000,
        reason: '  ',
        operationId: s.newOperationId(),
      }),
    ).rejects.toThrow('motivo');
    await expect(
      s.adjustBalance(ws.id, {
        accountId: conta,
        targetCents: 100000,
        reason: 'x',
        operationId: s.newOperationId(),
      }),
    ).rejects.toThrow('já é esse');
    await s.adjustBalance(ws.id, {
      accountId: conta,
      targetCents: 98765,
      reason: 'Conferi com o extrato',
      operationId: s.newOperationId(),
    });
    await s.adjustBalance(ws.id, {
      accountId: conta,
      targetCents: -500,
      reason: 'Tarifa não registrada',
      operationId: s.newOperationId(),
    });
    expect((await saldos(s, ws.id))['Banco A']).toBe(-500);
  });

  it('[CON-002] editar nome e tipo mantém o saldo; nome repetido é recusado', async () => {
    const { s, ws, ids } = await tresContas();
    await s.updateAccount(ws.id, {
      accountId: ids['Banco A'] ?? '',
      name: 'Banco Azul',
      kind: 'digital',
      operationId: s.newOperationId(),
    });
    const v = await s.view(ws.id);
    const azul = v.accounts.find((a) => a.account.id === ids['Banco A']);
    expect([azul?.account.name, azul?.account.kind, azul?.balance]).toEqual([
      'Banco Azul',
      'digital',
      100000,
    ]);
    await expect(
      s.updateAccount(ws.id, {
        accountId: ids['Banco B'] ?? '',
        name: 'banco azul',
        kind: 'corrente',
        operationId: s.newOperationId(),
      }),
    ).rejects.toThrow('Já existe');
  });

  it('[CON-002] arquivar só com saldo zero; a conta guarda o histórico e pode voltar', async () => {
    const { s, ws, ids } = await tresContas();
    await expect(
      s.setAccountArchived(ws.id, {
        accountId: ids['Banco B'] ?? '',
        archived: true,
        operationId: s.newOperationId(),
      }),
    ).rejects.toThrow('saldo zero');
    await s.transfer(ws.id, {
      fromId: ids['Banco B'] ?? '',
      toId: ids['Banco A'] ?? '',
      amountCents: 50000,
      feeCents: 0,
      date: '2027-03-09',
      operationId: s.newOperationId(),
    });
    await s.setAccountArchived(ws.id, {
      accountId: ids['Banco B'] ?? '',
      archived: true,
      operationId: s.newOperationId(),
    });
    let v = await s.view(ws.id);
    expect(v.accounts.find((a) => a.account.id === ids['Banco B'])?.account.archived).toBe(true);
    expect(v.total).toBe(150000);
    await s.setAccountArchived(ws.id, {
      accountId: ids['Banco B'] ?? '',
      archived: false,
      operationId: s.newOperationId(),
    });
    v = await s.view(ws.id);
    expect(v.accounts.find((a) => a.account.id === ids['Banco B'])?.account.archived).toBe(false);
  });
});

describe('espaços depois do primeiro acesso', () => {
  it('[COF-004] cria o espaço que faltou, mas nunca um segundo do mesmo tipo', async () => {
    const { s } = await tresContas();
    await expect(s.createWorkspace({ kind: 'PF', name: 'Outro' })).rejects.toThrow(
      'Já existe um espaço Pessoal',
    );
    await s.createWorkspace({ kind: 'PJ', name: 'Norte Software ME' });
    expect((await s.workspaces()).map((w) => w.kind)).toEqual(['PF', 'PJ']);
  });

  it('[COF-007] arquiva sem apagar e nunca deixa o cofre sem espaço ativo', async () => {
    const { s, ws } = await tresContas();
    await expect(s.setWorkspaceArchived(ws.id, true)).rejects.toThrow('único espaço ativo');
    await s.createWorkspace({ kind: 'PJ', name: 'Norte Software ME' });
    await s.setWorkspaceArchived(ws.id, true);
    expect((await s.workspaces()).find((w) => w.id === ws.id)?.archived).toBe(true);
    expect((await s.view(ws.id)).total).toBe(150000);
    await expect(s.createWorkspace({ kind: 'PF', name: 'Pessoal' })).rejects.toThrow('arquivado');
    await s.setWorkspaceArchived(ws.id, false);
    expect((await s.workspaces()).every((w) => !w.archived)).toBe(true);
  });

  it('[COF-007] exclusão mostra o que será apagado, pede a palavra e não toca no outro espaço', async () => {
    const { s, m, ws } = await tresContas();
    const pj = await s.createWorkspace({ kind: 'PJ', name: 'Norte Software ME' });
    await s.createAccount(pj.id, {
      name: 'Conta PJ',
      kind: 'digital',
      openingCents: 7000,
      operationId: s.newOperationId(),
    });
    expect(await s.workspaceFootprint(ws.id)).toEqual({ accounts: 3, entries: 2 });
    await expect(s.deleteWorkspace(ws.id, 'excluí')).rejects.toThrow('Digite EXCLUIR');
    await s.deleteWorkspace(ws.id, 'excluir');
    expect((await s.workspaces()).map((w) => w.kind)).toEqual(['PJ']);
    // Depois de bloquear e abrir de novo, o que sobrou continua íntegro.
    s.lock();
    const s2 = await m.app.unlock({ password: 'uma frase bem longa' });
    expect((await s2.workspaces()).map((w) => w.name)).toEqual(['Norte Software ME']);
    expect((await s2.view(pj.id)).total).toBe(7000);
    expect(s2.safeMode).toBe(false);
  });
});
