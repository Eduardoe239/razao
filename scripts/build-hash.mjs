// Hash do build (Volume 09, T-01 e notas da versão): SHA-256 de cada arquivo de dist/ e um hash geral.
// Quem quiser conferir a versão publicada roda "npm ci && npm run build && npm run build:hash" no commit da tag
// e compara com as notas da versão e com os arquivos servidos.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const pasta = path.resolve('dist');

async function listar(dir) {
  const itens = await readdir(dir, { withFileTypes: true });
  const arquivos = await Promise.all(
    itens.map((i) => (i.isDirectory() ? listar(path.join(dir, i.name)) : [path.join(dir, i.name)])),
  );
  return arquivos.flat();
}

const arquivos = (await listar(pasta)).map((a) => path.relative(pasta, a).split(path.sep).join('/')).sort();
const linhas = [];
for (const rel of arquivos) {
  const hash = createHash('sha256')
    .update(await readFile(path.join(pasta, rel)))
    .digest('hex');
  linhas.push(`${hash}  ${rel}`);
}
const geral = createHash('sha256').update(linhas.join('\n')).digest('hex');
console.log(linhas.join('\n'));
console.log(`\nHash geral do build (SHA-256 da lista acima): ${geral}`);
