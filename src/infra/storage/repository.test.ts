// Gravação atômica, idempotência, concorrência entre abas, falta de espaço e isolamento PF/PJ.
import { describe, expect, it } from 'vitest';
import { accountBalance } from '@/domain/ledger';
import { parseCivilDate } from '@/domain/civil-date';
import { StorageError } from './errors';
import { VaultRepository } from './repository';
import {
  abertura,
  contagens,
  contasDe,
  criarContas,
  falharPut,
  lookupDe,
  repositorioPronto,
  transferencia,
} from './test-helpers';

const hoje = parseCivilDate('2027-12-31');

async function codigo(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof StorageError) return e.code;
    throw e;
  }
  return 'sem erro';
}

describe('[NFR-010] gravação e leitura de volta', () => {
  it('grava lançamentos e entidades, e outra instância lê o mesmo estado do banco', async () => {
    const { db, dek, now, repo, state, ws } = await repositorioPronto();
    await repo.commit(state, abertura(ws, 'op-1', '2027-03-01', 100000), lookupDe(ws));
    await repo.commit(state, transferencia(ws, 'op-2', '2027-04-05', 30000), lookupDe(ws));
    const outra = await new VaultRepository(db, dek, 1, now).loadWorkspace(ws);
    expect(outra.journal.size).toBe(2);
    expect(outra.entities.size).toBe(Object.keys(contasDe(ws)).length);
    expect([...outra.pages.keys()].sort()).toEqual(['2027-03', '2027-04']);
    const banco = contasDe(ws)['banco'];
    expect(banco && accountBalance(outra.journal.values(), banco, hoje).amount).toBe(70000);
  });
});

describe('[LAN-012] operação repetida não grava de novo (INV-06)', () => {
  it('a segunda gravação da mesma operação devolve "repetida" e não muda nada', async () => {
    const { db, repo, state, ws } = await repositorioPronto();
    expect(await repo.commit(state, abertura(ws, 'op-1', '2027-03-01', 500), lookupDe(ws))).toBe('gravada');
    const antes = await contagens(db);
    expect(await repo.commit(state, abertura(ws, 'op-1', '2027-03-01', 500), lookupDe(ws))).toBe('repetida');
    expect(await contagens(db)).toEqual(antes);
  });
});

describe('[PERS-07] falta de espaço ou falha no meio desfaz a transação inteira', () => {
  for (const [nome, erro, codigoEsperado] of [
    ['cota cheia', () => new DOMException('sem espaço', 'QuotaExceededError'), 'QUOTA_EXCEEDED'],
    ['falha genérica', () => new Error('disco falhou'), 'WRITE_FAILED'],
  ] as const) {
    it(`${nome}: nada é gravado pela metade, nem a página do mês, nem a auditoria`, async () => {
      const { db, dek, now, repo, state, ws } = await repositorioPronto();
      await repo.commit(state, abertura(ws, 'op-1', '2027-03-01', 1000), lookupDe(ws));
      const antes = await contagens(db);
      const auditAntes = await db.getAll('audit');
      // A página do mês é gravada primeiro; a falha vem na auditoria, depois dela.
      const desfazer = falharPut('audit', erro);
      try {
        expect(
          await codigo(repo.commit(state, transferencia(ws, 'op-2', '2027-03-02', 100), lookupDe(ws))),
        ).toBe(codigoEsperado);
      } finally {
        desfazer();
      }
      expect(await contagens(db)).toEqual(antes);
      expect(await db.getAll('audit')).toEqual(auditAntes);
      const relido = await new VaultRepository(db, dek, 1, now).loadWorkspace(ws);
      expect(relido.journal.size).toBe(1);
      expect(state.journal.size).toBe(1);
    });
  }

  it('depois da falha, a mesma operação pode ser gravada normalmente', async () => {
    const { repo, state, ws } = await repositorioPronto();
    const desfazer = falharPut('journal', () => new DOMException('x', 'QuotaExceededError'));
    await codigo(repo.commit(state, abertura(ws, 'op-1', '2027-03-01', 1000), lookupDe(ws)));
    desfazer();
    expect(await repo.commit(state, abertura(ws, 'op-1', '2027-03-01', 1000), lookupDe(ws))).toBe('gravada');
  });
});

describe('[NFR-010] duas abas gravando ao mesmo tempo', () => {
  it('a segunda aba recebe conflito, não sobrescreve, e grava depois de recarregar', async () => {
    const { db, dek, now, repo, state, ws } = await repositorioPronto();
    const abaB = new VaultRepository(db, dek, 1, now);
    const estadoB = await abaB.loadWorkspace(ws);
    await repo.commit(state, abertura(ws, 'op-a', '2027-03-01', 1000), lookupDe(ws));
    expect(
      await codigo(abaB.commit(estadoB, transferencia(ws, 'op-b', '2027-03-02', 100), lookupDe(ws))),
    ).toBe('CONFLICT');
    const recarregado = await abaB.loadWorkspace(ws);
    expect(await abaB.commit(recarregado, transferencia(ws, 'op-b', '2027-03-02', 100), lookupDe(ws))).toBe(
      'gravada',
    );
    expect((await new VaultRepository(db, dek, 1, now).loadWorkspace(ws)).journal.size).toBe(2);
  });
});

describe('[COF-004] espaços isolados no armazenamento (INV-09)', () => {
  it('carregar o PF não traz nada do PJ', async () => {
    const { db, dek, now, repo, state } = await repositorioPronto('espaco-pf');
    await repo.commit(state, abertura('espaco-pf', 'op-1', '2027-03-01', 1000), lookupDe('espaco-pf'));
    const pj = await repo.loadWorkspace('espaco-pj');
    await repo.commit(pj, criarContas('espaco-pj'), lookupDe('espaco-pj'));
    await repo.commit(pj, abertura('espaco-pj', 'op-1', '2027-03-01', 9999), lookupDe('espaco-pj'));
    const leitor = new VaultRepository(db, dek, 1, now);
    const soPf = await leitor.loadWorkspace('espaco-pf');
    expect([...soPf.journal.values()].every((e) => e.workspaceId === 'espaco-pf')).toBe(true);
    expect([...soPf.entities.values()].every((x) => x.entity.workspaceId === 'espaco-pf')).toBe(true);
    expect(soPf.journal.size).toBe(1);
  });

  it('registro do PF copiado para a chave do PJ não abre e vai para a quarentena', async () => {
    const { db, dek, now, repo, state } = await repositorioPronto('espaco-pf');
    await repo.commit(state, abertura('espaco-pf', 'op-1', '2027-03-01', 1000), lookupDe('espaco-pf'));
    const pagina = await db.get('journal', ['espaco-pf', '2027-03']);
    await db.put('journal', pagina as never, ['espaco-pj', '2027-03']);
    const leitor = new VaultRepository(db, dek, 1, now);
    const pj = await leitor.loadWorkspace('espaco-pj');
    expect(pj.journal.size).toBe(0);
    expect(leitor.safeMode).toBe(true);
    expect(await db.count('quarantine')).toBe(1);
  });
});
