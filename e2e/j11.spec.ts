// Jornada J-11 (Volume 02): fazer e restaurar um backup. Dados sintéticos.
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { SENHA, criarCofre } from './helpers';

const SENHA_BACKUP = 'senha do backup de teste';
const SALDO = 'R$\u00a09.270,35';

async function abrirBackup(page: Page) {
  await page.getByRole('button', { name: 'Backup e segurança' }).filter({ visible: true }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Backup e segurança' })).toBeVisible();
}

async function fazerBackup(page: Page, pasta: string): Promise<string> {
  await abrirBackup(page);
  await expect(page.getByText('Nenhum backup ainda.')).toBeVisible();
  await page.getByRole('button', { name: 'Fazer backup' }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Senha do backup', { exact: true }).fill(SENHA_BACKUP);
  await d.getByLabel('Repita a senha do backup').fill(SENHA_BACKUP);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    d.getByRole('button', { name: 'Gerar backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^razao-backup-cofre-\d{4}-\d{2}-\d{2}\.razao$/);
  const caminho = `${pasta}/${download.suggestedFilename()}`;
  await download.saveAs(caminho);
  // PERS-05: só diz "concluído" depois de reler e conferir.
  await expect(page.getByRole('status').getByText('Backup concluído e conferido')).toBeVisible();
  await expect(page.getByText('Nenhum backup ainda.')).toHaveCount(0);
  return caminho;
}

async function restaurarNoCofreNovo(page: Page, arquivo: string) {
  await page.getByLabel('Arquivo de backup').setInputFiles(arquivo);
  await page.getByLabel('Senha do backup').fill('senha errada do backup');
  await page.getByRole('button', { name: 'Abrir backup' }).click();
  await expect(page.getByText('Senha do backup incorreta')).toBeVisible();
  await page.getByLabel('Senha do backup').fill(SENHA_BACKUP);
  await page.getByRole('button', { name: 'Abrir backup' }).click();
  // BKP-002: prévia com espaços, contagens e totais antes de qualquer mudança.
  const previa = page.getByRole('region', { name: 'Prévia do backup' });
  await expect(previa.getByText(`1 conta · 1 lançamento · total ${SALDO}`)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByLabel('Repita a senha').fill(SENHA);
  await page.getByRole('button', { name: 'Criar cofre' }).click();
  await page
    .getByRole('checkbox', { name: 'Guardei o código em um lugar seguro' })
    .click({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Restaurar o backup' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(SALDO).first()).toBeVisible();
  await expect(page.getByText('Banco Azul')).toBeVisible();
}

test.describe('J-11', () => {
  test.setTimeout(120_000);

  test('[PRIV-05] backup, apagar tudo e [BKP-003] restaurar num aparelho "novo"', async ({ page }, info) => {
    await criarCofre(page, false);
    const arquivo = await fazerBackup(page, info.outputDir);

    await page.getByRole('button', { name: 'Apagar tudo deste aparelho' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Digite APAGAR TUDO para confirmar').fill('APAGAR TUDO');
    await d.getByRole('button', { name: 'Apagar tudo' }).click();
    // Navegador como novo: primeiro acesso, sem cofre e sem tela de recuperação.
    await expect(page.getByRole('button', { name: 'Começar' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Começar' })).toBeVisible();

    await page.getByRole('button', { name: /Já tenho um backup/ }).click();
    await restaurarNoCofreNovo(page, arquivo);
  });

  test('[PERS-06] cofre sumido do navegador volta pelo backup, sem cofre vazio por cima', async ({
    page,
  }, info) => {
    await criarCofre(page, false);
    const arquivo = await fazerBackup(page, info.outputDir);
    await page.getByRole('button', { name: 'Bloquear o cofre' }).filter({ visible: true }).click();
    // O navegador "limpou" o banco, mas a marca de que existia um cofre ficou.
    await page.evaluate(
      () =>
        new Promise<void>((ok, falha) => {
          const r = indexedDB.deleteDatabase('razao');
          r.onsuccess = () => {
            ok();
          };
          r.onerror = () => {
            falha(new Error('não apagou'));
          };
        }),
    );
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Não encontramos o seu cofre' })).toBeVisible();
    await page.getByRole('button', { name: 'Restaurar pelo backup' }).click();
    await restaurarNoCofreNovo(page, arquivo);
  });

  test('[BKP-003] restaurar por cima mostra a prévia, guarda um ponto de volta e pode ser desfeito', async ({
    page,
  }, info) => {
    await criarCofre(page, false);
    const arquivo = await fazerBackup(page, info.outputDir);
    await page.goto('/#/contas/contas');
    await page.getByRole('button', { name: 'Nova conta' }).click();
    await page.getByRole('dialog').getByLabel('Nome da conta').fill('Depois do backup');
    await page.getByRole('dialog').getByLabel('Saldo de hoje').fill('1,00');
    await page.getByRole('dialog').getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByRole('list', { name: 'Contas' }).getByText('Depois do backup')).toBeVisible();

    await abrirBackup(page);
    await page.getByRole('button', { name: 'Restaurar backup' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Arquivo de backup').setInputFiles(arquivo);
    await d.getByLabel('Senha do backup').fill(SENHA_BACKUP);
    await d.getByRole('button', { name: 'Abrir backup' }).click();
    await expect(d.getByText('Substitui o cofre inteiro')).toBeVisible();
    await d.getByRole('button', { name: 'Restaurar' }).click();
    await expect(page.getByRole('status').getByText('Backup restaurado e conferido')).toBeVisible();

    await page.goto('/#/contas/contas');
    await expect(page.getByText('Depois do backup')).toHaveCount(0);
    await abrirBackup(page);
    await page.getByRole('button', { name: 'Voltar a este ponto' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Voltar a este ponto' }).click();
    await page.goto('/#/contas/contas');
    await expect(page.getByRole('list', { name: 'Contas' }).getByText('Depois do backup')).toBeVisible();
  });
});
