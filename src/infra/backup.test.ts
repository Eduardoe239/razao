// Backup e restauração ponta a ponta na aplicação, com o cofre real (IndexedDB simulado) e dados sintéticos.
import { describe, expect, it } from 'vitest';
import { WIPE_PHRASE } from '@/application/app';
import type { VaultSession } from '@/application/session';
import { forAllAsync } from '@/domain/testing/prop';
import { VAULT_MARKER_KEY } from './storage/vault-store';
import { cofreAberto, montar } from './test-helpers';

const SENHA_BACKUP = 'senha do backup longa';

async function comDados() {
  const { s, m } = await cofreAberto();
  const pf = await s.createWorkspace({ kind: 'PF', name: 'Pessoal' });
  const pj = await s.createWorkspace({ kind: 'PJ', name: 'Norte Software ME' });
  const op = () => s.newOperationId();
  await s.createAccount(pf.id, {
    name: 'Banco Azul',
    kind: 'corrente',
    openingCents: 927035,
    operationId: op(),
  });
  await s.createAccount(pf.id, { name: 'Carteira', kind: 'carteira', openingCents: 5000, operationId: op() });
  await s.createAccount(pj.id, {
    name: 'Conta PJ',
    kind: 'digital',
    openingCents: 150000,
    operationId: op(),
  });
  return { s, m, pf, pj };
}

/** Retrato de tudo o que a pessoa vê: ids, nomes, saldos e total, por espaço. */
async function retrato(s: VaultSession) {
  const out: unknown[] = [];
  for (const w of await s.workspaces()) {
    const v = await s.view(w.id);
    out.push([
      w.id,
      w.kind,
      w.name,
      v.total,
      v.accounts.map((a) => [a.account.id, a.account.name, a.balance]),
    ]);
  }
  return out;
}

describe('backup', () => {
  it('[BKP-001] o arquivo traz o cabeçalho em claro e nenhum nome ou valor legível', async () => {
    const { s, m } = await comDados();
    const b = await s.createBackup({ kind: 'cofre' }, SENHA_BACKUP, SENHA_BACKUP);
    expect(b.fileName).toMatch(/^razao-backup-cofre-\d{4}-\d{2}-\d{2}\.razao$/);
    expect(m.app.peekBackup(b.text)).toMatchObject({
      format: 'razao-backup',
      formatVersion: 1,
      scope: { kind: 'cofre' },
    });
    for (const segredo of ['Banco Azul', 'Norte Software', '927035', 'Carteira'])
      expect(b.text).not.toContain(segredo);
    expect(b.manifest.workspaces.map((w) => [w.kind, w.counts.entities, w.counts.entries])).toEqual([
      ['PF', 8, 2],
      ['PJ', 6, 1],
    ]);
  });

  it('[PERS-05] só conclui depois de reler e conferir; arquivo que não confere não é entregue', async () => {
    const { s, m } = await comDados();
    // Um gravador defeituoso que corrompe o arquivo: a releitura recusa e nada é marcado como feito.
    const original = m.file.write.bind(m.file);
    m.file.write = async (input) => {
      const texto = await original(input);
      const arq = JSON.parse(texto) as { content: { ct: string } };
      arq.content.ct = arq.content.ct.startsWith('A')
        ? `B${arq.content.ct.slice(1)}`
        : `A${arq.content.ct.slice(1)}`;
      return JSON.stringify(arq);
    };
    await expect(s.createBackup({ kind: 'cofre' }, SENHA_BACKUP, SENHA_BACKUP)).rejects.toThrow();
    expect(s.backupStatus(true).lastBackupAt).toBeNull();
  });

  it('[PERS-02] o indicador mostra a data do último backup e se há dados novos depois dele', async () => {
    const { s, m, pf } = await comDados();
    expect(s.backupStatus(true)).toMatchObject({ lastBackupAt: null, pendingChanges: true });
    await s.createBackup({ kind: 'cofre' }, SENHA_BACKUP, SENHA_BACKUP);
    expect(s.backupStatus(true).lastBackupAt).toBe(m.local.get('razao:ultimo-backup'));
    expect(s.backupStatus(true).pendingChanges).toBe(false);
    m.avancar(60);
    await s.createAccount(pf.id, {
      name: 'Nova',
      kind: 'dinheiro',
      openingCents: 1,
      operationId: s.newOperationId(),
    });
    expect(s.backupStatus(true).pendingChanges).toBe(true);
  });

  it('[BKP-001] senha curta ou diferente é recusada antes de gerar', async () => {
    const { s } = await comDados();
    await expect(s.createBackup({ kind: 'cofre' }, 'curta', 'curta')).rejects.toThrow('pelo menos 8');
    await expect(s.createBackup({ kind: 'cofre' }, SENHA_BACKUP, 'outra senha longa')).rejects.toThrow(
      'não são iguais',
    );
  });
});

