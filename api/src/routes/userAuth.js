/**
 * Autenticação desativada até existir um backend persistente e validado.
 * A implementação anterior mantinha usuários apenas em memória, usava hash
 * fraco e emitia tokens que não eram JWTs assinados. Falhar fechado é mais
 * seguro do que apresentar esse protótipo como autenticação real.
 */
const AUTH_DISABLED_MESSAGE = 'Autenticação de produção não está configurada. O Razão está operando em modo local; cadastro e login remotos permanecem indisponíveis.';

export class UserAuthService {
  constructor() {
    this.configured = false;
  }

  async register() {
    throw new Error(AUTH_DISABLED_MESSAGE);
  }

  async login() {
    throw new Error(AUTH_DISABLED_MESSAGE);
  }
}

export { AUTH_DISABLED_MESSAGE };
