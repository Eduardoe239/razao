// Categorias padrão, renomear, arquivar, mesclar, recategorizar em lote e regras, com o cofre real e dados sintéticos.
import { describe, expect, it } from 'vitest';
import type { VaultSession } from '@/application/session';
import arquivo from './backup/fixtures/razao-backup-0.1.0.razao?raw';
import { cofreAberto } from './test-helpers';

const SENHA = 'uma frase bem longa';

async function preparar(kind: 'PF' | 'PJ' = 'PF') {
  const { s, m } = await cofreAberto();
  const ws = await s.createWorkspace({ kind, name: kind === 'PF' ? 'Pessoal' : 'Negócio' });
  await s.createAccount(ws.id, {
    name: 'Banco Azul',
    kind: 'corrente',
    openingCents: 100000,
    operationId: s.newOperationId(),
  });
  const banco = (await s.view(ws.id)).accounts[0]?.account.id ?? '';
  const id = async (name: string) =>
    (await s.entries.categories(ws.id)).find((x) => x.name === name)?.id ?? '';
  const ids = async (...names: string[]) => Promise.all(names.map(id));
  return { s, m, ws, banco, id, ids };
}

type Base = Awaited<ReturnType<typeof preparar>>;

const gasto = (
  b: Base,
  categoryId: string,
  amountCents: number,
  date = '2027-03-01',
  status: 'realizado' | 'pendente' = 'realizado',
) =>
  b.s.entries.create(b.ws.id, {
    kind: 'despesa',
    accountId: b.banco,
    parts: [{ categoryId, amountCents }],
    date,
    status,
    description: 'Compra',
    operationId: b.s.newOperationId(),
  });

const porCategoria = async (s: VaultSession, ws: string) => {
  const out = new Map<string, number>();
  for (const r of await s.entries.list(ws))
    for (const p of r.parts)
      if (r.status === 'realizado') out.set(p.categoryId, (out.get(p.categoryId) ?? 0) + p.amountCents);
  return out;
};

describe('[CAT-001] categorias padrão (D-049)', () => {
  it('[CAT-001] espaço PF nasce com as categorias padrão e subcategorias; PJ com as dele', async () => {
    const pf = await preparar('PF');
    const cats = await pf.s.entries.categories(pf.ws.id);
    expect(cats.filter((c) => c.group === 'income').map((c) => c.name)).toEqual([
      'Salário',
      'Renda extra',
      'Rendimentos',
      'Retirada do negócio',
      'Outras receitas',
    ]);
    expect(cats.filter((c) => c.group === 'expense')).toHaveLength(20);
    const moradia = cats.find((c) => c.name === 'Moradia');
    expect(cats.filter((c) => c.parentId === moradia?.id).map((c) => c.name)).toEqual([
      'Aluguel',
      'Contas da casa',
    ]);
    const pj = await preparar('PJ');
    const catsPj = await pj.s.entries.categories(pj.ws.id);
    expect(catsPj.map((c) => c.name)).toContain('Impostos (DAS)');
    expect(catsPj).toHaveLength(14);
    expect(catsPj.some((c) => c.name === 'Salário')).toBe(false);
  });

  it('[CAT-001] Tarifas bancárias é a mesma conta interna das tarifas de transferência', async () => {
    const b = await preparar();
    await b.s.createAccount(b.ws.id, {
      name: 'Carteira',
      kind: 'carteira',
      openingCents: 0,
      operationId: b.s.newOperationId(),
    });
    const carteira =
      (await b.s.view(b.ws.id)).accounts.find((a) => a.account.name === 'Carteira')?.account.id ?? '';
    await b.s.transfer(b.ws.id, {
      fromId: b.banco,
      toId: carteira,
      amountCents: 5000,
      feeCents: 250,
      date: '2027-03-02',
      operationId: b.s.newOperationId(),
    });
    const tarifas = (await b.s.entries.categories(b.ws.id)).filter((c) => c.name === 'Tarifas bancárias');
    expect(tarifas).toHaveLength(1);
    expect(tarifas[0]?.ledgerAccountId).toBe(b.ws.feeExpenseId);
  });

  it('[CAT-001] espaço da Alpha 1 (backup 0.1.0) ganha as padrão uma vez só', async () => {
    const { s } = await cofreAberto();
    await s.restoreBackup(await s.openBackup(arquivo, 'senha da fixture 0.1.0'));
    const ws = (await s.workspaces()).find((w) => w.kind === 'PF');
    expect(ws).toBeDefined();
    const id = ws?.id ?? '';
    expect(await s.entries.categories(id)).toHaveLength(0);
    expect(await s.entries.ensureDefaults(id)).toBe('gravada');
    expect(await s.entries.categories(id)).toHaveLength(25);
    expect(await s.entries.ensureDefaults(id)).toBe('nada');
    expect(s.safeMode).toBe(false);
  });
});

