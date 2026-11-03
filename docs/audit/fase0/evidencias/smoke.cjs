const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const r = {};
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForTimeout(4500);
  await page.screenshot({ path: out + '/01-dashboard-1366.png', fullPage: true });
  r.navButtons = await page.$$eval('nav button, aside button, [role=tablist] button', bs => bs.map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean));
  r.hasCreateAccountUI = await page.locator('text=/nova conta|adicionar conta|criar conta/i').count();
  r.hasCreateCardUI = await page.locator('text=/novo cartão|adicionar cartão|cadastrar cartão/i').count();
  // novo lançamento
  const btn = page.locator('button', { hasText: /novo lançamento|\+/i }).first();
  await btn.click().catch(e => r.clickErr = e.message);
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/02-modal.png' });
  r.modalSelects = await page.$$eval('.modal-sheet select', ss => ss.map(s => [...s.options].map(o => o.textContent.trim())));
  r.modalTypeButtons = await page.$$eval('.modal-sheet button', bs => bs.map(b => b.innerText.trim()));
  await page.fill('.modal-sheet input[inputmode=decimal]', '45,90');
  await page.fill('.modal-sheet input[placeholder^="Ex"]', 'Teste fictício');
  await page.click('.modal-sheet button[type=submit]');
  await page.waitForTimeout(800);
  r.lsKeysAfterSave = await page.evaluate(() => Object.keys(localStorage));
  r.txCountStored = await page.evaluate(() => JSON.parse(localStorage.getItem('razao_app_state_v3')||'{}').transactions?.length);
  r.storedPlaintextContainsDescription = await page.evaluate(() => (localStorage.getItem('razao_app_state_v3')||'').includes('Teste fictício'));
  await page.reload(); await page.waitForTimeout(4500);
  r.txCountAfterReload = await page.evaluate(() => JSON.parse(localStorage.getItem('razao_app_state_v3')||'{}').transactions?.length);
  r.feedShowsTx = await page.locator('text=Teste fictício').count();
  // PF/PJ switch
  const pj = page.locator('button', { hasText: /^PJ$|Empresa|Empresarial/ }).first();
  r.pjButtonFound = await pj.count();
  if (r.pjButtonFound) { await pj.click(); await page.waitForTimeout(500); r.feedShowsTxInPJ = await page.locator('text=Teste fictício').count(); await page.screenshot({ path: out + '/03-pj.png', fullPage: true }); }
  // mobile
  await page.setViewportSize({ width: 375, height: 812 }); await page.waitForTimeout(400);
  await page.screenshot({ path: out + '/04-mobile-375.png', fullPage: true });
  r.hScrollMobile = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  // corrupted storage -> recovery screen
  await page.evaluate(() => { localStorage.setItem('razao_app_state_v3', '{corrompido'); localStorage.removeItem('razao_app_state_v3.last-known-good'); });
  await page.reload(); await page.waitForTimeout(4500);
  r.recoveryScreenText = (await page.locator('body').innerText()).slice(0, 300);
  r.corruptedBytesPreserved = await page.evaluate(() => localStorage.getItem('razao_app_state_v3'));
  await page.screenshot({ path: out + '/05-recovery.png', fullPage: true });
  r.errors = errors;
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
