import { createBackup, validateBackup } from '../domain/backup.js';

const HISTORY_KEY = 'razao_backup_history_v1';
const MAX_ITEMS = 5;
const MAX_TOTAL_BYTES = 3 * 1024 * 1024;

function readHistory() {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(HISTORY_KEY);
  if (raw === null) return [];
  // Never turn an unreadable catalog into an empty list that a later save would
  // overwrite. The financial state is separate, but this catalog may contain
  // the user's only local recovery copies.
  if (new TextEncoder().encode(raw).length > MAX_TOTAL_BYTES) {
    throw new Error('O catálogo de backups excede o limite de 3 MB. Ele foi preservado sem alterações.');
  }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('O catálogo de backups está corrompido. Ele foi preservado sem alterações.'); }
  if (!Array.isArray(parsed)) throw new Error('O catálogo de backups tem formato inválido e foi preservado sem alterações.');
  const malformed = parsed.some(item => !item || typeof item !== 'object' || Array.isArray(item)
    || typeof item.id !== 'string' || !item.id.trim()
    || typeof item.backupText !== 'string'
    || new TextEncoder().encode(item.backupText).length > MAX_TOTAL_BYTES);
  if (malformed) throw new Error('O catálogo contém um registro de backup inválido ou grande demais. Para evitar perda de cópias, o catálogo não será substituído.');
  return parsed.slice(0, MAX_ITEMS);
}

export function listLocalBackupHistory() {
  return readHistory().map(item => {
    const parsed = validateBackup(safeParse(item.backupText));
    return {
      id: item.id,
      createdAt: item.createdAt,
      label: item.label || 'Backup local',
      valid: parsed.valid,
      issue: parsed.valid ? '' : parsed.issues.join(' '),
      accounts: parsed.valid ? parsed.summary.accounts : 0,
      transactions: parsed.valid ? parsed.summary.transactions : 0,
      sizeBytes: new TextEncoder().encode(item.backupText).length
    };
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function safeParse(text) { try { return JSON.parse(text); } catch { return null; } }

export function recordLocalBackup(state, label = 'Backup automático') {
  if (typeof localStorage === 'undefined') return { saved: false, reason: 'Armazenamento local indisponível.' };
  let backupText;
  try { backupText = JSON.stringify(createBackup(state)); }
  catch (error) { return { saved: false, reason: error?.message || 'Estado inválido.' }; }
  const size = new TextEncoder().encode(backupText).length;
  if (size > MAX_TOTAL_BYTES) return { saved: false, reason: 'O backup é maior que o limite da área de histórico local.' };
  let history;
  try { history = readHistory(); }
  catch (error) { return { saved: false, reason: error?.message || 'O histórico de backups não pôde ser lido; nenhum registro foi sobrescrito.' }; }
  history.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), label: String(label).slice(0, 80), backupText });
  let kept = history.slice(0, MAX_ITEMS);
  while (kept.length > 0 && new TextEncoder().encode(JSON.stringify(kept)).length > MAX_TOTAL_BYTES) kept.pop();
  try {
    const serialized = JSON.stringify(kept);
    localStorage.setItem(HISTORY_KEY, serialized);
    if (localStorage.getItem(HISTORY_KEY) !== serialized) throw new Error('A gravação do catálogo não pôde ser confirmada por leitura.');
    return { saved: true, id: kept[0]?.id, count: kept.length };
  } catch (error) {
    return { saved: false, reason: error?.message || 'Sem espaço para manter o histórico.' };
  }
}

export function loadLocalBackup(id) {
  const item = readHistory().find(candidate => candidate.id === id);
  if (!item) throw new Error('O backup selecionado não existe mais no histórico local.');
  const parsed = validateBackup(safeParse(item.backupText));
  if (!parsed.valid) throw new Error(`O backup do histórico não passou na validação: ${parsed.issues.join(' ')}`);
  return { state: parsed.state, summary: parsed.summary, label: item.label, createdAt: item.createdAt };
}
