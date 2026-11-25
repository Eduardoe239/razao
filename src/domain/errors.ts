// Erros do domínio: sempre tipados e com motivo (Volume 04, princípio 6 — falha alto).
export type DomainErrorCode =
  | 'MONEY_INVALID'
  | 'MONEY_OUT_OF_RANGE'
  | 'CURRENCY_MISMATCH'
  | 'ALLOCATION_INVALID'
  | 'DATE_INVALID'
  | 'ENTRY_UNBALANCED'
  | 'ENTRY_INVALID'
  | 'ACCOUNT_UNKNOWN'
  | 'WORKSPACE_MISMATCH'
  | 'OPERATION_CONFLICT'
  | 'OPERATION_INVALID';

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

/** Atalho para lançar erro de domínio quando a condição falha. */
export function ensure(condition: boolean, code: DomainErrorCode, message: string): asserts condition {
  if (!condition) throw new DomainError(code, message);
}
