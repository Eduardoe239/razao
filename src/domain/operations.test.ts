// Exemplos da tabela do Volume 04, seção 4, e as regras de cada operação da Alpha 1.
import { describe, expect, it } from 'vitest';
import { parseCivilDate } from './civil-date';
import { DomainError } from './errors';
import { appendOperation, emptyJournal } from './journal';
import type { JournalEntry } from './ledger';
import { accountBalance, balancesAt, entryIdFor, journalImbalance, validateEntry } from './ledger';
import { money } from './money';
import { balanceAdjustment, openingBalance, reverseEntry, transfer } from './operations';
import { FUTURO, PF, PJ, ctx, lookup, planoDeContas } from './testing/fixtures';

const pf = planoDeContas(PF);
const pj = planoDeContas(PJ);
const contas = lookup(pf, pj);
const hoje = parseCivilDate('2027-03-10');

const codigo = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    throw e;
  }
  return 'sem erro';
};

function aplicar(...ops: JournalEntry[][]) {
  return ops.reduce((j, op) => appendOperation(j, op, contas), emptyJournal);
}

describe('[CON-001] saldo de abertura vira lançamento', () => {
  it('abrir conta com R$ 1.000: D Banco / C Saldo de abertura, sem contar como receita', () => {
    const [e] = openingBalance(ctx(PF, '2027-03-01'), {
      account: pf.banco,
      openingEquity: pf.abertura,
      amount: money(100000),
    });
    expect(e?.kind).toBe('abertura');
    expect(e?.lines).toEqual([
      { accountId: pf.banco.id, side: 'D', amount: 100000 },
      { accountId: pf.abertura.id, side: 'C', amount: 100000 },
    ]);
    const j = aplicar([e as JournalEntry]);
    expect(accountBalance(j.values(), pf.banco, hoje).amount).toBe(100000);
    expect(accountBalance(j.values(), pf.salario, hoje).amount).toBe(0);
  });

  it('conta que já começa no vermelho', () => {
    const op = openingBalance(ctx(PF, '2027-03-01'), {
      account: pf.banco,
      openingEquity: pf.abertura,
      amount: money(-25000),
    });
    expect(accountBalance(aplicar(op).values(), pf.banco, hoje).amount).toBe(-25000);
  });

  it('abertura de cartão com dívida aumenta o passivo', () => {
    const op = openingBalance(ctx(PF, '2027-03-01'), {
      account: pf.cartao,
      openingEquity: pf.abertura,
      amount: money(5000),
    });
    expect(accountBalance(aplicar(op).values(), pf.cartao, hoje).amount).toBe(5000);
  });

  it('recusa abertura zero, conta errada e contrapartida que não é patrimônio', () => {
    const c = ctx(PF, '2027-03-01');
    expect(
      codigo(() => openingBalance(c, { account: pf.banco, openingEquity: pf.abertura, amount: money(0) })),
    ).toBe('OPERATION_INVALID');
    expect(
      codigo(() => openingBalance(c, { account: pf.tarifas, openingEquity: pf.abertura, amount: money(1) })),
    ).toBe('OPERATION_INVALID');
    expect(
      codigo(() => openingBalance(c, { account: pf.banco, openingEquity: pf.salario, amount: money(1) })),
    ).toBe('OPERATION_INVALID');
  });
});

