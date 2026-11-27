// COF-003 e D-054: trocar a senha do cofre e gerar um código de recuperação novo, com o cofre aberto.
// Só o cabeçalho de chaves muda: nenhum dado é regravado, e a senha (ou o código) antigo para de abrir na hora.
import { normalizeRecoveryCode } from '@/domain/vault-policy';
import { AppError } from './errors';
import type { Credential, SessionPort } from './ports';
import { checkPassword } from './vault-rules';

/** Código novo já gerado, esperando a pessoa confirmar que guardou. Nada mudou ainda. */
export interface PendingRecoveryCode {
  readonly code: string;
  /** Confere os 4 últimos caracteres digitados e só então troca. */
  confirm(lastFour: string): Promise<void>;
}

export interface SecurityOps {
  changePassword(input: { current: string; next: string; repeat: string }): Promise<void>;
  newRecoveryCode(currentPassword: string): Promise<PendingRecoveryCode>;
  /** O cofre foi aberto pelo código de recuperação nesta sessão (D-042, item 6). */
  readonly openedByRecovery: boolean;
  /** Depois de abrir pelo código: senha nova e código novo, gravados juntos. */
  secureAfterRecovery(input: { next: string; repeat: string }): Promise<PendingRecoveryCode>;
  /** "Agora não": esquece o código usado; a oferta não volta nesta sessão. */
  dismissRecoveryOffer(): void;
}

const ATUAL_ERRADA = 'A senha atual não confere. Nada foi trocado.';

function senhaNova(next: string, repeat: string): void {
  const forca = checkPassword(next);
  if (!forca.ok) throw new AppError('INVALID', forca.message);
  if (next !== repeat) throw new AppError('INVALID', 'As duas senhas novas não são iguais.');
}

/** Os 4 últimos caracteres do código, do jeito que a pessoa digitar (minúscula, O no lugar de 0...). */
export function lastFourMatches(code: string, typed: string): boolean {
  const certo = normalizeRecoveryCode(code);
  const limpo = typed.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return certo !== null && limpo.length === 4 && certo.endsWith(limpo);
}

async function trocar(
  port: SessionPort,
  current: Credential,
  change: { password?: string; recoveryCode?: string },
  erro: string,
): Promise<void> {
  try {
    await port.changeKeys(current, change);
  } catch (e) {
    if (e instanceof AppError && e.code === 'WRONG_SECRET') throw new AppError('INVALID', erro);
    throw e;
  }
}

function pendente(code: string, gravar: () => Promise<void>): PendingRecoveryCode {
  return {
    code,
    async confirm(lastFour) {
      if (!lastFourMatches(code, lastFour)) {
        throw new AppError(
          'INVALID',
          'Os 4 últimos caracteres não conferem. Olhe o código guardado e digite de novo.',
        );
      }
      await gravar();
    },
  };
}

export function securityOps(port: SessionPort, opened: { recoveryCode: string | null }): SecurityOps {
  return {
    async changePassword({ current, next, repeat }) {
      senhaNova(next, repeat);
      if (next === current) throw new AppError('INVALID', 'A senha nova é igual à atual. Nada foi trocado.');
      await trocar(port, { password: current }, { password: next }, ATUAL_ERRADA);
    },

    async newRecoveryCode(currentPassword) {
      // Confere antes de mostrar: um código que não vai valer nunca aparece na tela.
      if (!(await port.checkCredential({ password: currentPassword }))) {
        throw new AppError('INVALID', ATUAL_ERRADA);
      }
      const code = port.newRecoveryCode();
      return pendente(code, () =>
        trocar(port, { password: currentPassword }, { recoveryCode: code }, ATUAL_ERRADA),
      );
    },

    get openedByRecovery() {
      return opened.recoveryCode !== null;
    },

    async secureAfterRecovery({ next, repeat }) {
      await Promise.resolve();
      const usado = opened.recoveryCode;
      if (usado === null) throw new AppError('INVALID', 'O cofre não foi aberto pelo código de recuperação.');
      senhaNova(next, repeat);
      const code = port.newRecoveryCode();
      return pendente(code, async () => {
        await trocar(
          port,
          { recoveryCode: usado },
          { password: next, recoveryCode: code },
          'O código de recuperação usado não abre mais o cofre. Nada foi trocado.',
        );
        opened.recoveryCode = null;
      });
    },

    dismissRecoveryOffer() {
      opened.recoveryCode = null;
    },
  };
}
