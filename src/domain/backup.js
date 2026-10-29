import { sanitizeState } from './sanitize.js';
import { validateStateStructure } from './stateValidation.js';
import { migrateData, CURRENT_SCHEMA_VERSION } from './migrations.js';

export const BACKUP_FORMAT = 'orazao-backup';
export const BACKUP_FORMAT_VERSION = 1;
const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// Non-cryptographic checksum: detects accidental corruption, not deliberate tampering.
export function backupChecksum(payload) {
  const input = stableStringify(payload);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function createBackup(state, createdAt = new Date().toISOString()) {
  if (!isRecord(state) || !Array.isArray(state.transactions) || !Array.isArray(state.accounts)) {
    throw new Error('Estado incompleto: contas e lançamentos são obrigatórios.');
  }
  const stateVersion = Number.isInteger(state.schemaVersion)
    ? state.schemaVersion
    : (Number.isInteger(state.version) ? state.version : CURRENT_SCHEMA_VERSION);
  if (Number.isInteger(state.version) && Number.isInteger(state.schemaVersion) && state.version !== state.schemaVersion) {
    throw new Error('O estado possui versões internas de schema conflitantes; gere um diagnóstico antes de exportar.');
  }
  if (stateVersion < 1 || stateVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Schema ${stateVersion} não suportado para backup.`);
  }
  const payload = {
    schemaVersion: stateVersion,
    state: JSON.parse(JSON.stringify(state))
  };
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt,
    payload,
    checksum: backupChecksum(payload)
  };
}

/**
 * Valida um estado vindo do catálogo de recuperação (inclusive cópias do Electron).
 * Essas cópias não carregam o envelope JSON exportável, então criamos um envelope
 * transitório para aplicar a mesma validação sem confiar apenas na estrutura IPC.
 */
export function validateHistoricalBackupState(state, createdAt = new Date().toISOString()) {
  try {
    const timestamp = typeof createdAt === 'string' && !Number.isNaN(Date.parse(createdAt))
      ? createdAt
      : new Date().toISOString();
    return validateBackup(createBackup(state, timestamp));
  } catch (error) {
    return { valid: false, issues: [error?.message || 'Estado de recuperação inválido.'] };
  }
}

/**
 * Cria um arquivo JSON exportável a partir de um estado histórico recuperado.
 * Não confia no catálogo nem no IPC: valida os dados financeiros antes de gerar
 * um novo envelope com checksum, preservando a data original quando válida.
 */
export function serializeHistoricalBackup(state, createdAt = new Date().toISOString()) {
  const validated = validateHistoricalBackupState(state, createdAt);
  if (!validated.valid) {
    throw new Error(`O backup histórico não pode ser exportado: ${validated.issues.join(' ')}`);
  }
  const timestamp = typeof createdAt === 'string' && !Number.isNaN(Date.parse(createdAt))
    ? new Date(createdAt).toISOString()
    : new Date().toISOString();
  return JSON.stringify(createBackup(validated.state, timestamp), null, 2);
}

export function validateBackup(input) {
  const issues = [];
  if (!isRecord(input)) return { valid: false, issues: ['O arquivo não contém um objeto JSON válido.'] };
  if (input.format !== BACKUP_FORMAT) issues.push('Formato de backup desconhecido ou não suportado.');
  if (input.formatVersion !== BACKUP_FORMAT_VERSION) issues.push('Versão do formato de backup não suportada.');
  if (typeof input.createdAt !== 'string' || Number.isNaN(Date.parse(input.createdAt))) issues.push('Data de criação do backup inválida.');
  if (!isRecord(input.payload)) issues.push('Conteúdo principal do backup ausente.');
  if (typeof input.checksum !== 'string' || !/^[0-9a-f]{8}$/.test(input.checksum)) issues.push('Checksum ausente ou inválido.');
  if (issues.length) return { valid: false, issues };
  if (backupChecksum(input.payload) !== input.checksum) issues.push('O checksum não confere; o arquivo pode estar incompleto ou corrompido.');
  if (!Number.isInteger(input.payload.schemaVersion) || input.payload.schemaVersion < 1 || input.payload.schemaVersion > CURRENT_SCHEMA_VERSION) {
    issues.push(`Versão do schema do backup inválida ou não suportada (1–${CURRENT_SCHEMA_VERSION}).`);
  }
  if (issues.length) return { valid: false, issues };
  const sourceCandidate = input.payload.state;
  if (!isRecord(sourceCandidate)) issues.push('Estado do aplicativo ausente.');
  let candidate;
  if (isRecord(sourceCandidate)) {
    try {
      candidate = migrateData(sourceCandidate, input.payload.schemaVersion);
    } catch (migrationError) {
      issues.push(`Migração do backup recusada sem alterar os dados ativos: ${migrationError?.message || 'erro desconhecido'}`);
    }
  }
  if (issues.length) return { valid: false, issues };
  if (!isRecord(candidate)) issues.push('Estado do aplicativo ausente após a migração.');
  else {
    if (!Array.isArray(candidate.accounts)) issues.push('Lista de contas ausente ou inválida.');
    if (!Array.isArray(candidate.transactions)) issues.push('Lista de lançamentos ausente ou inválida.');
    if (!Array.isArray(candidate.categories)) issues.push('Lista de categorias ausente ou inválida.');
    if (candidate.cards !== undefined && !Array.isArray(candidate.cards)) issues.push('Lista de cartões inválida.');
    if (candidate.auditLog !== undefined && !Array.isArray(candidate.auditLog)) issues.push('Histórico de auditoria inválido.');
    if (Array.isArray(candidate.accounts) && candidate.accounts.some(item => !isRecord(item) || typeof item.id !== 'string' || !item.id.trim())) issues.push('Há conta sem identificador válido.');
    if (Array.isArray(candidate.transactions) && candidate.transactions.some(item => !isRecord(item) || typeof item.id !== 'string' || !item.id.trim())) issues.push('Há lançamento sem identificador válido.');
    if (Array.isArray(candidate.accounts) && new Set(candidate.accounts.map(item => item?.id)).size !== candidate.accounts.length) issues.push('Há identificadores de conta duplicados.');
    if (Array.isArray(candidate.transactions) && new Set(candidate.transactions.map(item => item?.id)).size !== candidate.transactions.length) issues.push('Há identificadores de lançamento duplicados.');
    if (Array.isArray(candidate.transactions) && candidate.transactions.some(item => !Number.isSafeInteger(item.amountCents) || item.amountCents < 0)) issues.push('Há lançamento com valor em centavos inválido.');
    if (Array.isArray(candidate.accounts) && candidate.accounts.some(item => item.initialBalanceCents !== undefined && !Number.isSafeInteger(item.initialBalanceCents))) issues.push('Há saldo inicial de conta inválido.');
    if (Array.isArray(candidate.transactions) && candidate.transactions.some(item => !['receita', 'despesa', 'transferencia'].includes(item.type) || !['pago', 'pendente', 'cancelado'].includes(item.status))) issues.push('Há lançamento com tipo ou situação não suportada.');
    if (Array.isArray(candidate.transactions) && candidate.transactions.some(item => typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || Number.isNaN(Date.parse(`${item.date}T00:00:00Z`)) || new Date(`${item.date}T00:00:00Z`).toISOString().slice(0, 10) !== item.date)) issues.push('Há lançamento com data inválida.');
    if (Array.isArray(candidate.accounts) && Array.isArray(candidate.cards) && Array.isArray(candidate.transactions)) {
      const validAccountIds = new Set([...candidate.accounts, ...candidate.cards].map(item => item?.id).filter(Boolean));
      if (candidate.transactions.some(item => !validAccountIds.has(item.accountId))) issues.push('Há lançamento que referencia uma conta ou cartão inexistente.');
      if (candidate.transactions.some(item => item.type === 'transferencia' && (!item.toAccountId || !validAccountIds.has(item.toAccountId) || item.toAccountId === item.accountId))) issues.push('Há transferência com conta de destino inválida.');
    }
    // Reuse the same domain boundary used by primary persistence. This runs
    // before sanitizeState, so duplicate card/category IDs or semantic-invalid
    // current-schema rows cannot be silently normalized out of a backup.
    if (Array.isArray(candidate.accounts) && Array.isArray(candidate.transactions)) {
      const structure = validateStateStructure(candidate, { requireCurrentSchema: Number(candidate.version) >= 4, allowProfileMigration: true });
      issues.push(...structure.issues.map(issue => `Estado do backup: ${issue}`));
    }
  }
  if (issues.length) return { valid: false, issues };
  const state = sanitizeState(candidate);
  return {
    valid: true,
    issues: [],
    state,
    summary: {
      accounts: state.accounts.length,
      transactions: state.transactions.length,
      cards: state.cards.length,
      auditEvents: state.auditLog.length,
      createdAt: input.createdAt
    }
  };
}

export function parseBackupText(text) {
  if (typeof text !== 'string' || !text.trim()) return { valid: false, issues: ['O arquivo está vazio.'] };
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) return { valid: false, issues: ['O arquivo excede o limite de 25 MB.'] };
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { return { valid: false, issues: ['O arquivo não contém JSON válido ou está incompleto.'] }; }
  return validateBackup(parsed);
}
