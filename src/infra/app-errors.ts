// Tradução dos erros da infraestrutura para erros que a interface sabe mostrar.
import { AppError } from '@/application/errors';
import { VaultError } from './crypto/errors';
import { StorageError } from './storage/errors';

/** Versão do formato dos dados gravada no cofre. Sobe junto com cada migração nova. */
export const SCHEMA_VERSION = 1;

/** Erros da infraestrutura viram erros que a interface sabe mostrar. */
export function toAppError(erro: unknown): unknown {
  if (erro instanceof AppError) return erro;
  if (erro instanceof VaultError) {
    if (erro.code === 'WRONG_SECRET') {
      return new AppError('WRONG_SECRET', 'Senha ou código de recuperação incorreto.', { cause: erro });
    }
    return new AppError('STORAGE', 'O cabeçalho do cofre está danificado. Nada foi alterado.', {
      cause: erro,
    });
  }
  if (erro instanceof StorageError) {
    const mapa = {
      QUOTA_EXCEEDED: 'QUOTA',
      CONFLICT: 'CONFLICT',
      SAFE_MODE: 'SAFE_MODE',
    } as const;
    const code = erro.code in mapa ? mapa[erro.code as keyof typeof mapa] : 'STORAGE';
    return new AppError(code, erro.message, { cause: erro });
  }
  return erro;
}

export async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (erro) {
    throw toAppError(erro);
  }
}
