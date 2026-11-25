// App instalável, offline e com atualização segura; responsividade e privacidade de rede. Dados sintéticos.
import { readFile, writeFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { criarCofre, irPara } from './helpers';

/** Espera o service worker assumir a página (a primeira visita instala; a seguinte já é controlada). */
async function controlada(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
}

test.describe('instalável e offline', () => {
  test.setTimeout(120_000);

  test('[NFR-002] manifesto com nome, idioma, ícones e modo app', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    const m = (await (await request.get('/manifest.webmanifest')).json()) as {
      name: string;
      lang: string;
      display: string;
      start_url: string;
      icons: { src: string; sizes: string; purpose: string }[];
    };
    expect([m.name, m.lang, m.display, m.start_url]).toEqual(['O Razão', 'pt-BR', 'standalone', '/']);
    expect(m.icons.map((i) => `${i.sizes}:${i.purpose}`)).toEqual([
      '192x192:any',
      '512x512:any',
      '192x192:maskable',
      '512x512:maskable',
    ]);
    for (const i of m.icons) expect((await request.get(i.src)).status()).toBe(200);
  });

  test('[NFR-001] depois da primeira carga, a J-01 e o backup funcionam sem rede', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'O Playwright só controla service worker e modo offline juntos no Chromium; Firefox e Safari ficam no teste manual do I-08.',
    );
    await controlada(page);
    await context.setOffline(true);
    await page.reload();
    await criarCofre(page, false);
    await expect(page.getByText('R$\u00a09.270,35').first()).toBeVisible();
    await page.getByRole('button', { name: 'Backup e segurança' }).filter({ visible: true }).first().click();
    await page.getByRole('button', { name: 'Fazer backup' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Senha do backup', { exact: true }).fill('senha do backup offline');
    await d.getByLabel('Repita a senha do backup').fill('senha do backup offline');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      d.getByRole('button', { name: 'Gerar backup' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.razao$/);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
    await context.setOffline(false);
  });

  test('[SEC-05] versão nova espera o pedido, e o pedido troca a versão sem perder o cofre', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'O Playwright só acompanha a troca de service worker no Chromium.');
    // Publica uma "versão nova": o mesmo service worker com um byte a mais, servido pelo próprio servidor de teste.
    const arquivo = process.env['SW_PATH'] ?? 'dist/sw.js';
    const original = await readFile(arquivo, 'utf8');
    try {
      await controlada(page);
      await criarCofre(page, false);
      await writeFile(arquivo, `${original}\n// versão nova de teste\n`);
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
      });
      const aviso = page.getByRole('status').filter({ hasText: 'Há uma versão nova do Razão.' });
      await expect(aviso).toBeVisible();
      // Sem o toque, nada muda: o cofre continua aberto.
      await page.waitForTimeout(1000);
      await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
      await aviso.getByRole('button', { name: 'Atualizar' }).click();
      await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
      await expect(aviso).toHaveCount(0);
    } finally {
      await writeFile(arquivo, original);
    }
  });
});

test.describe('telas e rede', () => {
  test.setTimeout(120_000);

  test('[NFR-008] nenhuma tela rola para o lado de 360 a 1920 px', async ({ page }) => {
    const sobra = () =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const larguras = [360, 768, 1024, 1440, 1920];
    await page.goto('/');
    for (const w of larguras) {
      await page.setViewportSize({ width: w, height: 800 });
      expect(await sobra(), `boas-vindas em ${String(w)} px`).toBeLessThanOrEqual(0);
    }
    await criarCofre(page, true);
    const telas = [
      '#/inicio/visao-geral',
      '#/contas/contas',
      '#/planejamento/orcamento',
      '#/config/backup',
      '#/config/espacos',
    ];
    for (const w of larguras) {
      await page.setViewportSize({ width: w, height: 800 });
      for (const t of telas) {
        await page.goto(`/${t}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await sobra(), `${t} em ${String(w)} px`).toBeLessThanOrEqual(0);
      }
    }
  });

  test('[PRIV-02] do primeiro acesso ao backup, nenhuma requisição sai do próprio site e nada é enviado', async ({
    page,
    baseURL,
  }) => {
    const fora: string[] = [];
    const enviadas: string[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith(baseURL ?? 'http://localhost:4173') && !r.url().startsWith('blob:'))
        fora.push(r.url());
      if (r.method() !== 'GET') enviadas.push(`${r.method()} ${r.url()}`);
    });
    await criarCofre(page, false);
    await irPara(page, 'Ver contas');
    await page.getByRole('button', { name: 'Backup e segurança' }).filter({ visible: true }).first().click();
    await page.getByRole('button', { name: 'Fazer backup' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Senha do backup', { exact: true }).fill('senha do backup de rede');
    await d.getByLabel('Repita a senha do backup').fill('senha do backup de rede');
    await Promise.all([
      page.waitForEvent('download'),
      d.getByRole('button', { name: 'Gerar backup' }).click(),
    ]);
    expect(fora).toEqual([]);
    expect(enviadas).toEqual([]);
  });

  test('[PRIV-01] nenhuma telemetria: sem cookies, sem beacons e sem identificador guardado', async ({
    page,
    context,
  }) => {
    const beacons: string[] = [];
    page.on('request', (r) => {
      if (['ping', 'beacon'].includes(r.resourceType())) beacons.push(r.url());
    });
    await criarCofre(page, false);
    expect(await context.cookies()).toEqual([]);
    expect(beacons).toEqual([]);
    const chaves = await page.evaluate(() => Object.keys(localStorage).sort());
    // Só as marcas do próprio cofre e do lembrete; nenhum id de usuário ou de sessão.
    for (const k of chaves)
      expect(k).toMatch(
        /^razao:(cofre-existe|tentativas|primeira-gravacao|ultima-gravacao|ultimo-backup|lembrete-dias)$/,
      );
  });
});