describe('[CAT-002] renomear, arquivar e mesclar', () => {
  it('[CAT-002] renomear muda só o nome; nome repetido ou igual é recusado', async () => {
    const b = await preparar();
    const lazer = await b.id('Lazer');
    await gasto(b, lazer, 1000);
    await b.s.entries.renameCategory(b.ws.id, {
      categoryId: lazer,
      name: 'Passeios',
      operationId: b.s.newOperationId(),
    });
    expect((await b.s.entries.categories(b.ws.id)).find((c) => c.id === lazer)?.name).toBe('Passeios');
    expect((await porCategoria(b.s, b.ws.id)).get(lazer)).toBe(1000);
    await expect(
      b.s.entries.renameCategory(b.ws.id, {
        categoryId: lazer,
        name: 'compras',
        operationId: b.s.newOperationId(),
      }),
    ).rejects.toThrow(/Já existe/);
    await expect(
      b.s.entries.renameCategory(b.ws.id, {
        categoryId: lazer,
        name: 'Passeios',
        operationId: b.s.newOperationId(),
      }),
    ).rejects.toThrow(/mesmo/);
    await expect(
      b.s.entries.renameCategory(b.ws.id, {
        categoryId: lazer,
        name: ' ',
        operationId: b.s.newOperationId(),
      }),
    ).rejects.toThrow(/nome/);
  });

  it('[CAT-002] arquivar a principal arquiva as subcategorias e desliga as regras; histórico fica', async () => {
    const b = await preparar();
    const moradia = await b.id('Moradia');
    const aluguel = await b.id('Aluguel');
    await gasto(b, aluguel, 150000);
    await b.s.entries.createRule(b.ws.id, {
      pattern: 'imobiliária',
      categoryId: aluguel,
      operationId: b.s.newOperationId(),
    });
    await b.s.entries.setCategoryArchived(b.ws.id, {
      categoryId: moradia,
      archived: true,
      operationId: b.s.newOperationId(),
    });
    const cats = await b.s.entries.categories(b.ws.id);
    expect(cats.filter((c) => c.id === moradia || c.parentId === moradia).every((c) => c.archived)).toBe(
      true,
    );
    expect((await b.s.entries.rules(b.ws.id)).map((r) => r.active)).toEqual([false]);
    expect(
      await b.s.entries.suggest(b.ws.id, { description: 'Imobiliária Centro', kind: 'despesa' }),
    ).toBeUndefined();
    expect((await porCategoria(b.s, b.ws.id)).get(aluguel)).toBe(150000);
    await expect(gasto(b, aluguel, 10)).rejects.toThrow(/arquivada/);
    await expect(
      b.s.entries.setCategoryArchived(b.ws.id, {
        categoryId: aluguel,
        archived: false,
        operationId: b.s.newOperationId(),
      }),
    ).rejects.toThrow(/Reative "Moradia"/);
    await b.s.entries.setCategoryArchived(b.ws.id, {
      categoryId: moradia,
      archived: false,
      operationId: b.s.newOperationId(),
    });
    await b.s.entries.setCategoryArchived(b.ws.id, {
      categoryId: aluguel,
      archived: false,
      operationId: b.s.newOperationId(),
    });
    expect(await gasto(b, aluguel, 10)).toBe('gravada');
  });

  it('[CAT-002] mesclar: prévia com quantidade e meses; lançamentos vão para B, totais iguais, A arquivada, regras para B', async () => {
    const b = await preparar();
    const compras = await b.id('Compras');
    const lazer = await b.id('Lazer');
    await gasto(b, compras, 1000, '2027-01-15');
    await gasto(b, compras, 2000, '2027-03-01');
    await gasto(b, compras, 700, '2027-05-01', 'pendente');
    await gasto(b, lazer, 500, '2027-02-01');
    await b.s.entries.createRule(b.ws.id, {
      pattern: 'loja',
      categoryId: compras,
      operationId: b.s.newOperationId(),
    });
    const saldoAntes = (await b.s.view(b.ws.id)).total;
    expect(await b.s.entries.previewMerge(b.ws.id, { fromId: compras, toId: lazer })).toEqual({
      count: 3,
      pending: 1,
      months: ['2027-01', '2027-03', '2027-05'],
    });
    await b.s.entries.mergeCategory(b.ws.id, {
      fromId: compras,
      toId: lazer,
      operationId: b.s.newOperationId(),
    });
    b.s.lock();
    const s2 = await b.m.app.unlock({ password: SENHA });
    expect((await s2.view(b.ws.id)).total).toBe(saldoAntes);
    const por = await porCategoria(s2, b.ws.id);
    expect([por.get(compras), por.get(lazer)]).toEqual([undefined, 3500]);
    const lista = await s2.entries.list(b.ws.id);
    expect(lista).toHaveLength(4);
    expect(lista.find((r) => r.status === 'pendente')?.parts).toEqual([
      { categoryId: lazer, amountCents: 700 },
    ]);
    expect((await s2.entries.categories(b.ws.id)).find((c) => c.id === compras)?.archived).toBe(true);
    expect(await s2.entries.suggest(b.ws.id, { description: 'LOJA X', kind: 'despesa' })).toMatchObject({
      categoryId: lazer,
    });
  });

  it('[CAT-002] mescla recusada: mesma categoria, tipos diferentes, destino arquivado ou origem com subcategorias', async () => {
    const b = await preparar();
    const [lazer = '', salario = '', moradia = '', compras = ''] = await b.ids(
      'Lazer',
      'Salário',
      'Moradia',
      'Compras',
    );
    const merge = (fromId: string, toId: string) => b.s.entries.previewMerge(b.ws.id, { fromId, toId });
    await expect(merge(lazer, lazer)).rejects.toThrow(/outra categoria/);
    await expect(merge(lazer, salario)).rejects.toThrow(/Receita só se mescla/);
    await expect(merge(moradia, lazer)).rejects.toThrow(/subcategorias/);
    await b.s.entries.setCategoryArchived(b.ws.id, {
      categoryId: compras,
      archived: true,
      operationId: b.s.newOperationId(),
    });
    await expect(merge(lazer, compras)).rejects.toThrow(/arquivada/);
    expect(await merge(compras, lazer)).toEqual({ count: 0, pending: 0, months: [] });
  });
});

