// Jornadas funcionais do checklist beta.20 em 1440x900 — dados 100% fictícios.
const fs = require('fs');
const { launch, newPage, ready, shot, gotoTab, layoutAudit, save } = require('./lib.cjs');
const SCR = '<scratchpad>/scratchpad';

const R = {}; // resultados por jornada
const step = async (key, fn) => { try { R[key] = { ok: true, ...(await fn()) }; } catch (e) { R[key] = { ok: false, error: e.message.split('\n')[0] }; } };
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('razao_app_state_v3') || '{}'));
const bodyText = page => page.locator('main, body').first().innerText();

async function addTx(page, { amount, desc, type = 'despesa', status = 'pago', date }) {
  await page.locator('button.new-transaction-button').first().click();
  await page.waitForSelector('.modal-sheet');
  await page.fill('.modal-sheet input[aria-label="Valor do lançamento em reais"]', amount);
  await page.locator('.modal-sheet button', { hasText: type === 'receita' ? 'Entrada' : 'Saída' }).click();
  await page.fill('.modal-sheet input[placeholder^="Ex: Tênis"]', desc);
  if (date) await page.fill('.modal-sheet input[type=date]', date);
  await page.locator('.modal-sheet select.form-select').nth(2).selectOption(status);
  await page.click('.modal-sheet button[type=submit]');
  await page.waitForTimeout(500);
  const open = await page.locator('.modal-sheet').count();
  const msg = open ? (await page.locator('.modal-sheet').innerText()).slice(0, 400) : null;
  if (open) { await page.locator('.modal-sheet .icon-btn').click().catch(() => {}); await page.waitForTimeout(200); }
  return { modalStillOpen: !!open, msg };
}

