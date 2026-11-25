// Gera src/ui/theme/tokens.css a partir de src/ui/theme/tokens.json (cópia do design system aprovado, D-035).
// Rode sempre que o tokens.json mudar: npm run tokens
import { readFile, writeFile } from 'node:fs/promises';

const origem = new URL('../src/ui/theme/tokens.json', import.meta.url);
const destino = new URL('../src/ui/theme/tokens.css', import.meta.url);
const t = JSON.parse(await readFile(origem, 'utf8'));

// Um valor "{primary}" aponta para outro token: vira var(--primary), nunca o texto literal.
const valor = (v) => (/^\{[a-z0-9-]+\}$/.test(v) ? `var(--${v.slice(1, -1)})` : v);

const claro = [];
const escuro = [];
for (const c of t.color.tokens) {
  claro.push(`  --${c.name}: ${valor(c.value.light)};`);
  escuro.push(`  --${c.name}: ${valor(c.value.dark)};`);
}
for (const s of t.shadow.tokens) {
  claro.push(`  --${s.name}: ${s.value.light};`);
  escuro.push(`  --${s.name}: ${s.value.dark};`);
}

const fixos = [];
// A fonte vem empacotada no app (Inter Variable), nunca de um servidor de terceiros (SEC-03).
fixos.push(`  --font-sans: "Inter Variable", ${t.type.families.sans};`);
for (const g of t.type.groups) {
  for (const s of g.styles) {
    fixos.push(`  --text-${s.name}-size: ${s.fontSize};`);
    fixos.push(`  --text-${s.name}-line: ${s.lineHeight};`);
    fixos.push(`  --text-${s.name}-weight: ${s.fontWeight};`);
    if (s.letterSpacing) fixos.push(`  --text-${s.name}-tracking: ${s.letterSpacing};`);
  }
}
for (const grupo of ['spacing', 'radius'])
  for (const x of t[grupo].tokens) fixos.push(`  --${x.name}: ${x.value};`);

const css = `/* Gerado por scripts/gen-tokens.mjs a partir de tokens.json. Não edite à mão. */
:root {
${fixos.join('\n')}
${claro.join('\n')}
  color-scheme: light;
}

:root[data-theme='dark'] {
${escuro.join('\n')}
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${escuro.map((l) => `  ${l}`).join('\n')}
    color-scheme: dark;
  }
}
`;
await writeFile(destino, css, 'utf8');
console.log('tokens.css gerado.');
