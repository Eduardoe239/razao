// Erros que a interface sabe mostrar. Toda mensagem diz o que houve, se algo mudou e o próximo passo (Volume 02, 7.3).
export type AppErrorCode =
  'WRONG_SECRET' | 'WAIT' | 'INVALID' | 'SAFE_MODE' | 'CONFLICT' | 'VAULT_EXISTS' | 'QUOTA' | 'STORAGE';

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppError';
  }
}

/** Mensagem para a pessoa. Erro desconhecido nunca vira sucesso nem tela vazia. */
export function messageFor(erro: unknown): string {
  if (erro instanceof AppError) return erro.message;
  return 'Não foi possível concluir. Nada foi alterado. Tente de novo; se continuar, recarregue o app.';
}
