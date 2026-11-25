// Compatibilidade (Volume 05, seção 6; Volume 09, portão "a versão anterior abre na nova"): o backup sintético
// gerado pela 0.1.0 fica guardado aqui e tem de continuar abrindo e restaurando igual em toda versão futura.
import { describe, expect, it } from 'vitest';
import { cofreAberto } from '../test-helpers';
import esperadoTexto from './fixtures/razao-backup-0.1.0.esperado.json?raw';
import arquivo from './fixtures/razao-backup-0.1.0.razao?raw';

const esperado = JSON.parse(esperadoTexto) as unknown;

describe('backups de versões anteriores', () => {
  it('[BKP-002] o backup da 0.1.0 abre, mostra a prévia e restaura com os mesmos ids e saldos', async () => {
    const { s } = await cofreAberto();
    const previa = await s.openBackup(arquivo, 'senha da fixture 0.1.0');
    expect(previa.header).toMatchObject({
      format: 'razao-backup',
      formatVersion: 1,
      schemaVersion: 1,
      appVersion: '0.1.0-alpha',
    });
    await s.restoreBackup(previa);
    const retrato = [];
    for (const w of await s.workspaces()) {
      const v = await s.view(w.id);
      retrato.push({
        id: w.id,
        kind: w.kind,
        name: w.name,
        total: v.total,
        contas: v.accounts.map((a) => ({ id: a.account.id, name: a.account.name, saldo: a.balance })),
      });
    }
    expect(retrato).toEqual(esperado);
    expect(s.safeMode).toBe(false);
  });
});
