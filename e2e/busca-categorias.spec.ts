// Busca, exportação CSV, categorias e regras na tela (I-05 da Alpha 2a). Dados sintéticos.
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { criarCofre } from './helpers';

async function gasto(page: Page, valor: string, descricao: string, categoria: string) {
  await page.getByRole('button', { name: 'Novo lançamento' }).filter({ visible: true }).first().click();
  const d = page.getByRole('dialog', { name: 'Novo lançamento' });
  await d.getByLabel('Valor', { exact: true }).fill(valor);
  await d.getByLabel('Descrição').fill(descricao);
  await d.getByLabel('Categoria', { exact: true }).selectOption({ label: categoria });
  await d.getByRole('button', { name: 'Salvar lançamento' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

const linha = (page: Page, nome: string) => page.getByRole('button', { name: new RegExp(`^${nome} `) });

async function categorias(page: Page) {
  await page.goto('/#/config/categorias');
  await expect(page.getByRole('heading', { level: 1, name: 'Categorias e regras' })).toBeVisible();
}

test.describe('busca, CSV, categorias e regras', () => {
  test.setTimeout(120_000);

  test('[REL-005] busca em todos os meses, sem acento, e abre o detalhe', async ({ page }) => {
    await criarCofre(page, false);
    await page.goto('/#/lancamentos/todos');
    await gasto(page, '180,00', 'Posto Avenida', 'Transporte › Combustível');
    await gasto(page, '45,90', 'Farmácia Centro', 'Saúde › Farmácia');
    await page.getByRole('button', { name: 'Buscar' }).click();
    const b = page.getByRole('dialog', { name: 'Buscar' });
    await b.getByLabel('Buscar em todos os meses').fill('FARMACIA');
    await expect(b.getByRole('list', { name: 'Resultados da busca' }).getByRole('listitem')).toHaveCount(1);
    await b.getByLabel('Buscar em todos os meses').fill('180,00');
    await b.getByRole('button', { name: /^Posto Avenida / }).click();
    await expect(page.getByRole('dialog', { name: 'Posto Avenida' })).toBeVisible();
  });

  test('[REL-006] CSV do que está na tela, com fórmula neutralizada (SEC-07)', async ({ page }) => {
    await criarCofre(page, false);
    await page.goto('/#/lancamentos/todos');
    await gasto(page, '10,00', '=1+1', 'Lazer');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    const d = page.getByRole('dialog', { name: 'Exportar CSV' });
    await expect(d.getByText('O arquivo sai sem criptografia')).toBeVisible();
    const baixa = page.waitForEvent('download');
    await d.getByRole('button', { name: 'Baixar CSV' }).click();
    const arquivo = await baixa;
    expect(arquivo.suggestedFilename()).toMatch(/^razao-lancamentos-pessoal-\d{4}-\d{2}\.csv$/);
    const texto = await readFile(await arquivo.path(), 'utf8');
    const linhas = texto.replace(/^\uFEFF/, '').split('\r\n');
    expect(linhas[0]).toBe('Data;Descrição;Tipo;Situação;Conta;Categoria;Valor;Tags;Observação');
    expect(linhas[1]).toMatch(/^\d{2}\/\d{2}\/\d{4};'=1\+1;Saída;Realizado;Banco Azul;Lazer;10,00;;$/);
  });

  test('[CAT-003] regra criada em Categorias sugere a categoria no novo lançamento', async ({ page }) => {
    await criarCofre(page, false);
    await categorias(page);
    await page.getByRole('button', { name: /^Regras automáticas/ }).click();
    const r = page.getByRole('dialog', { name: 'Regras automáticas' });
    await r.getByLabel('Quando a descrição contém').fill('posto');
    await r.getByLabel('Sugerir a categoria').selectOption({ label: 'Despesa · Transporte › Combustível' });
    await r.getByRole('button', { name: 'Criar regra' }).click();
    await expect(r.getByRole('list', { name: 'Regras em ordem de prioridade' })).toContainText('"posto"');
    await page.keyboard.press('Escape');

    await page.goto('/#/lancamentos/todos');
    await page.getByRole('button', { name: 'Novo lançamento' }).filter({ visible: true }).first().click();
    const d = page.getByRole('dialog', { name: 'Novo lançamento' });
    await d.getByLabel('Valor', { exact: true }).fill('150,00');
    await d.getByLabel('Descrição').fill('POSTO Shell');
    await expect(d.getByText('Categoria sugerida:')).toContainText('Transporte › Combustível');
    await d.getByRole('button', { name: 'Salvar lançamento' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^POSTO Shell .*Combustível/ })).toBeVisible();
  });

  test('[CAT-002] mesclar Compras em Lazer com prévia: o lançamento muda de categoria e Compras é arquivada', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await page.goto('/#/lancamentos/todos');
    await gasto(page, '90,10', 'Loja Centro', 'Compras');
    await categorias(page);
    await page.getByRole('button', { name: /^Compras/ }).click();
    const c = page.getByRole('dialog', { name: 'Compras' });
    await c.getByLabel('Mover tudo para').selectOption({ label: 'Lazer' });
    await expect(c.getByText(/1 lançamento de .*, vão para Lazer\./)).toBeVisible();
    await c.getByRole('button', { name: 'Mesclar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Compras mesclada em Lazer.')).toBeVisible();
    await page.goto('/#/lancamentos/todos');
    await expect(page.getByRole('button', { name: /^Loja Centro .*Lazer/ })).toBeVisible();
  });

  test('[CAT-004] selecionar dois lançamentos e recategorizar em lote', async ({ page }) => {
    await criarCofre(page, false);
    await page.goto('/#/lancamentos/todos');
    await gasto(page, '20,00', 'Cinema', 'Compras');
    await gasto(page, '35,00', 'Livro', 'Educação');
    await page.getByRole('button', { name: 'Selecionar' }).click();
    await page.getByRole('checkbox', { name: /^Cinema / }).check();
    await page.getByRole('checkbox', { name: /^Livro / }).check();
    await expect(page.getByRole('region', { name: 'Ações em lote' })).toContainText('2 selecionados');
    await page.getByRole('button', { name: 'Recategorizar' }).click();
    const d = page.getByRole('dialog', { name: 'Recategorizar em lote' });
    await d.getByLabel('Mover para a categoria').selectOption({ label: 'Lazer' });
    await expect(d.getByText(/^2 lançamentos de /)).toBeVisible();
    await d.getByRole('button', { name: 'Mover' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(linha(page, 'Cinema')).toContainText('Lazer');
    await expect(linha(page, 'Livro')).toContainText('Lazer');
  });
});