describe('restauração', () => {
  it('[BKP-003] ida e volta: ids, nomes, saldos e totais voltam idênticos (INV-12)', async () => {
    const { s, pf } = await comDados();
    const antes = await retrato(s);
    const b = await s.createBackup({ kind: 'cofre' }, SENHA_BACKUP, SENHA_BACKUP);
    const contas = (await s.view(pf.id)).accounts.map((a) => a.account.id);
    await s.transfer(pf.id, {
      fromId: contas[0] ?? '',
      toId: contas[1] ?? '',
      amountCents: 1000,
      feeCents: 0,
      date: '2027-03-10',
      operationId: s.newOperationId(),
    });
    await s.createAccount(pf.id, {
      name: 'Depois do backup',
      kind: 'dinheiro',
      openingCents: 1,
      operationId: s.newOperationId(),
    });
    expect(await retrato(s)).not.toEqual(antes);
    const previa = await s.openBackup(b.text, SENHA_BACKUP);
    expect(previa.manifest).toEqual(b.manifest);
    await s.restoreBackup(previa);
    expect(await retrato(s)).toEqual(antes);
    expect(s.safeMode).toBe(false);
  });

  it('[BKP-003] propriedade: qualquer sequência de operações sobrevive ao backup e à restauração (INV-12)', async () => {
    await forAllAsync(
      'backup e restauração preservam tudo',
      async (rng) => {
        const { s, pf } = await comDados();
        const contas = (await s.view(pf.id)).accounts.map((a) => a.account.id);
        for (let i = 0; i < rng.int(0, 6); i++) {
          const de = rng.int(0, 1);
          await s.transfer(pf.id, {
            fromId: contas[de] ?? '',
            toId: contas[1 - de] ?? '',
            amountCents: rng.int(1, 9000),
            feeCents: rng.bool() ? rng.int(1, 300) : 0,
            date: '2027-03-10',
            operationId: s.newOperationId(),
          });
        }
        const antes = await retrato(s);
        const b = await s.createBackup({ kind: 'cofre' }, SENHA_BACKUP, SENHA_BACKUP);
        await s
          .adjustBalance(pf.id, {
            accountId: contas[0] ?? '',
            targetCents: rng.int(0, 99999),
            reason: 'teste',
            operationId: s.newOperationId(),
          })
          .catch(() => undefined);
        await s.restoreBackup(await s.openBackup(b.text, SENHA_BACKUP));
        expect(await retrato(s)).toEqual(antes);
      },
      12,
    );
  });

  it('[BKP-003] o estado anterior vira ponto de volta, e voltar a ele desfaz a restauração', async () => {
    const { s, pf } = await comDados();
    const b = await s.createBackup({ kind: 'cofre' }, SENHA_BACKUP, SENHA_BACKUP);
    await s.createAccount(pf.id, {
      name: 'Só no estado atual',
      kind: 'dinheiro',
      openingCents: 700,
      operationId: s.newOperationId(),
    });
    const atual = await retrato(s);
    await s.restoreBackup(await s.openBackup(b.text, SENHA_BACKUP));
    expect(await retrato(s)).not.toEqual(atual);
    const [ponto] = await s.restorePoints();
    expect(ponto).toBeDefined();
    await s.undoRestore(ponto?.id ?? '');
    expect(await retrato(s)).toEqual(atual);
    expect(s.safeMode).toBe(false);
  });

  it('[BKP-001] backup de um espaço só substitui aquele espaço e não toca no outro', async () => {
    const { s, pf, pj } = await comDados();
    const b = await s.createBackup({ kind: 'espaco', workspaceId: pj.id }, SENHA_BACKUP, SENHA_BACKUP);
    expect(b.fileName).toContain('negocio');
    await s.createAccount(pf.id, {
      name: 'Nova no PF',
      kind: 'dinheiro',
      openingCents: 100,
      operationId: s.newOperationId(),
    });
    await s.createAccount(pj.id, {
      name: 'Nova no PJ',
      kind: 'dinheiro',
      openingCents: 100,
      operationId: s.newOperationId(),
    });
    await s.restoreBackup(await s.openBackup(b.text, SENHA_BACKUP));
    expect((await s.view(pj.id)).accounts.map((a) => a.account.name)).toEqual(['Conta PJ']);
    expect((await s.view(pf.id)).accounts.map((a) => a.account.name)).toContain('Nova no PF');
  });

  it('[BKP-002] senha errada, arquivo alterado, incompleto, estranho ou de versão nova são recusados com o motivo', async () => {
    const { s } = await comDados();
    const b = await s.createBackup({ kind: 'cofre' }, SENHA_BACKUP, SENHA_BACKUP);
    await expect(s.openBackup(b.text, 'senha errada aqui')).rejects.toThrow('Senha do backup incorreta');
    const arq = JSON.parse(b.text) as {
      header: { createdAt: string; formatVersion: number };
      content: { ct: string };
    };
    const trocar = (f: (a: typeof arq) => void) => {
      const c = JSON.parse(b.text) as typeof arq;
      f(c);
      return JSON.stringify(c);
    };
    const ct = arq.content.ct;
    const meio = Math.floor(ct.length / 2);
    const outra = ct[meio] === 'A' ? 'B' : 'A';
    await expect(
      s.openBackup(
        trocar((c) => (c.content.ct = ct.slice(0, meio) + outra + ct.slice(meio + 1))),
        SENHA_BACKUP,
      ),
    ).rejects.toThrow('alterado ou está danificado');
    await expect(
      s.openBackup(
        trocar((c) => (c.header.createdAt = '2020-01-01T00:00:00.000Z')),
        SENHA_BACKUP,
      ),
    ).rejects.toThrow('alterado ou está danificado');
    await expect(
      s.openBackup(
        trocar((c) => (c.header.formatVersion = 2)),
        SENHA_BACKUP,
      ),
    ).rejects.toThrow('versão mais nova');
    await expect(s.openBackup(b.text.slice(0, b.text.length / 2), SENHA_BACKUP)).rejects.toThrow(
      'não é um backup do Razão ou está incompleto',
    );
    await expect(s.openBackup('{"ola":"mundo"}', SENHA_BACKUP)).rejects.toThrow('não é um backup do Razão');
  });
});

