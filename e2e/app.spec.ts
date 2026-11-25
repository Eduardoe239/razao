import { expect, test } from '@playwright/test';

test('[NFR-009] o app abre em português do Brasil, com o nome e a marca', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page).toHaveTitle('O Razão');
  await expect(page.getByRole('heading', { level: 1, name: 'O Razão' })).toBeVisible();
});

test('[SEC-03] a primeira carga não pede nada a outro endereço', async ({ page, baseURL }) => {
  const externas: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(baseURL ?? 'http://localhost:4173')) externas.push(r.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(externas).toEqual([]);
});