describe('[CON-004] transferência entre contas do mesmo espaço (INV-03)', () => {
  it('R$ 500 com tarifa de R$ 2: D Conta B 500 / D Tarifas 2 / C Conta A 502', () => {
    const [e] = transfer(ctx(PF, '2027-03-05'), {
      from: pf.banco,
      to: pf.digital,
      amount: money(50000),
      fee: money(200),
      feeAccount: pf.tarifas,
    });
    expect(e?.lines).toEqual([
      { accountId: pf.digital.id, side: 'D', amount: 50000 },
      { accountId: pf.tarifas.id, side: 'D', amount: 200 },
      { accountId: pf.banco.id, side: 'C', amount: 50200 },
    ]);
  });

  it('tarifa zero não gera linha de despesa', () => {
    const [e] = transfer(ctx(PF, '2027-03-05'), {
      from: pf.banco,
      to: pf.digital,
      amount: money(100),
      fee: money(0),
    });
    expect(e?.lines).toHaveLength(2);
  });

  it('recusa valor zero, mesma conta, tarifa sem categoria, tarifa negativa e conta que não é dinheiro', () => {
    const c = ctx(PF, '2027-03-05');
    expect(codigo(() => transfer(c, { from: pf.banco, to: pf.digital, amount: money(0) }))).toBe(
      'OPERATION_INVALID',
    );
    expect(codigo(() => transfer(c, { from: pf.banco, to: pf.banco, amount: money(1) }))).toBe(
      'OPERATION_INVALID',
    );
    expect(
      codigo(() => transfer(c, { from: pf.banco, to: pf.digital, amount: money(1), fee: money(1) })),
    ).toBe('OPERATION_INVALID');
    expect(
      codigo(() =>
        transfer(c, {
          from: pf.banco,
          to: pf.digital,
          amount: money(1),
          fee: money(-1),
          feeAccount: pf.tarifas,
        }),
      ),
    ).toBe('OPERATION_INVALID');
    expect(codigo(() => transfer(c, { from: pf.cartao, to: pf.digital, amount: money(1) }))).toBe(
      'OPERATION_INVALID',
    );
  });
});

describe('[CON-006] ajuste de saldo com motivo', () => {
  it('ajuste de +R$ 12: D Banco / C Ajustes de saldo, com o motivo guardado', () => {
    const [e] = balanceAdjustment(ctx(PF, '2027-03-08'), {
      account: pf.banco,
      adjustmentEquity: pf.ajustes,
      delta: money(1200),
      reason: ' Conferência com o extrato ',
    });
    expect(e?.lines[0]).toEqual({ accountId: pf.banco.id, side: 'D', amount: 1200 });
    expect(e?.meta['reason']).toBe('Conferência com o extrato');
  });

  it('ajuste negativo diminui o saldo', () => {
    const op = balanceAdjustment(ctx(PF, '2027-03-08'), {
      account: pf.banco,
      adjustmentEquity: pf.ajustes,
      delta: money(-700),
      reason: 'Tarifa não lançada',
    });
    expect(accountBalance(aplicar(op).values(), pf.banco, hoje).amount).toBe(-700);
  });

  it('recusa ajuste sem motivo ou zero', () => {
    const c = ctx(PF, '2027-03-08');
    const base = { account: pf.banco, adjustmentEquity: pf.ajustes };
    expect(codigo(() => balanceAdjustment(c, { ...base, delta: money(1), reason: '   ' }))).toBe(
      'OPERATION_INVALID',
    );
    expect(codigo(() => balanceAdjustment(c, { ...base, delta: money(0), reason: 'x' }))).toBe(
      'OPERATION_INVALID',
    );
  });
});

describe('[LAN-005] estorno anula o original e mantém os dois no histórico (INV-11)', () => {
  it('estorno de transferência volta os saldos e fica vinculado', () => {
    const [t] = transfer(ctx(PF, '2027-03-05'), { from: pf.banco, to: pf.digital, amount: money(3000) });
    const original = t as JournalEntry;
    const [r] = reverseEntry(ctx(PF, '2027-03-06'), original, 'lançado em dobro');
    const j = aplicar([original], [r as JournalEntry]);
    expect(j.size).toBe(2);
    expect(r?.links.reverses).toBe(original.entryId);
    expect(accountBalance(j.values(), pf.banco, hoje).amount).toBe(0);
    expect(accountBalance(j.values(), pf.digital, hoje).amount).toBe(0);
  });

  it('não estorna pendente nem lançamento de outro espaço', () => {
    const [t] = transfer(ctx(PF, '2027-03-05'), { from: pf.banco, to: pf.digital, amount: money(3000) });
    const pendente = { ...(t as JournalEntry), status: 'pendente' as const };
    expect(codigo(() => reverseEntry(ctx(PF, '2027-03-06'), pendente))).toBe('OPERATION_INVALID');
    expect(codigo(() => reverseEntry(ctx(PJ, '2027-03-06'), t as JournalEntry))).toBe('WORKSPACE_MISMATCH');
  });
});