describe('[CAT-004] recategorizar em lote', () => {
  it('[CAT-004] prévia e operação única; só o que muda entra; tipo errado é recusado', async () => {
    const b = await preparar();
    const [lazer = '', compras = '', educacao = ''] = await b.ids('Lazer', 'Compras', 'Educação');
    await gasto(b, lazer, 100, '2027-01-01');
    await gasto(b, compras, 200, '2027-02-01');
    await gasto(b, educacao, 300, '2027-02-05');
    const ids = (await b.s.entries.list(b.ws.id)).map((r) => r.entryId);
    expect(await b.s.entries.previewRecategorize(b.ws.id, { entryIds: ids, toId: educacao })).toEqual({
      count: 2,
      pending: 0,
      months: ['2027-01', '2027-02'],
    });
    const op = b.s.newOperationId();
    expect(await b.s.entries.recategorize(b.ws.id, { entryIds: ids, toId: educacao, operationId: op })).toBe(
      'gravada',
    );
    expect(await b.s.entries.recategorize(b.ws.id, { entryIds: ids, toId: educacao, operationId: op })).toBe(
      'repetida',
    );
    expect((await porCategoria(b.s, b.ws.id)).get(educacao)).toBe(600);
    expect((await b.s.view(b.ws.id)).total).toBe(100000 - 600);
    const novos = (await b.s.entries.list(b.ws.id)).map((r) => r.entryId);
    await expect(
      b.s.entries.recategorize(b.ws.id, {
        entryIds: novos,
        toId: educacao,
        operationId: b.s.newOperationId(),
      }),
    ).rejects.toThrow(/já estão/);
    const salario = await b.id('Salário');
    await expect(
      b.s.entries.previewRecategorize(b.ws.id, { entryIds: novos, toId: salario }),
    ).rejects.toThrow(/só receitas/);
    await expect(
      b.s.entries.previewRecategorize(b.ws.id, { entryIds: ['sumiu'], toId: lazer }),
    ).rejects.toThrow(/não existe mais/);
  });
});

