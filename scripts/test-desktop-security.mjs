import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'electron/preload.cjs'), 'utf8');

assert.equal(pkg.main, 'electron/main.cjs', 'Electron deve usar entrypoint CommonJS explícito');
assert.match(main, /preload\.cjs/, 'BrowserWindow deve carregar preload CommonJS');
assert.match(main, /contextIsolation:\s*true/, 'contextIsolation deve permanecer habilitado');
assert.match(main, /nodeIntegration:\s*false/, 'nodeIntegration deve permanecer desabilitado');
assert.match(main, /sandbox:\s*true/, 'sandbox deve permanecer habilitado');
assert.match(main, /assertTrusted\(event\)/, 'handlers IPC sensíveis devem validar a origem');
assert.match(main, /PACKAGED_ENTRY_URL/, 'a origem desktop precisa ser validada pela URL exata do entrypoint');
assert.match(main, /url\.href === PACKAGED_ENTRY_URL/, 'não confiar em arquivo local que apenas termina com dist/index.html');
assert.match(main, /validatePersistableState/, 'gravação/restauração desktop precisam compartilhar contrato estrutural');
assert.doesNotMatch(main, /url\.startsWith\('file:\/\/'\)/, 'não permitir navegação indiscriminada para qualquer arquivo local');
assert.match(main, /atomicWrite\(/, 'persistência deve escrever atomicamente');
assert.match(main, /MAX_STATE_BYTES/, 'persistência deve limitar o tamanho do estado');
assert.match(main, /desktop:openFileDialog/, 'dialog de abertura deve possuir handler');
assert.match(main, /desktop:saveFileDialog/, 'dialog de salvamento deve possuir handler');
assert.match(main, /window:minimize/, 'controle de minimizar deve possuir handler');
assert.match(main, /window:maximize/, 'controle de maximizar deve possuir handler');
assert.match(main, /window:close/, 'controle de fechar deve possuir handler');
assert.match(preload, /Object\.freeze/, 'API exposta ao renderer deve ser congelada');
assert.doesNotMatch(preload, /send\(['"][^'"]*['"],\s*.*ipcRenderer/, 'preload não deve expor IPC genérico');
console.log('Desktop security checks: 19 passed, 0 failed');
