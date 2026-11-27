// Mesclar categorias e recategorizar em lote: só a distribuição entre categorias muda (CAT-002, CAT-004).
import { describe, expect, it } from 'vitest';
import { addDays, parseCivilDate } from './civil-date';
import { DomainError } from './errors';
import { activeEntries, recordFlow } from './income-expense';
import type { Journal } from './journal';
import { appendOperation, applyUpdate, emptyJournal } from './journal';
import type { JournalEntry, LedgerAccount } from './ledger';
import { balancesAt } from './ledger';
import { money } from './money';
import { entriesUsing, recategorize } from './recategorize';
import { FUTURO, PF, PJ, ctx, lookup, planoDeContas } from './testing/fixtures';
import { forAll } from './testing/prop';

const pf = planoDeContas(PF);
const pj = planoDeContas(PJ);
const cat = (nome: string, group: 'income' | 'expense', ws = PF): LedgerAccount => ({
  id: `${ws}:${nome}`,
  workspaceId: ws,
  group,
});
const mercado = cat('mercado', 'expense');
const feira = cat('feira', 'expense');
const lazer = cat('lazer', 'expense');
const freela = cat('freela', 'income');
const contas = lookup(pf, pj, { mercado, feira, lazer, freela });
const despesas = [mercado, feira, lazer];

const codigo = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    throw e;
  }
  return 'sem erro';
};

const total = (b: ReadonlyMap<string, number>, ids: readonly string[]) =>
  ids.reduce((t, id) => t + (b.get(id) ?? 0), 0);

function aplicar(j: Journal, ch: ReturnType<typeof recategorize>, operationId: string): Journal {
  return ch.replace.length
    ? applyUpdate(j, { operationId, workspaceId: PF, ...ch }, contas)
    : appendOperation(j, ch.add, contas);
}