describe('[CON-003] saldo de cada conta e diário fechado', () => {
  it('saldo só conta lançamentos realizados até a data', () => {
    const a = openingBalance(ctx(PF, '2027-03-01'), {
      account: pf.banco,
      openingEquity: pf.abertura,
      amount: money(1000),
    });
    const b = transfer(ctx(PF, '2027-03-20'), { from: pf.banco, to: pf.digital, amount: money(400) });
    const j = aplicar(a, b);
    expect(accountBalance(j.values(), pf.banco, parseCivilDate('2027-03-19')).amount).toBe(1000);
    expect(accountBalance(j.values(), pf.banco, parseCivilDate('2027-03-20')).amount).toBe(600);
    const saldos = balancesAt(j.values(), contas, PF, FUTURO);
    expect(journalImbalance(saldos, contas)).toBe(0);
  });
});

describe('[COF-004] espaços PF e PJ nunca se misturam (INV-09)', () => {
  it('operação recusa conta de outro espaço', () => {
    const c = ctx(PF, '2027-03-05');
    expect(codigo(() => transfer(c, { from: pf.banco, to: pj.banco, amount: money(1) }))).toBe(
      'WORKSPACE_MISMATCH',
    );
    expect(
      codigo(() => openingBalance(c, { account: pj.banco, openingEquity: pf.abertura, amount: money(1) })),
    ).toBe('WORKSPACE_MISMATCH');
  });

  it('validação recusa lançamento com linha de outro espaço ou conta desconhecida', () => {
    const [t] = transfer(ctx(PF, '2027-03-05'), { from: pf.banco, to: pf.digital, amount: money(1) });
    const e = t as JournalEntry;
    const misturado = {
      ...e,
      lines: [e.lines[0], { accountId: pj.banco.id, side: 'C' as const, amount: 1 }],
    };
    expect(codigo(() => validateEntry(misturado as JournalEntry, contas))).toBe('WORKSPACE_MISMATCH');
    const fantasma = {
      ...e,
      lines: [e.lines[0], { accountId: 'nao-existe', side: 'C' as const, amount: 1 }],
    };
    expect(codigo(() => validateEntry(fantasma as JournalEntry, contas))).toBe('ACCOUNT_UNKNOWN');
  });

  it('leitura de saldo recusa lançamento de outro espaço, em vez de ignorar', () => {
    const op = transfer(ctx(PJ, '2027-03-05'), { from: pj.banco, to: pj.digital, amount: money(1) });
    expect(codigo(() => accountBalance(op, pf.banco, hoje))).toBe('WORKSPACE_MISMATCH');
    expect(codigo(() => balancesAt(op, contas, PF, hoje))).toBe('WORKSPACE_MISMATCH');
  });

  it('uma gravação não junta lançamentos de dois espaços', () => {
    const a = transfer(ctx(PF, '2027-03-05', 'x'), { from: pf.banco, to: pf.digital, amount: money(1) });
    const b = transfer(ctx(PJ, '2027-03-05', 'x'), { from: pj.banco, to: pj.digital, amount: money(1) });
    const segundo = { ...(b[0] as JournalEntry), entryId: entryIdFor('x', 1) };
    expect(codigo(() => appendOperation(emptyJournal, [a[0] as JournalEntry, segundo], contas))).toBe(
      'WORKSPACE_MISMATCH',
    );
  });
});
