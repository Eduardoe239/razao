// Erros do cofre. A mensagem nunca diz se errou a senha ou o código, nem dá pistas (SEC-11).
export type VaultErrorCode = 'WRONG_SECRET' | 'RECORD_TAMPERED' | 'KDF_UNAVAILABLE' | 'HEADER_INVALID';

export class VaultError extends Error {
  readonly code: VaultErrorCode;

  constructor(code: VaultErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'VaultError';
    this.code = code;
  }
}
