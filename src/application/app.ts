// Fachada da aplicação para a interface: cofre (criar, desbloquear) e a sessão aberta.
// A raiz (main.tsx) monta com as implementações reais; os testes montam com implementações em memória.
import { AppError } from './errors';
import type { Clock, Credential, IdSource, StorageStatus, VaultPort, VaultPresence } from './ports';
import { VaultSession } from './session';
import { checkPassword, waitAfterFailures } from './vault-rules';

export interface PendingVault {
  readonly recoveryCode: string;
  /** Grava o cofre e devolve a sessão aberta. Só depois de a pessoa confirmar que guardou o código. */
  confirm(): Promise<VaultSession>;
}

export interface RazaoApp {
  presence(): Promise<VaultPresence>;
  prepareVault(password: string, repeat: string): Promise<PendingVault>;
  unlock(cred: Credential): Promise<VaultSession>;
  /** Segundos que faltam para poder tentar de novo (SEC-11); 0 se pode tentar já. */
  waitSeconds(): number;
  storageStatus(): Promise<StorageStatus>;
  readonly clock: Clock;
}

export function createRazaoApp(deps: { vault: VaultPort; clock: Clock; ids: IdSource }): RazaoApp {
  const { vault, clock, ids } = deps;
  const restante = () => Math.max(0, Math.ceil((vault.attempts().waitUntilMs - clock.nowMs()) / 1000));

  return {
    clock,
    presence: () => vault.presence(),

    async prepareVault(password, repeat) {
      const check = checkPassword(password);
      if (!check.ok) throw new AppError('INVALID', check.message);
      if (password !== repeat) throw new AppError('INVALID', 'As duas senhas não são iguais.');
      const preparado = await vault.prepare(password);
      return {
        recoveryCode: preparado.recoveryCode,
        confirm: async () => new VaultSession(await preparado.save(), clock, ids),
      };
    },

    async unlock(cred) {
      const espera = restante();
      if (espera > 0) {
        throw new AppError('WAIT', `Muitas tentativas. Tente de novo em ${String(espera)} segundos.`);
      }
      try {
        const port = await vault.unlock(cred);
        vault.recordAttempt(true, clock.nowMs(), 0);
        return new VaultSession(port, clock, ids);
      } catch (erro) {
        if (erro instanceof AppError && erro.code === 'WRONG_SECRET') {
          const falhas = vault.attempts().failed + 1;
          vault.recordAttempt(false, clock.nowMs(), waitAfterFailures(falhas));
        }
        throw erro;
      }
    },

    waitSeconds: restante,
    storageStatus: () => vault.storageStatus(),
  };
}
