import { describe, expect, it } from 'vitest';
import { createRazaoApp } from './app';
import type { BackupFilePort, Clock, UpdatePort, VaultPort } from './ports';
import { WriteTracker } from './session';

describe('atualização do app', () => {
  it('[NFR-011] a versão nova espera a gravação em andamento terminar e não interrompe a operação', async () => {
    const t = new WriteTracker();
    let terminar: () => void = () => undefined;
    const gravacao = t.track(new Promise<void>((r) => (terminar = r)));
    expect(t.busy).toBe(true);
    let livre = false;
    const espera = t.idle().then(() => (livre = true));
    await Promise.resolve();
    expect(livre).toBe(false);
    terminar();
    await gravacao;
    await espera;
    expect(livre).toBe(true);
    expect(t.busy).toBe(false);
  });

  it('[SEC-05] nada é ativado sem pedido; o pedido passa pela aplicação', async () => {
    const chamadas: string[] = [];
    let avisar: () => void = () => undefined;
    const updates: UpdatePort = {
      onAvailable: (f) => {
        avisar = f;
        return () => undefined;
      },
      apply: () => {
        chamadas.push('apply');
        return Promise.resolve();
      },
    };
    const app = createRazaoApp({
      vault: {} as VaultPort,
      clock: {} as Clock,
      ids: { newId: () => 'x' },
      file: {} as BackupFilePort,
      prefs: { getItem: () => null, setItem: () => undefined },
      updates,
    });
    let visto = false;
    app.onUpdateAvailable(() => (visto = true));
    avisar();
    expect(visto).toBe(true);
    expect(chamadas).toEqual([]);
    await app.applyUpdate();
    expect(chamadas).toEqual(['apply']);
  });
});
