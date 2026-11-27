// Receitas, despesas e categorias pela aplicação, com o cofre real (IndexedDB simulado) e dados sintéticos.
import { describe, expect, it } from 'vitest';
import type { FlowEntryInput, UndoToken } from '@/application/entry-ops';
import type { VaultSession } from '@/application/session';
import { forAllAsync } from '@/domain/testing/prop';
import { cofreAberto } from './test-helpers';

const SENHA = 'uma frase bem longa';

async function preparar() {
  const { s, m } = await cofreAberto();
  const ws = await s.createWorkspace({ kind: 'PF', name: 'Pessoal' });
  await s.createAccount(ws.id, {
    name: 'Banco Azul',
    kind: 'corrente',
    openingCents: 100000,
    operationId: s.newOperationId(),
  });
  await s.createAccount(ws.id, {
    name: 'Carteira',
    kind: 'carteira',
    openingCents: 0,
    operationId: s.newOperationId(),
  });
  const contas = Object.fromEntries(
    (await s.view(ws.id)).accounts.map((a) => [a.account.name, a.account.id]),
  );
  // Categorias padrão do espaço novo (D-049).
  const cats = await s.entries.categories(ws.id);
  const cat = (name: string) => cats.find((x) => x.name === name)?.id ?? '';
  const mercado = cat('Mercado');
  const farmacia = cat('Farmácia');
  const salario = cat('Salário');
  return {
    s,
    m,
    ws,
    banco: contas['Banco Azul'] ?? '',
    carteira: contas['Carteira'] ?? '',
    mercado,
    farmacia,
    salario,
  };
}

type Base = Awaited<ReturnType<typeof preparar>>;

const despesa = (b: Base, centavos: number, extra: Partial<FlowEntryInput> = {}): FlowEntryInput => ({
  kind: 'despesa',
  accountId: b.banco,
  parts: [{ categoryId: b.mercado, amountCents: centavos }],
  date: '2027-03-08',
  status: 'realizado',
  description: 'Feira',
  operationId: b.s.newOperationId(),
  ...extra,
});

const saldo = async (s: VaultSession, wsId: string, nome = 'Banco Azul') =>
  (await s.view(wsId)).accounts.find((a) => a.account.name === nome)?.balance;

function token(u: UndoToken | null): UndoToken {
  if (!u) throw new Error('A exclusão devia devolver o "Desfazer".');
  return u;
}

async function reabrir(b: Base): Promise<VaultSession> {
  b.s.lock();
  return b.m.app.unlock({ password: SENHA });
}

