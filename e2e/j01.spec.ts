// Jornada J-01 (Volume 02): criar o cofre, escolher PF/PJ e ver o primeiro saldo. Dados sintéticos.
import { expect, test } from '@playwright/test';
import { SENHA, criarCofre } from './helpers';

test.describe('J-01', () => {
  test.setTimeout(90_000);

  test('[COF-006] do primeiro acesso ao primeiro saldo, e [COF-002] de volta depois de bloquear', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
    await expect(page.getByText('R$\u00a09.270,35').first()).toBeVisible();
    await expect(page.getByText('Banco Azul')).toBeVisible();

    // Nada do cofre fica na tela depois de bloquear.
    await page.getByRole('button', { name: 'Bloquear o cofre' }).filter({ visible: true }).click();
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
    await expect(page.getByText('Banco Azul')).toHaveCount(0);

    // SEC-11: a mensagem não diz o que errou.
    await page.getByLabel('Senha do cofre').fill('senha errada demais');
    await page.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(page.getByText('Senha ou código de recuperação incorreto.')).toBeVisible();

    await page.getByLabel('Senha do cofre').fill(SENHA);
    await page.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(page.getByText('R$\u00a09.270,35').first()).toBeVisible();

    // PERS-06 e COF-001: recarregar mantém o cofre e pede a senha de novo, nunca um cofre novo.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
  });

  test('[COF-005] PF e PJ separados, com o espaço ativo sempre visível', async ({ page }) => {
    const codigo = await criarCofre(page, true);
    await expect(page.getByText('R$\u00a09.270,35').first()).toBeVisible();
    // Troca para o Negócio: a conta do Pessoal não aparece lá.
    await page.getByRole('button', { name: 'Negócio' }).filter({ visible: true }).click();
    await expect(page.getByText('Nenhuma conta neste espaço').first()).toBeVisible();
    await expect(page.getByText('Banco Azul')).toHaveCount(0);
    await page.getByRole('button', { name: 'Pessoal' }).filter({ visible: true }).click();
    await expect(page.getByText('Banco Azul')).toBeVisible();

    // COF-001: o código de recuperação também abre o cofre.
    await page.getByRole('button', { name: 'Bloquear o cofre' }).filter({ visible: true }).click();
    await page.getByRole('button', { name: /usar código de recuperação/ }).click();
    await page.getByLabel('Código de recuperação').fill(codigo.toLowerCase());
    await page.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(page.getByText('Banco Azul')).toBeVisible();
  });
});
