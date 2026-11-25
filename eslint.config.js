import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';
import camadas from './eslint/camadas.mjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));

// SEC-04: nada de HTML montado por texto nem código gerado em tempo de execução.
const proibidosSeguranca = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: 'Proibido dangerouslySetInnerHTML (SEC-04).',
  },
  {
    selector: 'MemberExpression[property.name=/^(innerHTML|outerHTML)$/]',
    message: 'Proibido innerHTML e outerHTML (SEC-04).',
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: 'Proibido insertAdjacentHTML (SEC-04).',
  },
  {
    selector: "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]",
    message: 'Proibido document.write (SEC-04).',
  },
];

// Volume 04, princípios 4 e 5: o domínio não lê o relógio nem sorteia nada por conta própria.
const proibidosDominio = [
  { selector: "NewExpression[callee.name='Date']", message: 'O domínio recebe a data como parâmetro.' },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'O domínio recebe a data como parâmetro.',
  },
  {
    selector: "MemberExpression[object.name='Math'][property.name='random']",
    message: 'O domínio é determinístico; aleatoriedade só nos testes, com semente.',
  },
];

const pacotesPorCamada = {
  domain: [],
  application: ['zod'],
  infra: ['idb', 'hash-wasm', 'zod'],
  ai: [],
  ui: ['react', 'react-dom', '@fontsource-variable/inter'],
};

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'bench-dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  {
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': ['error', ...proibidosSeguranca],
      'max-lines': ['error', { max: 400, skipBlankLines: false, skipComments: false }],
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: raiz },
      globals: { ...globals.browser },
    },
    plugins: { razao: camadas, 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'razao/camadas': ['error', { raizSrc: path.join(raiz, 'src'), pacotes: pacotesPorCamada }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...proibidosSeguranca, ...proibidosDominio],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      // Os testes de propriedade usam semente fixa; o resto das regras continua valendo.
      'no-restricted-syntax': ['error', ...proibidosSeguranca],
    },
  },
  {
    files: ['*.config.ts', 'e2e/**/*.ts', 'bench/**/*.ts'],
    extends: [...tseslint.configs.strict],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
