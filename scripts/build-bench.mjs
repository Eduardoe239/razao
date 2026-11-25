// Gera bench-dist/argon2.html: um arquivo único, sem nada externo, que abre direto no navegador.
import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'vite';

const resultado = await build({
  configFile: false,
  logLevel: 'warn',
  build: {
    write: false,
    minify: true,
    target: 'es2022',
    lib: { entry: 'bench/argon2.ts', formats: ['iife'], name: 'medicao', fileName: () => 'argon2.js' },
  },
});

const saidas = (Array.isArray(resultado) ? resultado : [resultado]).flatMap((r) => r.output);
const js = saidas.find((s) => s.type === 'chunk')?.code;
if (!js) throw new Error('O build da medição não gerou JavaScript.');

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>O Razão — medição do Argon2id</title>
<style>
body { font-family: system-ui, sans-serif; margin: 24px; max-width: 760px; color: #0B1422; background: #F5F7FA; }
button { font: inherit; padding: 8px 16px; margin: 0 8px 16px 0; border-radius: 10px; border: 1px solid #7D8A9C; background: #fff; cursor: pointer; }
button:disabled { opacity: .5; cursor: default; }
pre { white-space: pre-wrap; background: #fff; border: 1px solid #DCE3EC; border-radius: 10px; padding: 12px; }
</style>
</head>
<body>
<script>${js.replaceAll('</script', '<\\/script')}</script>
</body>
</html>
`;
await mkdir('bench-dist', { recursive: true });
await writeFile('bench-dist/argon2.html', html, 'utf8');
console.log('Gerado bench-dist/argon2.html');
