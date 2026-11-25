// Erros do armazenamento. Cada um diz o que aconteceu e permite à interface mostrar o próximo passo.
export type StorageErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'WRITE_FAILED'
  | 'CONFLICT'
  | 'SAFE_MODE'
  | 'SCHEMA_TOO_NEW'
  | 'MIGRATION_FAILED'
  | 'NOT_FOUND'
  | 'AUDIT_BROKEN';

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageError';
    this.code = code;
  }
}

/** Traduz o erro do navegador: falta de espaço tem mensagem própria (PERS-07). */
export function fromDomException(erro: unknown): StorageError {
  const nome = erro instanceof Error || erro instanceof DOMException ? erro.name : '';
  if (nome === 'QuotaExceededError') {
    return new StorageError(
      'QUOTA_EXCEEDED',
      'Sem espaço no navegador. Nada foi gravado; libere espaço ou faça um backup.',
      {
        cause: erro,
      },
    );
  }
  if (erro instanceof StorageError) return erro;
  return new StorageError(
    'WRITE_FAILED',
    'A gravação falhou e foi desfeita por inteiro. Nada foi gravado pela metade.',
    {
      cause: erro,
    },
  );
}

/** Desfaz a transação se ela ainda estiver aberta. Erro lançado no meio do código não aborta sozinho. */
export function abortQuietly(tx: { abort(): void } | undefined): void {
  try {
    tx?.abort();
  } catch {
    // Já tinha terminado ou abortado; nada a fazer.
  }
}
