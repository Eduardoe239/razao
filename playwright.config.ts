import { defineConfig, devices } from '@playwright/test';

// Ponta a ponta nos três motores (Chromium, Firefox e WebKit), em 360 px e 1440 px (Volume 09).
const larguras = [
  { nome: 'celular', viewport: { width: 360, height: 780 } },
  { nome: 'computador', viewport: { width: 1440, height: 900 } },
] as const;

const motores = [
  { nome: 'chromium', device: devices['Desktop Chrome'] },
  { nome: 'firefox', device: devices['Desktop Firefox'] },
  { nome: 'webkit', device: devices['Desktop Safari'] },
] as const;

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: motores.flatMap((m) =>
    larguras.map((l) => ({
      name: `${m.nome}-${l.nome}`,
      use: { ...m.device, viewport: l.viewport },
    })),
  ),
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
  },
});
