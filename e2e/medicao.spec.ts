// Página de medição de desempenho (Volume 09): abre ao lado do app, mede com 10 mil lançamentos sintéticos
// e não toca no cofre de verdade. Os números de referência vêm do notebook e do celular do proprietário.
import { expect, test } from '@playwright/test';
import { criarCofre } from './helpers';

test('[NFR-006] a medição roda com 10 mil lançamentos e não toca no cofre de verdade', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Medição de referência só no Chromium; os outros motores rodam as jornadas.',
  );
  test.setTimeout(240_000);
  await criarCofre(page, false);
  await page.goto('/medicao/');
  await page.getByRole('button', { name: 'Medir' }).click();
  const saida = page.locator('pre[data-pronto="1"]');
  await expect(saida).toBeVisible({ timeout: 200_000 });
  const texto = await saida.innerText();
  expect(texto).not.toContain('Falhou');
  for (const linha of [
    'Argon2id',
    'Lançamentos no cofre: 10000',
    'Desbloquear e mostrar o saldo',
    'Salvar uma transferência',
    'Gerar e conferir o backup',
  ]) {
    expect(texto).toContain(linha);
  }
  // O cofre de verdade continua lá, intacto.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
  await page.getByLabel('Senha do cofre').fill('uma frase longa de teste');
  await page.getByRole('button', { name: 'Desbloquear' }).click();
  await expect(page.getByText('R$\u00a09.270,35').first()).toBeVisible();
});
