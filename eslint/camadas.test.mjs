// Testa as regras de arquitetura e de segurança do ESLint com código de exemplo.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint, RuleTester } from 'eslint';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { afterAll, describe, expect, it } from 'vitest';
import { regraCamadas } from './camadas.mjs';

RuleTester.describe = describe;
RuleTester.it = it;

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(raiz, 'src');
const opcoes = [
  {
    raizSrc: src,
    pacotes: { domain: [], application: ['zod'], infra: ['idb'], ai: [], ui: ['react'] },
  },
];
const em = (arq) => path.join(src, arq);
const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

describe('[NFR-013] fronteiras entre camadas', () => {
  tester.run('camadas', regraCamadas, {
    valid: [
      { code: "import { a } from './dinheiro';", filename: em('domain/x.ts'), options: opcoes },
      { code: "import { a } from '../domain/dinheiro';", filename: em('application/x.ts'), options: opcoes },
      { code: "import { a } from '@/application/casos';", filename: em('ui/tela.tsx'), options: opcoes },
      { code: "import { openDB } from 'idb';", filename: em('infra/banco.ts'), options: opcoes },
      { code: "import { a } from '@/infra/cofre';", filename: em('main.tsx'), options: opcoes },
    ],
    invalid: [
      {
        code: "import { a } from '../ui/tela';",
        filename: em('domain/x.ts'),
        options: opcoes,
        errors: [{ messageId: 'camada' }],
      },
      {
        code: "import React from 'react';",
        filename: em('domain/x.ts'),
        options: opcoes,
        errors: [{ messageId: 'pacote' }],
      },
      {
        code: "import { a } from '@/infra/banco';",
        filename: em('ui/tela.tsx'),
        options: opcoes,
        errors: [{ messageId: 'camada' }],
      },
      {
        code: "import { a } from '@/domain/dinheiro';",
        filename: em('ui/tela.tsx'),
        options: opcoes,
        errors: [{ messageId: 'camada' }],
      },
      {
        code: "export * from '../infra/banco';",
        filename: em('application/x.ts'),
        options: opcoes,
        errors: [{ messageId: 'camada' }],
      },
      {
        code: "const m = import('../ai/motor');",
        filename: em('infra/x.ts'),
        options: opcoes,
        errors: [{ messageId: 'camada' }],
      },
    ],
  });
});

describe('[SEC-04] código proibido é barrado pela configuração do projeto', () => {
  const eslint = new ESLint({ cwd: raiz });
  const casos = [
    ['eval', "eval('1+1');"],
    ['new Function', "const f = new Function('return 1');"],
    ['innerHTML', "document.body.innerHTML = '<b>x</b>';"],
    ['insertAdjacentHTML', "document.body.insertAdjacentHTML('beforeend', '<b>x</b>');"],
    ['document.write', "document.write('x');"],
  ];
  for (const [nome, codigo] of casos) {
    it(`barra ${nome}`, async () => {
      const [resultado] = await eslint.lintText(codigo, {
        filePath: path.join(raiz, 'scripts', 'exemplo.mjs'),
      });
      expect(resultado?.errorCount ?? 0).toBeGreaterThan(0);
    });
  }

  // Arquivos dentro de src/ passam pelas regras com tipos, então o teste grava arquivos de verdade e apaga no fim.
  const temporarios = [];
  async function lintarEmSrc(relativo, codigo) {
    const arquivo = path.join(src, relativo);
    await mkdir(path.dirname(arquivo), { recursive: true });
    await writeFile(arquivo, codigo, 'utf8');
    temporarios.push(arquivo);
    const [resultado] = await eslint.lintFiles([arquivo]);
    return resultado?.messages ?? [];
  }
  afterAll(async () => {
    await Promise.all(temporarios.map((a) => rm(a, { force: true })));
  });

  it('barra dangerouslySetInnerHTML em componente', async () => {
    const codigo = "export const C = () => <div dangerouslySetInnerHTML={{ __html: 'x' }} />;\n";
    const mensagens = await lintarEmSrc('ui/__eslint_teste__.tsx', codigo);
    expect(mensagens.map((m) => m.ruleId)).toContain('no-restricted-syntax');
  });

  it('barra relógio e sorteio dentro do domínio', async () => {
    const codigo = 'export const agora = (): number => Date.now() + Math.random();\n';
    const mensagens = await lintarEmSrc('domain/__eslint_teste__.ts', codigo);
    expect(mensagens.filter((m) => m.ruleId === 'no-restricted-syntax').length).toBe(2);
  }, 30000);

  it('barra arquivo com mais de 400 linhas', async () => {
    const codigo = Array.from({ length: 401 }, (_, i) => `export const a${i} = ${i};`).join('\n');
    const [resultado] = await eslint.lintText(codigo, { filePath: path.join(raiz, 'scripts', 'grande.mjs') });
    expect((resultado?.messages ?? []).some((m) => m.ruleId === 'max-lines')).toBe(true);
  });
});
