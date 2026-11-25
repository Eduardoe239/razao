// Passa a semente e a quantidade de casos dos testes de propriedade para o gerador (D-015).
// A semente é sorteada uma vez por execução no vitest.config.ts; para repetir uma falha: PROP_SEED=<semente> npm test.
const seed = Number(process.env['PROP_SEED'] ?? '20261125');
const runs = Number(process.env['PROP_RUNS'] ?? '1000');

(globalThis as { __RAZAO_PROP__?: { seed: number; runs: number } }).__RAZAO_PROP__ = { seed, runs };
