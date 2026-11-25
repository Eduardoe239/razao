// Migrações de esquema: snapshot antes, conferência antes e depois, desfazer automático (NFR-010, INV-12).
import { describe, expect, it } from 'vitest';
import { StorageError } from './errors';
import type { Migration, PlainVault } from './migrations';
import { defaultVerify, runMigrations } from './migrations';
import { VaultRepository } from './repository';
import { listSnapshots } from './snapshots';
import { abertura, lookupDe, repositorioPronto, transferencia } from './test-helpers';

async function codigo(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof StorageError) return e.code;
    throw e;
  }
  return 'sem erro';
}

/** Migração sintética v1 → v2: acrescenta uma marca em cada lançamento, sem mudar valores. */
const marcar: Migration = {
  from: 1,
  to: 2,
  migrate: (d: PlainVault) => ({
    ...d,
    journal: d.journal.map((r) => {
      const page = r.value as { entries: { meta: Record<string, string> }[] };
      return {
        ...r,
        value: { ...page, entries: page.entries.map((e) => ({ ...e, meta: { ...e.meta, migrado: 'v2' } })) },
      };
    }),
  }),
};

/** Migração defeituosa: perde um lançamento. */
const perde: Migration = {
  from: 1,
  to: 2,
  migrate: (d: PlainVault) => ({
    ...d,
    journal: d.journal.map((r) => {
      const page = r.value as { entries: unknown[] };
      return { ...r, value: { ...page, entries: page.entries.slice(1) } };
    }),
  }),
};

async function cenario() {
  const base = await repositorioPronto();
  await base.repo.commit(base.state, abertura(base.ws, 'op-1', '2027-03-01', 100000), lookupDe(base.ws));
  await base.repo.commit(base.state, transferencia(base.ws, 'op-2', '2027-04-02', 2500), lookupDe(base.ws));
  return base;
}

describe('[NFR-010] migrações versionadas e reversíveis', () => {
  it('migra de v1 para v2, recifra com a versão nova e mantém contagens e saldos', async () => {
    const { db, dek, now, ws } = await cenario();
    const r = await runMigrations(db, dek, {
      migrations: [marcar],
      targetVersion: 2,
      now: now(),
      snapshotId: 'mig-1',
    });
    expect(r).toBe('migrada');
    expect((await db.get('vault', 'header'))?.schemaVersion).toBe(2);
    const leitor = new VaultRepository(db, dek, 2, now);
    const s = await leitor.loadWorkspace(ws);
    expect(leitor.safeMode).toBe(false);
    expect(s.journal.size).toBe(2);
    expect([...s.journal.values()].every((e) => e.meta['migrado'] === 'v2')).toBe(true);
    // Com a versão antiga no contexto, os registros novos não abrem mais (a versão faz parte do AAD).
    const antigo = new VaultRepository(db, dek, 1, now);
    await antigo.loadWorkspace(ws);
    expect(antigo.safeMode).toBe(true);
    expect((await listSnapshots(db)).some((x) => x.reason === 'antes-de-migrar')).toBe(true);
  });

  it('migração que perde dado é cancelada antes de gravar, e nada muda', async () => {
    const { db, dek, now, ws } = await cenario();
    const antes = await db.getAll('journal');
    expect(
      await codigo(
        runMigrations(db, dek, { migrations: [perde], targetVersion: 2, now: now(), snapshotId: 'x' }),
      ),
    ).toBe('MIGRATION_FAILED');
    expect(await db.getAll('journal')).toEqual(antes);
    expect((await db.get('vault', 'header'))?.schemaVersion).toBe(1);
    expect((await new VaultRepository(db, dek, 1, now).loadWorkspace(ws)).journal.size).toBe(2);
  });

  it('diferença encontrada depois de gravar desfaz sozinha pelo snapshot', async () => {
    const { db, dek, now, ws } = await cenario();
    let chamadas = 0;
    const verify = (a: PlainVault, b: PlainVault) =>
      ++chamadas === 1 ? defaultVerify(a, b) : 'diferença simulada';
    expect(
      await codigo(
        runMigrations(db, dek, {
          migrations: [marcar],
          targetVersion: 2,
          now: now(),
          snapshotId: 's',
          verify,
        }),
      ),
    ).toBe('MIGRATION_FAILED');
    expect((await db.get('vault', 'header'))?.schemaVersion).toBe(1);
    const leitor = new VaultRepository(db, dek, 1, now);
    const s = await leitor.loadWorkspace(ws);
    expect(leitor.safeMode).toBe(false);
    expect(s.journal.size).toBe(2);
    expect([...s.journal.values()].some((e) => e.meta['migrado'])).toBe(false);
  });

  it('dados de versão mais nova que o app: recusa abrir e não toca em nada', async () => {
    const { db, dek, now } = await cenario();
    const vault = await db.get('vault', 'header');
    await db.put('vault', { ...(vault as NonNullable<typeof vault>), schemaVersion: 9 }, 'header');
    const antes = await db.getAll('journal');
    expect(
      await codigo(runMigrations(db, dek, { migrations: [], targetVersion: 2, now: now(), snapshotId: 'x' })),
    ).toBe('SCHEMA_TOO_NEW');
    expect(await db.getAll('journal')).toEqual(antes);
    expect(await db.count('snapshots')).toBe(0);
  });

  it('versão atual não faz nada; etapa faltando é erro antes de qualquer mudança', async () => {
    const { db, dek, now } = await cenario();
    expect(
      await runMigrations(db, dek, { migrations: [], targetVersion: 1, now: now(), snapshotId: 'x' }),
    ).toBe('atual');
    expect(
      await codigo(
        runMigrations(db, dek, { migrations: [marcar], targetVersion: 3, now: now(), snapshotId: 'x' }),
      ),
    ).toBe('MIGRATION_FAILED');
    expect((await db.get('vault', 'header'))?.schemaVersion).toBe(1);
  });

  it('a conferência padrão percebe quantidade e saldo diferentes', () => {
    const vazio: PlainVault = { entities: [], journal: [], audit: [], operations: [] };
    const pagina = (v: number) => ({
      key: ['pf', '2027-03'],
      value: { entries: [{ lines: [{ accountId: 'a', side: 'D', amount: v }] }] },
    });
    expect(defaultVerify(vazio, vazio)).toBeNull();
    expect(defaultVerify({ ...vazio, journal: [pagina(1)] }, vazio)).toContain('Quantidade');
    expect(defaultVerify({ ...vazio, journal: [pagina(1)] }, { ...vazio, journal: [pagina(2)] })).toContain(
      'Saldo',
    );
  });
});
