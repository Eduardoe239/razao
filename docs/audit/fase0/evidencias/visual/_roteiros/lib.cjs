// Utilitários de validação — somente dados fictícios, perfil de navegador descartável.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000/';
const EVID = 'C:/Users/<usuario>/Desktop/razao/docs/audit/fase0/evidencias/visual';

async function launch() {
  // launch() sem userDataDir => perfil temporário descartado ao fechar.
  return chromium.launch({ channel: 'chrome' });
}

async function newPage(browser, viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', acceptDownloads: true, ...extra });
  const page = await ctx.newPage();
  page._log = { console: [], dialogs: [] };
  page._dialogPolicy = []; // fila de 'accept'|'dismiss'|string(prompt)
  page.on('pageerror', e => page._log.console.push({ type: 'pageerror', text: e.message, url: page.url() }));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) page._log.console.push({ type: m.type(), text: m.text().slice(0, 400) }); });
  page.on('dialog', async d => {
    const action = page._dialogPolicy.length ? page._dialogPolicy.shift() : 'dismiss';
    page._log.dialogs.push({ type: d.type(), message: d.message().slice(0, 300), action: typeof action === 'string' && !['accept', 'dismiss'].includes(action) ? `prompt:${action}` : action });
    if (action === 'dismiss') await d.dismiss(); else if (action === 'accept') await d.accept(); else await d.accept(action);
  });
  return { ctx, page };
}

async function ready(page) {
  await page.goto(BASE);
  await page.waitForSelector('button.new-transaction-button, .recovery-retry-button, .startup-recovery', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(700);
}

function shotPath(mod, name) {
  const dir = path.join(EVID, mod);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name + '.png');
}
async function shot(page, mod, name, fullPage = true) {
  const p = shotPath(mod, name);
  await page.screenshot({ path: p, fullPage });
  return path.relative(EVID, p).replace(/\\/g, '/');
}

async function gotoTab(page, label) {
  const side = page.locator('aside.app-sidebar button.sidebar-nav-item', { hasText: label }).first();
  if (await side.isVisible().catch(() => false)) { await side.click(); await page.waitForTimeout(350); return 'sidebar'; }
  await page.locator('button.mobile-menu-button').click();
  await page.waitForTimeout(350);
  await page.locator('aside.mobile-drawer button.sidebar-nav-item', { hasText: label }).first().click();
  await page.waitForTimeout(450);
  return 'drawer';
}

// Auditoria de layout no DOM visível.
async function layoutAudit(page) {
  return page.evaluate(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[inert]') && !el.closest('[aria-hidden="true"]'); };
    const label = el => (el.innerText || el.getAttribute('aria-label') || el.placeholder || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60);
    const scrollParent = el => { let p = el.parentElement; while (p && p !== document.body) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth) return p; p = p.parentElement; } return null; };
    const res = { viewport: `${W}x${H}`, docScrollWidth: document.documentElement.scrollWidth, hOverflow: document.documentElement.scrollWidth > W + 1, offscreenControls: [], truncated: [], overlappingControls: [], smallTargets: [], tinyText: 0, scrollContainers: [], unlabeledControls: [] };
    const controls = [...document.querySelectorAll('button, a[href], input, select, textarea')].filter(vis);
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      const sp = scrollParent(el);
      if (!sp && (r.right > W + 1 || r.left < -1)) res.offscreenControls.push({ el: label(el), left: Math.round(r.left), right: Math.round(r.right) });
      if (W < 800 && (r.width < 24 || r.height < 24) && el.tagName !== 'A') res.smallTargets.push({ el: label(el), w: Math.round(r.width), h: Math.round(r.height) });
      const hasName = (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.title || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label') || (['BUTTON', 'A'].includes(el.tagName) && el.innerText.trim()));
      if (!hasName) res.unlabeledControls.push(`${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''} ${el.placeholder ? '"' + el.placeholder + '"' : ''}`.trim());
    }
    // controles sobrepostos (não aninhados) — ignora elementos fixos (barra inferior/topo) tratados à parte
    const isFixed = el => { let p = el; while (p && p !== document.body) { if (['fixed', 'sticky'].includes(getComputedStyle(p).position)) return true; p = p.parentElement; } return false; };
    const flow = controls.filter(c => !isFixed(c));
    for (let i = 0; i < flow.length; i++) for (let j = i + 1; j < flow.length; j++) {
      const a = flow[i], b = flow[j]; if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix > 4 && iy > 4) res.overlappingControls.push([label(a), label(b)]);
    }
    // texto cortado: overflow escondido com conteúdo maior
    for (const el of [...document.querySelectorAll('body *')].filter(vis)) {
      if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el);
      if (parseFloat(cs.fontSize) < 11) res.tinyText++;
      if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2) res.truncated.push({ text: el.innerText.trim().replace(/\s+/g, ' ').slice(0, 70), ellipsis: cs.textOverflow === 'ellipsis' });
    }
    for (const el of [...document.querySelectorAll('body *')].filter(vis)) { const cs = getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2) res.scrollContainers.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`); }
    // navegação inferior cobrindo o fim da página
    const nav = document.querySelector('nav.mobile-bottom-navigation');
    if (nav && vis(nav)) {
      const navTop = nav.getBoundingClientRect().top;
      window.scrollTo(0, document.documentElement.scrollHeight);
      const main = document.querySelector('main') || document.body;
      const items = [...main.querySelectorAll('button, a, input, select, p, h2, h3, li, td')].filter(vis);
      const last = items.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
      const fab = document.querySelector('.mobile-fab');
      res.bottomNav = { navTop: Math.round(navTop), lastContentBottom: last ? Math.round(last.getBoundingClientRect().bottom) : null, lastContent: last ? label(last) : null };
      res.bottomNav.covered = last ? last.getBoundingClientRect().bottom > navTop + 1 : false;
      if (fab && vis(fab)) { const fr = fab.getBoundingClientRect(); res.fab = { top: Math.round(fr.top), bottom: Math.round(fr.bottom) }; res.fabCovers = [...main.querySelectorAll('button')].filter(vis).filter(b => { const r = b.getBoundingClientRect(); return !(r.right < fr.left || r.left > fr.right || r.bottom < fr.top || r.top > fr.bottom); }).map(label); }
      window.scrollTo(0, 0);
    }
    res.offscreenControls = res.offscreenControls.slice(0, 15); res.truncated = res.truncated.slice(0, 15); res.overlappingControls = res.overlappingControls.slice(0, 15); res.smallTargets = res.smallTargets.slice(0, 20); res.unlabeledControls = [...new Set(res.unlabeledControls)].slice(0, 20); res.scrollContainers = [...new Set(res.scrollContainers)];
    return res;
  });
}

function save(name, data) {
  const out = '<scratchpad>/scratchpad/results';
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(data, null, 1));
}

module.exports = { launch, newPage, ready, shot, gotoTab, layoutAudit, save, EVID };
