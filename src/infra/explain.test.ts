// "Explicar" (IA-004) com o cofre real: a composição sempre fecha com o saldo. Dados sintéticos.
import { describe, expect, it } from 'vitest';
import { parseCivilDate } from '@/domain/civil-date';
import { forAllAsync } from '@/domain/testing/prop';
import { cofreAberto } from './test-helpers';

async function preparar() {
  const { s } = await cofreAberto();
  const ws = await s.createWorkspace({ kind: 'PF', name: 'Pessoal' });
  for (const [name, openingCents] of [
    ['Banco Azul', 100000],
    ['Carteira', 5000],
  ] as const) {
    await s.createAccount(ws.id, { name, kind: 'corrente', openingCents, operationId: s.newOperationId() });
  }
  const contas = (await s.view(ws.id)).accounts.map((a) => a.account.id);
  const cats = await s.entries.categories(ws.id);
  const id = (n: string) => cats.find((c) => c.name === n)?.id ?? '';
  return {
    s,
    ws,
    banco: contas[0] ?? '',
    carteira: contas[1] ?? '',
    mercado: id('Mercado'),
    farmacia: id('Farmácia'),
    salario: id('Salário'),
  };
}

describe('[IA-004] Explicar o saldo', () => {
  it('[IA-004] J-06: por que o saldo do banco mudou no mês, com transferência, divisão, ajuste e a vencer', async () => {
    const b = await preparar();
    const { s, ws } = b;
    const op = () => s.newOperationId();
    await s.entries.create(ws.id, {
      kind: 'receita',
      accountId: b.banco,
      parts: [{ categoryId: b.salario, amountCents: 410000 }],
      date: '2027-03-05',
      status: 'realizado',
      description: 'Salário',
      operationId: op(),
    });
    await s.entries.create(ws.id, {
      kind: 'despesa',
      accountId: b.banco,
      parts: [
        { categoryId: b.mercado, amountCents: 9240 },
        { categoryId: b.farmacia, amountCents: 3400 },
      ],
      date: '2027-03-06',
      status: 'realizado',
      description: 'Feira e farmácia',
      operationId: op(),
    });
    await s.transfer(ws.id, {
      fromId: b.banco,
      toId: b.carteira,
      amountCents: 20000,
      feeCents: 150,
      date: '2027-03-07',
      operationId: op(),
    });
    await s.adjustBalance(ws.id, {
      accountId: b.banco,
      targetCents: 480000,
      reason: 'Conferência com o extrato',
      operationId: op(),
    });
    await s.entries.create(ws.id, {
      kind: 'despesa',
      accountId: b.banco,
      parts: [{ categoryId: b.mercado, amountCents: 50000 }],
      date: '2027-03-30',
      status: 'pendente',
      description: 'Aluguel',
      operationId: op(),
    });
    const e = await s.entries.explainBalance(ws.id, {
      accountId: b.banco,
      from: parseCivilDate('2027-02-28'),
      to: parseCivilDate('2027-03-10'),
    });
    const saldo = (await s.view(ws.id)).accounts.find((a) => a.account.id === b.banco)?.balance;
    expect(e.closing?.cents).toBe(saldo);
    expect(e.groups.reduce((t, g) => t + g.totalCents, 0)).toBe(
      (e.closing?.cents ?? 0) - (e.opening?.cents ?? 0),
    );
    const rotulos = e.groups.map((g) => g.label);
    expect(rotulos).toContain('Salário');
    expect(rotulos).toContain('Alimentação › Mercado');
    expect(rotulos).toContain('Transferência · Carteira');
    expect(rotulos).toContain('Tarifas bancárias');
    expect(rotulos).toContain('Ajustes de saldo');
    expect(e.pending).toEqual({ count: 1, cents: -50000 });
    expect(e.sentence).toMatch(/^O saldo de Banco Azul (subiu|caiu) R\$/);
    const total = await s.entries.explainBalance(ws.id, {
      from: parseCivilDate('2027-02-28'),
      to: parseCivilDate('2027-03-10'),
    });
    // No total do espaço, a transferência entre as duas contas não aparece; só a tarifa.
    expect(total.groups.map((g) => g.label)).not.toContain('Transferência · Carteira');
    expect(total.groups.reduce((t, g) => t + g.totalCents, 0)).toBe(
      (total.closing?.cents ?? 0) - (total.opening?.cents ?? 0),
    );
  });

  it('[IA-004] propriedade: em qualquer sequência, as linhas somam exatamente a variação do saldo', async () => {
    const b = await preparar();
    const { s, ws } = b;
    await forAllAsync(
      'Explicar fecha com o saldo',
      async (rng) => {
        const dia = `2027-03-${String(rng.int(1, 9)).padStart(2, '0')}`;
        const acao = rng.int(0, 3);
        const lista = await s.entries.list(ws.id);
        if (acao === 0 || lista.length === 0) {
          await s.entries
            .create(ws.id, {
              kind: rng.bool() ? 'despesa' : 'receita',
              accountId: rng.pick([b.banco, b.carteira]),
              parts: [{ categoryId: b.mercado, amountCents: rng.int(1, 90000) }],
              date: dia,
              status: rng.int(0, 3) === 0 ? 'pendente' : 'realizado',
              description: 'x',
              operationId: s.newOperationId(),
            })
            .catch(async () => {
              await s.entries.create(ws.id, {
                kind: 'receita',
                accountId: b.banco,
                parts: [{ categoryId: b.salario, amountCents: 1000 }],
                date: dia,
                status: 'realizado',
                description: 'y',
                operationId: s.newOperationId(),
              });
            });
        } else if (acao === 1) {
          await s.transfer(ws.id, {
            fromId: b.banco,
            toId: b.carteira,
            amountCents: rng.int(1, 5000),
            feeCents: rng.int(0, 200),
            date: dia,
            operationId: s.newOperationId(),
          });
        } else if (acao === 2) {
          const alvo = rng.pick(lista);
          await s.entries.remove(ws.id, { entryId: alvo.entryId, operationId: s.newOperationId() });
        } else {
          const alvo = rng.pick(lista);
          if (alvo.status === 'realizado') {
            await s.entries
              .edit(ws.id, alvo.entryId, {
                kind: alvo.kind,
                accountId: alvo.accountId,
                parts: alvo.parts,
                date: dia,
                status: 'realizado',
                description: 'editado',
                operationId: s.newOperationId(),
              })
              .catch(() => undefined);
          }
        }
        const de = parseCivilDate(`2027-03-0${String(rng.int(1, 4))}`);
        const ate = parseCivilDate('2027-03-10');
        for (const accountId of [b.banco, b.carteira, undefined]) {
          const e = await s.entries.explainBalance(ws.id, {
            ...(accountId ? { accountId } : {}),
            from: de,
            to: ate,
          });
          expect(e.groups.reduce((t, g) => t + g.totalCents, 0)).toBe(
            (e.closing?.cents ?? 0) - (e.opening?.cents ?? 0),
          );
          for (const g of e.groups) expect(g.items.reduce((t, i) => t + i.amountCents, 0)).toBe(g.totalCents);
        }
      },
      30,
    );
  });
});
