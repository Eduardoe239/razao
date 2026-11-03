// Varredura responsiva, teclado, zoom e pagamento de fatura — dados fictícios, perfis descartáveis.
const fs = require('fs');
const { launch, newPage, ready, shot, gotoTab, layoutAudit, save } = require('./lib.cjs');
const SCR = '<scratchpad>/scratchpad';
const seed = fs.readFileSync(SCR + '/results/seed-state.json', 'utf8');
const VIEWS = [[375, 812], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1440, 900]];
const TABS = [['Visão geral', 'dashboard'], ['Lançamentos', 'lancamentos'], ['Cartões e faturas', 'cartoes'], ['Orçamentos', 'orcamentos'], ['Relatórios', 'relatorios'], ['Importar dados', 'importar'], ['Planejamento', 'planejamento'], ['Perfil', 'perfil'], ['Preferências', 'preferencias'], ['Histórico de Auditoria', 'historico'], ['Integridade Financeira', 'integridade']];
const OUT = {};
const seeded = async (browser, vp, extra) => {
  const { ctx, page } = await newPage(browser, vp, extra);
  await ctx.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('razao_app_state_v3', s); sessionStorage.setItem('seeded', '1'); } }, seed);
  await ready(page);
  return { ctx, page };
};

(async () => {
  const browser = await launch();

  // ---------- Varredura por resolução ----------
  for (const [w, h] of VIEWS) {
    const key = `${w}x${h}`; OUT[key] = { tabs: {}, modals: {} };
    const { ctx, page } = await seeded(browser, { width: w, height: h });
    for (const [label, slug] of TABS) {
      try {
        await gotoTab(page, label);
        await page.evaluate(() => window.scrollTo(0, 0));
        const a = await layoutAudit(page);
        a.shot = await shot(page, `responsivo/${key}`, slug);
        OUT[key].tabs[slug] = a;
      } catch (e) { OUT[key].tabs[slug] = { error: e.message.split('\n')[0] }; }
    }
    // modal de lançamento
    try {
      await gotoTab(page, 'Visão geral');
      const nb = page.locator('button.new-transaction-button:visible, button.mobile-fab:visible').first();
      await nb.click(); await page.waitForSelector('.modal-sheet');
      const a = await layoutAudit(page);
      const sheet = await page.locator('.modal-sheet').boundingBox();
      const submit = await page.locator('.modal-sheet button[type=submit]').boundingBox();
      a.sheet = sheet; a.submitVisibleWithoutScroll = submit ? submit.y + submit.height <= h : false;
      a.shot = await shot(page, `responsivo/${key}`, 'modal-lancamento', false);
      OUT[key].modals.lancamento = a;
      await page.locator('.modal-sheet .icon-btn').click();
    } catch (e) { OUT[key].modals.lancamento = { error: e.message.split('\n')[0] }; }
    // modal de importação
    try {
      await gotoTab(page, 'Importar dados');
      await page.locator('button', { hasText: 'Abrir Importador' }).click(); await page.waitForTimeout(300);
      const a = await layoutAudit(page); a.shot = await shot(page, `responsivo/${key}`, 'modal-importacao', false);
      OUT[key].modals.importacao = a;
      await page.locator('button', { hasText: /^✕$/ }).first().click();
    } catch (e) { OUT[key].modals.importacao = { error: e.message.split('\n')[0] }; }
    // diagnóstico
    try {
      await page.locator('button.diagnostic-button').click(); await page.waitForTimeout(400);
      const a = await layoutAudit(page); a.shot = await shot(page, `responsivo/${key}`, 'modal-diagnostico', false);
      OUT[key].modals.diagnostico = a;
      await page.reload(); await page.waitForSelector('button.new-transaction-button'); await page.waitForTimeout(300);
    } catch (e) { OUT[key].modals.diagnostico = { error: e.message.split('\n')[0] }; }
    // menu móvel + Escape
    if (w < 1024 || await page.locator('button.mobile-menu-button').isVisible()) {
      try {
        const menuVisible = await page.locator('button.mobile-menu-button').isVisible();
        if (menuVisible) {
          await page.locator('button.mobile-menu-button').click(); await page.waitForTimeout(350);
          const open = await page.locator('aside.mobile-drawer.is-open').count();
          const s = await shot(page, `responsivo/${key}`, 'menu-movel-aberto', false);
          const focusInDrawer = await page.evaluate(() => !!document.activeElement?.closest('.mobile-drawer'));
          await page.keyboard.press('Escape'); await page.waitForTimeout(300);
          const closedByEsc = (await page.locator('aside.mobile-drawer.is-open').count()) === 0;
          OUT[key].mobileMenu = { menuVisible, open: !!open, focusInDrawer, closedByEsc, shot: s };
        } else OUT[key].mobileMenu = { menuVisible };
      } catch (e) { OUT[key].mobileMenu = { error: e.message.split('\n')[0] }; }
    }
    OUT[key].console = page._log.console;
    await ctx.close();
  }

  // ---------- Teclado (1440) ----------
  {
    const { ctx, page } = await seeded(browser, { width: 1440, height: 900 });
    const seq = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      seq.push(await page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return { el: 'body' };
        const cs = getComputedStyle(el);
        const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
        return { el: (el.innerText || el.getAttribute('aria-label') || el.placeholder || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40), tag: el.tagName, focusIndicator: visible };
      }));
      if (i === 6) await shot(page, 'acessibilidade', 'foco-teclado-1440', false);
    }
    // Abrir modal pelo teclado e verificar foco contido
    await page.locator('button.new-transaction-button').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const modalOpen = await page.locator('.modal-sheet').count();
    const inside = [];
    for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); inside.push(await page.evaluate(() => !!document.activeElement?.closest('.modal-sheet'))); }
    await shot(page, 'acessibilidade', 'foco-modal-lancamento', false);
    OUT.keyboard = { tabSequence: seq, withoutIndicator: seq.filter(s => s.el !== 'body' && !s.focusIndicator).map(s => s.el), modalOpenedByEnter: !!modalOpen, focusStaysInModal: inside.every(Boolean), focusTrail: inside };
    await ctx.close();
  }

  // ---------- Zoom 200% (equivalente: viewport CSS 720x450, DPR 2) ----------
  {
    const { ctx, page } = await seeded(browser, { width: 720, height: 450 }, { deviceScaleFactor: 2 });
    OUT.zoom200 = {};
    for (const [label, slug] of [['Visão geral', 'dashboard'], ['Lançamentos', 'lancamentos'], ['Orçamentos', 'orcamentos']]) {
      await gotoTab(page, label);
      const a = await layoutAudit(page); a.shot = await shot(page, 'zoom-200', slug); OUT.zoom200[slug] = a;
    }
    const nb = page.locator('button.new-transaction-button:visible, button.mobile-fab:visible').first();
    await nb.click(); await page.waitForSelector('.modal-sheet');
    const sheet = await page.locator('.modal-sheet').boundingBox();
    await page.locator('.modal-sheet button[type=submit]').scrollIntoViewIfNeeded();
    const submit = await page.locator('.modal-sheet button[type=submit]').boundingBox();
    OUT.zoom200.modal = { sheet, submitReachable: !!submit && submit.y >= 0 && submit.y + submit.height <= 450, shot: await shot(page, 'zoom-200', 'modal-lancamento', false) };
    await ctx.close();
  }

  // ---------- Pagamento de fatura com saldo suficiente (perfil separado) ----------
  {
    const { ctx, page } = await newPage(browser, { width: 1440, height: 900 });
    await ready(page);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('razao_app_state_v3')));
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const y = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const base = { categoryId: st.categories.find(c => c.profileType === 'PF' && c.type === 'despesa').id, profileType: 'PF', createdAt: new Date().toISOString() };
    st.cards = [{ id: 'card-ficticio', name: 'Cartão Fictício Teste', limitCents: 500000, closingDay: 10, dueDay: 20, profileType: 'PF' }];
    st.transactions = [
      { ...base, id: 'tx-sal', description: 'Salário fictício', amountCents: 500000, type: 'receita', status: 'pago', date: y, accountId: 'acc-1', categoryId: st.categories.find(c => c.profileType === 'PF' && c.type === 'receita').id },
      { ...base, id: 'tx-card', description: 'Compra fictícia no cartão', amountCents: 32050, type: 'despesa', status: 'pago', date: y, accountId: 'card-ficticio' }
    ];
    await page.evaluate(s => localStorage.setItem('razao_app_state_v3', JSON.stringify(s)), st);
    await page.reload(); await page.waitForSelector('button.new-transaction-button, .recovery-retry-button'); await page.waitForTimeout(400);
    const pay = { recovery: await page.locator('.recovery-retry-button').count() };
    if (!pay.recovery) {
      const dash0 = await page.locator('main').innerText();
      await gotoTab(page, 'Cartões e faturas');
      pay.before = (await page.locator('main').innerText()).match(/Saldo Devedor\s*R\$\s*[\d.,]+/)?.[0];
      page._dialogPolicy.push('accept', 'accept', 'accept');
      await page.locator('main button', { hasText: 'Pagar Fatura' }).click(); await page.waitForTimeout(700);
      const s1 = await page.evaluate(() => JSON.parse(localStorage.getItem('razao_app_state_v3')));
      pay.dialogs = page._log.dialogs.splice(0);
      pay.paymentTxs = s1.transactions.filter(t => t.id !== 'tx-sal' && t.id !== 'tx-card').map(t => ({ type: t.type, amountCents: t.amountCents, accountId: t.accountId, toAccountId: t.toAccountId, linkedCardId: t.linkedCardId, status: t.status, date: t.date }));
      pay.after = (await page.locator('main').innerText()).match(/Saldo Devedor\s*R\$\s*[\d.,]+|PAGA|Paga[^\n]*/)?.[0];
      pay.shot = await shot(page, '13-cartoes', 'pagamento-saldo-suficiente');
      const again = page.locator('main button', { hasText: 'Pagar Fatura' });
      pay.payButtonAfter = await again.count() ? { enabled: await again.isEnabled() } : null;
      if (pay.payButtonAfter?.enabled) { page._dialogPolicy.push('accept', 'accept'); await again.click(); await page.waitForTimeout(500); pay.secondDialogs = page._log.dialogs.splice(0); pay.txAfterSecond = (await page.evaluate(() => JSON.parse(localStorage.getItem('razao_app_state_v3')).transactions.length)); }
      await gotoTab(page, 'Visão geral');
      const dash1 = await page.locator('main').innerText();
      const exp = t => (t.match(/Despesas?[^\n]*\n?[^\n]*R\$\s*[\d.,]+/) || [null])[0];
      pay.dashboardExpenseBefore = exp(dash0); pay.dashboardExpenseAfter = exp(dash1);
      pay.dashShot = await shot(page, '13-cartoes', 'dashboard-apos-pagamento');
    }
    OUT.invoicePayment = pay;
    await ctx.close();
  }

  save('responsive', OUT);
  await browser.close();
  console.log('done');
})();
