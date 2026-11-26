// Receitas e despesas: linhas, divisão, pendente, edição, exclusão e desfazer (Volume 04, seções 4 e 7.4).
import { describe, expect, it } from 'vitest';
import { addDays, parseCivilDate } from './civil-date';
import { DomainError } from './errors';
import type { FlowInput } from './income-expense';
import {
  activeEntries,
  confirmPending,
  deleteFlow,
  editFlow,
  editHistory,
  recordFlow,
  restorePending,
  undoDelete,
} from './income-expense';
import type { Journal } from './journal';
import { appendOperation, applyUpdate, emptyJournal } from './journal';
import type { JournalEntry, LedgerAccount } from './ledger';
import { balancesAt } from './ledger';
import { allocateEqually, money } from './money';
import { reverseEntry } from './operations';
import { FUTURO, PF, PJ, ctx, lookup, planoDeContas } from './testing/fixtures';
import { forAll } from './testing/prop';

const pf = planoDeContas(PF);
const pj = planoDeContas(PJ);
const cat = (nome: string, group: 'income' | 'expense'): LedgerAccount => ({
  id: `${PF}:${nome}`,
  workspaceId: PF,
  group,
});
const mercado = cat('mercado', 'expense');
const farmacia = cat('farmacia', 'expense');
const lazer = cat('lazer', 'expense');
const freela = cat('freela', 'income');
const contas = lookup(pf, pj, { mercado, farmacia, lazer, freela });

const codigo = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    throw e;
  }
  return 'sem erro';
};

const despesa = (valor: number, extra: Partial<FlowInput> = {}): FlowInput => ({
  kind: 'despesa',
  account: pf.banco,
  parts: [{ category: mercado, amount: money(valor) }],
  status: 'realizado',
  ...extra,
});

function aplicar(journal: Journal, change: ReturnType<typeof recordFlow>, operationId: string): Journal {
  if (change.replace.length || change.remove.length) {
    return applyUpdate(journal, { operationId, workspaceId: PF, ...change }, contas);
  }
  return appendOperation(journal, change.add, contas);
}

const saldo = (j: Iterable<JournalEntry>, conta: LedgerAccount) =>
  balancesAt(j, contas, PF, FUTURO).get(conta.id) ?? 0;

