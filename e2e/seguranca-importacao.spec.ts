// I-08 da Alpha 2a no navegador real: trocar a senha (COF-003), código novo e oferta depois de abrir pelo
// código (D-042), restaurar como espaço novo (D-046) e importar da beta.20 (BKP-008). Dados sintéticos.
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { SENHA, criarCofre } from './helpers';

const NOVA = 'outra frase de teste bem longa';
const SENHA_BACKUP = 'senha do backup de teste';

async function abrirBackup(page: Page) {
  await page.getByRole('button', { name: 'Backup e segurança' }).filter({ visible: true }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Backup e segurança' })).toBeVisible();
}

async function bloquear(page: Page) {
  await page.getByRole('button', { name: 'Bloquear o cofre' }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
}

async function abrirCom(page: Page, segredo: { senha: string } | { codigo: string }) {
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Desbloquear' })).toBeVisible();
  if ('codigo' in segredo) {
    const trocar = page.getByRole('button', { name: /usar código de recuperação/ });
    if (await trocar.isVisible()) await trocar.click();
    await page.getByLabel('Código de recuperação').fill(segredo.codigo);
  } else {
    const trocar = page.getByRole('button', { name: 'Usar a senha do cofre' });
    if (await trocar.isVisible()) await trocar.click();
    await page.getByLabel('Senha do cofre').fill(segredo.senha);
  }
  await page.getByRole('button', { name: 'Desbloquear' }).click();
}

const ultimos4 = (c: string) => c.replace(/[^0-9A-Z]/g, '').slice(-4);

test.describe('senha e código de recuperação', () => {
  test.setTimeout(90_000);

  test('[COF-003] trocar a senha: a antiga para de abrir, a nova abre e os dados continuam', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await abrirBackup(page);
    await page.getByRole('button', { name: 'Trocar a senha' }).click();
    const d = page.getByRole('dialog', { name: 'Trocar a senha' });
    await d.getByLabel('Senha atual').fill('senha errada qualquer');
    await d.getByLabel('Senha nova', { exact: true }).fill(NOVA);
    await d.getByLabel('Repita a senha nova').fill(NOVA);
    await d.getByRole('button', { name: 'Trocar a senha' }).click();
    await expect(d.getByText('A senha atual não confere. Nada foi trocado.')).toBeVisible({
      timeout: 20_000,
    });
    await d.getByLabel('Senha atual').fill(SENHA);
    await d.getByRole('button', { name: 'Trocar a senha' }).click();
    await expect(page.getByRole('status').getByText('Senha trocada.')).toBeVisible({ timeout: 20_000 });

    await bloquear(page);
    await abrirCom(page, { senha: SENHA });
    await expect(page.getByText('Senha ou código de recuperação incorreto.')).toBeVisible({
      timeout: 20_000,
    });
    await page.reload();
    await abrirCom(page, { senha: NOVA });
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toHaveCount(0, {
      timeout: 30_000,
    });
    await page.goto('/#/inicio');
    await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
    await expect(page.getByText('R$\u00a09.270,35').first()).toBeVisible();
  });

  test('[D-054] código novo com confirmação; [D-042] depois de abrir pelo código, senha e código novos', async ({
    page,
  }) => {
    const antigo = await criarCofre(page, false);
    await abrirBackup(page);
    await page.getByRole('button', { name: 'Gerar código novo' }).click();
    const d = page.getByRole('dialog', { name: 'Gerar código novo' });
    await d.getByLabel('Senha atual').fill(SENHA);
    await d.getByRole('button', { name: 'Gerar código novo' }).click();
    const caixa = d.getByTestId('codigo');
    await expect(caixa).toBeVisible({ timeout: 20_000 });
    const novo = (await caixa.innerText()).replace(/\s+/g, '');
    expect(novo).not.toBe(antigo);
    await d.getByLabel('Digite os 4 últimos caracteres do código').fill('ZZZZ');
    await d.getByRole('button', { name: 'Guardei, trocar o código' }).click();
    await expect(d.getByText('Os 4 últimos caracteres não conferem')).toBeVisible();
    await d.getByLabel('Digite os 4 últimos caracteres do código').fill(ultimos4(novo));
    await d.getByRole('button', { name: 'Guardei, trocar o código' }).click();
    await expect(page.getByRole('status').getByText('Código de recuperação trocado.')).toBeVisible({
      timeout: 20_000,
    });

    await bloquear(page);
    await abrirCom(page, { codigo: antigo });
    await expect(page.getByText('Senha ou código de recuperação incorreto.')).toBeVisible({
      timeout: 20_000,
    });
    await page.reload();
    await abrirCom(page, { codigo: novo });
    const oferta = page.getByRole('dialog', { name: 'Crie uma senha nova' });
    await expect(oferta).toBeVisible({ timeout: 30_000 });
    await oferta.getByLabel('Senha nova', { exact: true }).fill(NOVA);
    await oferta.getByLabel('Repita a senha nova').fill(NOVA);
    await oferta.getByRole('button', { name: 'Continuar' }).click();
    const caixa2 = oferta.getByTestId('codigo');
    await expect(caixa2).toBeVisible();
    const terceiro = (await caixa2.innerText()).replace(/\s+/g, '');
    await oferta.getByLabel('Digite os 4 últimos caracteres do código').fill(ultimos4(terceiro));
    await oferta.getByRole('button', { name: 'Guardei, trocar o código' }).click();
    await expect(
      page.getByRole('status').getByText('Senha nova criada e código de recuperação trocado.'),
    ).toBeVisible({
      timeout: 20_000,
    });
    await bloquear(page);
    await abrirCom(page, { senha: NOVA });
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toHaveCount(0, {
      timeout: 30_000,
    });
    await page.goto('/#/inicio');
    await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
    // Aberto pela senha, não há oferta.
    await expect(page.getByRole('dialog', { name: 'Crie uma senha nova' })).toHaveCount(0);
  });
});

test.describe('espaços novos', () => {
  test.setTimeout(90_000);

  test('[D-046] restaurar como espaço novo: entra ao lado, com o mesmo saldo, e o atual não muda', async ({
    page,
  }, info) => {
    await criarCofre(page, false);
    await abrirBackup(page);
    await page.getByRole('button', { name: 'Fazer backup' }).click();
    const b = page.getByRole('dialog');
    await b.getByLabel('Senha do backup', { exact: true }).fill(SENHA_BACKUP);
    await b.getByLabel('Repita a senha do backup').fill(SENHA_BACKUP);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      b.getByRole('button', { name: 'Gerar backup' }).click(),
    ]);
    // Caminho sem acento: o nome da pasta do teste tem "ç" e o seletor de arquivo do Chrome não lê.
    const arquivo = join(tmpdir(), `razao-e2e-${String(info.workerIndex)}-${String(Date.now())}.razao`);
    await download.saveAs(arquivo);
    await expect(page.getByRole('status').getByText('Backup concluído e conferido')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: 'Restaurar backup' }).click();
    const d = page.getByRole('dialog', { name: 'Restaurar backup' });
    await expect(d.getByLabel('Arquivo de backup')).toBeVisible();
    await d.getByLabel('Arquivo de backup').setInputFiles(arquivo);
    await d.getByLabel('Senha do backup').fill(SENHA_BACKUP);
    await d.getByRole('button', { name: 'Abrir backup' }).click();
    await d.getByRole('radio', { name: 'Como espaço novo' }).click();
    await expect(d.getByText('Entra ao lado, sem mexer no que existe')).toBeVisible();
    await d.getByRole('button', { name: 'Restaurar como espaço novo' }).click();
    await expect(page.getByRole('status').getByText('Espaço novo criado a partir do backup')).toBeVisible({
      timeout: 20_000,
    });

    const seletor = page.getByRole('group', { name: 'Espaço' }).filter({ visible: true });
    const novo = seletor.getByRole('button', { name: /^Pessoal \(restaurado em \d{2}\/\d{2}\)$/ });
    await expect(novo).toBeVisible();
    await novo.click();
    await page.goto('/#/inicio');
    await expect(page.getByText('R$\u00a09.270,35').first()).toBeVisible();
    await page.goto('/#/config/espacos');
    await expect(
      page.getByRole('list', { name: 'Espaços' }).getByText(/Pessoal \(restaurado em/),
    ).toBeVisible();
  });

  test('[BKP-008] importar da beta.20: prévia que confere, quarentena e espaços novos', async ({ page }) => {
    await criarCofre(page, false);
    await abrirBackup(page);
    await page.getByRole('button', { name: 'Importar arquivo da beta.20' }).click();
    const d = page.getByRole('dialog', { name: 'Importar da beta.20' });
    await d.getByLabel('Arquivo da beta.20').setInputFiles('src/infra/backup/fixtures/beta20-backup.json');
    await d.getByRole('button', { name: 'Ver prévia' }).click();
    const pf = d.getByRole('list', { name: 'Contas de Pessoal (beta.20)' });
    await expect(pf.getByText('Banco Azul')).toBeVisible();
    await expect(pf.getByText(/beta\.20 R\$\s7\.222,60 · Razão R\$\s7\.222,60 · confere/)).toBeVisible();
    await expect(d.getByRole('list', { name: 'Itens na quarentena' }).getByRole('listitem')).toHaveCount(5);
    await expect(d.getByText('1 lançamento cancelado não entra.')).toBeVisible();
    const espera = page.waitForEvent('download');
    await d.getByRole('button', { name: 'Baixar relatório' }).click();
    expect((await espera).suggestedFilename()).toBe('razao-importacao-beta20.txt');
    await d.getByRole('button', { name: 'Importar', exact: true }).click();
    await expect(page.getByRole('status').getByText('Importação concluída e conferida')).toBeVisible({
      timeout: 20_000,
    });

    // Com mais de dois espaços, o seletor vira uma lista de escolha.
    const seletor = page.getByRole('combobox', { name: 'Espaço' }).filter({ visible: true });
    await seletor.selectOption({ label: 'Pessoal (beta.20)' });
    await page.goto('/#/contas/contas');
    await expect(page.getByRole('list', { name: 'Contas' }).getByText('Carteira').first()).toBeVisible();
    await page.goto('/#/config/backup');
    await page.getByRole('button', { name: 'Verificar agora' }).click();
    await expect(page.getByRole('status').getByText('Verificação concluída: tudo certo.')).toBeVisible({
      timeout: 20_000,
    });
  });
});
