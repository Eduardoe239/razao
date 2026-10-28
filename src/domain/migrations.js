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
      data.transactions = data.transactions.map(t => {
        const val = t.amountCents || t.amount || 0;
        const cents = Number.isInteger(val) && val >= 100 ? val : Math.round(val * 100);
        return {
          ...t,
          amountCents: cents,
          amount: cents,
          status: t.status === "pendente" ? "pendente" : "pago"
        };
      });
    }
    data.schemaVersion = 2;
  }

  if (data.schemaVersion === 2) {
    if (Array.isArray(data.transactions)) {
      data.transactions = data.transactions.map(t => ({
        ...t,
        amountCents: t.amountCents || (Number.isInteger(t.amount) ? t.amount : Math.round((t.amount || 0) * 100))
      }));
    }
    data.schemaVersion = 3;
  }

  return data;
}
