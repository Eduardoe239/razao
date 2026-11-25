// Confere o build em dist/: nenhum recurso de terceiros (SEC-03) e JavaScript inicial até 250 KB comprimido.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { LIMITE_JS_INICIAL, tamanhoComprimido, urlsExternas } from './lib/build.mjs';

const pasta = path.resolve('dist');

async function listar(dir) {
  const itens = await readdir(dir, { withFileTypes: true });
  const arquivos = await Promise.all(
    itens.map((i) => (i.isDirectory() ? listar(path.join(dir, i.name)) : [path.join(dir, i.name)])),
  );
  return arquivos.flat();
}

const arquivos = await listar(pasta);
const textos = arquivos.filter(
  (a) => /\.(html|js|css|json|webmanifest|txt)$/.test(a) || a.endsWith('_headers'),
);

let falhou = false;
for (const arquivo of textos) {
  const externas = urlsExternas(await readFile(arquivo, 'utf8'));
  if (externas.length) {
    falhou = true;
    console.error(`SEC-03: ${path.relative(pasta, arquivo)} cita endereço externo: ${externas.join(', ')}`);
  }
}

// O JavaScript inicial é o que o index.html carrega direto.
const html = await readFile(path.join(pasta, 'index.html'), 'utf8');
const iniciais = [...html.matchAll(/<script[^>]+src="\/?([^"]+\.js)"/g)].map((m) => m[1]);
let total = 0;
for (const rel of iniciais) total += tamanhoComprimido(await readFile(path.join(pasta, rel)));
const kb = (total / 1024).toFixed(1);
if (total > LIMITE_JS_INICIAL) {
  falhou = true;
  console.error(`Orçamento: JavaScript inicial com ${kb} KB comprimido, acima de 250 KB.`);
} else {
  console.log(`JavaScript inicial: ${kb} KB comprimido (limite 250 KB).`);
}

if (falhou) process.exit(1);
console.log(`Build conferido: ${textos.length} arquivos de texto, nenhum endereço externo.`);
