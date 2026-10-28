export const CURRENT_SCHEMA_VERSION = 3;

export function migrateData(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      accounts: [],
      transactions: [],
      recurring: [],
      cards: [],
      budgets: {},
      goals: []
    };
  }

  const version = raw.schemaVersion || 1;
  let data = JSON.parse(JSON.stringify(raw));

  if (version === 1) {
    if (Array.isArray(data.transactions)) {
      data.transactions = data.transactions.map(t => ({
        ...t,
        amount: Number.isInteger(t.amount) ? t.amount : Math.round((t.amount || 0) * 100),
        status: t.status === "pendente" ? "pendente" : "pago"
      }));
    }
    data.schemaVersion = 2;
  }

  if (data.schemaVersion === 2) {
    data.schemaVersion = 3;
  }

  return data;
}
