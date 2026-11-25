import { describe, expect, it } from 'vitest';
import { addLoadedEntries } from './journal';
import type { JournalEntry } from './ledger';
import { money } from './money';
import { transfer } from './operations';
import { PF, ctx, lookup, planoDeContas } from './testing/fixtures';

const contas = planoDeContas(PF);
const tabela = lookup(contas);
const { banco, carteira } = contas;

function transf(op: string, centavos: number): JournalEntry[] {
  return transfer(ctx(PF, '2027-03-10', op), { from: banco, to: carteira, amount: money(centavos) });
}

describe('diário montado na abertura do cofre', () => {
  it('[BKP-006] monta numa passada, ignora repetido igual e recusa repetido diferente (INV-06)', () => {
    const d = new Map<string, JournalEntry>();
    addLoadedEntries(d, [...transf('a', 100), ...transf('b', 200)], tabela);
    addLoadedEntries(d, transf('a', 100), tabela);
    expect(d.size).toBe(2);
    expect(() => addLoadedEntries(d, transf('a', 999), tabela)).toThrow('dois conteúdos');
    expect(d.size).toBe(2);
  });

  it('[BKP-006] lançamento inválido não entra, e nada da mesma página entra junto (INV-06)', () => {
    const d = new Map<string, JournalEntry>();
    const [boa] = transf('c', 100);
    const ruim = { ...(transf('d', 100)[0] as JournalEntry), lines: [] };
    expect(() => addLoadedEntries(d, [boa as JournalEntry, ruim], tabela)).toThrow();
    expect(d.size).toBe(0);
  });
});
