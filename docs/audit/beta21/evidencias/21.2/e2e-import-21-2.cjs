// E2E da subetapa 21.2 — importação CSV/OFX. Somente dados fictícios.
// Perfil de navegador temporário (launch sem userDataDir), descartado ao fechar.
// Uso: node import-21-2.cjs <diretório-de-evidências>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:3000/';
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const R = { startedAt: new Date().toISOString(), runtime: { node: process.version, playwright: require('playwright-core/package.json').version, browser: null }, steps: {} };
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }); return `${name}.png`; };
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('razao_app_state_v3') || '{}'));

async function gotoTab(page, label) {
  await page.locator('aside.app-sidebar button.sidebar-nav-item', { hasText: label }).first().click();
  await page.waitForTimeout(350);
}

async function openImporter(page, tab) {
  await gotoTab(page, 'Importar dados');
  await page.locator('button', { hasText: 'Abrir Importador' }).click();
  await page.waitForTimeout(300);
  await page.locator('button.pill-tab', { hasText: tab }).click();
  await page.waitForTimeout(150);
}

async function analyze(page, text) {
  await page.locator('textarea').fill(text);
  await page.locator('button.btn-primary', { hasText: 'Analisar' }).click();
  await page.waitForTimeout(500);
}

async function closeModal(page) {
  // O modal mantém a etapa de revisão ao fechar pelo ✕ (comportamento anterior à 21.2); voltar antes.
  const back = page.locator('.modal-sheet button', { hasText: 'Voltar' });
  if (await back.count()) { await back.first().click(); await page.waitForTimeout(150); }
  await page.locator('.modal-sheet button', { hasText: /^✕$/ }).first().click();
  await page.waitForTimeout(250);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  R.runtime.browser = browser.version();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const page = await ctx.newPage();
  const dialogs = [];
  const errors = [];
  page.on('dialog', async d => { dialogs.push(d.message().slice(0, 200)); await d.dismiss(); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE);
  await page.waitForSelector('button.new-transaction-button', { timeout: 20000 });
  await page.waitForTimeout(500);

  const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const CSV = `Data;Descrição;Valor\n${today};Mercado fictício editado;-245,90\n${today};Padaria D'Avila fictícia;-12,50\n${today};Estorno de compra fictício;100,00\n${today};Café fictício;-4.50\n32/13/2026;Linha inválida fictícia;abc`;

  // 1. CSV da validação visual da Fase 0 (antes: R$ 450,00, D'Avila perdida, inválida sem relatório, estorno como saída).
  {
    const nBefore = ((await state(page)).transactions || []).length;
    await openImporter(page, 'CSV');
    await analyze(page, CSV);
    const text = await page.locator('.modal-sheet').innerText();
    const s = await shot(page, '01-csv-revisao');
    await page.locator('section[aria-label="Registros rejeitados"]').scrollIntoViewIfNeeded().catch(() => {});
    const s2 = await shot(page, '02-csv-rejeitados');
    R.steps.csv_review = {
      summary: (text.match(/\d+ de \d+ registro\(s\) válido\(s\)[^\n]*/) || [null])[0],
      cafe: (text.match(/Café fictício[\s\S]{0,40}/) || [''])[0].replace(/\s+/g, ' '),
      davila: text.includes("Padaria D'Avila fictícia"),
      estorno: (text.match(/Estorno de compra fictício[\s\S]{0,40}/) || [''])[0].replace(/\s+/g, ' '),
      rejected: (text.match(/Linha 6:[^\n]*/) || [null])[0],
      checkboxes: await page.locator('.modal-sheet input[type=checkbox]').count(),
      shots: [s, s2]
    };
    R.steps.csv_review.pass = /4 de 5 registro\(s\) válido\(s\) · 1 rejeitado\(s\)/.test(text)
      && /Café fictício\s*Saída −\s*R\$\s*4,50/.test(text)
      && R.steps.csv_review.davila
      && /Estorno de compra fictício\s*Entrada \+\s*R\$\s*100,00/.test(text)
      && /Linha 6: Data inválida/.test(text)
      && R.steps.csv_review.checkboxes === 4;

    // 2. Confirmar e conferir o que foi gravado (valores em centavos e tipo).
    await page.locator('.modal-sheet button.btn-primary', { hasText: 'Confirmar' }).click();
    await page.waitForTimeout(600);
    const st = await state(page);
    const added = (st.transactions || []).slice(0, (st.transactions || []).length - nBefore)
      .map(t => ({ description: t.description, amountCents: t.amountCents, type: t.type, date: t.date, sourceLineLeaked: 'sourceLine' in t }));
    const dialog = dialogs[dialogs.length - 1] || '';
    // ACHADO FORA DO ESCOPO (IMP-01): "Padaria ..." recebe de predictCategory o id fixo
    // 'alimentacao', inexistente; applyReconciliationDecisions ignora o item e avisa no diálogo.
    const davilaSkippedByCategory = !added.some(t => t.description === "Padaria D'Avila fictícia")
      && /1 item\(ns\) ignorado\(s\)/.test(dialog) && /categoria selecionada não pertence/.test(dialog);
    R.steps.csv_apply = {
      added,
      dialog,
      knownFinding: davilaSkippedByCategory ? 'IMP-01: Padaria D\'Avila ignorada na confirmação por categoria inexistente (predictCategory), não pelo parser' : null,
      pass: added.length === 3
        && added.some(t => t.description === 'Café fictício' && t.amountCents === 450 && t.type === 'despesa')
        && added.some(t => t.description === 'Estorno de compra fictício' && t.amountCents === 10000 && t.type === 'receita')
        && added.some(t => t.description === 'Mercado fictício editado' && t.amountCents === 24590 && t.type === 'despesa')
        && davilaSkippedByCategory
        && !added.some(t => t.description === 'Linha inválida fictícia' || t.sourceLineLeaked)
    };

    // 2b. Apóstrofo sem palavra-chave de categoria: a linha D'Avila é gravada com o valor correto.
    const nBefore2 = st.transactions.length;
    await openImporter(page, 'CSV');
    await analyze(page, `Data;Descrição;Valor\n${today};Livraria D'Avila fictícia;-12,50`);
    await page.locator('.modal-sheet button.btn-primary', { hasText: 'Confirmar' }).click();
    await page.waitForTimeout(600);
    const st2 = await state(page);
    const added2 = st2.transactions.slice(0, st2.transactions.length - nBefore2).map(t => ({ description: t.description, amountCents: t.amountCents, type: t.type }));
    R.steps.csv_apply_davila = {
      added: added2,
      pass: added2.length === 1 && added2[0].description === "Livraria D'Avila fictícia" && added2[0].amountCents === 1250 && added2[0].type === 'despesa'
    };
  }

  // 3. OFX com valor BR, data inválida, valor ambíguo e TRNTYPE contrário ao sinal.
  {
    await openImporter(page, 'OFX');
    const OFX = '<OFX><BANKTRANLIST>\n<STMTTRN>\n<TRNTYPE>DEBIT\n<DTPOSTED>20261028120000[-3:BRT]\n<TRNAMT>-1.234,56\n<FITID>E2E-FICT-1\n<MEMO>ALUGUEL FICTICIO\n</STMTTRN>\n<STMTTRN>\n<TRNTYPE>DEBIT\n<DTPOSTED>20261331\n<TRNAMT>-1.00\n<FITID>E2E-FICT-2\n</STMTTRN>\n<STMTTRN>\n<TRNTYPE>DEBIT\n<DTPOSTED>20261027\n<TRNAMT>1.234\n<FITID>E2E-FICT-3\n</STMTTRN>\n<STMTTRN>\n<TRNTYPE>DEBIT\n<DTPOSTED>20261027\n<TRNAMT>15.00\n<FITID>E2E-FICT-4\n<MEMO>ESTORNO FICTICIO\n</STMTTRN>\n</BANKTRANLIST></OFX>';
    await analyze(page, OFX);
    const text = await page.locator('.modal-sheet').innerText();
    const s = await shot(page, '03-ofx-revisao');
    R.steps.ofx_review = {
      summary: (text.match(/\d+ de \d+ registro\(s\) válido\(s\)[^\n]*/) || [null])[0],
      aluguel: (text.match(/ALUGUEL FICTICIO[\s\S]{0,40}/) || [''])[0].replace(/\s+/g, ' '),
      warningShown: /TRNTYPE/.test(text),
      shots: [s]
    };
    R.steps.ofx_review.pass = /2 de 4 registro\(s\) válido\(s\) · 2 rejeitado\(s\)/.test(text)
      && /ALUGUEL FICTICIO\s*Saída −\s*R\$\s*1\.234,56/.test(text)
      && /ESTORNO FICTICIO\s*Entrada \+\s*R\$\s*15,00/.test(text)
      && /Valor ambíguo/.test(text) && /Data inválida/.test(text) && R.steps.ofx_review.warningShown;
    await closeModal(page);
  }

  // 4. Arquivo sem negativos: aviso de sinal.
  {
    await openImporter(page, 'CSV');
    await analyze(page, `Data;Descrição;Valor\n${today};Crédito fictício A;10,00\n${today};Crédito fictício B;20,00`);
    const text = await page.locator('.modal-sheet').innerText();
    const s = await shot(page, '04-csv-sem-negativos-aviso');
    R.steps.csv_no_negatives = { pass: /Atenção antes de importar/.test(text) && /Nenhum valor negativo encontrado/.test(text), shots: [s] };
    await closeModal(page);
  }

  // 5. Delimitador ambíguo: erro explícito, nada vai para a revisão.
  {
    await openImporter(page, 'CSV');
    await analyze(page, 'a;b;c,d,e\n1;2;3,4,5');
    const text = await page.locator('.modal-sheet').innerText();
    const s = await shot(page, '05-csv-delimitador-ambiguo');
    R.steps.csv_ambiguous = { pass: /Não foi possível decidir o delimitador/.test(text) && (await page.locator('textarea').count()) === 1, shots: [s] };
    await closeModal(page);
  }

  R.dialogs = dialogs;
  R.pageErrors = errors;
  R.allPass = Object.values(R.steps).every(s => s.pass) && errors.length === 0;
  R.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'e2e-21.2-resultado.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
  process.exit(R.allPass ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
