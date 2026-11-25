// Gera o código de recuperação com o gerador do navegador (crypto.getRandomValues).
import { RECOVERY_BYTES, encodeRecoveryCode } from '@/domain/vault-policy';
import { randomBytes, wipe } from './bytes';

export function generateRecoveryCode(): string {
  const bytes = randomBytes(RECOVERY_BYTES);
  try {
    return encodeRecoveryCode(bytes);
  } finally {
    wipe(bytes);
  }
}
