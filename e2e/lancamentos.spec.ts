// Lançamentos de verdade na tela (I-04 da Alpha 2a): J-02, divisão, pendente, edição, exclusão com desfazer,
// duplicar, filtros e clique duplo. Dados sintéticos; o cofre começa com o Banco Azul em R$ 9.270,35.
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { criarCofre } from './helpers';

const reais = (texto: string) => `R$\u00a0${texto}`;

async function abrirLancamentos(page: Page) {
  await page.goto('/#/lancamentos/todos');
  await expect(page.getByRole('heading', { level: 1, name: 'Lançamentos' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Período e totais' })).toBeVisible();
}

async function novo(page: Page) {
  // No celular é o botão da barra inferior; no computador, o botão da página.
  await page.getByRole('button', { name: 'Novo lançamento' }).filter({ visible: true }).first().click();
  const d = page.getByRole('dialog', { name: 'Novo lançamento' });
  await expect(d.getByLabel('Valor', { exact: true })).toBeVisible();
  return d;
}

async function gasto(page: Page, valor: string, descricao: string, categoria: string) {
  const d = await novo(page);
  await d.getByLabel('Valor', { exact: true }).fill(valor);
  await d.getByLabel('Descrição').fill(descricao);
  await d.getByLabel('Categoria', { exact: true }).selectOption({ label: categoria });
  await d.getByRole('button', { name: 'Salvar lançamento' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

const linha = (page: Page, nome: string) => page.getByRole('button', { name: new RegExp(`^${nome} `) });

async function saldoBanco(page: Page) {
  await page.goto('/#/contas/contas');
  const texto = await page.getByRole('button', { name: /^Banco Azul / }).innerText();
  await page.goto('/#/lancamentos/todos');
  return texto;
}

test.describe('lançamentos', () => {
  test.setTimeout(120_000);

  test('[LAN-001] J-02: gasto registrado, totais e saldo da conta atualizados; o segundo em até 10 s e 3 toques', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await abrirLancamentos(page);
    await expect(page.getByText('Nenhum lançamento ainda')).toBeVisible();
    await gasto(page, '45,90', 'Mercado Bom Preço', 'Alimentação › Mercado');
    await expect(page.getByRole('status').getByText(/Mercado Bom Preço · R\$\s45,90 salvo/)).toBeVisible();
    await expect(linha(page, 'Mercado Bom Preço')).toBeVisible();
    const totais = page.getByRole('region', { name: 'Período e totais' });
    await expect(totais).toContainText(`−\u00a0${reais('45,90')}`);
    expect(await saldoBanco(page)).toContain(reais('9.224,45'));

    // J-02: abrir, digitar o valor e salvar; a categoria e a conta já vêm da última vez.
    const inicio = Date.now();
    const d = await novo(page);
    await d.getByLabel('Valor', { exact: true }).fill('12,00');
    await expect(d.getByLabel('Categoria', { exact: true })).toHaveValue(/.+/);
    await d.getByRole('button', { name: 'Salvar lançamento' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(Date.now() - inicio).toBeLessThan(10_000);
    await expect(page.getByRole('region', { name: 'Período e totais' })).toContainText(
      `−\u00a0${reais('57,90')}`,
    );
  });

  test('[LAN-012] clique duplo em salvar grava um lançamento só', async ({ page }) => {
    await criarCofre(page, false);
    await abrirLancamentos(page);
    const d = await novo(page);
    await d.getByLabel('Valor', { exact: true }).fill('30,00');
    await d.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Lazer' });
    await d.getByRole('button', { name: 'Salvar lançamento' }).dblclick();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(linha(page, 'Lazer')).toHaveCount(1);
  });

  test('[LAN-007] dividido em duas categorias: a soma precisa fechar e vira uma saída só', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await abrirLancamentos(page);
    const d = await novo(page);
    await d.getByLabel('Valor', { exact: true }).fill('126,40');
    await d.getByLabel('Descrição').fill('Feira e farmácia');
    await d.getByLabel('Dividir em mais de uma categoria').check();
    await d.getByLabel('Categoria 1').selectOption({ label: 'Alimentação › Mercado' });
    await d.getByLabel('Valor 1').fill('92,40');
    await d.getByLabel('Categoria 2').selectOption({ label: 'Saúde › Farmácia' });
    await d.getByLabel('Valor 2').fill('30,00');
    await expect(d.getByText(`Falta ${reais('4,00')}`)).toBeVisible();
    await d.getByRole('button', { name: 'Salvar lançamento' }).click();
    await expect(d.getByRole('alert').getByText(`Falta distribuir ${reais('4,00')}.`)).toBeVisible();
    await d.getByLabel('Valor 2').fill('34,00');
    await expect(d.getByText('Tudo distribuído')).toBeVisible();
    await d.getByRole('button', { name: 'Salvar lançamento' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await linha(page, 'Feira e farmácia').click();
    const det = page.getByRole('dialog', { name: 'Feira e farmácia' });
    await expect(det).toContainText(`Mercado · ${reais('92,40')}`);
    await expect(det).toContainText(`Farmácia · ${reais('34,00')}`);
  });

  test('[LAN-003] a vencer fica fora do saldo até confirmar o pagamento', async ({ page }) => {
    await criarCofre(page, false);
    await abrirLancamentos(page);
    const d = await novo(page);
    await d.getByLabel('Valor', { exact: true }).fill('1.500,00');
    await d.getByLabel('Descrição').fill('Aluguel');
    await d.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Moradia › Aluguel' });
    await d.getByRole('button', { name: 'A vencer' }).click();
    await d.getByRole('button', { name: 'Salvar lançamento' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await saldoBanco(page)).toContain(reais('9.270,35'));
    await page.goto('/#/lancamentos/a-vencer');
    await expect(page.getByRole('region', { name: 'Período e totais' })).toContainText(
      `−\u00a0${reais('1.500,00')}`,
    );
    await linha(page, 'Aluguel').click();
    await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
    await expect(page.getByRole('status').getByText('Aluguel confirmado hoje')).toBeVisible();
    expect(await saldoBanco(page)).toContain(reais('7.770,35'));
  });

  test('[LAN-004] editar o valor marca como editado; [LAN-010] duplicar cria outro igual', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await abrirLancamentos(page);
    await gasto(page, '62,90', 'Restaurante Sabor', 'Alimentação › Restaurantes e delivery');
    await linha(page, 'Restaurante Sabor').click();
    await page.getByRole('button', { name: 'Editar' }).click();
    const e = page.getByRole('dialog', { name: 'Editar lançamento' });
    await e.getByLabel('Valor', { exact: true }).fill('68,90');
    await e.getByRole('button', { name: 'Salvar alteração' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Restaurante Sabor .* editado/ })).toBeVisible();
    expect(await saldoBanco(page)).toContain(reais('9.201,45'));

    await linha(page, 'Restaurante Sabor').click();
    await page.getByRole('button', { name: 'Duplicar' }).click();
    await page
      .getByRole('dialog', { name: 'Duplicar lançamento' })
      .getByRole('button', { name: 'Salvar lançamento' })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(linha(page, 'Restaurante Sabor')).toHaveCount(2);
  });

  test('[LAN-006] excluir some dos totais e "Desfazer" traz de volta', async ({ page }) => {
    await criarCofre(page, false);
    await abrirLancamentos(page);
    await gasto(page, '180,00', 'Posto Avenida', 'Transporte › Combustível');
    await linha(page, 'Posto Avenida').click();
    await page.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(linha(page, 'Posto Avenida')).toHaveCount(0);
    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect(linha(page, 'Posto Avenida')).toHaveCount(1);
    expect(await saldoBanco(page)).toContain(reais('9.090,35'));
  });

  test('[LAN-011] filtro por categoria mostra só o que combina e o total do filtro', async ({ page }) => {
    await criarCofre(page, false);
    await abrirLancamentos(page);
    await gasto(page, '50,00', 'Farmácia Centro', 'Saúde › Farmácia');
    await gasto(page, '70,00', 'Cinema', 'Lazer');
    await page.getByRole('button', { name: 'Filtros' }).click();
    const f = page.getByRole('dialog', { name: 'Filtros' });
    await f.getByRole('checkbox', { name: 'Saúde' }).click();
    await f.getByRole('button', { name: 'Ver 1 lançamento' }).click();
    await expect(linha(page, 'Farmácia Centro')).toBeVisible();
    await expect(linha(page, 'Cinema')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Filtros · 1' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Período e totais' })).toContainText(
      `−\u00a0${reais('50,00')}`,
    );
  });
});
