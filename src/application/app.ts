// Fachada da aplicação para a interface: cofre (criar, desbloquear) e a sessão aberta.
// A raiz (main.tsx) monta com as implementações reais; os testes montam com implementações em memória.
import type { BackupPreview } from './backup';
import { openBackup } from './backup';
import { AppError } from './errors';
import type {
  BackupFilePort,
  BackupHeader,
  Clock,
  Credential,
  IdSource,
  StorageStatus,
  VaultPort,
  VaultPresence,
} from './ports';
import type { Prefs } from './reminder';
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
  /** BKP-002 sem cofre aberto (cofre sumido, PERS-06): só o cabeçalho, sem senha. */
  peekBackup(text: string): BackupHeader;
  /** Decifra e confere um backup sem precisar de cofre aberto. */
  openBackupFile(text: string, password: string): Promise<BackupPreview>;
  /** PERS-06: cria o cofre novo (depois de guardar o código) e restaura o backup nele. */
  restoreIntoNewVault(pending: PendingVault, preview: BackupPreview): Promise<VaultSession>;
  /** PRIV-05: apaga tudo deste site neste navegador, com a frase digitada. */
  wipeAll(typed: string): Promise<void>;
  readonly clock: Clock;
}

export const WIPE_PHRASE = 'APAGAR TUDO';

export function createRazaoApp(deps: {
  vault: VaultPort;
  clock: Clock;
  ids: IdSource;
  file: BackupFilePort;
  prefs: Prefs;
}): RazaoApp {
  const { vault, clock, ids, file, prefs } = deps;
  const extras = { file, prefs };
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
        confirm: async () => new VaultSession(await preparado.save(), clock, ids, extras),
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
        return new VaultSession(port, clock, ids, extras);
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
    peekBackup: (text) => file.peek(text),
    openBackupFile: (text, password) => openBackup(file, text, password),

    async restoreIntoNewVault(pending, preview) {
      const session = await pending.confirm();
      await session.restoreBackup(preview);
      return session;
    },

    async wipeAll(typed) {
      if (typed.trim().toUpperCase() !== WIPE_PHRASE) {
        throw new AppError('INVALID', `Digite ${WIPE_PHRASE} para confirmar. Nada foi apagado.`);
      }
      await vault.wipeAll();
    },
  };
}
