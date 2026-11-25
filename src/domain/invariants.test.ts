// Invariantes do Volume 04, seção 5, com testes de propriedade (D-015).
import { describe, expect, it } from 'vitest';
import type { CivilDate } from './civil-date';
import { addDays, parseCivilDate } from './civil-date';
import { DomainError } from './errors';
import type { Journal } from './journal';
import { appendOperation, emptyJournal } from './journal';
import type { JournalEntry, LedgerAccount } from './ledger';
import { balancesAt, entryIdFor, journalImbalance, signedEffect, validateEntry } from './ledger';
import { money } from './money';
import { balanceAdjustment, openingBalance, reverseEntry, transfer } from './operations';
import type { Rng } from './testing/prop';
import { forAll } from './testing/prop';
import { FUTURO, PF, lookup, planoDeContas } from './testing/fixtures';

const pf = planoDeContas(PF);
const contas = lookup(pf);
const dinheiro: LedgerAccount[] = [pf.banco, pf.digital, pf.carteira];
const inicio = parseCivilDate('2027-01-01');

const codigo = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    throw e;
  }
  return 'sem erro';
};

/** Sorteia uma operação válida da Alpha 1. */
function sortearOperacao(rng: Rng, n: number, realizados: JournalEntry[]): JournalEntry[] {
  const c = {
    workspaceId: PF,
    operationId: `op-${String(n)}`,
    date: addDays(inicio, rng.int(0, 365)),
  };
  const valor = money(rng.cents(1_000_000_000));
  const tipo = rng.int(0, 3);
  if (tipo === 0) {
    const conta = rng.pick([...dinheiro, pf.cartao]);
    return openingBalance(c, {
      account: conta,
      openingEquity: pf.abertura,
      amount: rng.bool() ? valor : money(-valor.amount),
    });
  }
  if (tipo === 1) {
    const from = rng.pick(dinheiro);
    const to = rng.pick(dinheiro.filter((a) => a.id !== from.id));
    const comTarifa = rng.bool();
    return transfer(
      c,
      comTarifa
        ? { from, to, amount: valor, fee: money(rng.int(1, 1000)), feeAccount: pf.tarifas }
        : { from, to, amount: valor },
    );
  }
  if (tipo === 2) {
    const delta = rng.bool() ? valor : money(-valor.amount);
    return balanceAdjustment(c, {
      account: rng.pick(dinheiro),
      adjustmentEquity: pf.ajustes,
      delta,
      reason: 'conferência',
    });
  }
  const alvo = realizados.length ? rng.pick(realizados) : undefined;
  if (!alvo) return transfer(c, { from: pf.banco, to: pf.digital, amount: valor });
  return reverseEntry(c, alvo);
}

/** Monta um diário aleatório e, junto, o saldo acumulado lançamento a lançamento (o "cache"). */
function cenario(rng: Rng) {
  let journal: Journal = emptyJournal;
  const cache = new Map<string, number>();
  const realizados: JournalEntry[] = [];
  const total = rng.int(1, 30);
  for (let i = 0; i < total; i++) {
    const op = sortearOperacao(rng, i, realizados);
    journal = appendOperation(journal, op, contas);
    for (const e of op) {
      realizados.push(e);
      for (const l of e.lines) {
        const conta = contas.get(l.accountId) as LedgerAccount;
        cache.set(l.accountId, (cache.get(l.accountId) ?? 0) + signedEffect(l, conta.group));
      }
    }
  }
  return { journal, cache };
}

const soma = (saldos: Map<string, number>, ids: string[]) =>
  ids.reduce((a, id) => a + (saldos.get(id) ?? 0), 0);

describe('[CON-003] saldo é sempre calculado dos lançamentos (INV-01)', () => {
  it('recalcular do zero dá o mesmo saldo do acumulado', () => {
    forAll('INV-01', (rng) => {
      const { journal, cache } = cenario(rng);
      const saldos = balancesAt(journal.values(), contas, PF, FUTURO);
      for (const [id, valor] of cache) expect(saldos.get(id)).toBe(valor);
    });
  });

  it('INV-02: lançamento pendente não altera nenhum saldo realizado', () => {
    forAll('INV-02', (rng) => {
      const { journal } = cenario(rng);
      const antes = balancesAt(journal.values(), contas, PF, FUTURO);
      const op = sortearOperacao(rng, 999, []).map((e) => ({ ...e, status: 'pendente' as const }));
      const depois = balancesAt(appendOperation(journal, op, contas).values(), contas, PF, FUTURO);
      expect(depois).toEqual(antes);
    });
  });
});

describe('[CON-004] transferência não muda o total do espaço, só a tarifa (INV-03)', () => {
  it('total em dinheiro cai só a tarifa; receitas não mudam; despesas sobem só a tarifa', () => {
    forAll('INV-03', (rng) => {
      const { journal } = cenario(rng);
      const antes = balancesAt(journal.values(), contas, PF, FUTURO);
      const tarifa = rng.bool() ? rng.int(1, 5000) : 0;
      const from = rng.pick(dinheiro);
      const to = rng.pick(dinheiro.filter((a) => a.id !== from.id));
      const op = transfer(
        { workspaceId: PF, operationId: 'op-transf', date: inicio },
        { from, to, amount: money(rng.cents(99_999_999_999)), fee: money(tarifa), feeAccount: pf.tarifas },
      );
      const depois = balancesAt(appendOperation(journal, op, contas).values(), contas, PF, FUTURO);
      const ids = dinheiro.map((a) => a.id);
      expect(soma(depois, ids) - soma(antes, ids) + tarifa).toBe(0);
      expect(soma(depois, [pf.salario.id])).toBe(soma(antes, [pf.salario.id]));
      expect(soma(depois, [pf.tarifas.id]) - soma(antes, [pf.tarifas.id])).toBe(tarifa);
    });
  });
});

