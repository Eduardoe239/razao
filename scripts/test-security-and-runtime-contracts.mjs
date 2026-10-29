import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../index.html');
const main = read('../electron/main.cjs');
const preload = read('../electron/preload.cjs');
const desktopDev = read('./desktop-dev.mjs');
const pkg = JSON.parse(read('../package.json'));
let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}

check(pkg.version === '1.22.0-beta.20', 'versão do pacote corresponde à beta.20');
check(pkg.engines?.node === '>=22.12.0', 'versão mínima do Node está declarada');
check(pkg.scripts?.['desktop:dev'] === 'node scripts/desktop-dev.mjs', 'modo desktop usa inicializador que aguarda Vite');
check(pkg.dependencies?.react && pkg.dependencies?.['react-dom'], 'dependências centrais estão declaradas');
check(pkg.devDependencies?.electron && pkg.devDependencies?.vite, 'ferramentas de desenvolvimento estão declaradas');
check(/http-equiv="Content-Security-Policy"/i.test(html), 'documento declara CSP');
check(/default-src\s+'self'/.test(html) && /object-src\s+'none'/.test(html), 'CSP restringe origem e bloqueia plugins');
check(/base-uri\s+'self'/.test(html) && /form-action\s+'self'/.test(html), 'CSP restringe base-uri e destinos de formulário');
check(!/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html), 'HTML não carrega fonte de terceiro');
check(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?/i.test(html), 'viewport permite zoom assistivo');
check(/href="\.\/favicon\.(?:ico|png)"/.test(html), 'ícones do site usam caminhos relativos compatíveis com protocolo file://');
check(/nodeIntegration:\s*false/.test(main) && /contextIsolation:\s*true/.test(main) && /sandbox:\s*true/.test(main), 'Electron desativa Node no renderer, isola contexto e ativa sandbox');
check(/setWindowOpenHandler\(\(\)\s*=>\s*\(\{\s*action:\s*'deny'\s*\}\)\)/.test(main), 'Electron bloqueia popups');
check(/webContents\.on\('will-navigate'/.test(main) && /target\.origin\s*===\s*DEV_ORIGIN/.test(main), 'navegação do renderer tem verificação de origem');
check(/function isTrustedSender/.test(main) && /isTrustedSender\(event\)/.test(main), 'handlers IPC validam a origem do frame');
check(/contextBridge\.exposeInMainWorld\('electronAPI'/.test(preload), 'preload expõe API explícita por contextBridge');
check(!/exposeInMainWorld\(['"](?:require|ipcRenderer|fs|process)['"]/.test(preload), 'preload não expõe primitivas Node genéricas');
check(/node_modules.*vite.*bin.*vite\.js/.test(desktopDev) && /node_modules.*electron.*cli\.js/.test(desktopDev), 'inicializador desktop verifica CLIs locais');
check(/127\.0\.0\.1:5173/.test(desktopDev) && /deadline/.test(desktopDev), 'inicializador aguarda disponibilidade local com timeout');
check(/SIGINT/.test(desktopDev) && /SIGTERM/.test(desktopDev), 'inicializador trata encerramento do processo');
check(/RAZAO_TEST_USER_DATA/.test(main), 'Electron permite perfil isolado somente no processo não empacotado');
check(/RAZAO_TEST_USER_DATA/.test(desktopDev) && /\.razao-desktop-test-profile/.test(desktopDev), 'desktop:dev direciona dados para perfil de teste separado do app instalado');
check(pkg.scripts?.test.includes('test-security-and-runtime-contracts.mjs'), 'contratos estáticos de segurança integram npm test');
console.log(`Contratos estáticos de segurança/runtime: ${checks} verificações aprovadas, 0 falhas.`);
