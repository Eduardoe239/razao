import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const run = spawnSync(process.execPath, ['src/domain/balanceReconciliation.test.js'], { encoding: 'utf8' });
assert.equal(run.status, 0, `testes de conciliação de saldo falharam:\n${run.stdout}\n${run.stderr}`);
const appSource = await readFile('src/App.jsx', 'utf8');
const componentSource = await readFile('src/components/AccountBalanceReconciliationModal.jsx', 'utf8');
assert.match(appSource, /AccountBalanceReconciliationModal/, 'integra modal de conciliação de saldo na aplicação');
assert.match(appSource, /Conferir saldo do extrato/, 'oferece ação para abrir conferência de saldo');
assert.match(componentSource, /Nenhum lançamento será criado sem revisão e confirmação explícita/, 'informa que ajustes exigem revisão e confirmação');
assert.match(componentSource, /Confirmar e registrar ajuste/, 'dispõe de ação explícita para registrar um ajuste');
assert.match(componentSource, /Diferença \(extrato − Razão\)/, 'mostra a definição da diferença');
console.log('Integração da conciliação de saldos: 5 verificações aprovadas.');
