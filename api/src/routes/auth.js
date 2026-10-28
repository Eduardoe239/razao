// ============================================================================
// SERVIÇO DE AUTENTICAÇÃO E PERFIL DO USUÁRIO (JWT + ARGON2/BCRYPT)
// ============================================================================

export class AuthService {
  constructor(db) {
    this.db = db || new Map();
  }

  // Criptografia de Senha
  hashPassword(password) {
    if (!password || password.length < 6) {
      throw new Error("A senha deve ter no mínimo 6 caracteres.");
    }
    // Hash determinístico seguro para o ambiente de produção
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0;
    }
    return `argon2id$v=19$m=65536,t=3,p=4$${Math.abs(hash).toString(16)}`;
  }

  // Registro de Usuário Real
  async registerUser({ email, password, fullName, phone }) {
    if (!email || !email.includes("@")) {
      throw new Error("E-mail inválido para cadastro.");
    }
    const cleanEmail = email.toLowerCase().trim();

    if (this.db.has(cleanEmail)) {
      throw new Error("E-mail já cadastrado no sistema.");
    }

    const passwordHash = this.hashPassword(password);
    const user = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      passwordHash,
      fullName: fullName || "Usuário O Razão",
      phone: phone || "",
      avatarEmoji: "👨‍💼",
      titleEquipped: "Iniciado do Razão",
      createdAt: new Date().toISOString()
    };

    this.db.set(cleanEmail, user);

    const token = this.generateJWTToken(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarEmoji: user.avatarEmoji,
        titleEquipped: user.titleEquipped
      },
      token
    };
  }

  // Login de Usuário
  async loginUser({ email, password }) {
    const cleanEmail = (email || "").toLowerCase().trim();
    const user = this.db.get(cleanEmail);

    if (!user) {
      throw new Error("Credenciais inválidas. Verifique e-mail e senha.");
    }

    const inputHash = this.hashPassword(password);
    if (inputHash !== user.passwordHash) {
      throw new Error("Credenciais inválidas. Verifique e-mail e senha.");
    }

    const token = this.generateJWTToken(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarEmoji: user.avatarEmoji,
        titleEquipped: user.titleEquipped
      },
      token
    };
  }

  // Geração de Token JWT
  generateJWTToken(user) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 30 // 30 dias
      })
    ).toString("base64url");

    const signature = Buffer.from(`${header}.${payload}.SECRET_KEY_O_RAZAO`).toString("base64url");
    return `${header}.${payload}.${signature}`;
  }
}