describe('[CAT-002] mesclar categorias', () => {
  it('[CAT-002] propriedade: saldos das contas e totais de receita e despesa não mudam; A fica zerada', () => {
    forAll('mesclar conserva os totais', (rng) => {
      let j: Journal = emptyJournal;
      const n = rng.int(1, 15);
      for (let i = 0; i < n; i++) {
        const c = ctx(PF, addDays(parseCivilDate('2027-01-01'), rng.int(0, 120)), `op-${String(i)}`);
        const usar = despesas.filter(() => rng.bool());
        const kind = rng.int(0, 4) === 0 ? 'receita' : 'despesa';
        const partes = kind === 'receita' ? [freela] : usar.length ? usar : [mercado];
        j = appendOperation(
          j,
          recordFlow(c, {
            kind,
            account: rng.pick([pf.banco, pf.carteira]),
            parts: partes.map((category) => ({ category, amount: money(rng.cents(500_000)) })),
            status: rng.int(0, 3) === 0 ? 'pendente' : 'realizado',
          }).add,
          contas,
        );
      }
      const usados = entriesUsing(activeEntries(j.values()), new Set([feira.id]));
      if (!usados.length) return;
      const antes = balancesAt(j.values(), contas, PF, FUTURO);
      const pendentesAntes = [...j.values()].filter((e) => e.status === 'pendente').length;
      const ativosAntes = activeEntries(j.values()).length;
      const m = ctx(PF, '2027-06-01', 'mesclar');
      const ch = recategorize(m, usados, new Map([[feira.id, mercado.id]]), contas);
      j = aplicar(j, ch, m.operationId);
      const depois = balancesAt(j.values(), contas, PF, FUTURO);
      for (const conta of [pf.banco, pf.carteira, freela])
        expect(depois.get(conta.id) ?? 0).toBe(antes.get(conta.id) ?? 0);
      expect(
        total(
          depois,
          despesas.map((x) => x.id),
        ),
      ).toBe(
        total(
          antes,
          despesas.map((x) => x.id),
        ),
      );
      expect(depois.get(feira.id) ?? 0).toBe(0);
      expect(depois.get(mercado.id) ?? 0).toBe((antes.get(mercado.id) ?? 0) + (antes.get(feira.id) ?? 0));
      expect(entriesUsing(activeEntries(j.values()), new Set([feira.id]))).toHaveLength(0);
      expect([...j.values()].filter((e) => e.status === 'pendente')).toHaveLength(pendentesAntes);
      expect(activeEntries(j.values())).toHaveLength(ativosAntes);
    });
  });

  it('[CAT-002] realizado: estorno e lançamento novo na data dele, com a mesma descrição; pendente trocado direto', () => {
    const c = ctx(PF, '2027-02-10');
    const real = recordFlow(c, {
      kind: 'despesa',
      account: pf.banco,
      parts: [
        { category: feira, amount: money(1000) },
        { category: mercado, amount: money(500) },
      ],
      status: 'realizado',
      meta: { description: 'Sacolão' },
    }).add[0] as JournalEntry;
    const pend = recordFlow(ctx(PF, '2027-03-01'), {
      kind: 'despesa',
      account: pf.banco,
      parts: [{ category: feira, amount: money(300) }],
      status: 'pendente',
    }).add[0] as JournalEntry;
    const ch = recategorize(ctx(PF, '2027-06-01'), [real, pend], new Map([[feira.id, mercado.id]]), contas);
    const [estorno, novo] = ch.add;
    expect(estorno?.links).toEqual({ reverses: real.entryId });
    expect([estorno?.date, novo?.date]).toEqual(['2027-02-10', '2027-02-10']);
    expect(novo?.meta).toEqual({ description: 'Sacolão' });
    expect(novo?.links).toEqual({ replaces: real.entryId });
    // As duas partes caem em Mercado e viram uma só, com a soma.
    expect(novo?.lines).toEqual([
      { accountId: mercado.id, side: 'D', amount: 1500 },
      { accountId: pf.banco.id, side: 'C', amount: 1500 },
    ]);
    expect(ch.replace).toEqual([
      { ...pend, lines: [{ ...pend.lines[0], accountId: mercado.id }, pend.lines[1]] },
    ]);
  });

  it('[CAT-002] recusa destino igual, de outro tipo, de outro espaço, lista vazia, repetida ou sem a origem', () => {
    const c = ctx(PF, '2027-06-01');
    const e = recordFlow(ctx(PF, '2027-02-10'), {
      kind: 'despesa',
      account: pf.banco,
      parts: [{ category: feira, amount: money(1000) }],
      status: 'realizado',
    }).add[0] as JournalEntry;
    const pjCat = cat('x', 'expense', PJ);
    const comPj = lookup(pf, pj, { mercado, feira, lazer, freela, pjCat });
    expect(codigo(() => recategorize(c, [e], new Map(), contas))).toBe('OPERATION_INVALID');
    expect(codigo(() => recategorize(c, [e], new Map([[feira.id, feira.id]]), contas))).toBe(
      'OPERATION_INVALID',
    );
    expect(codigo(() => recategorize(c, [e], new Map([[feira.id, freela.id]]), contas))).toBe(
      'OPERATION_INVALID',
    );
    expect(codigo(() => recategorize(c, [e], new Map([[feira.id, pjCat.id]]), comPj))).toBe(
      'WORKSPACE_MISMATCH',
    );
    expect(codigo(() => recategorize(c, [e], new Map([[feira.id, 'nao-existe']]), contas))).toBe(
      'OPERATION_INVALID',
    );
    expect(codigo(() => recategorize(c, [], new Map([[feira.id, mercado.id]]), contas))).toBe(
      'OPERATION_INVALID',
    );
    expect(codigo(() => recategorize(c, [e, e], new Map([[feira.id, mercado.id]]), contas))).toBe(
      'OPERATION_INVALID',
    );
    expect(codigo(() => recategorize(c, [e], new Map([[lazer.id, mercado.id]]), contas))).toBe(
      'OPERATION_INVALID',
    );
    expect(codigo(() => recategorize(c, [e], new Map([[pf.banco.id, pf.carteira.id]]), contas))).toBe(
      'OPERATION_INVALID',
    );
    const transf = { ...e, kind: 'transferencia' as const };
    expect(codigo(() => recategorize(c, [transf], new Map([[feira.id, mercado.id]]), contas))).toBe(
      'OPERATION_INVALID',
    );
  });
});
