// Atualiza rastreio/requisitos.json a partir do Volume 03 no razao-docs (pasta irmã).
// Rode depois de qualquer mudança no catálogo de requisitos.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { lerCatalogo } from './lib/rastreio.mjs';

const origem = path.resolve('..', 'razao-docs', 'plano-v3', '03-requisitos.md');
const catalogo = lerCatalogo(await readFile(origem, 'utf8'));
if (!catalogo.length) throw new Error(`Nenhum requisito encontrado em ${origem}`);
await writeFile('rastreio/requisitos.json', `${JSON.stringify(catalogo, null, 2)}\n`, 'utf8');
const ativos = catalogo.filter((r) => r.prioridade !== 'Cancelado').length;
console.log(`${catalogo.length} IDs lidos (${ativos} ativos).`);
