const fs = require('fs');
const { launch, newPage, ready, shot, gotoTab, save } = require('./lib.cjs');
const SCR = '<scratchpad>/scratchpad';
const seed = fs.readFileSync(SCR + '/results/seed-state.json', 'utf8');
(async () => {
  const browser = await launch(); const OUT = {};
  for (const [w,h] of [[375,812],[390,844]]) {
    const key = `${w}x${h}`; OUT[key] = {};
    const { ctx, page } = await newPage(browser, { width: w, height: h });
    await ctx.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('razao_app_state_v3', s); sessionStorage.setItem('seeded','1'); } }, seed);
    await ready(page);
    for (const [label, slug] of [['Visão geral','dashboard'],['Lançamentos','lancamentos'],['Relatórios','relatorios'],['Planejamento','planejamento'],['Perfil','perfil'],['Preferências','preferencias'],['Integridade Financeira','integridade'],['Orçamentos','orcamentos']]) {
      await gotoTab(page, label);
      await page.mouse.move(w/2, h/2);
      for (let i=0;i<30;i++) await page.mouse.wheel(0, 800);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const nav = document.querySelector('nav.mobile-bottom-navigation').getBoundingClientRect();
        const main = document.querySelector('main') || document.body;
        const vis = el => { const r = el.getBoundingClientRect(); return r.width>0&&r.height>0&&!el.closest('[inert]'); };
        const els = [...main.querySelectorAll('*')].filter(vis).filter(e => e.children.length===0 && e.textContent.trim());
        const last = els.sort((a,b)=>b.getBoundingClientRect().bottom-a.getBoundingClientRect().bottom)[0];
        const footer = document.querySelector('footer');
        return { scrollY: Math.round(window.scrollY), docH: document.documentElement.scrollHeight, navTop: Math.round(nav.top), lastText: last?.textContent.trim().slice(0,50), lastBottom: Math.round(last?.getBoundingClientRect().bottom), footerBottom: footer ? Math.round(footer.getBoundingClientRect().bottom) : null, mainPadBottom: getComputedStyle(main).paddingBottom };
      });
      r.covered = r.lastBottom > r.navTop + 1;
      r.shot = await shot(page, `responsivo/${key}`, `${slug}-fim-da-pagina`, false);
      OUT[key][slug] = r;
    }
    await ctx.close();
  }
  save('scrollprobe', OUT); await browser.close(); console.log(JSON.stringify(OUT));
})();