(async () => {
  const browser = await launch();
  const { ctx, page } = await newPage(browser, { width: 1440, height: 900 });

  // ---------- Inicialização / splash ----------
  await step('splash', async () => {
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(150);
    const splashVisible = await page.locator('.splash-screen').isVisible().catch(() => false);
    const p = splashVisible ? await shot(page, '01-inicializacao', 'splash-1440', false) : null;
    const splashText = splashVisible ? await page.locator('.splash-screen').innerText() : null;
    await page.waitForSelector('button.new-transaction-button', { timeout: 20000 });
    await page.waitForTimeout(500);
    const blank = (await page.locator('body').innerText()).trim().length < 20;
    return { splashVisible, splashText, blankScreen: blank, shots: [p, await shot(page, '01-inicializacao', 'primeira-leitura-vazia-1440')] };
  });

  // ---------- Modal de lançamento: validações e categorias ----------
  await step('modal_validacao', async () => {
    await page.locator('button.new-transaction-button').first().click();
    await page.waitForSelector('.modal-sheet');
    const s1 = await shot(page, '03-lancamentos', 'modal-novo-lancamento', false);
    const despesaCats = await page.locator('.modal-sheet select.form-select').nth(0).locator('option').allInnerTexts();
    const accounts = await page.locator('.modal-sheet select.form-select').nth(1).locator('option').allInnerTexts();
    const defaultDate = await page.inputValue('.modal-sheet input[type=date]');
    // Escape fecha?
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    const escCloses = (await page.locator('.modal-sheet').count()) === 0;
    if (!escCloses) await page.locator('.modal-sheet .icon-btn').click();
    // valor negativo / vazio
    const neg = await addTx(page, { amount: '-10,00', desc: 'Teste negativo fictício' });
    const empty = await addTx(page, { amount: '', desc: 'Teste vazio fictício' });
    const ambiguous = await addTx(page, { amount: '1.234', desc: 'Teste ambíguo fictício' });
    return { despesaCatsSample: despesaCats.slice(0, 20), offersIncomeCatForExpense: despesaCats.some(c => /Salário|Receita|Investimentos/i.test(c)), accounts, defaultDate, escCloses, negative: neg, empty, ambiguous, dialogs: page._log.dialogs.splice(0), shots: [s1] };
  });

  // ---------- Massa fictícia ----------
  await step('seed', async () => {
    const out = [];
    out.push(await addTx(page, { amount: '5.000,00', desc: 'Salário fictício', type: 'receita' }));
    out.push(await addTx(page, { amount: '245,90', desc: 'Mercado fictício' }));
    out.push(await addTx(page, { amount: '180,00', desc: 'Conta de luz fictícia', status: 'pendente' }));
    out.push(await addTx(page, { amount: '1.234.567,89', desc: 'Assinatura de serviço com nome extremamente comprido para testar a quebra de linha segura em todas as telas LTDA' }));
    out.push(await addTx(page, { amount: '12,34', desc: '=SOMA(1;1) fórmula fictícia' }));
    const st = await state(page);
    return { results: out, txCount: st.transactions?.length, dialogs: page._log.dialogs.splice(0) };
  });

  // ---------- Dashboard ----------
  await step('dashboard', async () => {
    await gotoTab(page, 'Visão geral');
    const s0 = await shot(page, '02-dashboard', 'dashboard-com-dados-1440');
    const periodLabel = async () => (await page.locator('.date-nav-btn').first().locator('xpath=..').innerText()).replace(/\s+/g, ' ').trim();
    const before = await periodLabel();
    await page.locator('.date-nav-btn', { hasText: '‹' }).first().click(); await page.waitForTimeout(300);
    const prev = await periodLabel();
    await page.locator('.date-nav-btn', { hasText: '›' }).first().click(); await page.waitForTimeout(300);
    await page.locator('button.pill-tab', { hasText: 'Semana' }).first().click(); await page.waitForTimeout(300);
    const week = await periodLabel();
    await page.locator('button.pill-tab', { hasText: '3 meses' }).first().click(); await page.waitForTimeout(300);
    const quarter = await periodLabel();
    const s1 = await shot(page, '02-dashboard', 'periodo-3-meses');
    await page.locator('button.pill-tab', { hasText: /^Mês$/ }).first().click(); await page.waitForTimeout(300);
    // ocultar valores
    const textBefore = await bodyText(page);
    await page.locator('button.privacy-button').click(); await page.waitForTimeout(300);
    const textHidden = await bodyText(page);
    const s2 = await shot(page, '02-dashboard', 'valores-ocultos');
    const amountsVisibleWhenHidden = (textHidden.match(/R\$\s?[\d.]+,\d{2}/g) || []);
    await page.locator('button.privacy-button').click(); await page.waitForTimeout(200);
    // abrir lançamento
    await page.locator('button.new-transaction-button').first().click(); await page.waitForTimeout(300);
    const modalOpens = await page.locator('.modal-sheet').isVisible();
    await page.locator('.modal-sheet .icon-btn').click();
    // diagnóstico
    await page.locator('button.diagnostic-button').click(); await page.waitForTimeout(500);
    const diagText = (await bodyText(page));
    const s3 = await shot(page, '02-dashboard', 'diagnostico-aberto', false);
    const diagDialogs = await page.locator('[role=dialog]').count();
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    const diagEscCloses = (await page.locator('[role=dialog]').count()) < diagDialogs;
    if (!diagEscCloses) { const close = page.locator('[role=dialog] button', { hasText: /Fechar|✕/ }).first(); if (await close.count()) await close.click(); else await page.mouse.click(5, 5); await page.waitForTimeout(300); }
    return { periods: { before, prev, week, quarter }, periodChanges: before !== prev && week !== quarter, amountsVisibleWhenHiddenCount: amountsVisibleWhenHidden.length, amountsVisibleWhenHiddenSample: amountsVisibleWhenHidden.slice(0, 5), amountsBeforeCount: (textBefore.match(/R\$\s?[\d.]+,\d{2}/g) || []).length, modalOpens, diagnosticDialogCount: diagDialogs, diagEscCloses, diagSnippet: diagText.includes('Diagnóstico') , shots: [s0, s1, s2, s3] };
  });

  // ---------- Recorrências / compromissos ----------
  await step('recorrencias', async () => {
    await gotoTab(page, 'Visão geral');
    await page.fill('input[placeholder="Ex.: Internet"]', 'Internet fictícia');
    await page.fill('input[placeholder="0,00"]:not([aria-label])', '99,90').catch(async () => page.locator('input[placeholder="0,00"]').last().fill('99,90'));
    await page.locator('input[type=number]').first().fill('15');
    const before = (await state(page)).recurring?.length || 0;
    await page.locator('button', { hasText: 'Adicionar recorrência' }).click(); await page.waitForTimeout(500);
    const after = (await state(page)).recurring?.length || 0;
    const txt = await bodyText(page);
    const s = await shot(page, '04-recorrencias-compromissos', 'recorrencia-adicionada');
    const gen = page.locator('button', { hasText: /Gerar|gerar/ }).first();
    let generated = null;
    if (await gen.count()) { const b = (await state(page)).transactions.length; page._dialogPolicy.push('accept'); await gen.click(); await page.waitForTimeout(600); generated = (await state(page)).transactions.length - b; }
    return { recurringBefore: before, recurringAfter: after, listsInternet: txt.includes('Internet fictícia'), upcomingShowsInternet: /Próximos compromissos[\s\S]*Internet fictícia/.test(txt), generateButton: await gen.count(), generatedOccurrences: generated, dialogs: page._log.dialogs.splice(0), shots: [s] };
  });

  // ---------- Lançamentos ----------
  await step('lancamentos', async () => {
    await gotoTab(page, 'Lançamentos');
    const s0 = await shot(page, '03-lancamentos', 'lista-1440');
    const rows = () => page.locator('.tx-action-button.is-danger').count();
    const total = await rows();
    await page.fill('input[aria-label="Buscar lançamentos"]', 'Mercado');
    await page.waitForTimeout(400);
    const afterSearch = await rows();
    const s1 = await shot(page, '03-lancamentos', 'busca-mercado');
    await page.fill('input[aria-label="Buscar lançamentos"]', '');
    await page.waitForTimeout(300);
    // alterar status
    const stBefore = (await state(page)).transactions.find(t => t.description === 'Conta de luz fictícia')?.status;
    const luzRow = page.locator('.tx-status-badge').nth(0);
    const statusTextBefore = await luzRow.innerText();
    await page.locator('[aria-label="Editar Conta de luz fictícia"]').locator('xpath=ancestor::*[.//button[contains(@class,"tx-status-badge")]][1]').locator('.tx-status-badge').click();
    await page.waitForTimeout(400);
    const stAfter = (await state(page)).transactions.find(t => t.description === 'Conta de luz fictícia')?.status;
    // editar
    await page.locator('[aria-label="Editar Mercado fictício"]').click(); await page.waitForTimeout(300);
    const prefilled = await page.inputValue('.modal-sheet input[placeholder^="Ex: Tênis"]');
    const prefilledAmount = await page.inputValue('.modal-sheet input[aria-label="Valor do lançamento em reais"]');
    await page.fill('.modal-sheet input[placeholder^="Ex: Tênis"]', 'Mercado fictício editado');
    await page.click('.modal-sheet button[type=submit]'); await page.waitForTimeout(400);
    const edited = (await state(page)).transactions.some(t => t.description === 'Mercado fictício editado');
    // excluir: cancelar e depois confirmar
    const n0 = (await state(page)).transactions.length;
    page._dialogPolicy.push('dismiss');
    await page.locator('[aria-label="Excluir =SOMA(1;1) fórmula fictícia"]').click(); await page.waitForTimeout(300);
    const n1 = (await state(page)).transactions.length;
    // filtros avançados
    await page.fill('input[placeholder="Ex.: 50,00"]', '1.000,00'); await page.waitForTimeout(300);
    const filteredMin = await rows();
    const s2 = await shot(page, '03-lancamentos', 'filtro-valor-minimo');
    const clear = page.locator('button', { hasText: 'Limpar filtros' }).first();
    await clear.click(); await page.waitForTimeout(300);
    const afterClear = await rows();
    // exportar CSV
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.locator('button', { hasText: 'Exportar CSV' }).click()]);
    const csvPath = SCR + '/export-ficticio.csv'; await dl.saveAs(csvPath);
    const csv = fs.readFileSync(csvPath, 'utf8');
    const formulaLine = csv.split(/\r?\n/).find(l => l.includes('SOMA')) || '';
    // agora confirmar exclusão
    page._dialogPolicy.push('accept');
    await page.locator('[aria-label="Excluir =SOMA(1;1) fórmula fictícia"]').click(); await page.waitForTimeout(400);
    const n2 = (await state(page)).transactions.length;
    const deletedAudit = (await state(page)).auditLog?.some(e => e.action === 'transaction_deleted');
    return { total, afterSearch, statusTextBefore, stBefore, stAfter, prefilled, prefilledAmount, edited, deleteCancelKeeps: n1 === n0, deleteConfirmRemoves: n2 === n0 - 1, deletedAudit, filteredMin, afterClear, csvFilename: dl.suggestedFilename(), csvHeader: csv.split(/\r?\n/)[0], csvFormulaLine: formulaLine, csvFormulaNeutralized: /['"]?'=|^\s*"?'/.test(formulaLine) || !/(^|[;,]"?)=SOMA/.test(formulaLine), dialogs: page._log.dialogs.splice(0), shots: [s0, s1, s2] };
  });

  // ---------- Orçamentos ----------
  await step('orcamentos', async () => {
    await gotoTab(page, 'Orçamentos');
    const s0 = await shot(page, '05-orcamentos', 'orcamento-inicial');
    const opts = await page.locator('main select').first().locator('option').allInnerTexts();
    const target = opts.find(o => /Alimenta|Mercado|Supermercado/i.test(o)) || opts[1] || opts[0];
    await page.locator('main select').first().selectOption({ label: target });
    await page.fill('input[placeholder="Ex.: 450,00"]', '450,00');
    await page.locator('button', { hasText: 'Salvar limite' }).click(); await page.waitForTimeout(400);
    const txt = await bodyText(page);
    const s1 = await shot(page, '05-orcamentos', 'limite-salvo');
    const hasUsed = /utilizado|ultrapassado/i.test(txt), hasRemaining = /restante|disponível|resta/i.test(txt);
    const removeBtns = await page.locator('button', { hasText: 'Remover limite' }).count();
    await page.locator('button', { hasText: 'Remover limite' }).first().click(); await page.waitForTimeout(300);
    const removeAfter = await page.locator('button', { hasText: 'Remover limite' }).count();
    const removeConfirmed = page._log.dialogs.length > 0;
    return { category: target, hasUsed, hasRemaining, removeBtns, removeAfter, removeAskedConfirmation: removeConfirmed, budgetsAfter: (await state(page)).budgets, dialogs: page._log.dialogs.splice(0), shots: [s0, s1] };
  });

  // ---------- Relatórios ----------
  await step('relatorios', async () => {
    await gotoTab(page, 'Relatórios');
    const shots = [await shot(page, '06-relatorios', 'relatorios-padrao')];
    const t0 = await bodyText(page);
    for (const b of ['6M', '1Y', 'Semanal', '3 Meses']) { await page.locator('button', { hasText: new RegExp('^' + b + '$') }).first().click(); await page.waitForTimeout(350); }
    const t1 = await bodyText(page);
    shots.push(await shot(page, '06-relatorios', 'relatorios-periodo-alterado'));
    const tables = await page.locator('main table').count();
    const svg = await page.locator('main svg').count();
    const canvas = await page.locator('main canvas').count();
    const audit = await layoutAudit(page);
    return { changedOnPeriod: t0 !== t1, tables, svg, canvas, truncated: audit.truncated, hOverflow: audit.hOverflow, shots };
  });

  // ---------- Planejamento ----------
  await step('planejamento', async () => {
    await gotoTab(page, 'Planejamento');
    const s0 = await shot(page, '07-planejamento', 'planejamento-inicial');
    const t0 = await bodyText(page);
    await page.locator('button.ai-suggestion-chip').first().click(); await page.waitForTimeout(600);
    const t1 = await bodyText(page);
    const s1 = await shot(page, '07-planejamento', 'pergunta-sugerida');
    await page.fill('input[placeholder^="Ex.: Posso assumir"]', 'Posso assumir uma despesa de R$ 800?');
    await page.locator('button', { hasText: 'Consultar' }).click(); await page.waitForTimeout(600);
    const t2 = await bodyText(page);
    // barra superior
    await gotoTab(page, 'Visão geral');
    await page.fill('input[aria-label="Perguntar ao assistente do Razão"]', 'Quanto gastei este mês?');
    await page.locator('button[aria-label="Enviar pergunta"]').click(); await page.waitForTimeout(700);
    const heading = await page.locator('h1').first().innerText();
    const t3 = await bodyText(page);
    const s2 = await shot(page, '07-planejamento', 'pergunta-barra-superior');
    // cenários
    const scen = {};
    for (const c of ['Otimista', 'Conservador', 'Esperado']) { await page.locator('button', { hasText: new RegExp('^' + c + '$') }).click(); await page.waitForTimeout(300); scen[c] = await page.locator('button', { hasText: new RegExp('^' + c + '$') }).getAttribute('aria-pressed'); }
    const s3 = await shot(page, '07-planejamento', 'cenario');
    const dismissBtns = await page.locator('button', { hasText: 'Dispensar alerta' }).count();
    let dismissWorks = null;
    if (dismissBtns) { await page.locator('button', { hasText: 'Dispensar alerta' }).first().click(); await page.waitForTimeout(300); dismissWorks = (await page.locator('button', { hasText: 'Dispensar alerta' }).count()) === dismissBtns - 1; }
    const labelsAI = /regras|determin|local|não (é|há) (um )?(modelo|IA)|sem IA|estimativa|heur/i.test(t0);
    return { suggestedAnswered: t1.length > t0.length, typedAnswered: t2 !== t1, topBarNavigatedTo: heading, topBarAnswered: t3.includes('Quanto gastei') || t3 !== t2, scenarios: scen, dismissBtns, dismissWorks, disclosureSnippet: (t0.match(/[^.\n]*(regras|local|estimativa|heur|IA)[^.\n]*/i) || [null])[0], labelsAI, shots: [s0, s1, s2, s3] };
  });

  // ---------- Importação ----------
  await step('importacao', async () => {
    await gotoTab(page, 'Importar dados');
    const s0 = await shot(page, '08-importacao', 'tela-importar');
    const nBefore = (await state(page)).transactions.length;
    await page.locator('button', { hasText: 'Abrir Importador' }).click(); await page.waitForTimeout(400);
    const s1 = await shot(page, '08-importacao', 'modal-importacao', false);
    await page.locator('button.pill-tab', { hasText: 'CSV' }).click(); await page.waitForTimeout(200);
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const csv = `Data;Descrição;Valor\n${today};Mercado fictício editado;-245,90\n${today};Padaria D'Avila fictícia;-12,50\n${today};Estorno de compra fictício;100,00\n${today};Café fictício;-4.50\n32/13/2026;Linha inválida fictícia;abc`;
    await page.locator('textarea').fill(csv);
    await page.locator('button.btn-primary').filter({ hasText: /Processar|Analisar|Extrair|Ler|Interpretar|Validar/ }).first().click().catch(async () => page.locator('.btn-primary').first().click());
    await page.waitForTimeout(600);
    const review = await page.locator('body').innerText();
    const s2 = await shot(page, '08-importacao', 'revisao-duplicatas', false);
    const items = await page.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].length);
    // capturar tipo atribuído ao estorno antes de sair
    const estornoTipo = await page.evaluate(() => { const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&e.textContent.trim()==='Estorno de compra fictício'); let p=el; for(let i=0;i<5&&p;i++){p=p.parentElement; const st=p&&p.getAttribute('style')||''; if(/expense|income|#ef4444|#10b981|red|green/.test(st)) return st.slice(0,200);} const card=el&&el.closest('div[style]'); return card?card.innerText.slice(0,200)+' | '+(card.querySelector('[style*=color]')||{getAttribute:()=>''}).getAttribute('style'):null; });
    await page.locator('button', { hasText: 'Voltar' }).first().click().catch(() => {});
    await page.waitForTimeout(250);
    await page.locator('button', { hasText: /^✕$/ }).first().click();
    await page.waitForTimeout(300);
    const importModalClosed = (await page.locator('textarea').count()) === 0;
    const nAfter = (await state(page)).transactions.length;
    return { reviewMentionsDuplicate: /duplica|possível|já existe|correspond/i.test(review), reviewSnippet: review.slice(review.indexOf('Mercado') - 50, review.indexOf('Mercado') + 600), mentionsDAvila: review.includes("D'Avila"), mentionsCafe: /Café fictício/.test(review), cafeValue: (review.match(/Café fictício[\s\S]{0,80}/) || [''])[0], estornoAs: (review.match(/Estorno de compra fictício[\s\S]{0,80}/) || [''])[0], invalidReported: /inválid|erro|ignorad/i.test(review), checkboxes: items, appliedNothing: nAfter === nBefore, importModalClosed, estornoTipo, dialogs: page._log.dialogs.splice(0), shots: [s0, s1, s2] };
  });

  // ---------- Perfil ----------
  await step('perfil', async () => {
    await gotoTab(page, 'Perfil');
    const s0 = await shot(page, '09-perfil', 'perfil-resumo');
    await page.locator('button', { hasText: 'Editar dados' }).click(); await page.waitForTimeout(300);
    const s1 = await shot(page, '09-perfil', 'perfil-edicao');
    const inputs = await page.locator('main form input').count();
    const fields = await page.evaluate(() => [...document.querySelectorAll('main form input, main form select')].map(i => (i.closest('label')?.innerText || i.getAttribute('aria-label') || i.name || i.placeholder || '').split('\n')[0]));
    await page.locator('main form input').first().fill('Pessoa Fictícia');
    await page.locator('button', { hasText: 'Salvar perfil' }).click(); await page.waitForTimeout(400);
    const avatar = await page.locator('.topbar-avatar-button').innerText();
    await page.reload(); await page.waitForSelector('button.new-transaction-button'); await page.waitForTimeout(400);
    const avatarAfterReload = await page.locator('.topbar-avatar-button').innerText();
    return { inputs, fields, avatar, avatarAfterReload, activeTabAfterReload: await page.locator('h1').first().innerText(), shots: [s0, s1] };
  });

  // ---------- Preferências ----------
  await step('preferencias', async () => {
    await gotoTab(page, 'Preferências');
    const s0 = await shot(page, '10-preferencias', 'preferencias-padrao');
    await page.locator('button', { hasText: 'Azul ardósia' }).click(); await page.waitForTimeout(250);
    await page.locator('button', { hasText: 'Compacto' }).click(); await page.waitForTimeout(250);
    const s1 = await shot(page, '10-preferencias', 'ardosia-compacto');
    const read = () => page.evaluate(() => ({ html: document.documentElement.className + ' ' + JSON.stringify(document.documentElement.dataset), body: document.body.className + ' ' + JSON.stringify(document.body.dataset), pressed: [...document.querySelectorAll('main button[aria-pressed="true"], main button.is-selected, main button[aria-checked="true"]')].map(b => b.innerText.split('\n')[0]) }));
    const r1 = await read();
    await gotoTab(page, 'Lançamentos'); await gotoTab(page, 'Preferências');
    const r2 = await read();
    await page.reload(); await page.waitForSelector('button.new-transaction-button'); await page.waitForTimeout(300);
    await gotoTab(page, 'Preferências');
    const r3 = await read();
    const s2 = await shot(page, '10-preferencias', 'apos-recarregar');
    // restaurar padrão
    await page.locator('button', { hasText: 'Azul institucional' }).click(); await page.locator('button', { hasText: 'Confortável' }).click();
    return { afterSelect: r1, afterNavigate: r2, afterReload: r3, persistsNavigate: JSON.stringify(r1.pressed) === JSON.stringify(r2.pressed), persistsReload: JSON.stringify(r1.pressed) === JSON.stringify(r3.pressed), shots: [s0, s1, s2] };
  });

  // ---------- Histórico e integridade ----------
  await step('historico_integridade', async () => {
    await gotoTab(page, 'Histórico de Auditoria');
    const s0 = await shot(page, '11-historico-integridade', 'historico');
    const a1 = await layoutAudit(page);
    const events = await page.locator('main tr, main li, main article').count();
    await gotoTab(page, 'Integridade Financeira');
    const s1 = await shot(page, '11-historico-integridade', 'integridade');
    const run = page.locator('main button').filter({ hasText: /Verificar|Executar|Analisar/ }).first();
    if (await run.count()) { await run.click(); await page.waitForTimeout(500); }
    const s2 = await shot(page, '11-historico-integridade', 'integridade-executada');
    const a2 = await layoutAudit(page);
    return { auditRows: events, historicoLayout: { hOverflow: a1.hOverflow, truncated: a1.truncated, scroll: a1.scrollContainers }, integridadeLayout: { hOverflow: a2.hOverflow, truncated: a2.truncated, scroll: a2.scrollContainers }, integrityText: (await page.locator('main').innerText()).slice(0, 600), shots: [s0, s1, s2] };
  });

  // ---------- Conferir saldo de extrato ----------
  await step('conferir_saldo', async () => {
    await gotoTab(page, 'Visão geral');
    await page.locator('button', { hasText: 'Conferir saldo do extrato' }).click(); await page.waitForTimeout(400);
    const s = await shot(page, '02-dashboard', 'conferir-saldo-extrato', false);
    const txt = (await page.locator('[role=dialog], .modal-sheet').first().innerText().catch(() => '')).slice(0, 400);
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    const escCloses = (await page.locator('[role=dialog], .modal-sheet').count()) === 0;
    if (!escCloses) { await page.locator('[role=dialog] button, .modal-sheet button').filter({ hasText: /✕|Fechar|Cancelar/ }).first().click().catch(() => {}); }
    return { txt, escCloses, shots: [s] };
  });

  // ---------- PF/PJ ----------
  await step('pf_pj', async () => {
    await gotoTab(page, 'Lançamentos');
    await page.locator('.profile-switcher button', { hasText: 'PJ' }).click(); await page.waitForTimeout(400);
    const pjText = await bodyText(page);
    const s = await shot(page, '12-pf-pj', 'lancamentos-pj');
    const warning = (pjText.match(/[^.\n]*isolamento[^.\n]*/i) || [null])[0];
    await page.reload(); await page.waitForSelector('button.new-transaction-button'); await page.waitForTimeout(300);
    const afterReload = await page.locator('.profile-switcher button.is-selected').innerText();
    await page.locator('.profile-switcher button', { hasText: 'PF' }).click();
    return { pjShowsPF: pjText.includes('Salário fictício'), warning, profileAfterReload: afterReload, shots: [s] };
  });

  // ---------- Cartões (estado vazio + cartão fictício injetado) ----------
  await step('cartoes', async () => {
    await gotoTab(page, 'Cartões e faturas');
    const s0 = await shot(page, '13-cartoes', 'estado-sem-cartao');
    const empty = await page.locator('text=Nenhum cartão cadastrado').count();
    const createCardUI = await page.locator('button', { hasText: /cartão/i }).filter({ hasText: /novo|adicionar|cadastrar/i }).count();
    // injeção de cartão FICTÍCIO apenas no perfil temporário do navegador
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('razao_app_state_v3'));
      const tpl = s.transactions.find(t => t.profileType === 'PF');
      s.cards = [{ id: 'card-ficticio', name: 'Cartão Fictício Teste', limitCents: 500000, closingDay: 10, dueDay: 20, profileType: 'PF' }];
      const d = new Date(); const iso = new Date(d.getTime() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      s.transactions.push({ ...tpl, id: 'tx-card-ficticio', description: 'Compra fictícia no cartão', amountCents: 32050, type: 'despesa', status: 'pago', date: iso, accountId: 'card-ficticio', importedId: undefined });
      localStorage.setItem('razao_app_state_v3', JSON.stringify(s));
    });
    await page.reload(); await page.waitForSelector('button.new-transaction-button, .recovery-retry-button', { timeout: 15000 }); await page.waitForTimeout(400);
    const recovery = await page.locator('.recovery-retry-button').count();
    if (recovery) return { empty, createCardUI, injectedStateRejected: true, text: (await page.locator('body').innerText()).slice(0, 500), shots: [s0, await shot(page, '13-cartoes', 'injecao-rejeitada')] };
    await gotoTab(page, 'Cartões e faturas');
    const s1 = await shot(page, '13-cartoes', 'ciclo-fatura-cartao-ficticio');
    const invoiceText = (await page.locator('main').innerText()).slice(0, 800);
    const payBtn = page.locator('main button', { hasText: /Pagar|pagamento/i }).first();
    const hasPay = await payBtn.count();
    let paid = null;
    if (hasPay) {
      page._dialogPolicy.push('accept', 'accept');
      const n0 = (await state(page)).transactions.length;
      await payBtn.click(); await page.waitForTimeout(700);
      const st = await state(page);
      paid = { newTx: st.transactions.length - n0, paymentTx: st.transactions.filter(t => t.linkedCardId === 'card-ficticio' || t.toAccountId === 'card-ficticio').map(t => ({ type: t.type, amountCents: t.amountCents, status: t.status })) };
      paid.textAfter = (await page.locator('main').innerText()).slice(0, 600);
      paid.shot = await shot(page, '13-cartoes', 'apos-pagamento');
      // pagar de novo (duplicidade)
      const again = page.locator('main button', { hasText: /Pagar|pagamento/i }).first();
      if (await again.count() && await again.isEnabled()) { page._dialogPolicy.push('accept', 'accept'); const n1 = (await state(page)).transactions.length; await again.click(); await page.waitForTimeout(600); paid.secondClickNewTx = (await state(page)).transactions.length - n1; }
    }
    // dashboard: indicador de fatura
    return { empty, createCardUI, invoiceText, hasPay, paid, dialogs: page._log.dialogs.splice(0), shots: [s0, s1] };
  });

  // ---------- Recuperação (armazenamento corrompido, contexto separado) ----------
  await step('recuperacao', async () => {
    const { ctx: c2, page: p2 } = await newPage(browser, { width: 1440, height: 900 });
    await ready(p2);
    await addTx(p2, { amount: '10,00', desc: 'Lançamento fictício de recuperação' });
    // Caso 1: principal corrompido, LKG válido
    await p2.evaluate(() => localStorage.setItem('razao_app_state_v3', '{corrompido-1'));
    await p2.reload(); await p2.waitForTimeout(2500);
    const case1 = { text: (await p2.locator('body').innerText()).slice(0, 300), mainAfter: (await p2.evaluate(() => localStorage.getItem('razao_app_state_v3'))).slice(0, 40), corruptedPreservedSomewhere: await p2.evaluate(() => Object.keys(localStorage).some(k => (localStorage.getItem(k) || '').includes('{corrompido-1'))), keys: await p2.evaluate(() => Object.keys(localStorage)), shot: await shot(p2, '14-recuperacao', 'principal-corrompido-com-copia') };
    // Caso 2: sem cópia válida
    await p2.evaluate(() => { localStorage.setItem('razao_app_state_v3', '{corrompido-2'); localStorage.removeItem('razao_app_state_v3.last-known-good'); });
    await p2.reload(); await p2.waitForTimeout(2500);
    const t2 = await p2.locator('body').innerText();
    const s2 = await shot(p2, '14-recuperacao', 'sem-copia-valida');
    const buttons = await p2.locator('button').allInnerTexts();
    const audit = await layoutAudit(p2);
    await p2.setViewportSize({ width: 375, height: 812 }); await p2.waitForTimeout(300);
    const s3 = await shot(p2, '14-recuperacao', 'sem-copia-valida-375');
    const audit375 = await layoutAudit(p2);
    const preserved = await p2.evaluate(() => localStorage.getItem('razao_app_state_v3'));
    const r = { case1, case2: { text: t2.slice(0, 700), buttons, preserved, truncated: audit.truncated, hOverflow375: audit375.hOverflow, truncated375: audit375.truncated }, console: p2._log.console, dialogs: p2._log.dialogs, shots: [s2, s3] };
    await c2.close();
    return r;
  });

  R._console = page._log.console;
  R._dialogsLeft = page._log.dialogs;
  save('functional', R);
  // estado final fictício para a varredura responsiva
  const st = await state(page);
  fs.writeFileSync(SCR + '/results/seed-state.json', JSON.stringify(st));
  await browser.close();
  console.log(Object.entries(R).map(([k, v]) => `${k}: ${v && v.ok === false ? 'ERRO ' + v.error : 'ok'}`).join('\n'));
})();