describe('receitas e despesas pela aplicação', () => {
  it('[LAN-001] despesa e receita mudam o saldo e aparecem na lista com conta, categoria e descrição', async () => {
    const b = await preparar();
    await b.s.entries.create(b.ws.id, despesa(b, 4590));
    await b.s.entries.create(b.ws.id, {
      ...despesa(b, 300000),
      kind: 'receita',
      parts: [{ categoryId: b.salario, amountCents: 300000 }],
      description: '  Salário de março  ',
    });
    expect(await saldo(b.s, b.ws.id)).toBe(100000 - 4590 + 300000);
    const lista = await b.s.entries.list(b.ws.id);
    expect(lista.map((r) => [r.kind, r.amountCents, r.description, r.accountId])).toEqual([
      ['receita', 300000, 'Salário de março', b.banco],
      ['despesa', 4590, 'Feira', b.banco],
    ]);
  });

  it('[LAN-012] a mesma operação repetida (clique duplo) grava uma vez só', async () => {
    const b = await preparar();
    const input = despesa(b, 1000);
    expect(await b.s.entries.create(b.ws.id, input)).toBe('gravada');
    expect(await b.s.entries.create(b.ws.id, input)).toBe('repetida');
    expect(await b.s.entries.list(b.ws.id)).toHaveLength(1);
    expect(await saldo(b.s, b.ws.id)).toBe(99000);
  });

  it('[LAN-012] editar e confirmar repetidos (clique duplo) também gravam uma vez só', async () => {
    const b = await preparar();
    await b.s.entries.create(b.ws.id, despesa(b, 1000));
    await b.s.entries.create(b.ws.id, despesa(b, 500, { status: 'pendente', date: '2027-04-01' }));
    const [pend, real] = await b.s.entries.list(b.ws.id);
    const edicao = despesa(b, 1500);
    expect(await b.s.entries.edit(b.ws.id, real?.entryId ?? '', edicao)).toBe('gravada');
    expect(await b.s.entries.edit(b.ws.id, real?.entryId ?? '', edicao)).toBe('repetida');
    const conf = { entryId: pend?.entryId ?? '', date: '2027-03-09', operationId: b.s.newOperationId() };
    expect(await b.s.entries.confirm(b.ws.id, conf)).toBe('gravada');
    expect(await b.s.entries.confirm(b.ws.id, conf)).toBe('repetida');
    expect(await saldo(b.s, b.ws.id)).toBe(100000 - 1500 - 500);
    expect(await b.s.entries.list(b.ws.id)).toHaveLength(2);
  });

  it('[LAN-007] dividido em duas categorias: uma saída com o total exato', async () => {
    const b = await preparar();
    await b.s.entries.create(
      b.ws.id,
      despesa(b, 0, {
        parts: [
          { categoryId: b.mercado, amountCents: 8000 },
          { categoryId: b.farmacia, amountCents: 4001 },
        ],
      }),
    );
    expect(await saldo(b.s, b.ws.id)).toBe(100000 - 12001);
    const [row] = await b.s.entries.list(b.ws.id);
    expect(row?.amountCents).toBe(12001);
    expect(row?.parts).toEqual([
      { categoryId: b.mercado, amountCents: 8000 },
      { categoryId: b.farmacia, amountCents: 4001 },
    ]);
  });

  it('[LAN-003] pendente com data prevista não entra no saldo; confirmado entra e continua depois de reabrir', async () => {
    const b = await preparar();
    await b.s.entries.create(b.ws.id, despesa(b, 20000, { status: 'pendente', date: '2027-04-15' }));
    expect(await saldo(b.s, b.ws.id)).toBe(100000);
    const [p] = await b.s.entries.list(b.ws.id);
    await expect(
      b.s.entries.confirm(b.ws.id, {
        entryId: p?.entryId ?? '',
        date: '2027-04-15',
        operationId: b.s.newOperationId(),
      }),
    ).rejects.toThrow(/depois de hoje/);
    await b.s.entries.confirm(b.ws.id, {
      entryId: p?.entryId ?? '',
      date: '2027-03-09',
      operationId: b.s.newOperationId(),
    });
    expect(await saldo(b.s, b.ws.id)).toBe(80000);
    const s2 = await reabrir(b);
    expect(await saldo(s2, b.ws.id)).toBe(80000);
    const [r] = await s2.entries.list(b.ws.id);
    expect([r?.status, r?.date]).toEqual(['realizado', '2027-03-09']);
  });

  it('[LAN-004] editar valor e mês: saldo recalculado, uma linha só, marcada como editada, e igual depois de reabrir', async () => {
    const b = await preparar();
    await b.s.entries.create(b.ws.id, despesa(b, 5000, { date: '2027-02-20' }));
    const [orig] = await b.s.entries.list(b.ws.id);
    await b.s.entries.edit(
      b.ws.id,
      orig?.entryId ?? '',
      despesa(b, 7000, { accountId: b.carteira, date: '2027-03-01' }),
    );
    expect(await saldo(b.s, b.ws.id)).toBe(100000);
    expect(await saldo(b.s, b.ws.id, 'Carteira')).toBe(-7000);
    const lista = await b.s.entries.list(b.ws.id);
    expect(lista.map((r) => [r.amountCents, r.date, r.edited])).toEqual([[7000, '2027-03-01', true]]);
    await expect(b.s.entries.edit(b.ws.id, orig?.entryId ?? '', despesa(b, 1))).rejects.toThrow(
      /não existe mais/,
    );
    const s2 = await reabrir(b);
    expect(await saldo(s2, b.ws.id, 'Carteira')).toBe(-7000);
    expect((await s2.entries.list(b.ws.id)).map((r) => r.amountCents)).toEqual([7000]);
  });

  it('[LAN-004] pendente editado muda de mês sem deixar cópia na página antiga', async () => {
    const b = await preparar();
    await b.s.entries.create(b.ws.id, despesa(b, 5000, { status: 'pendente', date: '2027-05-10' }));
    const [p] = await b.s.entries.list(b.ws.id);
    await b.s.entries.edit(
      b.ws.id,
      p?.entryId ?? '',
      despesa(b, 6000, { status: 'pendente', date: '2027-06-10' }),
    );
    await b.s.entries.edit(
      b.ws.id,
      p?.entryId ?? '',
      despesa(b, 6000, { status: 'pendente', date: '2027-06-11', description: 'Outra' }),
    );
    const s2 = await reabrir(b);
    const lista = await s2.entries.list(b.ws.id);
    expect(lista.map((r) => [r.entryId, r.amountCents, r.date, r.description])).toEqual([
      [p?.entryId, 6000, '2027-06-11', 'Outra'],
    ]);
  });

  it('[LAN-004] só a descrição muda: nada de estorno, saldo igual', async () => {
    const b = await preparar();
    await b.s.entries.create(b.ws.id, despesa(b, 5000));
    const [orig] = await b.s.entries.list(b.ws.id);
    await b.s.entries.edit(
      b.ws.id,
      orig?.entryId ?? '',
      despesa(b, 5000, { description: 'Feira do sábado' }),
    );
    const [r] = await (await reabrir(b)).entries.list(b.ws.id);
    expect([r?.entryId, r?.description, r?.edited]).toEqual([orig?.entryId, 'Feira do sábado', false]);
  });

  it('[LAN-006] excluir realizado e pendente, com desfazer; desfazer duas vezes é recusado', async () => {
    const b = await preparar();
    await b.s.entries.create(b.ws.id, despesa(b, 5000));
    await b.s.entries.create(b.ws.id, despesa(b, 900, { status: 'pendente', date: '2027-04-01' }));
    const [pend, real] = await b.s.entries.list(b.ws.id);
    const opExcluir = b.s.newOperationId();
    const r1 = await b.s.entries.remove(b.ws.id, { entryId: real?.entryId ?? '', operationId: opExcluir });
    // Clique repetido no "Excluir": não grava de novo e não oferece outro "Desfazer".
    expect(
      await b.s.entries.remove(b.ws.id, { entryId: real?.entryId ?? '', operationId: opExcluir }),
    ).toEqual({
      result: 'repetida',
      undo: null,
    });
    const r2 = await b.s.entries.remove(b.ws.id, {
      entryId: pend?.entryId ?? '',
      operationId: b.s.newOperationId(),
    });
    expect(await b.s.entries.list(b.ws.id)).toHaveLength(0);
    expect(await saldo(b.s, b.ws.id)).toBe(100000);
    const u1 = token(r1.undo);
    const u2 = token(r2.undo);
    const opDesfazer = b.s.newOperationId();
    await b.s.entries.undoRemove(b.ws.id, { undo: u1, operationId: opDesfazer });
    expect(await b.s.entries.undoRemove(b.ws.id, { undo: u1, operationId: opDesfazer })).toBe('repetida');
    await b.s.entries.undoRemove(b.ws.id, { undo: u2, operationId: b.s.newOperationId() });
    expect(await saldo(b.s, b.ws.id)).toBe(95000);
    await expect(
      b.s.entries.undoRemove(b.ws.id, { undo: u1, operationId: b.s.newOperationId() }),
    ).rejects.toThrow(/já foi desfeita/);
    await expect(
      b.s.entries.undoRemove(b.ws.id, { undo: u2, operationId: b.s.newOperationId() }),
    ).rejects.toThrow(/já foi recuperado/);
    const s2 = await reabrir(b);
    expect((await s2.entries.list(b.ws.id)).map((r) => r.entryId).sort()).toEqual(
      [pend?.entryId, real?.entryId].sort(),
    );
  });

  it('[LAN-001] recusa data futura no realizado, conta arquivada, categoria de outro tipo e valor zero', async () => {
    const b = await preparar();
    await expect(b.s.entries.create(b.ws.id, despesa(b, 100, { date: '2027-03-11' }))).rejects.toThrow(
      /depois de hoje/,
    );
    await expect(b.s.entries.create(b.ws.id, despesa(b, 100, { date: '2027-02-30' }))).rejects.toThrow(
      /data válida/,
    );
    await expect(b.s.entries.create(b.ws.id, despesa(b, 0))).rejects.toThrow(/maior que zero/);
    await expect(b.s.entries.create(b.ws.id, despesa(b, 100, { parts: [] }))).rejects.toThrow(/categoria/);
    await expect(
      b.s.entries.create(b.ws.id, despesa(b, 100, { parts: [{ categoryId: b.salario, amountCents: 100 }] })),
    ).rejects.toThrow(/categoria de despesa/);
    await expect(
      b.s.entries.create(
        b.ws.id,
        despesa(b, 100, { parts: [{ categoryId: 'nao-existe', amountCents: 100 }] }),
      ),
    ).rejects.toThrow(/não encontrada/);
    await expect(
      b.s.entries.create(b.ws.id, despesa(b, 100, { description: 'x'.repeat(201) })),
    ).rejects.toThrow(/200/);
    await b.s.setAccountArchived(b.ws.id, {
      accountId: b.carteira,
      archived: true,
      operationId: b.s.newOperationId(),
    });
    await expect(b.s.entries.create(b.ws.id, despesa(b, 100, { accountId: b.carteira }))).rejects.toThrow(
      /arquivada/,
    );
    expect(await b.s.entries.list(b.ws.id)).toHaveLength(0);
  });

  it('[LAN-005] propriedade: registrar, editar e excluir em qualquer ordem deixa o saldo igual à soma da lista', async () => {
    const b = await preparar();
    await forAllAsync(
      'saldo igual à soma das receitas e despesas que valem',
      async (rng) => {
        const lista = await b.s.entries.list(b.ws.id);
        const acao = lista.length === 0 ? 0 : rng.int(0, 2);
        const valor = rng.int(1, 50000);
        if (acao === 0)
          await b.s.entries.create(
            b.ws.id,
            despesa(b, valor, { status: rng.bool() ? 'realizado' : 'pendente' }),
          );
        else if (acao === 1) {
          const alvo = rng.pick(lista);
          await b.s.entries.edit(
            b.ws.id,
            alvo.entryId,
            despesa(b, valor, {
              status: alvo.status === 'pendente' && rng.bool() ? 'pendente' : 'realizado',
            }),
          );
        } else
          await b.s.entries.remove(b.ws.id, {
            entryId: rng.pick(lista).entryId,
            operationId: b.s.newOperationId(),
          });
        const depois = await b.s.entries.list(b.ws.id);
        const gasto = depois.filter((r) => r.status === 'realizado').reduce((t, r) => t + r.amountCents, 0);
        expect(await saldo(b.s, b.ws.id)).toBe(100000 - gasto);
      },
      40,
    );
  });
});

