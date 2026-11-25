// Recuperação segura (BKP-006), auditoria sem limite e encadeada (BKP-005) e validação do que volta do disco (SEC-06).
import { describe, expect, it } from 'vitest';
import { forAllAsync } from '@/domain/testing/prop';
import { fromBase64, toBase64 } from '../crypto/bytes';
import { sealJson } from '../crypto/records';
import { GENESIS, chainEvent, verifyChain } from './audit';
import type { AuditEvent } from './schema';
import { StorageError } from './errors';
import { VaultRepository } from './repository';
import { createSnapshot, listSnapshots, restoreSnapshot } from './snapshots';
import { abertura, contagens, falharPut, lookupDe, repositorioPronto, transferencia } from './test-helpers';

const ev = (i: number) => ({
  at: `2027-03-0${String((i % 9) + 1)}T00:00:00Z`,
  action: 'teste',
  workspaceId: 'pf',
  target: `t${String(i)}`,
});

async function corrente(n: number): Promise<AuditEvent[]> {
  const out: AuditEvent[] = [];
  for (let i = 0; i < n; i++) out.push(await chainEvent(ev(i), out.at(-1) ?? null));
  return out;
}

describe('[BKP-005] trilha de auditoria encadeada e sem limite', () => {
  it('a corrente começa no gênesis e confere inteira', async () => {
    const c = await corrente(5);
    expect(c[0]?.prev).toBe(GENESIS);
    expect(await verifyChain(c)).toEqual({ ok: true, count: 5 });
  });

  it('detecta evento alterado, apagado, repetido ou fora de ordem', async () => {
    const c = await corrente(6);
    const alterado = c.map((e, i) => (i === 3 ? { ...e, target: 'outro' } : e));
    expect(await verifyChain(alterado)).toMatchObject({ ok: false, brokenAt: 3 });
    expect(await verifyChain(c.filter((_, i) => i !== 2))).toMatchObject({ ok: false, brokenAt: 2 });
    const trocado = [c[0], c[2], c[1], ...c.slice(3)] as AuditEvent[];
    expect((await verifyChain(trocado)).ok).toBe(false);
    expect((await verifyChain([...c, c[5] as AuditEvent])).ok).toBe(false);
  });

  it('guarda mais de 500 eventos, o limite antigo da beta.20, sem descartar nenhum', async () => {
    const { db, dek, now, repo, state, ws } = await repositorioPronto();
    for (let i = 0; i < 520; i++)
      await repo.commit(state, transferencia(ws, `op-${String(i)}`, '2027-03-02', 1), lookupDe(ws));
    const relido = new VaultRepository(db, dek, 1, now);
    const s = await relido.loadWorkspace(ws);
    const eventos = [...s.auditPages.values()].flatMap((p) => p.page.events);
    expect(eventos).toHaveLength(521);
    expect(relido.safeMode).toBe(false);
    expect(s.lastAudit?.seq).toBe(520);
  }, 60_000);
});

describe('[BKP-006] registro danificado vai para a quarentena e o cofre entra em modo seguro', () => {
  it('página corrompida: original intacto, cópia na quarentena, outros meses legíveis e gravação bloqueada', async () => {
    const { db, dek, now, repo, state, ws } = await repositorioPronto();
    await repo.commit(state, abertura(ws, 'op-1', '2027-03-01', 1000), lookupDe(ws));
    await repo.commit(state, transferencia(ws, 'op-2', '2027-04-02', 100), lookupDe(ws));
    const original = await db.get('journal', [ws, '2027-04']);
    if (!original) throw new Error('página não gravada');
    const ct = fromBase64(original.sealed.ct);
    ct[5] = (ct[5] ?? 0) ^ 1;
    const corrompida = { ...original, sealed: { ...original.sealed, ct: toBase64(ct) } };
    await db.put('journal', corrompida, [ws, '2027-04']);

    const leitor = new VaultRepository(db, dek, 1, now);
    const s = await leitor.loadWorkspace(ws);
    expect(leitor.safeMode).toBe(true);
    expect(leitor.issues.map((p) => p.store)).toEqual(['journal']);
    expect(s.journal.size).toBe(1); // março continua legível
    const q = await db.getAll('quarantine');
    expect(q[0]?.original).toEqual(corrompida);
    expect(await db.get('journal', [ws, '2027-04'])).toEqual(corrompida); // nada apagado nem sobrescrito
    await expect(leitor.commit(s, transferencia(ws, 'op-3', '2027-03-03', 1), lookupDe(ws))).rejects.toThrow(
      StorageError,
    );
  });

  it('versão antiga e legítima de uma página, devolvida ao lugar, é detectada pela auditoria (T-10)', async () => {
    const { db, dek, now, repo, state, ws } = await repositorioPronto();
    await repo.commit(state, abertura(ws, 'op-1', '2027-03-01', 1000), lookupDe(ws));
    const antiga = await db.get('journal', [ws, '2027-03']);
    await repo.commit(state, transferencia(ws, 'op-2', '2027-03-05', 100), lookupDe(ws));
    await db.put('journal', antiga as never, [ws, '2027-03']);
    const leitor = new VaultRepository(db, dek, 1, now);
    await leitor.loadWorkspace(ws);
    expect(leitor.safeMode).toBe(true);
    expect(leitor.issues[0]?.reason).toContain('auditoria');
  });

  it('[SEC-06] conteúdo fora do formato é recusado sem travar, qualquer que seja a forma', async () => {
    const { db, dek, now, ws } = await repositorioPronto();
    await forAllAsync(
      'página malformada',
      async (rng) => {
        const formas: unknown[] = [
          null,
          rng.int(0, 1e6),
          'texto',
          { workspaceId: ws, month: '2027-03', entries: 'x' },
          { workspaceId: ws, month: '2027-13', entries: [] },
          { workspaceId: ws, month: '2027-03', entries: [{ entryId: 'a', lines: [] }] },
          { workspaceId: ws, month: '2027-03', entries: [{ lines: [{ amount: -rng.int(1, 9) }] }] },
          Array.from({ length: rng.int(0, 5) }, () => rng.int(0, 9)),
        ];
        const valor = rng.pick(formas);
        const sealed = await sealJson(
          dek,
          { store: 'journal', workspaceId: ws, key: '2027-03', schemaVersion: 1 },
          valor,
        );
        await db.put('journal', { sealed, rev: 1 }, [ws, '2027-03']);
        const leitor = new VaultRepository(db, dek, 1, now);
        const s = await leitor.loadWorkspace(ws);
        expect(leitor.safeMode).toBe(true);
        expect(s.journal.size).toBe(0);
      },
      50,
    );
  }, 60_000);
});