describe('cofre sumido e apagar tudo', () => {
  it('[PERS-06] restaura o backup num cofre novo, com senha e código novos', async () => {
    const { s } = await comDados();
    const antes = await retrato(s);
    const b = await s.createBackup({ kind: 'cofre' }, SENHA_BACKUP, SENHA_BACKUP);
    // Outro navegador "sem o cofre": a marca existe, o banco não.
    const novo = montar(new Map([[VAULT_MARKER_KEY, '1']]));
    expect(await novo.app.presence()).toBe('sumiu');
    const previa = await novo.app.openBackupFile(b.text, SENHA_BACKUP);
    const pendente = await novo.app.prepareVault('outra frase de senha', 'outra frase de senha');
    const s2 = await novo.app.restoreIntoNewVault(pendente, previa);
    expect(await retrato(s2)).toEqual(antes);
    s2.lock();
    expect(await novo.app.presence()).toBe('normal');
    const s3 = await novo.app.unlock({ password: 'outra frase de senha' });
    expect(await retrato(s3)).toEqual(antes);
  });

  it('[PRIV-05] apagar tudo pede a frase e deixa o navegador como novo', async () => {
    const { s, m } = await comDados();
    s.lock();
    await expect(m.app.wipeAll('apagar')).rejects.toThrow(`Digite ${WIPE_PHRASE}`);
    expect(await m.app.presence()).toBe('normal');
    await m.app.wipeAll('apagar tudo');
    expect(await m.app.presence()).toBe('novo');
    expect([...m.local.keys()].filter((k) => k.startsWith('razao:'))).toEqual([]);
  });
});
