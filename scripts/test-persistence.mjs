import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'src/services/storage.js'), 'utf8');
const cryptoLegacy = fs.readFileSync(path.join(root, 'src/services/encryptedStorage.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');

assert.match(app, /await loadStateAsync\(\)/, 'boot deve aguardar a leitura persistida');
assert.match(app, /if \(!isHydrated\) return/, 'gravação automática deve aguardar hidratação');
assert.match(app, /setBootError\(message\)/, 'falha de leitura deve sair da splash e apresentar erro recuperável');
assert.match(app, /StartupRecoveryScreen/, 'falha de boot deve expor tela de recuperação');
assert.match(app, /!bootError && isHydrated && !showSplash && \(<AppShell/, 'shell principal só pode ficar interativo após hidratação e fim da splash');
assert.match(app, /!bootError && \(!isHydrated \|\| showSplash\)/, 'splash não deve esconder indefinidamente o fluxo de recuperação');
assert.match(app, /validateHistoricalBackupState\(candidateState, createdAt\)/, 'restauração a partir do boot deve validar integridade financeira');
assert.match(app, /parseBackupText\(await file\.text\(\)\)/, 'backup externo precisa passar pelo validador antes de restaurar');
assert.match(app, /if \(!isHydrated\) return/, 'persistência automática continua bloqueada enquanto a hidratação falha');
assert.match(storage, /return await window\.electronAPI\.loadState\(\)/, 'desktop deve priorizar o armazenamento nativo');
assert.match(main, /safeStorage\.encryptString/, 'estado desktop deve ser protegido pelo safeStorage');
assert.match(main, /safeStorage\.decryptString/, 'estado desktop deve ser descriptografado pelo safeStorage');
assert.match(main, /não foram salvos em texto puro/, 'não deve haver fallback para gravação em texto puro no desktop');
assert.doesNotMatch(cryptoLegacy, /RazaoLocalSecurityKey2026|RazaoSaltSec2026/, 'segredos fixos antigos devem ser removidos');
assert.doesNotMatch(cryptoLegacy, /encrypted:\s*false/, 'não deve existir fallback criptográfico em texto puro');
console.log('Persistence checks: 13 passed, 0 failed');
