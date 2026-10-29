import assert from "node:assert";
import { runMoneyTests } from "../src/domain/money.test.js";
import { runAccountsTests } from "../src/domain/accounts.test.js";
import { runInvoicesTests } from "../src/domain/invoices.test.js";
import { runCommitmentsTests } from "../src/domain/commitments.test.js";
import { runSanitizeTests } from "../src/domain/sanitize.test.js";
import { runUIDTests } from "../src/domain/uid.test.js";
import { runBudgetTests } from "../src/domain/budget.test.js";
import { runSavingsTests } from "../src/domain/savings.test.js";
import { runMigrationsTests } from "../src/domain/migrations.test.js";
import { runForecastTests } from "../src/domain/forecast.test.js";

const suites = [
  { name: "Money Domain", fn: runMoneyTests },
  { name: "Accounts Domain", fn: runAccountsTests },
  { name: "Invoices Domain", fn: runInvoicesTests },
  { name: "Commitments Domain", fn: runCommitmentsTests },
  { name: "Sanitize Domain", fn: runSanitizeTests },
  { name: "UID Domain", fn: runUIDTests },
  { name: "Budget Domain", fn: runBudgetTests },
  { name: "Savings Domain", fn: runSavingsTests },
  { name: "Migrations Domain", fn: runMigrationsTests },
  { name: "Forecast Domain", fn: runForecastTests }
];

let totalPassed = 0;
let totalFailed = 0;

console.log("==========================================");
console.log("   O RAZÃO V3 - SUÍTE COMPLETA DE TESTES  ");
console.log("==========================================\n");

for (const suite of suites) {
  try {
    suite.fn(assert);
    console.log(`✅ [PASS] ${suite.name}`);
    totalPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${suite.name}:`, err.message);
    totalFailed++;
  }
}

console.log("\n------------------------------------------");
console.log(`RESULTADO FINAL: ${totalPassed} aprovados, ${totalFailed} falhas`);
console.log("------------------------------------------\n");

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
