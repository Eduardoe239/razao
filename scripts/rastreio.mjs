// Uso: npm run rastreio            → mostra o rastreio da fase atual e falha só com ID desconhecido.
//      npm run rastreio -- --portao → também falha se um "Deve" da fase estiver sem teste (portão da Alpha).
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { montarRastreio, relatorioMarkdown } from './lib/rastreio.mjs';

const raiz = path.resolve('.');
const portao = process.argv.includes('--portao');

const catalogo = JSON.parse(await readFile(path.join(raiz, 'rastreio/requisitos.json'), 'utf8'));
const verificacoes = JSON.parse(await readFile(path.join(raiz, 'rastreio/verificacoes.json'), 'utf8'));
const { faseAtual } = JSON.parse(await readFile(path.join(raiz, 'rastreio/config.json'), 'utf8'));

async function arquivosDeTeste(dir) {
  if (!existsSync(dir)) return [];
  const itens = await readdir(dir, { withFileTypes: true, recursive: true });
  return itens
    .filter((i) => i.isFile() && /\.(test|spec)\.(ts|tsx|mjs)$/.test(i.name))
    .map((i) => path.join(i.parentPath, i.name));
}

const lista = (
  await Promise.all(['src', 'e2e', 'scripts', 'eslint'].map((d) => arquivosDeTeste(path.join(raiz, d))))
).flat();
const testes = {};
for (const arq of lista)
  testes[path.relative(raiz, arq).split(path.sep).join('/')] = await readFile(arq, 'utf8');

const r = montarRastreio(catalogo, testes, verificacoes, faseAtual);
const md = relatorioMarkdown(r, new Date().toISOString().slice(0, 10));

// O relatório vai para o razao-docs quando ele estiver ao lado; na CI, para o resumo do job.
const docs = path.resolve(raiz, '..', 'razao-docs');
if (existsSync(docs)) {
  const destino = path.join(docs, 'rastreio', `${faseAtual.toLowerCase().replace(/\s+/g, '-')}.md`);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, md, 'utf8');
  console.log(`Relatório gravado em ${destino}`);
}
if (process.env['GITHUB_STEP_SUMMARY'])
  await writeFile(process.env['GITHUB_STEP_SUMMARY'], md, { flag: 'a' });

const cobertos = r.linhas.length - r.semCobertura.length;
console.log(`${faseAtual}: ${cobertos} de ${r.linhas.length} requisitos com teste ou verificação.`);
if (r.semCobertura.length) console.log(`Sem teste: ${r.semCobertura.map((l) => l.id).join(', ')}`);

let falhou = false;
for (const d of r.desconhecidos) {
  falhou = true;
  console.error(`ID desconhecido ou cancelado: ${d.id} em ${d.arquivo}`);
}
if (portao && r.semCobertura.length) {
  falhou = true;
  console.error('Portão: há requisitos "Deve" da fase sem teste.');
}
if (falhou) process.exit(1);
