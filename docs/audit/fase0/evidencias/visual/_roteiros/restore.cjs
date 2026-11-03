const fs = require('fs');
const { launch, newPage, ready, shot, save } = require('./lib.cjs');
const SCR='<scratchpad>/scratchpad';
const seed = fs.readFileSync(SCR+'/results/seed-state.json','utf8');
(async () => {
  const b = await launch(); const R = {};
  const { ctx, page } = await newPage(b, { width: 1440, height: 900 });
  await ctx.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('razao_app_state_v3', s); sessionStorage.setItem('seeded','1'); } }, seed);
  await ready(page);
  await page.locator('button.diagnostic-button').click(); await page.waitForTimeout(400);
  page._dialogPolicy.push('accept','accept','accept');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.locator('button', { hasText: 'Exportar Backup' }).click()]);
  const bk = SCR + '/backup-ficticio.json'; await dl.saveAs(bk);
  R.export = { file: dl.suggestedFilename(), bytes: fs.statSync(bk).size, plaintextReadable: fs.readFileSync(bk,'utf8').includes('Salário fictício'), dialogs: page._log.dialogs.splice(0) };
  R.export.shot = await shot(page, '14-recuperacao', 'apos-exportar-backup', false);
  // mutação pós-backup, para que a restauração tenha efeito observável
  const n0 = await page.evaluate(() => JSON.parse(localStorage.getItem('razao_app_state_v3')).transactions.length);
  // restaurar: primeiro recusar
  page._dialogPolicy.push('dismiss','dismiss','dismiss');
  R.restoreControlTag = await page.locator('text=Restaurar Backup').first().evaluate(e => e.closest('label,button')?.tagName + ' tabindex=' + e.closest('label,button')?.getAttribute('tabindex'));
  await page.setInputFiles('input[type=file][accept*=json]', bk); await page.waitForTimeout(1200);
  R.restoreDismiss = { dialogs: page._log.dialogs.splice(0), txAfter: await page.evaluate(() => JSON.parse(localStorage.getItem('razao_app_state_v3')).transactions.length), n0, uiText: (await page.locator('[role=dialog], .modal-overlay').first().innerText().catch(()=>'')).slice(0,500) };
  R.restoreDismiss.shot = await shot(page, '14-recuperacao', 'restaurar-confirmacao', false);
  // gerenciador de backups após export
  R.catalog = await page.evaluate(() => localStorage.getItem('razao_backup_history_v1')?.slice(0,200));
  R.console = page._log.console;
  save('restore', R); await b.close(); console.log(JSON.stringify(R,null,1));
})();
