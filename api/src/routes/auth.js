/**
 * Fachada de autenticação desativada até configurar armazenamento persistente,
 * hash de senha apropriado, assinatura/validação de sessão e autorização.
 * Não emitir JWTs fictícios nem rótulos Argon2 para hashes não compatíveis.
 */
const AUTH_DISABLED_MESSAGE = 'Autenticação de produção não está configurada. Cadastro e login remotos estão desabilitados até a implementação e validação do serviço seguro.';

export class AuthService {
  constructor() {
    this.configured = false;
  }

  hashPassword() {
    throw new Error(AUTH_DISABLED_MESSAGE);
  }

  async registerUser() {
    throw new Error(AUTH_DISABLED_MESSAGE);
  }

  async loginUser() {
    throw new Error(AUTH_DISABLED_MESSAGE);
  }

  generateJWTToken() {
    throw new Error(AUTH_DISABLED_MESSAGE);
  }
}

export { AUTH_DISABLED_MESSAGE };
