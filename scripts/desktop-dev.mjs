import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const electronCli = path.join(root, 'node_modules', 'electron', 'cli.js');
if (!existsSync(viteCli) || !existsSync(electronCli)) {
  console.error('Dependências ausentes. Execute `npm install` na pasta do projeto antes de iniciar o Electron.');
  process.exit(1);
}

const env = {
  ...process.env,
  NODE_ENV: 'development',
  // Impede que o teste de desktop encoste no banco do aplicativo instalado.
  RAZAO_TEST_USER_DATA: path.join(root, '.razao-desktop-test-profile')
};
const vite = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
  cwd: root, env, stdio: 'inherit', windowsHide: true
});
let electron;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (electron && !electron.killed) electron.kill();
  if (!vite.killed) vite.kill();
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(0));
vite.once('exit', code => {
  if (!stopping && electron) stop(typeof code === 'number' ? code : 1);
  else if (!stopping && !electron) stop(typeof code === 'number' && code === 0 ? 1 : (code || 1));
});

function probe() {
  return new Promise(resolve => {
    const req = http.get('http://127.0.0.1:5173/', response => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 400);
    });
    req.setTimeout(800, () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

try {
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline && !stopping) {
    ready = await probe();
    if (ready) break;
    if (vite.exitCode !== null) throw new Error(`Vite encerrou com código ${vite.exitCode}.`);
    await delay(250);
  }
  if (!ready) throw new Error('Vite não ficou disponível em http://127.0.0.1:5173 dentro de 30 segundos.');
  if (stopping) process.exit(process.exitCode || 0);
  electron = spawn(process.execPath, [electronCli, '.'], { cwd: root, env, stdio: 'inherit', windowsHide: false });
  electron.once('exit', code => stop(typeof code === 'number' ? code : 1));
} catch (error) {
  console.error(`Não foi possível iniciar o ambiente desktop: ${error.message}`);
  stop(1);
}
