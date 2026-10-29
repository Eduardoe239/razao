import { migrateData, CURRENT_SCHEMA_VERSION } from "./migrations.js";

export function runMigrationsTests(assert) {
  const legacyV1 = {
    schemaVersion: 1,
    transactions: [
      { id: "1", amount: 50.5, status: "pago" }
    ]
  };

  const migrated = migrateData(legacyV1);
  assert.strictEqual(migrated.schemaVersion, CURRENT_SCHEMA_VERSION, "Deve migrar a versão do schema para a versão atual");
  assert.strictEqual(migrated.transactions[0].amountCents, 5050, "Deve converter 50.50 BRL para 5050 centavos na migração");
  assert.strictEqual(migrated.version, CURRENT_SCHEMA_VERSION, "Deve atualizar a versão interna para o schema atual");
}
