// I-07 da Alpha 2a no navegador real: comprovante anexado (LAN-009) sem localização (PRIV-08),
// verificação de integridade (BKP-007). A foto é desenhada na hora e recebe um EXIF com GPS falso.
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { MARCA_APARELHO, MARCA_GPS, comGps, contem } from '../src/domain/testing/image-fixtures';
import { criarCofre } from './helpers';

async function umGasto(page: Page) {
  await page.goto('/#/lancamentos/todos');
  await page.getByRole('button', { name: 'Novo lançamento' }).filter({ visible: true }).first().click();
  const d = page.getByRole('dialog', { name: 'Novo lançamento' });
  await d.getByLabel('Valor', { exact: true }).fill('45,90');
  await d.getByLabel('Descrição').fill('Mercado Bom Preço');
  await d.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Alimentação › Mercado' });
  await d.getByRole('button', { name: 'Salvar lançamento' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /^Mercado Bom Preço / }).click();
  return page.getByRole('dialog');
}

/** JPEG de verdade, desenhado no próprio navegador, com EXIF de localização posto depois. */
async function fotoComGps(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 600;
    const g = c.getContext('2d');
    if (!g) return '';
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 0, 800, 600);
    g.fillStyle = '#222';
    g.font = '40px sans-serif';
    g.fillText('RECIBO SINTÉTICO 45,90', 80, 300);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1] ?? '';
  });
  const jpeg = new Uint8Array(Buffer.from(b64, 'base64'));
  const com = comGps(jpeg);
  expect(contem(com, MARCA_GPS)).toBe(true);
  return Buffer.from(com);
}

test.describe('comprovantes', () => {
  test.setTimeout(120_000);

  test('[LAN-009, PRIV-08] foto com localização entra sem metadados, abre e baixa', async ({ page }) => {
    await criarCofre(page, false);
    const d = await umGasto(page);
    await d.getByLabel('Escolher comprovante').setInputFiles({
      name: 'recibo-gps.jpg',
      mimeType: 'image/jpeg',
      buffer: await fotoComGps(page),
    });
    const item = d.getByRole('listitem').filter({ hasText: 'recibo-gps.jpg' });
    await expect(item).toContainText('Foto ·');

    const espera = page.waitForEvent('download');
    await d.getByRole('button', { name: 'Baixar recibo-gps.jpg' }).click();
    const baixado = await espera;
    expect(baixado.suggestedFilename()).toBe('recibo-gps.jpg');
    const bytes = new Uint8Array(readFileSync(await baixado.path()));
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
    expect(contem(bytes, MARCA_GPS)).toBe(false);
    expect(contem(bytes, MARCA_APARELHO)).toBe(false);
    expect(contem(bytes, 'Exif')).toBe(false);

    await d.getByRole('button', { name: 'Ver recibo-gps.jpg', exact: true }).click();
    const img = d.getByRole('img', { name: 'Comprovante recibo-gps.jpg' });
    await expect(img).toBeVisible();
    // A foto redesenhada abriu de verdade (largura natural da imagem, não um ícone quebrado).
    expect(await img.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBe(800);
    await d.getByRole('button', { name: 'Fechar recibo-gps.jpg' }).click();
    await expect(img).toHaveCount(0);
    // A lista mostra o clipe no lançamento.
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('com comprovante').first()).toBeAttached();
  });

  test('[LAN-009] PDF entra como veio e sai ao remover; arquivo de outro tipo é recusado', async ({
    page,
  }) => {
    await criarCofre(page, false);
    const d = await umGasto(page);
    const entrada = d.getByLabel('Escolher comprovante');
    await entrada.setInputFiles({
      name: 'pagina.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('<html><script>alert(1)</script></html>'),
    });
    await expect(d.getByText('Este arquivo não é nenhum deles')).toBeVisible();
    await expect(d.getByText('Nenhum comprovante.')).toBeVisible();

    await entrada.setInputFiles({
      name: 'nota.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7\n% nota sintética\n%%EOF'),
    });
    const item = d.getByRole('listitem').filter({ hasText: 'nota.pdf' });
    await expect(item).toContainText('PDF ·');
    await d.getByRole('button', { name: 'Remover nota.pdf' }).click();
    await expect(d.getByText('Nenhum comprovante.')).toBeVisible();
  });
});

test.describe('verificação de integridade', () => {
  test.setTimeout(120_000);

  test('[BKP-007] tudo certo; depois de adulterar uma página, mostra a divergência e não corrige', async ({
    page,
  }) => {
    await criarCofre(page, false);
    await umGasto(page);
    await page.goto('/#/config/backup');
    await page.getByRole('button', { name: 'Verificar agora' }).click();
    await expect(page.getByRole('status').getByText('Verificação concluída: tudo certo.')).toBeVisible();
    const resultado = page.getByRole('list', { name: 'Resultado de Pessoal' });
    await expect(resultado.getByText('Páginas do diário: confere')).toBeAttached();
    await expect(resultado.getByText('Trilha de auditoria: confere')).toBeAttached();

    // Um byte trocado numa página do diário, direto no banco do navegador.
    const antes = await page.evaluate(
      () =>
        new Promise<string>((ok, falha) => {
          const r = indexedDB.open('razao');
          r.onerror = () => falha(new Error('sem banco'));
          r.onsuccess = () => {
            const tx = r.result.transaction('journal', 'readwrite');
            const st = tx.objectStore('journal');
            const c = st.openCursor();
            c.onsuccess = () => {
              const cur = c.result;
              if (!cur) return;
              const v = cur.value as { sealed: { iv: string; ct: string }; rev: number };
              const ct = v.sealed.ct;
              const troca = ct[10] === 'A' ? 'B' : 'A';
              const novo = { ...v, sealed: { ...v.sealed, ct: ct.slice(0, 10) + troca + ct.slice(11) } };
              cur.update(novo);
              tx.oncomplete = () => {
                r.result.close();
                ok(novo.sealed.ct);
              };
            };
          };
        }),
    );
    await page.getByRole('button', { name: 'Verificar de novo' }).click();
    await expect(page.getByText('Encontramos divergência')).toBeVisible();
    await expect(resultado.getByText('Páginas do diário: divergência')).toBeAttached();
    // Nada foi corrigido: a página continua como ficou.
    const depois = await page.evaluate(
      () =>
        new Promise<string>((ok) => {
          const r = indexedDB.open('razao');
          r.onsuccess = () => {
            const c = r.result.transaction('journal').objectStore('journal').openCursor();
            c.onsuccess = () => {
              const v = c.result?.value as { sealed: { ct: string } } | undefined;
              r.result.close();
              ok(v?.sealed.ct ?? '');
            };
          };
        }),
    );
    expect(depois).toBe(antes);
  });
});
