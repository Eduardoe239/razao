// Testes dedicados aos itens BLOCKED — perfis de navegador temporários, dados fictícios, sem alteração do código do app.
const { launch, newPage, ready, shot, gotoTab, save } = require('./lib.cjs');
const R = {};
const st = p => p.evaluate(() => JSON.parse(localStorage.getItem('razao_app_state_v3') || 'null'));
async function addTx(page, amount, desc, type = 'despesa') {
  await page.locator('button.new-transaction-button').first().click();
  await page.waitForSelector('.modal-sheet');
  await page.fill('.modal-sheet input[aria-label="Valor do lançamento em reais"]', amount);
  await page.locator('.modal-sheet button', { hasText: type === 'receita' ? 'Entrada' : 'Saída' }).click();
  await page.fill('.modal-sheet input[placeholder^="Ex: Tênis"]', desc);
  await page.click('.modal-sheet button[type=submit]');
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await launch();

  // ===== T1: gerar alerta com dados sintéticos e dispensá-lo =====
  {
    const { ctx, page } = await newPage(browser, { width: 1440, height: 900 });
    await ready(page);
    await addTx(page, '59,90', 'Assinatura de streaming fictícia');
    await addTx(page, '59,90', 'Assinatura de streaming fictícia');
    await gotoTab(page, 'Planejamento');
    const count = () => page.locator('.anomaly-count').innerText();
    const before = { count: await count(), buttons: await page.locator('button', { hasText: 'Dispensar alerta' }).count(), titles: await page.locator('.ai-anomaly-item strong').allInnerTexts(), texts: await page.locator('.ai-anomaly-item p').allInnerTexts() };
    const s1 = await shot(page, 'dedicados/alerta', '01-alerta-gerado');
    await page.locator('button', { hasText: 'Dispensar alerta' }).first().focus();
    await page.keyboard.press('Enter'); // dispensa via teclado
    await page.waitForTimeout(300);
    const after = { count: await count(), buttons: await page.locator('button', { hasText: 'Dispensar alerta' }).count(), emptyState: await page.locator('text=Nenhuma anomalia identificada').count() };
    const s2 = await shot(page, 'dedicados/alerta', '02-alerta-dispensado');
    const txUnchanged = (await st(page)).transactions.length;
    // persistência da dispensa
    await gotoTab(page, 'Visão geral'); await gotoTab(page, 'Planejamento');
    const afterNavigate = await count();
    await page.reload(); await page.waitForSelector('button.new-transaction-button'); await page.waitForTimeout(400);
    await gotoTab(page, 'Planejamento');
    const afterReload = await count();
    const s3 = await shot(page, 'dedicados/alerta', '03-apos-recarregar');
    R.alerta = { before, after, transactionsAfterDismiss: txUnchanged, afterNavigate, afterReload, console: page._log.console, shots: [s1, s2, s3] };
    await ctx.close();
  }

  // ===== T2: recuperação local do ErrorBoundary (Web) =====
  // Método: injeção de falha NO NAVEGADOR DE TESTE (addInitScript), sem alterar o código do app.
  // Intl.NumberFormat#format lança erro somente para o valor sentinela 777,77 — provoca erro de renderização real.
  {
    const { ctx, page } = await newPage(browser, { width: 1440, height: 900 });
    await ctx.addInitScript(() => {
      const Orig = Intl.NumberFormat;
      function Patched(...args) {
        const nf = new Orig(...args);
        const fmt = nf.format.bind(nf);
        Object.defineProperty(nf, 'format', { value: v => { if (Math.abs(Number(v) - 777.77) < 1e-9) throw new Error('FALHA INJETADA PELO TESTE (harness) — valor sentinela 777,77'); return fmt(v); } });
        return nf;
      }
      Patched.prototype = Orig.prototype;
      Patched.supportedLocalesOf = Orig.supportedLocalesOf.bind(Orig);
      Intl.NumberFormat = Patched;
    });
    await ready(page);
    await addTx(page, '5.000,00', 'Salário fictício', 'receita');
    await addTx(page, '245,90', 'Mercado fictício');
    await page.waitForTimeout(600);
    const k = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(key => [key, (() => { const v = localStorage.getItem(key); try { const j = JSON.parse(v); const s = j && j.raw ? JSON.parse(j.raw) : j; return { len: v.length, tx: Array.isArray(s?.transactions) ? s.transactions.length : null, descr: Array.isArray(s?.transactions) ? s.transactions.map(t => t.description) : null }; } catch { return { len: v.length, unparsable: true }; } })()])));
    const storageBefore = await k();
    // provoca a falha
    await page.locator('button.new-transaction-button').first().click();
    await page.fill('.modal-sheet input[aria-label="Valor do lançamento em reais"]', '777,77');
    await page.fill('.modal-sheet input[placeholder^="Ex: Tênis"]', 'Valor sentinela fictício');
    await page.click('.modal-sheet button[type=submit]');
    await page.waitForTimeout(1000);
    const boundary = await page.locator('.error-recovery-screen').count();
    const boundaryText = boundary ? (await page.locator('.error-recovery-screen').innerText()).slice(0, 700) : (await page.locator('body').innerText()).slice(0, 300);
    const s1 = await shot(page, 'dedicados/recuperacao-local', '01-tela-erro-interface');
    await page.setViewportSize({ width: 375, height: 812 }); await page.waitForTimeout(200);
    const s1m = await shot(page, 'dedicados/recuperacao-local', '01b-tela-erro-interface-375');
    await page.setViewportSize({ width: 1440, height: 900 });
    const storageAtError = await k();
    let r = { boundary: !!boundary, boundaryText, storageBefore, storageAtError };
    if (boundary) {
      // 1) recusar a confirmação
      page._dialogPolicy.push('dismiss');
      await page.locator('button', { hasText: 'Tentar recuperação local' }).click(); await page.waitForTimeout(400);
      r.dismiss = { dialogs: page._log.dialogs.splice(0), storage: await k() };
      // 2) aceitar
      page._dialogPolicy.push('accept');
      await Promise.all([page.waitForEvent('load', { timeout: 15000 }).catch(() => null), page.locator('button', { hasText: 'Tentar recuperação local' }).click()]);
      await page.waitForSelector('button.new-transaction-button, .recovery-retry-button, .error-recovery-screen', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500); // permite autosave
      r.accept = { dialogs: page._log.dialogs.splice(0), screen: (await page.locator('h1').first().innerText().catch(() => '')), storageAfterReload: await k(), visibleText: (await page.locator('main').innerText().catch(() => '')).slice(0, 400) };
      r.accept.shot = await shot(page, 'dedicados/recuperacao-local', '02-apos-recuperacao-local');
      // há caminho na UI para voltar aos dados preservados?
      await page.locator('button.diagnostic-button').click(); await page.waitForTimeout(500);
      r.accept.diagnosticText = (await page.locator('body').innerText()).match(/Gerenciador de backups[\s\S]{0,300}/)?.[0];
      r.accept.shotDiag = await shot(page, 'dedicados/recuperacao-local', '03-diagnostico-apos-recuperacao', false);
    }
    r.console = page._log.console.map(c => ({ type: c.type, text: c.text.slice(0, 200) }));
    R.recuperacaoLocal = r;
    await ctx.close();
  }

  save('dedicated', R);
  await browser.close();
  console.log(JSON.stringify(R, null, 1));
})();
