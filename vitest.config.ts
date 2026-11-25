import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Uma semente por execução, compartilhada por todos os arquivos de teste (D-015).
const seed = process.env['PROP_SEED'] ?? String(Math.floor(Math.random() * 2 ** 31));
const runs = process.env['PROP_RUNS'] ?? '1000';
console.log(`Testes de propriedade: PROP_SEED=${seed}, ${runs} casos por invariante.`);

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs', 'eslint/**/*.test.mjs'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    env: { PROP_SEED: seed, PROP_RUNS: runs },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/domain/testing/**'],
      // NFR-013: o domínio financeiro precisa de 95% de linhas cobertas (Volume 09).
      thresholds: {
        'src/domain/**': { lines: 95 },
      },
    },
  },
});
