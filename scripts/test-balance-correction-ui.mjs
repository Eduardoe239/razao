import assert from 'node:assert/strict';
import fs from 'node:fs';

const modal = fs.readFileSync(new URL('../src/components/AccountBalanceReconciliationModal.jsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const sanitizer = fs.readFileSync(new URL('../src/domain/sanitize.js', import.meta.url), 'utf8');

assert.ok(modal.includes('analyzeBalanceDiscrepancy'), 'modal usa análise de hipóteses');
assert.ok(modal.includes('prepareBalanceAdjustment'), 'modal prepara um rascunho, sem aplicação automática');
assert.ok(modal.includes('Confirmei no extrato'), 'modal exige confirmação explícita do usuário');
assert.ok(modal.includes('Confirmar e registrar ajuste'), 'modal apresenta ação explícita para registrar');
assert.ok(modal.includes('disabled={!confirmAdjustment'), 'ação fica desabilitada sem confirmação');
assert.ok(app.includes('applyBalanceAdjustment'), 'App usa o serviço de domínio para aplicar a correção');
assert.ok(app.includes('handleApplyBalanceAdjustment'), 'App conecta o callback de aplicação');
assert.ok(sanitizer.includes('balance_reconciliation_adjustment'), 'sanitização preserva a origem do ajuste');
assert.ok(sanitizer.includes('reconciliationAdjustment'), 'sanitização preserva metadados auditáveis');
console.log('Integração visual da correção de saldo: 9 verificações aprovadas.');
