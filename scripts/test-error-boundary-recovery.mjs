import assert from 'node:assert/strict';
import fs from 'node:fs';

const boundary = fs.readFileSync('src/components/ErrorBoundary.jsx', 'utf8');
const storage = fs.readFileSync('src/services/storage.js', 'utf8');

assert.match(boundary, /getPreRestoreBackupKey/,
  'ErrorBoundary deve usar a chave de backup reconhecida pelo serviço de persistência');
assert.doesNotMatch(boundary, /razao_app_state_v3_backup_emergency/,
  'não deve gravar em uma chave de emergência órfã');
assert.match(boundary, /format: 'orazao-pre-restore-snapshot'/,
  'snapshot de exceção deve usar o formato esperado pelo mecanismo de recuperação');
assert.match(boundary, /verified\.raw !== current/,
  'a cópia deve ser verificada contra os bytes do estado atual');
assert.ok(boundary.indexOf('verified.raw !== current') < boundary.indexOf('localStorage.removeItem(storageKey)'),
  'o estado ativo só pode ser removido depois de validar a cópia');
assert.match(boundary, /window\.electronAPI\?\.isDesktop/,
  'a ação não deve tentar redefinir localStorage quando o estado é gerenciado pelo desktop');
assert.doesNotMatch(boundary, /100% seguros/,
  'a interface não deve prometer segurança absoluta dos dados');
assert.match(storage, /'orazao-pre-restore-snapshot'/,
  'o formato da cópia pré-restauração deve coincidir com o contrato de recuperação');
assert.match(storage, /'orazao-last-known-good-snapshot'/,
  'a recuperação Web deve reconhecer o último estado confirmado');

console.log('ErrorBoundary recovery checks: 8 passed, 0 failed');
