// Contrato do ponto de entrada Electron (SEC-01, beta.21/21.1).
// Os arquivos legados electron/main.js e electron/preload.js (estado em texto puro,
// sandbox desativado, IPC sem validação de remetente) foram removidos. Como
// `build.files` empacota `electron/**/*`, qualquer arquivo extra nesta pasta iria
// para o instalador; este teste impede que eles voltem.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
let checks = 0;
const check = (fn, message) => { fn(); checks++; console.log(`  ✓ ${message}`); };

console.log('Contrato do ponto de entrada Electron');

check(() => assert.equal(pkg.main, 'electron/main.cjs'), 'package.json "main" aponta para electron/main.cjs');
check(() => assert.ok(existsSync(join(root, 'electron', 'main.cjs'))), 'electron/main.cjs existe');
check(() => assert.ok(existsSync(join(root, 'electron', 'preload.cjs'))), 'electron/preload.cjs existe');

for (const legacy of ['electron/main.js', 'electron/preload.js', 'dir', 'type']) {
  check(() => assert.equal(existsSync(join(root, legacy)), false, `${legacy} não deve existir`), `${legacy} ausente`);
}

// Somente os arquivos esperados podem ser empacotados a partir de electron/.
const allowedFiles = new Set(['main.cjs', 'preload.cjs']);
const allowedDirs = new Set(['assets']);
const unexpected = readdirSync(join(root, 'electron')).filter(name => {
  const isDir = statSync(join(root, 'electron', name)).isDirectory();
  return isDir ? !allowedDirs.has(name) : !allowedFiles.has(name);
});
check(() => assert.deepEqual(unexpected, [], `arquivos inesperados em electron/: ${unexpected.join(', ')}`), 'electron/ contém apenas main.cjs, preload.cjs e assets/');

// O processo principal ativo carrega o preload .cjs, não o legado.
const mainSource = readFileSync(join(root, 'electron', 'main.cjs'), 'utf8');
check(() => assert.match(mainSource, /preload:\s*path\.join\(__dirname,\s*'preload\.cjs'\)/), 'main.cjs carrega preload.cjs');
check(() => assert.doesNotMatch(mainSource, /'preload\.js'/), 'main.cjs não referencia preload.js');

console.log(`Contrato do ponto de entrada Electron: ${checks} verificações aprovadas, 0 falhas`);
