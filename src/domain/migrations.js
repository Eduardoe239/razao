/**
 * Versionamento canônico do estado financeiro persistido.
 *
 * v1: `transaction.amount` representa unidade monetária (BRL); migra para cents.
 * v2: `amountCents` é preferido; o campo legado `amount` inteiro representa
 *     cents, enquanto `amount` fracionário representa BRL (compatibilidade com
 *     a regra histórica já publicada no migrador anterior).
 * v3: transações já devem possuir `amountCents`; campos ausentes/ambíguos são
 *     recusados em vez de inferidos.
 * v4: estado corrente da aplicação (`version` e `schemaVersion` = 4).
 *
 * Este módulo só transforma o formato. A validação estrutural/semântica precisa
 * ocorrer depois da migração e antes de sanitizeState ou da persistência.
 */
export const CURRENT_SCHEMA_VERSION = 4;

const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function emptyState() {
  return {
    version: CURRENT_SCHEMA_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    accounts: [],
    transactions: [],
    cards: [],
    recurring: [],
    auditLog: [],
    budgets: {},
    settings: {}
  };
}

function resolveSourceVersion(raw, declaredSchemaVersion) {
  const candidates = [declaredSchemaVersion, raw.schemaVersion, raw.version]
    .filter(value => value !== undefined && value !== null);
  if (!candidates.length) {
    const hasCurrentShape = Array.isArray(raw.accounts)
      && Array.isArray(raw.transactions)
      && raw.transactions.every(tx => isRecord(tx) && Number.isSafeInteger(tx.amountCents) && tx.amountCents >= 0);
    if (hasCurrentShape || Object.keys(raw).length === 0) return CURRENT_SCHEMA_VERSION;
    return 1;
  }
  const normalized = candidates;
  if (normalized.some(value => !Number.isInteger(value) || value < 1 || value > CURRENT_SCHEMA_VERSION)) {
    throw new Error(`Versão de schema não suportada. Versões aceitas: 1 a ${CURRENT_SCHEMA_VERSION}.`);
  }
  if (new Set(normalized).size > 1) {
    throw new Error(`Versão de schema inconsistente entre envelope e estado: ${normalized.join(', ')}.`);
  }
  return normalized[0];
}

function convertLegacyAmount(transaction, sourceVersion, index) {
  const label = `Lançamento legado ${index + 1}`;
  if (hasOwn(transaction, 'amountCents')) {
    if (!Number.isSafeInteger(transaction.amountCents) || transaction.amountCents < 0) {
      throw new Error(`${label} possui amountCents inválido; a migração foi interrompida para evitar alteração financeira.`);
    }
    return transaction.amountCents;
  }
  if (!hasOwn(transaction, 'amount') || typeof transaction.amount !== 'number'
      || !Number.isFinite(transaction.amount) || transaction.amount < 0) {
    throw new Error(`${label} não possui um valor monetário migrável; a migração foi interrompida.`);
  }

  let cents;
  if (sourceVersion === 1) {
    // O contrato v1 é explícito: `amount` era valor em BRL, inclusive inteiros.
    const calculatedCents = transaction.amount * 100;
    cents = Math.round(calculatedCents);
    if (Math.abs(calculatedCents - cents) > 1e-6) {
      throw new Error(`${label} possui mais precisão que centavos em schema v1; a migração foi interrompida sem arredondar dinheiro.`);
    }
  } else if (sourceVersion === 2) {
    // Preserva a semântica do migrador v2 existente para dados já publicados.
    if (Number.isInteger(transaction.amount)) cents = transaction.amount;
    else {
      const calculatedCents = transaction.amount * 100;
      cents = Math.round(calculatedCents);
      if (Math.abs(calculatedCents - cents) > 1e-6) {
        throw new Error(`${label} possui mais precisão que centavos em schema v2; a migração foi interrompida sem arredondar dinheiro.`);
      }
    }
  } else {
    throw new Error(`${label} pertence ao schema v${sourceVersion}, que exige amountCents explícito.`);
  }
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error(`${label} excede o intervalo seguro de centavos; a migração foi interrompida.`);
  }
  return cents;
}

function migrateTransactions(data, sourceVersion) {
  if (data.transactions === undefined) return;
  if (!Array.isArray(data.transactions)) {
    throw new Error('A lista de lançamentos é inválida; migração interrompida sem alterar dados.');
  }
  data.transactions = data.transactions.map((transaction, index) => {
    if (!isRecord(transaction)) {
      throw new Error(`Lançamento legado ${index + 1} não é um objeto válido; migração interrompida.`);
    }
    const amountCents = convertLegacyAmount(transaction, sourceVersion, index);
    const { amount: legacyAmount, ...preservedFields } = transaction;
    return { ...preservedFields, amountCents };
  });
}

/**
 * Migra estado/envelope legado para schema 4 sem sanitizar nem descartar linhas.
 * Lança erro para schema desconhecido, versão conflitante ou valor ambíguo.
 */
export function migrateData(raw, declaredSchemaVersion) {
  if (raw === null || raw === undefined) return emptyState();
  if (!isRecord(raw)) throw new Error('O estado a migrar precisa ser um objeto JSON.');
  if (Object.keys(raw).length === 0) return emptyState();

  const data = JSON.parse(JSON.stringify(raw));
  let version = resolveSourceVersion(data, declaredSchemaVersion);
  // Se o envelope informa versão explicitamente e o objeto tem sua própria
  // versão, resolveSourceVersion detecta e rejeita qualquer divergência.
  while (version < CURRENT_SCHEMA_VERSION) {
    migrateTransactions(data, version);
    version += 1;
    data.schemaVersion = version;
    data.version = version;
  }

  if (version === CURRENT_SCHEMA_VERSION && Array.isArray(data.transactions)) {
    data.transactions = data.transactions.map((transaction, index) => {
      if (!isRecord(transaction)) {
        throw new Error(`Lançamento ${index + 1} não é um objeto válido no schema atual.`);
      }
      // Schema atual não permite inferir unidades a partir de `amount`.
      if (!Number.isSafeInteger(transaction.amountCents) || transaction.amountCents < 0) {
        throw new Error(`Lançamento ${index + 1} não possui amountCents inteiro e não negativo no schema atual.`);
      }
      const { amount: legacyAmount, ...preservedFields } = transaction;
      return { ...preservedFields, amountCents: transaction.amountCents };
    });
  }

  data.version = CURRENT_SCHEMA_VERSION;
  data.schemaVersion = CURRENT_SCHEMA_VERSION;
  return data;
}
