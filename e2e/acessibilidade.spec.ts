// Acessibilidade das telas da Alpha 1 e da Alpha 2a (Volume 09, portão comum): axe sem violações graves ou críticas,
// nos temas claro e escuro, e operação por teclado nas telas novas. Dados sintéticos.
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { criarCofre } from './helpers';

async function semViolacoesGraves(page: Page, onde: string) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const graves = r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact ?? ''}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  expect(graves, onde).toEqual([]);
}

for (const tema of ['light', 'dark'] as const) {
  test(`[NFR-007] telas da Alpha 1 sem violação grave de acessibilidade, tema ${tema === 'light' ? 'claro' : 'escuro'}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: tema, reducedMotion: 'reduce' });
    await page.goto('/');
    await semViolacoesGraves(page, 'boas-vindas');
    await criarCofre(page, true);
    for (const t of [
      '#/inicio/visao-geral',
      '#/contas/contas',
      '#/lancamentos/todos',
      '#/config/backup',
      '#/config/espacos',
      '#/config/categorias',
    ]) {
      await page.goto(`/${t}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await semViolacoesGraves(page, t);
    }
    await page.goto('/#/contas/contas');
    await page.getByRole('button', { name: 'Nova conta' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await semViolacoesGraves(page, 'painel de nova conta');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Alpha 2a: novo lançamento, lista com um lançamento e o detalhe.
    await page.goto('/#/lancamentos/todos');
    await page.getByRole('button', { name: 'Novo lançamento' }).filter({ visible: true }).first().click();
    const novo = page.getByRole('dialog', { name: 'Novo lançamento' });
    await novo.getByLabel('Valor', { exact: true }).fill('25,00');
    await novo.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Lazer' });
    await semViolacoesGraves(page, 'novo lançamento');
    await novo.getByRole('button', { name: 'Salvar lançamento' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await semViolacoesGraves(page, 'lista de lançamentos');
    await page.getByRole('button', { name: /^Lazer / }).click();
    await expect(page.getByRole('dialog', { name: 'Lazer' })).toBeVisible();
    await semViolacoesGraves(page, 'detalhe do lançamento');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.getByRole('dialog', { name: 'Buscar' }).getByLabel('Buscar em todos os meses').fill('lazer');
    await semViolacoesGraves(page, 'busca');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Selecionar' }).click();
    await semViolacoesGraves(page, 'seleção em lote');
    await page.goto('/#/config/categorias');
    await page.getByRole('button', { name: /^Regras automáticas/ }).click();
    await expect(page.getByRole('dialog', { name: 'Regras automáticas' })).toBeVisible();
    await semViolacoesGraves(page, 'regras automáticas');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Lazer/ }).click();
    await semViolacoesGraves(page, 'ações da categoria');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Bloquear o cofre' }).filter({ visible: true }).click();
    await semViolacoesGraves(page, 'desbloqueio');
  });
}

test('[COF-002] desbloquear e criar uma conta só com o teclado', async ({ page }) => {
  test.setTimeout(120_000);
  await criarCofre(page, false);
  await page.getByRole('button', { name: 'Bloquear o cofre' }).filter({ visible: true }).click();
  // O campo de senha recebe o foco sozinho; Enter desbloqueia.
  await expect(page.getByLabel('Senha do cofre')).toBeFocused();
  await page.keyboard.type('uma frase longa de teste');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
  await page.goto('/#/contas/contas');
  const nova = page.getByRole('button', { name: 'Nova conta' });
  await nova.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Nome da conta')).toBeFocused();
  await page.keyboard.type('Conta do teclado');
  // Tab até o saldo, passando pelos tipos.
  for (
    let i = 0;
    i < 12 && !(await page.getByLabel('Saldo de hoje').evaluate((e) => e === document.activeElement));
    i++
  ) {
    await page.keyboard.press('Tab');
  }
  await page.keyboard.type('12,34');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('list', { name: 'Contas' }).getByText('Conta do teclado')).toBeVisible();
  // O foco volta para quem abriu o painel.
  await expect(nova).toBeFocused();
});