describe('[CAT-003] regras pela aplicação', () => {
  it('[CAT-003] sugere pela prioridade, reordena, desliga e apaga; nunca aponta para categoria arquivada', async () => {
    const b = await preparar();
    const [combustivel = '', apps = '', salario = ''] = await b.ids(
      'Combustível',
      'Apps e ônibus',
      'Salário',
    );
    const r1 = (
      await b.s.entries.createRule(b.ws.id, {
        pattern: 'posto',
        categoryId: combustivel,
        operationId: b.s.newOperationId(),
      })
    ).ruleId;
    const r2 = (
      await b.s.entries.createRule(b.ws.id, {
        pattern: 'posto uber',
        categoryId: apps,
        operationId: b.s.newOperationId(),
      })
    ).ruleId;
    await b.s.entries.createRule(b.ws.id, {
      pattern: 'empresa',
      categoryId: salario,
      operationId: b.s.newOperationId(),
    });
    const sugere = (description: string, kind: 'receita' | 'despesa' = 'despesa') =>
      b.s.entries.suggest(b.ws.id, { description, kind }).then((x) => x?.categoryId);
    expect(await sugere('POSTO UBER 22')).toBe(combustivel);
    await b.s.entries.reorderRules(b.ws.id, {
      ruleIds: [r2, r1, ...(await b.s.entries.rules(b.ws.id)).slice(2).map((r) => r.id)],
      operationId: b.s.newOperationId(),
    });
    expect(await sugere('POSTO UBER 22')).toBe(apps);
    expect(await sugere('Empresa X', 'despesa')).toBeUndefined();
    expect(await sugere('Empresa X', 'receita')).toBe(salario);
    await b.s.entries.updateRule(b.ws.id, {
      ruleId: r2,
      pattern: 'posto uber',
      categoryId: apps,
      active: false,
      operationId: b.s.newOperationId(),
    });
    expect(await sugere('POSTO UBER 22')).toBe(combustivel);
    await b.s.entries.removeRule(b.ws.id, { ruleId: r1, operationId: b.s.newOperationId() });
    expect(await sugere('POSTO UBER 22')).toBeUndefined();
    expect((await b.s.entries.rules(b.ws.id)).map((r) => r.id)).not.toContain(r1);
    await expect(
      b.s.entries.reorderRules(b.ws.id, { ruleIds: [r2], operationId: b.s.newOperationId() }),
    ).rejects.toThrow(/mudaram/);
    await expect(
      b.s.entries.createRule(b.ws.id, { pattern: 'x', categoryId: apps, operationId: b.s.newOperationId() }),
    ).rejects.toThrow(/2 a 80/);
    await expect(
      b.s.entries.createRule(b.ws.id, {
        pattern: 'xx',
        categoryId: 'nada',
        operationId: b.s.newOperationId(),
      }),
    ).rejects.toThrow(/não existe/);
    await b.s.entries.setCategoryArchived(b.ws.id, {
      categoryId: apps,
      archived: true,
      operationId: b.s.newOperationId(),
    });
    await expect(
      b.s.entries.updateRule(b.ws.id, {
        ruleId: r2,
        pattern: 'posto uber',
        categoryId: apps,
        active: true,
        operationId: b.s.newOperationId(),
      }),
    ).rejects.toThrow(/arquivada/);
  });
});
