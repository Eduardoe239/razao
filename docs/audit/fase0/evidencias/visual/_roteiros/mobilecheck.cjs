const fs = require('fs');
const { launch, newPage, ready, shot, gotoTab, save } = require('./lib.cjs');
const SCR = '<scratchpad>/scratchpad';
const seed = fs.readFileSync(SCR + '/results/seed-state.json', 'utf8');
const TABS = [['Visão geral','dashboard'],['Lançamentos','lancamentos'],['Relatórios','relatorios'],['Planejamento','planejamento'],['Perfil','perfil'],['Preferências','preferencias'],['Integridade Financeira','integridade']];
(async () => {
  const browser = await launch(); const OUT = {};
  for (const [w,h] of [[375,812],[390,844]]) {
    const key=`${w}x${h}`; OUT[key]={};
    const { ctx, page } = await newPage(browser, { width: w, height: h });
    await ctx.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('razao_app_state_v3', s); sessionStorage.setItem('seeded','1'); } }, seed);
    await ready(page);
    for (const [label, slug] of TABS) {
      await gotoTab(page, label);
      const r = await page.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&!el.closest('[inert]'); };
        // scroll everything scrollable to the bottom
        const scrollers = [document.scrollingElement, ...document.querySelectorAll('*')].filter(e => e && e.scrollHeight > e.clientHeight + 5 && /(auto|scroll)/.test(getComputedStyle(e === document.scrollingElement ? document.documentElement : e).overflowY) || e === document.scrollingElement);
        scrollers.forEach(s => s.scrollTop = s.scrollHeight);
        const nav = document.querySelector('nav.mobile-bottom-navigation'); const navTop = nav.getBoundingClientRect().top;
        const main = document.querySelector('main') || document.body;
        const items = [...main.querySelectorAll('button, a, input, select, p, h2, h3, li, td, span')].filter(vis).filter(e => e.innerText?.trim());
        const last = items.sort((a,b)=>b.getBoundingClientRect().bottom-a.getBoundingClientRect().bottom)[0];
        const lb = last.getBoundingClientRect().bottom;
        const fab = document.querySelector('.mobile-fab'); const fr = fab && vis(fab) ? fab.getBoundingClientRect() : null;
        const underFab = fr ? items.filter(e => e.matches('button,a,input,select')).filter(b => { const r=b.getBoundingClientRect(); return !(r.right<fr.left||r.left>fr.right||r.bottom<fr.top||r.top>fr.bottom); }).map(b=>b.innerText.trim().slice(0,40)||b.getAttribute('aria-label')) : [];
        const sc = scrollers.map(s => (s===document.scrollingElement?'document':s.tagName+'.'+String(s.className).split(' ')[0]));
        return { scrollers: sc, navTop: Math.round(navTop), lastBottom: Math.round(lb), last: last.innerText.trim().slice(0,50), covered: lb > navTop + 1, gapPx: Math.round(navTop - lb), underFab };
      });
      r.shot = await shot(page, `responsivo/${key}`, `${slug}-fim-da-pagina`, false);
      OUT[key][slug] = r;
      await page.evaluate(() => { document.scrollingElement.scrollTop = 0; });
    }
    // small targets & truncation detail on lancamentos
    await gotoTab(page, 'Lançamentos');
    OUT[key].details = await page.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(); return r.width>0&&r.height>0&&!el.closest('[inert]'); };
      const small = [...document.querySelectorAll('button,input,select')].filter(vis).map(b => ({ t:(b.innerText.trim()||b.getAttribute('aria-label')||b.title||'').slice(0,40), w:Math.round(b.getBoundingClientRect().width), h:Math.round(b.getBoundingClientRect().height) })).filter(x => x.w<24||x.h<24);
      const srOnly = [...document.querySelectorAll('*')].filter(e => ['Buscar lançamentos','Filtrar por tipo'].includes(e.textContent.trim()) && e.children.length===0).map(e => { const cs=getComputedStyle(e); return { tag:e.tagName, cls:e.className, clip:cs.clip, w:cs.width, pos:cs.position }; });
      const topTitle = [...document.querySelectorAll('header *')].filter(e=>getComputedStyle(e).textOverflow==='ellipsis').map(e=>({t:e.textContent, cls:e.className}));
      return { small: small.slice(0,8), smallCount: small.length, srOnly, topTitle };
    });
    // diagnóstico pelo menu móvel
    await page.locator('button.mobile-menu-button').click(); await page.waitForTimeout(300);
    const diag = page.locator('aside.mobile-drawer button', { hasText: 'Diagnóstico' });
    OUT[key].diagnosticInDrawer = await diag.count();
    if (await diag.count()) { await diag.click(); await page.waitForTimeout(500); OUT[key].diagShot = await shot(page, `responsivo/${key}`, 'modal-diagnostico', false); }
    // título longo na barra superior
    await page.keyboard.press('Escape').catch(()=>{});
    await page.reload(); await page.waitForSelector('button.mobile-menu-button'); await page.waitForTimeout(500); await gotoTab(page, 'Histórico de Auditoria');
    OUT[key].titleShot = await shot(page, `responsivo/${key}`, 'titulo-barra-superior', false);
    await ctx.close();
  }
  save('mobilecheck', OUT); await browser.close(); console.log(JSON.stringify(OUT, null, 0));
})();
