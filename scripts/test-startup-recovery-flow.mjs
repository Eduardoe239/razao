import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const screen = fs.readFileSync(new URL('../src/components/StartupRecoveryScreen.jsx', import.meta.url), 'utf8');
const history = fs.readFileSync(new URL('../src/services/backupHistory.js', import.meta.url), 'utf8');
const modal = fs.readFileSync(new URL('../src/components/DiagnosticModal.jsx', import.meta.url), 'utf8');

assert.match(app, /setBootError\(message\)/, 'falha de leitura aparece no estado de boot');
assert.match(app, /setIsHydrated\(false\)/, 'autosave é desabilitado durante falha de leitura');
assert.match(app, /setShowSplash\(false\)/, 'falha de leitura não deixa a splash travada para sempre');
assert.match(app, /listLocalBackupHistory\(\)/, 'boot tenta enumerar cópias locais');
assert.match(app, /window\.electronAPI\.listRecoveryBackups\(\)/, 'boot tenta enumerar cópias desktop');
assert.match(app, /validateHistoricalBackupState\(candidateState, createdAt\)/, 'cópia é validada financeiramente antes de restaurar');
assert.match(app, /saveStateWithRecovery\(nextState\)/, 'restauração usa o caminho com recuperação e rollback');
assert.match(app, /parseBackupText\(await file\.text\(\)\)/, 'importação externa usa parser/validador oficial');
assert.match(screen, /Recuperar uma cópia validada/, 'interface informa objetivo da ação');
assert.match(screen, /onImportBackup/, 'interface oferece importação de backup externo');
assert.match(screen, /nenhum estado vazio será salvo/, 'interface explica o fail-closed');
assert.match(history, /preservado sem alterações/, 'catálogo corrompido não vira lista vazia silenciosa');
assert.match(modal, /não foi adicionado ao histórico local/, 'exportação informa quando o histórico local falha');
console.log('Startup recovery flow: 13 static regression checks passed, 0 failed');
