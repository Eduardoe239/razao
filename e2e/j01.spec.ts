// Jornada J-01 (Volume 02): criar o cofre, escolher PF/PJ e ver o primeiro saldo. Dados sintéticos.
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const SENHA = 'uma frase longa de teste';

async function criarCofre(page: Page, comEmpresa: boolean) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar' }).click();
  // PERS-03: no WebKit fora do modo app aparece a explicação de instalar; dá para seguir.
  const semInstalar = page.getByRole('button', { name: 'Continuar sem instalar' });
  if (await semInstalar.isVisible().catch(() => false)) await semInstalar.click();
  await expect(page.getByRole('heading', { name: 'Crie a senha do cofre' })).toBeVisible();
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByLabel('Repita a senha').fill(SENHA);
  await page.getByRole('button', { name: 'Criar cofre' }).click();

  await expect(page.getByRole('heading', { name: 'Guarde o código de recuperação' })).toBeVisible({
    timeout: 20_000,
  });
  const codigo = (await page.getByTestId('codigo').innerText()).replace(/\s+/g, '');
  expect(codigo).toMatch(/^[0-9A-HJKMNP-TV-Z]{24}$/);
  const continuar = page.getByRole('button', { name: 'Continuar' });
  await expect(continuar).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Guardei o código em um lugar seguro' }).click();
  await continuar.click();

  await expect(page.getByRole('heading', { name: 'O que você vai organizar?' })).toBeVisible();
  if (comEmpresa) {
    await page.getByRole('radio', { name: /Pessoal e minha empresa/ }).click();
    await page.getByLabel('Nome da empresa').fill('Norte Software ME');
  }
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Adicione sua primeira conta' })).toBeVisible();
  await page.getByLabel('Nome da conta').fill('Banco Azul');
  await page.getByRole('radio', { name: 'Conta corrente' }).click();
  await page.getByLabel('Saldo de hoje').fill('9.270,35');
  await page.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByRole('heading', { name: 'Tudo pronto' })).toBeVisible();
  await page.getByRole('button', { name: 'Ir para o Início' }).click();
  return codigo;
}

test.describe('J-01', () => {
  test.setTimeout(90_000);

  test('[COF-006] do primeiro acesso ao primeiro saldo, e [COF-002] de volta depois de bloquear', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
    await expect(page.getByText('R$ 9.270,35').first()).toBeVisible();
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
    await expect(page.getByText('R$ 9.270,35').first()).toBeVisible();

    // PERS-06 e COF-001: recarregar mantém o cofre e pede a senha de novo, nunca um cofre novo.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
  });

  test('[COF-005] PF e PJ separados, com o espaço ativo sempre visível', async ({ page }) => {
    const codigo = await criarCofre(page, true);
    await expect(page.getByText('R$ 9.270,35').first()).toBeVisible();
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
