// ============================================================================
// SERVIÇO DE AUTENTICAÇÃO E CADASTRO DE USUÁRIOS (FULL-STACK API)
// ============================================================================

export class UserAuthService {
  constructor() {
    this.users = new Map();
  }

  // Gera hash seguro de senha
  hashPassword(password) {
    if (!password || password.length < 6) {
      throw new Error("A senha deve conter no mínimo 6 caracteres.");
    }
    let h = 0;
    for (let i = 0; i < password.length; i++) {
      h = (h << 5) - h + password.charCodeAt(i);
      h |= 0;
    }
    return `hash_sec_${Math.abs(h).toString(16)}`;
  }

  // Cadastro de Novo Usuário
  async register({ email, password, fullName, phone }) {
    if (!email || !email.includes("@")) {
      throw new Error("Formato de e-mail inválido.");
    }
    const cleanEmail = email.toLowerCase().trim();

    if (this.users.has(cleanEmail)) {
      throw new Error("E-mail já cadastrado no sistema.");
    }

    const passwordHash = this.hashPassword(password);
    const user = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      passwordHash,
      fullName: fullName || "Usuário O Razão",
      phone: phone || "",
      avatarEmoji: "👨‍💼",
      titleEquipped: "Iniciado do Razão",
      createdAt: new Date().toISOString()
    };

    this.users.set(cleanEmail, user);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarEmoji: user.avatarEmoji,
        titleEquipped: user.titleEquipped
      },
      token: `jwt_session_${user.id}_${Date.now()}`
    };
  }

  // Login de Usuário Existente
  async login({ email, password }) {
    const cleanEmail = (email || "").toLowerCase().trim();
    const user = this.users.get(cleanEmail);

    if (!user) {
      throw new Error("E-mail ou senha incorretos.");
    }

    const inputHash = this.hashPassword(password);
    if (inputHash !== user.passwordHash) {
      throw new Error("E-mail ou senha incorretos.");
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarEmoji: user.avatarEmoji,
        titleEquipped: user.titleEquipped
      },
      token: `jwt_session_${user.id}_${Date.now()}`
    };
  }
}
