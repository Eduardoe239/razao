/**
 * Migração local de entidades legadas para escopo PF/PJ.
 *
 * Registros financeiros antigos sem profileType são PF por compatibilidade.
 * Toda referência a conta, categoria ou cartão deve apontar para uma entidade
 * do mesmo perfil. Se um registro contradizer um perfil explícito da entidade,
 * clona-se a entidade para o perfil do registro e reescreve-se a referência;
 * assim o histórico é preservado sem compartilhar a entidade entre perfis.
 * O migrador é idempotente: referências já separadas não geram clones novos.
 */
const COLLECTIONS = [
  { key: 'accounts', fields: ['accountId', 'toAccountId', 'targetAccountId'] },
  { key: 'categories', fields: ['categoryId'] },
  { key: 'cards', fields: ['linkedCardId'] }
];

const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const normalizedProfile = item => item?.profileType === 'PJ' ? 'PJ' : 'PF';

function makeScopedId(id, profileType, usedIds) {
  const base = `${id}__${profileType}`;
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) candidate = `${base}_${suffix++}`;
  usedIds.add(candidate);
  return candidate;
}

function cardInvoiceReference(item) {
  // Pagamento de fatura usa toAccountId como ID do cartão, mesmo quando já
  // possui linkedCardId. Esse campo nunca deve ser migrado como conta.
  return item?.type === 'transferencia' && typeof item?.linkedInvoiceKey === 'string'
    ? 'toAccountId'
    : null;
}

function referenceFields(collection, item) {
  let fields = [...collection.fields];
  if (collection.key === 'accounts' && item?.type === 'transferencia' && typeof item?.linkedInvoiceKey === 'string') {
    // O destino de uma quitação é um cartão, não uma conta; evitar colisão de IDs
    // entre catálogos que reescreva o destino para a entidade errada.
    fields = fields.filter(field => field !== 'toAccountId');
  }
  if (collection.key === 'cards') {
    const invoiceField = cardInvoiceReference(item);
    if (invoiceField) fields.push(invoiceField);
  }
  return fields;
}

export function migrateProfileScopedEntities(input) {
  if (!isRecord(input)) return input;
  const state = {
    ...input,
    accounts: Array.isArray(input.accounts) ? input.accounts.map(item => isRecord(item) ? ({ ...item }) : item) : [],
    categories: Array.isArray(input.categories) ? input.categories.map(item => isRecord(item) ? ({ ...item }) : item) : [],
    cards: Array.isArray(input.cards) ? input.cards.map(item => isRecord(item) ? ({ ...item }) : item) : [],
    transactions: Array.isArray(input.transactions) ? input.transactions.map(item => isRecord(item) ? ({ ...item }) : item) : [],
    recurring: Array.isArray(input.recurring) ? input.recurring.map(item => isRecord(item) ? ({ ...item }) : item) : []
  };

  for (const collection of COLLECTIONS) {
    const entities = state[collection.key];
    const validEntities = entities.filter(isRecord);
    const byId = new Map(validEntities.filter(entity => typeof entity.id === 'string' && entity.id.trim()).map(entity => [entity.id, entity]));
    const usedIds = new Set(byId.keys());
    const cloneBySourceAndProfile = new Map();

    // Normalize unclassified entities as PF, but never silently re-label an
    // entity with an explicit valid PF/PJ designation.
    for (const entity of validEntities) {
      entity.profileType = normalizedProfile(entity);
    }

    const ensureProfileReference = (record, field) => {
      const sourceId = record?.[field];
      if (typeof sourceId !== 'string' || !sourceId.trim()) return;
      const source = byId.get(sourceId);
      // Unknown references are deliberately not guessed. The state validator
      // will reject them before persistence, showing a recoverable startup error.
      if (!source) return;
      const targetProfile = normalizedProfile(record);
      if (source.profileType === targetProfile) return;

      const mapKey = `${sourceId}\u0000${targetProfile}`;
      let target = cloneBySourceAndProfile.get(mapKey);
      if (!target) {
        target = validEntities.find(entity => entity?.migratedFromId === sourceId && entity.profileType === targetProfile);
      }
      if (!target) {
        const cloneId = makeScopedId(sourceId, targetProfile, usedIds);
        target = { ...source, id: cloneId, profileType: targetProfile, migratedFromId: sourceId };
        entities.push(target);
        validEntities.push(target);
        byId.set(cloneId, target);
      }
      cloneBySourceAndProfile.set(mapKey, target);
      record[field] = target.id;
    };

    // Accounts are processed before cards. An ordinary transfer's toAccountId
    // always refers to an account; legacy invoice payments referring to a card
    // are handled only in the cards pass below.
    for (const record of [...state.transactions, ...state.recurring]) {
      if (!isRecord(record)) continue;
      for (const field of referenceFields(collection, record)) {
        ensureProfileReference(record, field);
      }
    }
  }

  // Tag every legacy financial record PF only after the original references
  // have been separated. Explicit PJ records remain PJ.
  state.transactions = state.transactions.map(item => isRecord(item) ? ({ ...item, profileType: normalizedProfile(item) }) : item);
  state.recurring = state.recurring.map(item => isRecord(item) ? ({ ...item, profileType: normalizedProfile(item) }) : item);
  return state;
}

export function entitiesForProfile(entities, profileType = 'PF') {
  return (Array.isArray(entities) ? entities : []).filter(item => item?.profileType === profileType);
}
