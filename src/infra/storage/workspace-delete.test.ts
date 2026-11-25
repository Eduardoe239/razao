// COF-007 no armazenamento: a exclusão tira o espaço de todos os conjuntos e dos snapshots, de uma vez só.
import { describe, expect, it } from 'vitest';
import { VaultRepository } from './repository';
import { createSnapshot, listSnapshots } from './snapshots';
import { abertura, criarContas, falharPut, lookupDe, novoBanco } from './test-helpers';
import { deleteWorkspaceData } from './workspace-delete';

async function doisEspacos() {
  const base = await novoBanco();
  const repo = new VaultRepository(base.db, base.dek, 1, base.now);
  for (const ws of ['espaco-pf', 'espaco-pj']) {
    const st = await repo.loadWorkspace(ws);
    await repo.commit(st, criarContas(ws), lookupDe(ws));
    await repo.commit(st, abertura(ws, `${ws}-ab`, '2027-03-01', 10000), lookupDe(ws));
  }
  await createSnapshot(base.db, base.dek, 'manual', { id: 'snap-1', now: base.now(), schemaVersion: 1 });
  return { ...base, repo };
}

const doEspaco = (k: IDBValidKey, ws: string) => Array.isArray(k) && k[0] === ws;

describe('exclusão de espaço no armazenamento', () => {
  it('[COF-007] apaga entidades, diário, operações, auditoria e a parte do espaço nos snapshots', async () => {
    const { db, dek, now } = await doisEspacos();
    await deleteWorkspaceData(db, dek, 'espaco-pj');
    for (const store of ['entities', 'journal', 'operations', 'audit'] as const) {
      const keys = await db.getAllKeys(store);
      expect(keys.some((k) => doEspaco(k, 'espaco-pj'))).toBe(false);
      expect(keys.some((k) => doEspaco(k, 'espaco-pf'))).toBe(true);
    }
    const [snap] = await listSnapshots(db);
    expect(snap?.records.some((r) => doEspaco(r.key, 'espaco-pj'))).toBe(false);
    expect(snap?.records.some((r) => doEspaco(r.key, 'espaco-pf'))).toBe(true);
    // O espaço que ficou continua abrindo, com a trilha íntegra.
    const repo = new VaultRepository(db, dek, 1, now);
    const st = await repo.loadWorkspace('espaco-pf');
    expect(repo.safeMode).toBe(false);
    expect(st.journal.size).toBeGreaterThan(0);
  });

  it('[COF-007] falha no meio da exclusão não apaga nada pela metade', async () => {
    const { db, dek } = await doisEspacos();
    const antes = await db.getAllKeys('entities');
    const desfazer = falharPut('snapshots', () => new DOMException('falhou', 'UnknownError'));
    try {
      await expect(deleteWorkspaceData(db, dek, 'espaco-pj')).rejects.toThrow('desfeita por inteiro');
    } finally {
      desfazer();
    }
    expect(await db.getAllKeys('entities')).toEqual(antes);
  });
});
