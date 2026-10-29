import assert from 'node:assert/strict';
import { UserAuthService, AUTH_DISABLED_MESSAGE as USER_AUTH_MESSAGE } from '../api/src/routes/userAuth.js';
import { AuthService, AUTH_DISABLED_MESSAGE as AUTH_MESSAGE } from '../api/src/routes/auth.js';

const userAuth = new UserAuthService();
assert.equal(userAuth.configured, false);
await assert.rejects(() => userAuth.register({ email: 'a@example.com', password: 'StrongPassword1!' }), /não está configurada/);
await assert.rejects(() => userAuth.login({ email: 'a@example.com', password: 'StrongPassword1!' }), /não está configurada/);
assert.match(USER_AUTH_MESSAGE, /modo local/);

const auth = new AuthService();
assert.equal(auth.configured, false);
assert.throws(() => auth.hashPassword('StrongPassword1!'), /não está configurada/);
await assert.rejects(() => auth.registerUser({ email: 'a@example.com', password: 'StrongPassword1!' }), /não está configurada/);
await assert.rejects(() => auth.loginUser({ email: 'a@example.com', password: 'StrongPassword1!' }), /não está configurada/);
assert.throws(() => auth.generateJWTToken({ id: 'u1' }), /não está configurada/);
assert.match(AUTH_MESSAGE, /desabilitados/);
console.log('✓ 10 verificações: autenticação não configurada falha fechado e não emite hashes/tokens fictícios.');
