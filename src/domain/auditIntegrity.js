import { AUDIT_ACTIONS } from './auditLog.js';
import { auditLedger } from './ledger.js';

const COMPARED_FIELDS = ['id', 'description', 'amountCents', 'type', 'status', 'date', 'accountId', 'toAccountId', 'categoryId', 'profileType', 'source', 'linkedInvoiceKey', 'linkedCardId', 'idempotencyKey', 'importedId', 'reconciliationKey', 'recurringId', 'recurringOccurrenceDate'];

function sameRelevantFields(snapshot, transaction) {
  if (!snapshot || !transaction) return false;
  return COMPARED_FIELDS.every(field => snapshot[field] === undefined || (transaction[field] ?? undefined) === snapshot[field]);
}

export function auditStateIntegrity({ auditLog = [], transactions = [], accounts = [], virtualAccountIds = [] } = {}) {
  const issues = [];
  const events = Array.isArray(auditLog) ? auditLog : [];
  const txs = Array.isArray(transactions) ? transactions : [];
  const txById = new Map();
  for (const tx of txs) {
    if (tx?.id && !txById.has(tx.id)) txById.set(tx.id, tx);
  }
  const seenEventIds = new Set();
  const latestByEntity = new Map();
  let validEvents = 0;

  events.forEach((event, index) => {
    const location = `Evento ${index + 1}`;
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      issues.push({ code: 'invalid_event', message: `${location}: estrutura inválida` });
      return;
    }
    const id = typeof event.id === 'string' ? event.id.trim() : '';
    if (!id) issues.push({ code: 'missing_event_id', eventId: null, message: `${location}: identificador ausente ou inválido` });
    else if (seenEventIds.has(id)) issues.push({ code: 'duplicate_event_id', eventId: id, message: `${location}: identificador de evento duplicado (${id})` });
    else seenEventIds.add(id);

    const time = typeof event.timestamp === 'string' ? Date.parse(event.timestamp) : NaN;
    if (!Number.isFinite(time)) issues.push({ code: 'invalid_timestamp', eventId: id || null, message: `${location}: data/hora inválida` });
    if (typeof event.action !== 'string' || !AUDIT_ACTIONS.has(event.action)) {
      issues.push({ code: 'unknown_action', eventId: id || null, message: `${location}: tipo de ação desconhecido` });
    }
    if (!['PF', 'PJ'].includes(event.profileType)) issues.push({ code: 'invalid_profile', eventId: id || null, message: `${location}: perfil PF/PJ inválido` });
    if (event.before !== null && event.before !== undefined && (typeof event.before !== 'object' || Array.isArray(event.before))) issues.push({ code: 'invalid_snapshot', eventId: id || null, message: `${location}: snapshot anterior inválido` });
    if (event.after !== null && event.after !== undefined && (typeof event.after !== 'object' || Array.isArray(event.after))) issues.push({ code: 'invalid_snapshot', eventId: id || null, message: `${location}: snapshot posterior inválido` });

    if (event.action === 'import_reconciliation_summary') {
      if (!event.metadata || !Number.isInteger(event.metadata.addedCount) || event.metadata.addedCount < 0 || !Number.isInteger(event.metadata.settledCount) || event.metadata.settledCount < 0 || !Number.isInteger(event.metadata.skippedCount) || event.metadata.skippedCount < 0) {
        issues.push({ code: 'invalid_import_summary', eventId: id || null, message: `${location}: resumo de importação incompleto ou inválido` });
      }
    } else if (typeof event.entityId !== 'string' || !event.entityId.trim()) {
      issues.push({ code: 'missing_entity_id', eventId: id || null, message: `${location}: lançamento sem identificador de entidade` });
    }

    if (id && Number.isFinite(time) && typeof event.action === 'string' && AUDIT_ACTIONS.has(event.action)) validEvents++;
    if (event.entityType === 'transaction' && typeof event.entityId === 'string' && event.entityId.trim()) {
      const current = latestByEntity.get(event.entityId);
      if (!current || (Number.isFinite(time) && time >= current.time)) latestByEntity.set(event.entityId, { event, time, index });
    }
  });

  // Compare only entities that have audit evidence; legacy transactions without a
  // history event are not called corrupt merely because the log is not retroactive.
  for (const [entityId, latest] of latestByEntity) {
    const { event } = latest;
    const current = txById.get(entityId);
    if (event.action === 'transaction_deleted') {
      if (current) issues.push({ code: 'deleted_transaction_exists', eventId: event.id, transactionId: entityId, message: `O histórico informa exclusão, mas o lançamento ${entityId} ainda existe` });
      continue;
    }
    if (event.action === 'import_reconciliation_summary') continue;
    if (!current) {
      issues.push({ code: 'audited_transaction_missing', eventId: event.id, transactionId: entityId, message: `O histórico referencia o lançamento ${entityId}, mas ele não existe no estado atual` });
      continue;
    }
    if (event.after && !sameRelevantFields(event.after, current)) {
      issues.push({ code: 'snapshot_mismatch', eventId: event.id, transactionId: entityId, message: `O lançamento ${entityId} diverge do snapshot do evento mais recente` });
    } else if (!event.after && ['transaction_created', 'transaction_updated', 'transaction_status_changed', 'invoice_payment_registered', 'balance_adjustment_applied'].includes(event.action)) {
      issues.push({ code: 'missing_after_snapshot', eventId: event.id, transactionId: entityId, message: `O evento ${event.id} não possui snapshot posterior` });
    }
  }

  const ledger = auditLedger(accounts, txs, { virtualAccountIds });
  for (const issue of ledger.issues) issues.push({ code: 'ledger_issue', transactionId: issue.transactionId, message: `Livro-razão: ${issue.reason}` });

  return {
    ok: issues.length === 0,
    issues,
    checkedEvents: events.length,
    validEvents,
    checkedTransactions: txs.length,
    checkedAccounts: Array.isArray(accounts) ? accounts.length : 0,
    legacyTransactionsWithoutAudit: txs.filter(tx => tx?.id && !latestByEntity.has(tx.id)).length,
    limitations: [
      'Verificações estruturais e cruzamento de snapshots não constituem prova criptográfica de autenticidade.',
      'O histórico começa a ser preenchido a partir da versão que registra eventos; lançamentos antigos podem não ter trilha retroativa.',
      'A integridade do log local não pode ser garantida contra alguém que altere os dados persistidos diretamente.'
    ]
  };
}