describe('[BKP-006] snapshots e restauração', () => {
  it('restaurar volta exatamente ao estado do snapshot e guarda antes uma cópia do estado atual', async () => {
    const { db, dek, now, repo, state, ws } = await repositorioPronto();
    await repo.commit(state, abertura(ws, 'op-1', '2027-03-01', 1000), lookupDe(ws));
    await createSnapshot(db, dek, 'manual', { id: 'snap-a', now: now(), schemaVersion: 1 });
    const jornalA = await db.getAll('journal');
    await repo.commit(state, transferencia(ws, 'op-2', '2027-03-02', 100), lookupDe(ws));
    const jornalB = await db.getAll('journal');

    await restoreSnapshot(db, dek, 'snap-a', { backupId: 'antes-1', now: now(), schemaVersion: 1 });
    expect(await db.getAll('journal')).toEqual(jornalA);
    expect((await listSnapshots(db)).map((s) => s.reason).sort()).toEqual(['antes-de-restaurar', 'manual']);
    const s = await new VaultRepository(db, dek, 1, now).loadWorkspace(ws);
    expect(s.journal.size).toBe(1);

    // Restauração encadeada: voltar a cópia feita antes de restaurar devolve o estado B.
    await restoreSnapshot(db, dek, 'antes-1', { backupId: 'antes-2', now: now(), schemaVersion: 1 });
    expect(await db.getAll('journal')).toEqual(jornalB);
  });

  it('aba fechada no meio da restauração: nada muda, porque a transação é desfeita inteira', async () => {
    const { db, dek, now, repo, state, ws } = await repositorioPronto();
    await createSnapshot(db, dek, 'manual', { id: 'vazio', now: now(), schemaVersion: 1 });
    await repo.commit(state, abertura(ws, 'op-1', '2027-03-01', 1000), lookupDe(ws));
    const jornal = await db.getAll('journal');
    const entidades = await db.getAll('entities');
    const desfazer = falharPut('entities', () => new Error('aba fechada'));
    try {
      await expect(
        restoreSnapshot(db, dek, 'vazio', { backupId: 'b', now: now(), schemaVersion: 1 }),
      ).rejects.toThrow(StorageError);
    } finally {
      desfazer();
    }
    expect(await db.getAll('journal')).toEqual(jornal);
    expect(await db.getAll('entities')).toEqual(entidades);
  });

  it('snapshot nunca é sobrescrito, e cada motivo automático guarda só os 5 mais recentes', async () => {
    const { db, dek, now } = await repositorioPronto();
    await createSnapshot(db, dek, 'manual', { id: 'x', now: now(), schemaVersion: 1 });
    await expect(
      createSnapshot(db, dek, 'manual', { id: 'x', now: now(), schemaVersion: 1 }),
    ).rejects.toThrow(StorageError);
    for (let i = 0; i < 7; i++)
      await createSnapshot(db, dek, 'antes-de-reparar', {
        id: `r${String(i)}`,
        now: now(),
        schemaVersion: 1,
      });
    const reparos = (await listSnapshots(db)).filter((s) => s.reason === 'antes-de-reparar').map((s) => s.id);
    expect(reparos).toEqual(['r6', 'r5', 'r4', 'r3', 'r2']);
    expect((await contagens(db))['snapshots']).toBe(6);
  });

  it('restaurar snapshot que não existe não toca em nada', async () => {
    const { db, dek, now } = await repositorioPronto();
    const antes = await contagens(db);
    await expect(
      restoreSnapshot(db, dek, 'nao-existe', { backupId: 'b', now: now(), schemaVersion: 1 }),
    ).rejects.toThrow(StorageError);
    expect(await contagens(db)).toEqual(antes);
  });
});
