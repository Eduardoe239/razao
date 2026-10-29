import { uid } from './uid.js';

export const AUDIT_ACTIONS = new Set([
  'transaction_created', 'transaction_updated', 'transaction_deleted',
  'transaction_status_changed', 'invoice_payment_registered',
  'balance_adjustment_applied', 'import_reconciliation_summary', 'backup_restored',
  'recurring_rule_created', 'recurring_rule_toggled', 'recurring_rule_deleted',
  'budget_limit_set', 'budget_limit_removed'
]);

const SNAPSHOT_FIELDS = [
  'id', 'description', 'amountCents', 'type', 'status', 'date', 'accountId',
  'toAccountId', 'categoryId', 'profileType', 'source', 'linkedInvoiceKey',
  'linkedCardId', 'idempotencyKey', 'importedId', 'reconciliationKey', 'recurringId', 'recurringOccurrenceDate',
  'dayOfMonth', 'startDate', 'endDate', 'active', 'monthKey'
];

export function auditSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const snapshot = {};
  for (const field of SNAPSHOT_FIELDS) {
    if (value[field] !== undefined && ['string', 'number', 'boolean'].includes(typeof value[field])) {
      snapshot[field] = value[field];
    }
  }
  return Object.keys(snapshot).length ? snapshot : null;
}

export function createAuditEvent({
  eventId = uid(), timestamp = new Date().toISOString(), action,
  entityType = 'transaction', entityId = null, profileType = 'PF',
  before = null, after = null, metadata = {}
} = {}) {
  const safeMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? Object.fromEntries(Object.entries(metadata).filter(([key, value]) =>
      /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key) && ['string', 'number', 'boolean'].includes(typeof value)
    ).map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 200) : value]).slice(0, 20))
    : {};
  return {
    id: eventId,
    timestamp,
    action,
    entityType,
    entityId: typeof entityId === 'string' ? entityId.slice(0, 160) : null,
    profileType: profileType === 'PJ' ? 'PJ' : 'PF',
    before: auditSnapshot(before),
    after: auditSnapshot(after),
    metadata: safeMetadata
  };
}

export function appendAuditEvent(auditLog, event) {
  const current = Array.isArray(auditLog) ? auditLog : [];
  // Keep duplicates for the integrity checker to identify; never silently rewrite evidence.
  return [...current, event].slice(-500);
}

/**
 * Retorna apenas eventos explicitamente associados ao perfil solicitado.
 * Eventos sem perfil são ambíguos e nunca devem vazar entre PF e PJ; quem
 * consome a trilha pode exibir apenas uma contagem de registros não classificados.
 */
export function auditEventsForProfile(auditLog, profileType = 'PF') {
  if (!['PF', 'PJ'].includes(profileType)) return [];
  return (Array.isArray(auditLog) ? auditLog : []).filter(event => event && event.profileType === profileType);
}

export function countUnclassifiedAuditEvents(auditLog) {
  return (Array.isArray(auditLog) ? auditLog : []).filter(event => !event || !['PF', 'PJ'].includes(event.profileType)).length;
}

export function sanitizeAuditLog(auditLog) {
  if (!Array.isArray(auditLog)) return [];
  // Keep basic malformed/duplicate records visible to the audit checker instead of
  // silently discarding evidence. UI uses defensive rendering for untrusted fields.
  return auditLog.filter(event => event && typeof event === 'object' && !Array.isArray(event)).slice(-500).map(event => ({
    ...event,
    id: typeof event.id === 'string' ? event.id.slice(0, 160) : event.id,
    timestamp: typeof event.timestamp === 'string' ? event.timestamp.slice(0, 80) : event.timestamp,
    action: typeof event.action === 'string' ? event.action.slice(0, 80) : event.action,
    entityType: typeof event.entityType === 'string' ? event.entityType.slice(0, 80) : event.entityType,
    entityId: typeof event.entityId === 'string' ? event.entityId.slice(0, 160) : event.entityId,
    profileType: event.profileType === 'PJ' ? 'PJ' : event.profileType === 'PF' ? 'PF' : event.profileType,
    before: auditSnapshot(event.before),
    after: auditSnapshot(event.after),
    metadata: event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
      ? Object.fromEntries(Object.entries(event.metadata).slice(0, 20).map(([key, value]) => [String(key).slice(0, 40), typeof value === 'string' ? value.slice(0, 200) : value]).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value)))
      : {}
  }));
}

export function changedSnapshotFields(before, after) {
  const left = auditSnapshot(before) || {};
  const right = auditSnapshot(after) || {};
  const fields = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...fields].filter(field => JSON.stringify(left[field]) !== JSON.stringify(right[field]));
}
