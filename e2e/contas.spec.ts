// Contas e espaços depois do primeiro acesso, e as falhas de gravação no navegador real (I-04). Dados sintéticos.
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { SENHA, criarCofre, falhar, irPara, prepararFalhas } from './helpers';

const reais = (texto: string) => `R$\u00a0${texto}`;

async function novaConta(page: Page, nome: string, saldo: string) {
  await page.getByRole('button', { name: 'Nova conta' }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('Nome da conta').fill(nome);
  await d.getByLabel('Saldo de hoje').fill(saldo);
  await d.getByRole('button', { name: 'Criar conta' }).click();
}

async function bloquearEAbrir(page: Page) {
  await page.getByRole('button', { name: 'Bloquear o cofre' }).filter({ visible: true }).click();
  await page.getByLabel('Senha do cofre').fill(SENHA);
  await page.getByRole('button', { name: 'Desbloquear' }).click();
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test.describe('contas e espaços', () => {
  test.setTimeout(90_000);

  test('[CON-004] nova conta, transferência com tarifa, [CON-006] ajuste e [CON-002] arquivamento', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await irPara(page, 'Ver contas');
    await novaConta(page, 'Carteira', '100,00');
    await expect(page.getByRole('status').getByText('Conta Carteira criada')).toBeVisible();

    await page.getByRole('button', { name: 'Transferir' }).click();
    const t = page.getByRole('dialog');
    await t.getByLabel('Valor').fill('50,00');
    await t.getByLabel('Tarifa (opcional)').fill('1,00');
    await t.getByRole('button', { name: 'Transferir' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const lista = page.getByRole('list', { name: 'Contas' });
    await expect(lista.getByText(reais('9.219,35'))).toBeVisible();
    await expect(lista.getByText(reais('150,00'))).toBeVisible();
    await expect(page.getByText(reais('9.369,35'))).toBeVisible();

    await page.getByRole('button', { name: /^Banco Azul / }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Ajustar saldo' }).click();
    const a = page.getByRole('dialog');
    await a.getByLabel('Saldo certo de hoje').fill('9.200,00');
    await expect(a.getByText(`Diferença: \u2212\u00a0${reais('19,35')}`)).toBeVisible();
    await a.getByLabel('Motivo').fill('Conferi com o extrato');
    await a.getByRole('button', { name: 'Ajustar saldo' }).click();
    await expect(lista.getByText(reais('9.200,00'))).toBeVisible();

    // CON-007: conta com saldo só encerra com transferência final, na mesma operação.
    await page.getByRole('button', { name: /^Carteira / }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Encerrar conta' }).click();
    const e = page.getByRole('dialog');
    await expect(e.getByText(`A conta ainda tem ${reais('150,00')}`)).toBeVisible();
    await expect(e.getByLabel('Transferir para')).toHaveValue(/.+/);
    await e.getByRole('button', { name: 'Transferir e encerrar' }).click();
    await expect(
      page.getByRole('status').getByText(/foram para Banco Azul e a conta Carteira foi encerrada/),
    ).toBeVisible();
    await expect(lista.getByText(reais('9.350,00'))).toBeVisible();

    // Tudo continua lá depois de bloquear e abrir de novo.
    await bloquearEAbrir(page);
    await irPara(page, 'Ver contas');
    await expect(page.getByText(reais('9.350,00')).first()).toBeVisible();
  });

  test('[COF-007] criar o Negócio depois, arquivar, reativar e excluir com a palavra digitada', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await irPara(page, 'Espaços');
    await page.getByRole('button', { name: 'Criar o espaço Negócio' }).click();
    await page.getByRole('dialog').getByLabel('Nome da empresa').fill('Norte Software ME');
    await page.getByRole('dialog').getByRole('button', { name: 'Criar espaço' }).click();
    await expect(page.getByRole('button', { name: 'Negócio' }).filter({ visible: true })).toBeVisible();

    const linha = page.getByRole('listitem').filter({ hasText: 'Norte Software ME' });
    await linha.getByRole('button', { name: 'Arquivar' }).click();
    await expect(page.getByRole('button', { name: 'Negócio' }).filter({ visible: true })).toHaveCount(0);
    await linha.getByRole('button', { name: 'Reativar' }).click();
    await expect(page.getByRole('button', { name: 'Negócio' }).filter({ visible: true })).toBeVisible();

    await linha.getByRole('button', { name: 'Excluir' }).click();
    const d = page.getByRole('dialog');
    await expect(d.getByText('apaga 0 movimentos e 0 contas')).toBeVisible();
    const confirmar = d.getByRole('button', { name: 'Excluir o espaço' });
    await expect(confirmar).toBeDisabled();
    await d.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR');
    await confirmar.click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Norte Software ME' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Criar o espaço Negócio' })).toBeVisible();
  });
});

test.describe('falhas de gravação no navegador real', () => {
  test.setTimeout(90_000);

  for (const caso of [
    {
      id: 'PERS-07',
      titulo: 'sem espaço no navegador',
      falha: { store: 'journal', nome: 'QuotaExceededError' },
      msg: 'Sem espaço no navegador. Nada foi gravado',
    },
    {
      id: 'BKP-006',
      titulo: 'gravação interrompida no meio',
      falha: { store: 'operations', nome: 'UnknownError' },
      msg: 'A gravação falhou e foi desfeita por inteiro',
    },
  ]) {
    test(`[${caso.id}] ${caso.titulo}: nada fica gravado pela metade`, async ({ page }) => {
      await prepararFalhas(page);
      await criarCofre(page, false);
      await irPara(page, 'Ver contas');
      await falhar(page, caso.falha);
      await novaConta(page, 'Reserva', '10,00');
      await expect(page.getByRole('dialog').getByText(caso.msg)).toBeVisible();
      await falhar(page, null);
      await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();
      await expect(page.getByText('Reserva')).toHaveCount(0);
      // Depois de reabrir o cofre, nada da tentativa aparece e a trilha continua íntegra.
      await bloquearEAbrir(page);
      await expect(page.getByText('Cofre em modo seguro')).toHaveCount(0);
      await irPara(page, 'Ver contas');
      await expect(page.getByText('Reserva')).toHaveCount(0);
      // E a mesma ação funciona depois que o problema passa.
      await novaConta(page, 'Reserva', '10,00');
      await expect(page.getByRole('list', { name: 'Contas' }).getByText('Reserva')).toBeVisible();
    });
  }

  test('[CON-001] outra aba gravou no meio: esta recusa sem sobrescrever e grava depois de reabrir', async ({
    page,
    context,
  }) => {
    await criarCofre(page, false);
    await irPara(page, 'Ver contas');
    const outra = await context.newPage();
    await outra.goto('/');
    await outra.getByLabel('Senha do cofre').fill(SENHA);
    await outra.getByRole('button', { name: 'Desbloquear' }).click();
    await irPara(outra, 'Ver contas');
    await novaConta(outra, 'Poupança da outra aba', '5,00');
    await expect(
      outra.getByRole('list', { name: 'Contas' }).getByText('Poupança da outra aba'),
    ).toBeVisible();

    await novaConta(page, 'Conta desta aba', '7,00');
    await expect(page.getByRole('dialog').getByText('Os dados mudaram em outra aba')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();
    await bloquearEAbrir(page);
    await irPara(page, 'Ver contas');
    await expect(page.getByText('Poupança da outra aba')).toBeVisible();
    await novaConta(page, 'Conta desta aba', '7,00');
    await expect(page.getByRole('list', { name: 'Contas' }).getByText('Conta desta aba')).toBeVisible();
  });
});
