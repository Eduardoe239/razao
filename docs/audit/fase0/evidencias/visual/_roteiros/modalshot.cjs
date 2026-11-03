const fs = require('fs');
const { launch, newPage, ready, shot } = require('./lib.cjs');
const seed = fs.readFileSync('<scratchpad>/scratchpad/results/seed-state.json','utf8');
(async () => {
  const b = await launch(); const out = {};
  for (const [w,h] of [[375,812],[1440,900]]) {
    const { ctx, page } = await newPage(b, { width: w, height: h });
    await ctx.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('razao_app_state_v3', s); sessionStorage.setItem('seeded','1'); } }, seed);
    await ready(page);
    await page.locator('button.new-transaction-button:visible, button.mobile-fab:visible').first().click();
    await page.waitForTimeout(1200);
    out[w] = await page.evaluate(() => { const s = document.querySelector('.modal-sheet'); const cs = getComputedStyle(s); const o = getComputedStyle(document.querySelector('.modal-overlay')); return { bg: cs.backgroundColor, opacity: cs.opacity, backdrop: cs.backdropFilter, overlayBg: o.backgroundColor, overlayFilter: o.backdropFilter }; });
    await shot(page, `responsivo/${w}x${h}`, 'modal-lancamento', false);
    await ctx.close();
  }
  console.log(JSON.stringify(out)); await b.close();
})();