describe('[LAN-001] receita e despesa viram lançamentos balanceados', () => {
  it('[LAN-001] receita: entra na conta e na categoria de receita', () => {
    const [e] = recordFlow(ctx(PF, '2027-03-05'), {
      kind: 'receita',
      account: pf.banco,
      parts: [{ category: pf.salario, amount: money(300000) }],
      status: 'realizado',
      meta: { description: 'Salário', vazio: '' },
    }).add;
    expect(e?.lines).toEqual([
      { accountId: pf.banco.id, side: 'D', amount: 300000 },
      { accountId: pf.salario.id, side: 'C', amount: 300000 },
    ]);
    expect(e?.kind).toBe('receita');
    expect(e?.meta).toEqual({ description: 'Salário' });
  });

  it('[LAN-001] despesa: sai da conta e entra na categoria de despesa', () => {
    const [e] = recordFlow(ctx(PF, '2027-03-05'), despesa(5000)).add;
    expect(e?.lines).toEqual([
      { accountId: mercado.id, side: 'D', amount: 5000 },
      { accountId: pf.banco.id, side: 'C', amount: 5000 },
    ]);
    expect(saldo([e as JournalEntry], pf.banco)).toBe(-5000);
  });

  it('[CAT-001] receita só aceita categoria de receita, e despesa só de despesa', () => {
    const c = ctx(PF, '2027-03-05');
    expect(
      codigo(() => recordFlow(c, despesa(100, { parts: [{ category: freela, amount: money(100) }] }))),
    ).toBe('OPERATION_INVALID');
    expect(
      codigo(() =>
        recordFlow(c, {
          ...despesa(100),
          kind: 'receita',
          parts: [{ category: mercado, amount: money(100) }],
        }),
      ),
    ).toBe('OPERATION_INVALID');
    expect(codigo(() => recordFlow(c, despesa(100, { account: pf.cartao })))).toBe('OPERATION_INVALID');
  });

  it('[LAN-001] recusa valor zero, negativo, categoria repetida, parte demais e categoria de outro espaço', () => {
    const c = ctx(PF, '2027-03-05');
    expect(codigo(() => recordFlow(c, despesa(0)))).toBe('OPERATION_INVALID');
    expect(codigo(() => recordFlow(c, despesa(-10)))).toBe('OPERATION_INVALID');
    expect(codigo(() => recordFlow(c, despesa(10, { parts: [] })))).toBe('OPERATION_INVALID');
    const duas = [
      { category: mercado, amount: money(10) },
      { category: mercado, amount: money(20) },
    ];
    expect(codigo(() => recordFlow(c, despesa(10, { parts: duas })))).toBe('OPERATION_INVALID');
    expect(
      codigo(() => recordFlow(c, despesa(10, { parts: [{ category: pj.tarifas, amount: money(10) }] }))),
    ).toBe('WORKSPACE_MISMATCH');
    const muitas = Array.from({ length: 51 }, (_, i) => ({
      category: cat(`c${String(i)}`, 'expense'),
      amount: money(1),
    }));
    expect(codigo(() => recordFlow(c, despesa(10, { parts: muitas })))).toBe('OPERATION_INVALID');
    expect(codigo(() => recordFlow(c, despesa(10, { meta: { description: 'x'.repeat(2001) } })))).toBe(
      'ENTRY_INVALID',
    );
    const metaDemais = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${String(i)}`, 'v']));
    expect(codigo(() => recordFlow(c, despesa(10, { meta: metaDemais })))).toBe('ENTRY_INVALID');
    expect(codigo(() => recordFlow(c, despesa(10, { meta: { '': 'v' } })))).toBe('ENTRY_INVALID');
  });
});

describe('[LAN-007] divisão em várias categorias (INV-07)', () => {
  it('[LAN-007] 80 de mercado + 40 de farmácia: uma saída de 120', () => {
    const [e] = recordFlow(
      ctx(PF, '2027-03-05'),
      despesa(0, {
        parts: [
          { category: mercado, amount: money(8000) },
          { category: farmacia, amount: money(4000) },
        ],
      }),
    ).add;
    expect(e?.lines).toEqual([
      { accountId: mercado.id, side: 'D', amount: 8000 },
      { accountId: farmacia.id, side: 'D', amount: 4000 },
      { accountId: pf.banco.id, side: 'C', amount: 12000 },
    ]);
  });

  it('[LAN-007] INV-07: dividir em partes iguais fecha o total ao centavo, com qualquer valor', () => {
    forAll('INV-07 divisão de lançamento', (rng) => {
      const total = rng.cents(100_000_000);
      const cats = [mercado, farmacia, lazer].slice(0, rng.int(1, 3));
      const partes = allocateEqually(money(total), cats.length).filter((p) => p.amount > 0);
      const [e] = recordFlow(
        ctx(PF, '2027-03-05'),
        despesa(0, { parts: partes.map((amount, i) => ({ category: cats[i] ?? mercado, amount })) }),
      ).add;
      expect(e?.lines.at(-1)?.amount).toBe(total);
      expect(saldo([e as JournalEntry], pf.banco)).toBe(-total);
    });
  });
});

describe('[LAN-003] pendente e confirmação (INV-02)', () => {
  it('[LAN-003] INV-02: pendente nunca mexe no saldo; confirmado entra na data confirmada', () => {
    forAll('INV-02 pendente de receita e despesa', (rng) => {
      const valor = rng.cents(1_000_000);
      const quando = addDays(parseCivilDate('2027-01-01'), rng.int(0, 400));
      const c = ctx(PF, quando);
      let j = aplicar(emptyJournal, recordFlow(c, despesa(valor, { status: 'pendente' })), c.operationId);
      expect(saldo(j.values(), pf.banco)).toBe(0);
      expect(saldo(j.values(), mercado)).toBe(0);
      const pendente = [...j.values()][0] as JournalEntry;
      const conf = ctx(PF, '2027-02-10');
      j = aplicar(j, confirmPending(conf, pendente), conf.operationId);
      const confirmado = j.get(pendente.entryId);
      expect(confirmado?.status).toBe('realizado');
      expect(confirmado?.date).toBe('2027-02-10');
      expect(saldo(j.values(), pf.banco)).toBe(-valor);
    });
  });

  it('[LAN-003] confirmar duas vezes ou em outro espaço é recusado', () => {
    const [p] = recordFlow(ctx(PF, '2027-03-05'), despesa(100, { status: 'pendente' })).add;
    const pendente = p as JournalEntry;
    const [r] = recordFlow(ctx(PF, '2027-03-05'), despesa(100)).add;
    expect(codigo(() => confirmPending(ctx(PF, '2027-03-06'), r as JournalEntry))).toBe('OPERATION_INVALID');
    expect(codigo(() => confirmPending(ctx(PJ, '2027-03-06'), pendente))).toBe('WORKSPACE_MISMATCH');
  });
});

describe('[LAN-004] edição (Volume 04, seção 7.4)', () => {
  const base = () => {
    const c = ctx(PF, '2027-03-05');
    const j = aplicar(
      emptyJournal,
      recordFlow(c, despesa(5000, { meta: { description: 'Feira' } })),
      c.operationId,
    );
    return { j, original: [...j.values()][0] as JournalEntry };
  };

  it('[LAN-004] mudar o valor gera estorno na data antiga e lançamento novo vinculado, na mesma operação', () => {
    const { j, original } = base();
    const c = ctx(PF, '2027-04-02');
    const change = editFlow(c, original, despesa(7000, { meta: { description: 'Feira' } }));
    expect(change.add).toHaveLength(2);
    const [estorno, novo] = change.add;
    expect(estorno?.links).toEqual({ reverses: original.entryId });
    expect(estorno?.date).toBe('2027-03-05');
    expect(novo?.links).toEqual({ replaces: original.entryId });
    expect(novo?.date).toBe('2027-04-02');
    const depois = aplicar(j, change, c.operationId);
    expect(saldo(depois.values(), pf.banco)).toBe(-7000);
    expect(activeEntries(depois.values()).map((e) => e.entryId)).toEqual([novo?.entryId]);
    expect(editHistory(depois.values(), novo?.entryId ?? '').map((e) => e.entryId)).toEqual([
      novo?.entryId,
      original.entryId,
    ]);
  });

  it('[LAN-004] mudar só a descrição troca o meta, sem estorno; sem mudança é recusado', () => {
    const { j, original } = base();
    const c = ctx(PF, '2027-03-05');
    const change = editFlow(c, original, despesa(5000, { meta: { description: 'Feira do sábado' } }));
    expect(change.add).toHaveLength(0);
    expect(change.replace[0]?.meta).toEqual({ description: 'Feira do sábado' });
    const depois = aplicar(j, change, c.operationId);
    expect(depois.get(original.entryId)?.meta['description']).toBe('Feira do sábado');
    expect(codigo(() => editFlow(c, original, despesa(5000, { meta: { description: 'Feira' } })))).toBe(
      'OPERATION_INVALID',
    );
  });

  it('[LAN-004] pendente é trocado direto; realizado não volta a pendente; estorno não se edita aqui', () => {
    const c = ctx(PF, '2027-03-05');
    const [p] = recordFlow(c, despesa(100, { status: 'pendente' })).add;
    const pendente = p as JournalEntry;
    const troca = editFlow(ctx(PF, '2027-05-01'), pendente, despesa(250, { status: 'pendente' }));
    expect(troca.replace[0]?.entryId).toBe(pendente.entryId);
    expect(troca.replace[0]?.date).toBe('2027-05-01');
    const { original } = base();
    expect(codigo(() => editFlow(c, original, despesa(100, { status: 'pendente' })))).toBe(
      'OPERATION_INVALID',
    );
    const [estorno] = reverseEntry(c, original);
    expect(codigo(() => editFlow(c, estorno as JournalEntry, despesa(100)))).toBe('OPERATION_INVALID');
    expect(codigo(() => editFlow(ctx(PJ, '2027-03-05'), original, despesa(100)))).toBe('WORKSPACE_MISMATCH');
  });
});

describe('[LAN-006] exclusão com desfazer', () => {
  it('[LAN-006] realizado: estorno marcado como exclusão; desfazer é estorno do estorno', () => {
    const c = ctx(PF, '2027-03-05');
    let j = aplicar(emptyJournal, recordFlow(c, despesa(5000)), c.operationId);
    const original = [...j.values()][0] as JournalEntry;
    const del = ctx(PF, '2027-03-20');
    const change = deleteFlow(del, original);
    expect(change.add[0]?.links).toEqual({ reverses: original.entryId, deletes: original.entryId });
    expect(change.add[0]?.date).toBe(original.date);
    j = aplicar(j, change, del.operationId);
    expect(saldo(j.values(), pf.banco)).toBe(0);
    expect(activeEntries(j.values())).toHaveLength(0);
    const desfazer = ctx(PF, '2027-03-20');
    j = aplicar(j, undoDelete(desfazer, change.add[0] as JournalEntry), desfazer.operationId);
    expect(saldo(j.values(), pf.banco)).toBe(-5000);
    expect(activeEntries(j.values()).map((e) => e.entryId)).toEqual([original.entryId]);
    expect(codigo(() => undoDelete(desfazer, original))).toBe('OPERATION_INVALID');
  });

  it('[LAN-006] pendente sai do diário e volta igual', () => {
    const c = ctx(PF, '2027-03-05');
    let j = aplicar(emptyJournal, recordFlow(c, despesa(5000, { status: 'pendente' })), c.operationId);
    const pendente = [...j.values()][0] as JournalEntry;
    const del = ctx(PF, '2027-03-20');
    j = aplicar(j, deleteFlow(del, pendente), del.operationId);
    expect(j.size).toBe(0);
    j = aplicar(j, restorePending(pendente), 'desfazer');
    expect(j.get(pendente.entryId)).toEqual(pendente);
    const [r] = recordFlow(c, despesa(1)).add;
    expect(codigo(() => restorePending(r as JournalEntry))).toBe('OPERATION_INVALID');
  });
});

describe('[LAN-005] estorno, edição e exclusão nunca mudam o saldo por fora (INV-11)', () => {
  it('[LAN-005] INV-11: qualquer sequência de registrar, editar, excluir e desfazer bate com o modelo', () => {
    forAll('INV-11 receitas e despesas', (rng) => {
      let j: Journal = emptyJournal;
      const vivos = new Map<string, JournalEntry>();
      const exclusoes: JournalEntry[] = [];
      const pendExcluidos: JournalEntry[] = [];
      let n = 0;
      const novaCtx = () =>
        ctx(PF, addDays(parseCivilDate('2027-01-01'), rng.int(0, 200)), `p-${String(n++)}`);
      const sortear = (): FlowInput => {
        const kind = rng.bool() ? 'despesa' : 'receita';
        const cats = kind === 'despesa' ? [mercado, farmacia, lazer] : [pf.salario, freela];
        const usar = cats.slice(0, rng.int(1, cats.length));
        return {
          kind,
          account: rng.pick([pf.banco, pf.digital, pf.carteira]),
          parts: usar.map((category) => ({ category, amount: money(rng.cents(1_000_000)) })),
          status: rng.int(0, 3) === 0 ? 'pendente' : 'realizado',
          meta: { description: `d${String(rng.int(0, 3))}` },
        };
      };
      for (let passo = 0; passo < 12; passo++) {
        const c = novaCtx();
        const lista = [...vivos.values()];
        const acao = lista.length === 0 ? 0 : rng.int(0, 4);
        if (acao === 0) {
          const ch = recordFlow(c, sortear());
          j = aplicar(j, ch, c.operationId);
          for (const e of ch.add) vivos.set(e.entryId, e);
        } else if (acao === 1) {
          const alvo = rng.pick(lista);
          const entrada = sortear();
          const input = alvo.status === 'realizado' ? { ...entrada, status: 'realizado' as const } : entrada;
          let ch;
          try {
            ch = editFlow(c, alvo, input);
          } catch {
            continue;
          }
          j = aplicar(j, ch, c.operationId);
          vivos.delete(alvo.entryId);
          const novo = ch.replace[0] ?? ch.add[1];
          if (novo) vivos.set(novo.entryId, novo);
        } else if (acao === 2) {
          const alvo = rng.pick(lista);
          const ch = deleteFlow(c, alvo);
          j = aplicar(j, ch, c.operationId);
          vivos.delete(alvo.entryId);
          if (ch.add[0]) exclusoes.push(ch.add[0]);
          else pendExcluidos.push(alvo);
        } else if (acao === 3 && exclusoes.length) {
          const exc = exclusoes.splice(rng.int(0, exclusoes.length - 1), 1)[0] as JournalEntry;
          j = aplicar(j, undoDelete(c, exc), c.operationId);
          const volta = j.get(exc.links.deletes ?? '');
          if (volta) vivos.set(volta.entryId, volta);
        } else if (pendExcluidos.length) {
          const p = pendExcluidos.splice(0, 1)[0] as JournalEntry;
          j = aplicar(j, restorePending(p), c.operationId);
          vivos.set(p.entryId, p);
        }
        const todos = [...j.values()];
        const ativos = activeEntries(todos);
        expect(new Set(ativos.map((e) => e.entryId))).toEqual(new Set(vivos.keys()));
        expect(balancesAt(todos, contas, PF, FUTURO)).toEqual(balancesAt(ativos, contas, PF, FUTURO));
        expect(balancesAt(todos, contas, PF, FUTURO)).toEqual(balancesAt(vivos.values(), contas, PF, FUTURO));
      }
    });
  });
});

describe('[LAN-004] regras do diário para trocar e remover', () => {
  const c = ctx(PF, '2027-03-05');
  const real = recordFlow(c, despesa(100)).add[0] as JournalEntry;
  const c2 = ctx(PF, '2027-03-05');
  const pend = recordFlow(c2, despesa(100, { status: 'pendente' })).add[0] as JournalEntry;
  const j = appendOperation(appendOperation(emptyJournal, [real], contas), [pend], contas);
  const up = (u: Partial<Parameters<typeof applyUpdate>[1]>) =>
    codigo(() =>
      applyUpdate(j, { operationId: 'x', workspaceId: PF, add: [], replace: [], remove: [], ...u }, contas),
    );

  it('[LAN-004] realizado só troca o meta; nada é apagado de realizado', () => {
    expect(up({ replace: [{ ...real, lines: pend.lines.map((l) => ({ ...l, amount: 999 })) }] })).toBe(
      'OPERATION_INVALID',
    );
    expect(up({ replace: [{ ...real, date: parseCivilDate('2027-03-06') }] })).toBe('OPERATION_INVALID');
    expect(up({ remove: [real.entryId] })).toBe('OPERATION_INVALID');
    expect(up({ replace: [{ ...real, meta: { description: 'ok' } }] })).toBe('sem erro');
  });

  it('[LAN-004] recusa operação vazia, lançamento repetido, inexistente, identidade trocada e outro espaço', () => {
    expect(up({})).toBe('OPERATION_INVALID');
    expect(up({ remove: [pend.entryId, pend.entryId] })).toBe('OPERATION_INVALID');
    expect(up({ remove: ['nao-existe'] })).toBe('OPERATION_INVALID');
    expect(up({ replace: [{ ...pend, operationId: 'outra' }] })).toBe('OPERATION_INVALID');
    expect(up({ add: [real] })).toBe('OPERATION_CONFLICT');
    expect(up({ add: [{ ...real, entryId: 'novo', workspaceId: PJ }] })).toBe('WORKSPACE_MISMATCH');
    expect(up({ workspaceId: PJ, remove: [pend.entryId] })).toBe('WORKSPACE_MISMATCH');
    expect(up({ replace: [{ ...pend, lines: [] }] })).toBe('ENTRY_UNBALANCED');
  });

  it('[LAN-005] corrente de estornos adulterada em ciclo não trava a lista', () => {
    const a = { ...real, entryId: 'a', kind: 'estorno' as const, links: { reverses: 'b' } };
    const b = { ...real, entryId: 'b', kind: 'estorno' as const, links: { reverses: 'a' } };
    expect(activeEntries([a, b, real])).toEqual([real]);
  });
});