describe('[CAT-001] categorias como contas internas', () => {
  it('[CAT-001] subcategoria de um nível, do mesmo tipo, sem nome repetido no mesmo lugar', async () => {
    const b = await preparar();
    const nova = (name: string, group: 'income' | 'expense', parentId?: string) =>
      b.s.entries.createCategory(b.ws.id, { name, group, parentId, operationId: b.s.newOperationId() });
    const outros = (await b.s.entries.categories(b.ws.id)).find((x) => x.name === 'Outros gastos')?.id;
    const sub = (await nova('Hortifruti', 'expense', outros)).categoryId;
    await expect(nova('Feira', 'expense', sub)).rejects.toThrow(/Subcategoria não tem/);
    await expect(nova('Bônus', 'income', outros)).rejects.toThrow(/mesmo tipo/);
    await expect(nova('X', 'expense', 'nao-existe')).rejects.toThrow(/não existe/);
    await expect(nova('outros GASTOS', 'expense')).rejects.toThrow(/Já existe/);
    await expect(nova('   ', 'expense')).rejects.toThrow(/nome/);
    expect((await nova('Mercado', 'income')).result).toBe('gravada');
    const cats = await b.s.entries.categories(b.ws.id);
    expect(cats.find((c) => c.id === sub)?.parentId).toBe(outros);
    await b.s.entries.create(b.ws.id, despesa(b, 300, { parts: [{ categoryId: sub, amountCents: 300 }] }));
    expect(await saldo(b.s, b.ws.id)).toBe(99700);
  });
});