describe('[LAN-012] a mesma operação repetida grava uma vez só (INV-06)', () => {
  it('aplicar N vezes é igual a aplicar uma vez', () => {
    forAll('INV-06', (rng) => {
      const { journal } = cenario(rng);
      const op = sortearOperacao(rng, 500, []);
      const uma = appendOperation(journal, op, contas);
      let varias = uma;
      for (let i = rng.int(1, 5); i > 0; i--) varias = appendOperation(varias, op, contas);
      expect(varias).toBe(uma);
      expect(varias.size).toBe(journal.size + op.length);
    });
  });

  it('mesma operação com outro conteúdo é conflito, nunca sobrescreve', () => {
    const op = transfer(
      { workspaceId: PF, operationId: 'x', date: inicio },
      { from: pf.banco, to: pf.digital, amount: money(10) },
    );
    const j = appendOperation(emptyJournal, op, contas);
    const outra = transfer(
      { workspaceId: PF, operationId: 'x', date: inicio },
      { from: pf.banco, to: pf.digital, amount: money(20) },
    );
    expect(codigo(() => appendOperation(j, outra, contas))).toBe('OPERATION_CONFLICT');
  });

  it('operação vazia, com IDs de operações diferentes ou gravada pela metade é recusada', () => {
    expect(codigo(() => appendOperation(emptyJournal, [], contas))).toBe('OPERATION_INVALID');
    const a = transfer(
      { workspaceId: PF, operationId: 'a', date: inicio },
      { from: pf.banco, to: pf.digital, amount: money(1) },
    );
    const b = transfer(
      { workspaceId: PF, operationId: 'b', date: inicio },
      { from: pf.banco, to: pf.digital, amount: money(1) },
    );
    expect(codigo(() => appendOperation(emptyJournal, [...a, ...b], contas))).toBe('OPERATION_INVALID');
    const j = appendOperation(emptyJournal, a, contas);
    const segunda = { ...(a[0] as JournalEntry), entryId: entryIdFor('a', 1) };
    expect(codigo(() => appendOperation(j, [a[0] as JournalEntry, segunda], contas))).toBe(
      'OPERATION_CONFLICT',
    );
  });
});

describe('[NFR-013] todo lançamento é balanceado (INV-08) e o diário fecha (INV-10)', () => {
  it('toda operação gerada passa na validação e o diário soma zero em qualquer data', () => {
    forAll('INV-08 e INV-10', (rng) => {
      const { journal } = cenario(rng);
      for (const e of journal.values()) validateEntry(e, contas);
      const data = addDays(inicio, rng.int(-10, 400));
      expect(journalImbalance(balancesAt(journal.values(), contas, PF, data), contas)).toBe(0);
    });
  });

  it('recusa lançamento desbalanceado, com uma linha só ou com valor inválido', () => {
    const [t] = transfer(
      { workspaceId: PF, operationId: 'v', date: inicio },
      { from: pf.banco, to: pf.digital, amount: money(10) },
    );
    const e = t as JournalEntry;
    const l0 = e.lines[0] as JournalEntry['lines'][number];
    const l1 = e.lines[1] as JournalEntry['lines'][number];
    expect(codigo(() => validateEntry({ ...e, lines: [l0, { ...l1, amount: 9 }] }, contas))).toBe(
      'ENTRY_UNBALANCED',
    );
    expect(codigo(() => validateEntry({ ...e, lines: [l0] }, contas))).toBe('ENTRY_UNBALANCED');
    expect(
      codigo(() =>
        validateEntry(
          {
            ...e,
            lines: [
              { ...l0, amount: 0 },
              { ...l1, amount: 0 },
            ],
          },
          contas,
        ),
      ),
    ).toBe('ENTRY_INVALID');
    expect(
      codigo(() =>
        validateEntry(
          {
            ...e,
            lines: [
              { ...l0, amount: 1.5 },
              { ...l1, amount: 1.5 },
            ],
          },
          contas,
        ),
      ),
    ).toBe('ENTRY_INVALID');
    expect(codigo(() => validateEntry({ ...e, date: '2027-02-30' as CivilDate }, contas))).toBe(
      'ENTRY_INVALID',
    );
    expect(codigo(() => validateEntry({ ...e, workspaceId: '' }, contas))).toBe('ENTRY_INVALID');
  });
});

describe('[LAN-005] estorno anula exatamente o original (INV-11)', () => {
  it('lançamento mais estorno deixa todos os saldos como antes', () => {
    forAll('INV-11', (rng) => {
      const { journal } = cenario(rng);
      const antes = balancesAt(journal.values(), contas, PF, FUTURO);
      const op = sortearOperacao(rng, 700, []);
      const com = appendOperation(journal, op, contas);
      let desfeito = com;
      op.forEach((e, i) => {
        const r = reverseEntry({ workspaceId: PF, operationId: `rev-${String(i)}`, date: e.date }, e);
        desfeito = appendOperation(desfeito, r, contas);
      });
      expect(balancesAt(desfeito.values(), contas, PF, FUTURO)).toEqual(antes);
      expect(desfeito.size).toBe(journal.size + 2 * op.length);
    });
  });
});
