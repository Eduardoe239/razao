// Razão IA nível 1 na tela (I-06): sugestão que aprende, Explicar, alertas e desligar. Dados sintéticos.
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { criarCofre } from './helpers';

async function novo(page: Page) {
  await page.getByRole('button', { name: 'Novo lançamento' }).filter({ visible: true }).first().click();
  return page.getByRole('dialog', { name: 'Novo lançamento' });
}

async function gasto(
  page: Page,
  valor: string,
  descricao: string,
  categoria: string,
  opcoes: { pendente?: string } = {},
) {
  const d = await novo(page);
  await d.getByLabel('Valor', { exact: true }).fill(valor);
  await d.getByLabel('Descrição').fill(descricao);
  await d.getByLabel('Categoria', { exact: true }).selectOption({ label: categoria });
  if (opcoes.pendente) {
    await d.getByRole('button', { name: 'A vencer' }).click();
    await d.getByLabel('Data').fill(opcoes.pendente);
  }
  await d.getByRole('button', { name: 'Salvar lançamento' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test.describe('Razão IA nível 1', () => {
  test.setTimeout(120_000);

  test('[IA-001] aprende com o histórico: a mesma descrição já vem com a categoria e o motivo', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await page.goto('/#/lancamentos/todos');
    await gasto(page, '18,50', 'Padaria Estrela', 'Alimentação › Mercado');
    await gasto(page, '30,00', 'Cinema', 'Lazer');
    const d = await novo(page);
    await d.getByLabel('Valor', { exact: true }).fill('12,00');
    await d.getByLabel('Descrição').fill('padaria estrela');
    await expect(d.getByRole('status')).toContainText('Alimentação › Mercado');
    await expect(d.getByRole('status')).toContainText('você usou essa categoria da última vez');
    await d.getByRole('button', { name: 'Salvar lançamento' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^padaria estrela .*Mercado/ })).toBeVisible();
  });

  test('[IA-004] J-06 e J-12: Explicar no Início, na conta e nos totais da lista abre os lançamentos', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await page.goto('/#/lancamentos/todos');
    await gasto(page, '180,00', 'Posto Avenida', 'Transporte › Combustível');
    await page.getByRole('button', { name: 'Explicar' }).click();
    const e = page.getByRole('dialog', { name: 'O que compõe estes totais' });
    await expect(e).toContainText('saíram R$');
    // O primeiro grupo já vem aberto, com os lançamentos dele.
    await expect(e.getByRole('button', { name: /Transporte › Combustível/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await e.getByRole('button', { name: /^Posto Avenida/ }).click();
    await expect(page.getByRole('dialog', { name: 'Posto Avenida' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('/#/inicio/visao-geral');
    await page.getByRole('button', { name: 'Por que o saldo mudou' }).click();
    const t = page.getByRole('dialog', { name: 'Por que o saldo mudou' });
    await expect(t).toContainText('O total do espaço');
    await expect(t).toContainText('Saldo de abertura');
    await expect(t).toContainText('Transporte › Combustível');
    await page.keyboard.press('Escape');

    await page.goto('/#/contas/contas');
    await page.getByRole('button', { name: /^Banco Azul / }).click();
    await page.getByRole('button', { name: 'Por que o saldo mudou' }).click();
    await expect(page.getByRole('dialog')).toContainText('O saldo de Banco Azul');
  });

  test('[IA-006] alerta de atrasado aparece no Início e, dispensado, não volta', async ({ page }) => {
    await criarCofre(page, false);
    await page.goto('/#/lancamentos/todos');
    await gasto(page, '99,90', 'Internet', 'Moradia › Contas da casa', { pendente: '2020-01-10' });
    await page.goto('/#/inicio/visao-geral');
    const alertas = page.getByRole('region', { name: 'Alertas da Razão IA' });
    await expect(alertas).toContainText('Internet está atrasado');
    await alertas.getByRole('button', { name: 'Dispensar' }).first().click();
    await expect(page.getByText('Internet está atrasado')).toHaveCount(0);
    await page.reload();
    await page.getByLabel('Senha do cofre').fill('uma frase longa de teste');
    await page.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
    await expect(page.getByText('Internet está atrasado')).toHaveCount(0);
  });

  test('[IA-013] desligada, somem sugestões, Explicar e alertas, e o app continua completo', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await page.goto('/#/lancamentos/todos');
    await gasto(page, '18,50', 'Padaria Estrela', 'Alimentação › Mercado');
    await gasto(page, '99,90', 'Internet', 'Moradia › Contas da casa', { pendente: '2020-01-10' });
    await page.goto('/#/config/ia');
    await page.getByRole('switch', { name: 'Razão IA nível 1' }).click();
    await expect(page.getByText('Razão IA desligada neste aparelho.')).toBeVisible();
    await page.goto('/#/inicio/visao-geral');
    await expect(page.getByRole('region', { name: 'Alertas da Razão IA' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Por que o saldo mudou' })).toHaveCount(0);
    await page.goto('/#/lancamentos/todos');
    await expect(page.getByRole('button', { name: 'Explicar' })).toHaveCount(0);
    const d = await novo(page);
    await d.getByLabel('Valor', { exact: true }).fill('12,00');
    await d.getByLabel('Descrição').fill('Padaria Estrela');
    await expect(d.getByText('Categoria sugerida:')).toHaveCount(0);
    await d.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Lazer' });
    await d.getByRole('button', { name: 'Salvar lançamento' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
