import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const splash = readFileSync(new URL('../src/components/SplashScreen.jsx', import.meta.url), 'utf8');
const storage = readFileSync(new URL('../src/services/storage.js', import.meta.url), 'utf8');

assert.match(splash, /Iniciando a interface/);
assert.match(splash, /Preparando os recursos da aplicação/);
assert.doesNotMatch(splash, /criptografia AES-GCM-256/i, 'A splash não deve afirmar que inicializa criptografia que não está implementada nesse fluxo.');
assert.doesNotMatch(splash, /banco de dados local seguro/i, 'A splash não deve prometer armazenamento seguro sem qualificação.');
assert.match(splash, /O armazenamento Web não oferece criptografia em repouso/);
assert.match(splash, /Boolean\(window\.electronAPI\)/, 'A divulgação Web deve ser condicionada à modalidade navegador.');
assert.match(storage, /localStorage/, 'A divulgação precisa corresponder ao mecanismo de persistência Web usado.');

console.log('✓ 7 verificações: splash sem alegações falsas de criptografia e aviso explícito para armazenamento Web.');
