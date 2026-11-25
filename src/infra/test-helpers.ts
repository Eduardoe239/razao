// Apoio aos testes de integração da aplicação com o cofre real (IndexedDB simulado), com dados sintéticos.
import 'fake-indexeddb/auto';
import { createRazaoApp } from '@/application/app';
import type { Clock } from '@/application/ports';
import type { VaultSession } from '@/application/session';
import { parseCivilDate } from '@/domain/civil-date';
import { newArgon2Params } from './crypto/kdf';
import { uuidv7 } from './ids';
import { createBackupFilePort } from './backup/file';
import { createVaultPort } from './vault-adapter';

let n = 0;
export const proximo = () => ++n;

export function montar(local = new Map<string, string>(), dbName = `razao-app-${String(proximo())}`) {
  let ms = Date.UTC(2027, 2, 10, 12, 0, 0);
  const clock: Clock = {
    nowIso: () => new Date(ms).toISOString(),
    nowMs: () => ms,
    monotonicMs: () => ms,
    today: () => parseCivilDate('2027-03-10'),
    deviceTimeZone: () => 'America/Fortaleza',
  };
  const kv = {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => local.set(k, v),
    removeItem: (k: string) => local.delete(k),
  };
  const vault = createVaultPort({
    dbName,
    local: kv,
    nowIso: () => clock.nowIso(),
    nowMs: () => clock.nowMs(),
    kdf: { kdf: () => newArgon2Params({ memoryKiB: 256 }) },
  });
  let seq = 0;
  const file = createBackupFilePort({ kdf: () => newArgon2Params({ memoryKiB: 256 }) });
  const app = createRazaoApp({ vault, clock, ids: { newId: () => uuidv7(ms + seq++) }, file, prefs: kv });
  return { app, vault, file, local, dbName, avancar: (s: number) => (ms += s * 1000) };
}

/** Cofre aberto com um espaço Pessoal, para os testes que não tratam da criação. */
export async function cofreAberto(): Promise<{ s: VaultSession; m: ReturnType<typeof montar> }> {
  const m = montar();
  const s = await (await m.app.prepareVault('uma frase bem longa', 'uma frase bem longa')).confirm();
  return { s, m };
}
