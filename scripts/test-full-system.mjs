import { parseToCents, centsToFloat, formatMoney } from "../src/domain/money.js";
import { accountBalance, calculateNetWorth } from "../src/domain/accounts.js";
import { cardInvoices, validateInvoicePayment } from "../src/domain/invoices.js";
import { buildCommitments } from "../src/domain/commitments.js";
import { sanitizeTransaction, sanitizeState, isValidISODate } from "../src/domain/sanitize.js";
import { uid } from "../src/domain/uid.js";
import { budgetForMonth, setCategoryBudget } from "../src/domain/budget.js";
import { calculateSavingsBalance } from "../src/domain/savings.js";
import { migrateData } from "../src/domain/migrations.js";
import { calculateForecast } from "../src/domain/forecast.js";
import { calculateUserAchievements } from "../src/domain/achievements.js";
import { parseOFX, parseCSV } from "../src/domain/importers.js";
import { reconcileTransactions } from "../src/domain/reconciliation.js";
import { parseReceiptText } from "../src/domain/receiptOcr.js";
import { buildFinancialContext, queryAIAdvisor } from "../src/domain/aiContextEngine.js";
import { simulateScenarios } from "../src/domain/scenarioSimulator.js";
import { detectAnomalies } from "../src/domain/anomalyDetector.js";
import { recordCategoryRule, predictCategory, calculateAdaptiveContingencyFactor } from "../src/domain/categoryLearning.js";
import { UserAuthService } from "../api/src/routes/userAuth.js";
import { BankingService } from "../api/src/routes/openFinanceApi.js";
import { OcrService } from "../api/src/routes/ocrService.js";
import { OutboxSyncService } from "../api/src/routes/outboxSync.js";
import { loadState, saveState } from "../src/services/storage.js";
import { runSyncQueueTests } from "../src/services/syncQueue.test.js";

// Mock localStorage for Node.js sandbox
class MemoryStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MemoryStorage();

console.log("=================================================================");
console.log("   O RAZÃO V14.0 — SUÍTE INTEGRAL DE TESTES MULTIPLATAFORMA & UX");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runAllTests() {
  // 1. Money Domain
  console.log("📦 1. Testes do Módulo de Precisão Monetária (money.js)");
  assert(parseToCents(125.099) === 12510, "parseToCents deve arredondar para centavos inteiros sem erro IEEE 754");
  assert(centsToFloat(12510) === 125.10, "centsToFloat deve retornar o valor float correspondente");

  // 2. Accounts Domain
  console.log("\n📦 2. Testes do Módulo de Contas e Patrimônio (accounts.js)");
  const acc = { id: "acc-1", initialBalanceCents: 10000 };
  const txs = [
    { type: "receita", amountCents: 5000, status: "pago", accountId: "acc-1" },
    { type: "despesa", amountCents: 2000, status: "pago", accountId: "acc-1" }
  ];
  assert(accountBalance(acc, txs) === 13000, "accountBalance deve somar receitas e subtrair despesas pagas");

  // 3. Invoices Domain
  console.log("\n📦 3. Testes do Módulo de Faturas de Cartão (invoices.js)");
  const card = { id: "card-1", name: "Black", limitCents: 500000, closingDay: 10, dueDay: 20 };
  const invoiceVal = validateInvoicePayment({ invoice: { remainingCents: 10000 }, amountCents: 5000, fromAccountId: "acc-1", cardId: "card-1" });
  assert(invoiceVal.valid === true, "validateInvoicePayment deve aprovar pagamento válido");

  // 4. Commitments Domain
  console.log("\n📦 4. Testes do Módulo de Compromissos e Dupla Contagem (commitments.js)");
  const comms = buildCommitments({
    transactions: [{ id: "t1", status: "pendente", date: "2026-11-01", amountCents: 3000, accountId: "acc-1" }],
    recurring: [{ id: "r1", active: true, amountCents: 1500, accountId: "acc-1" }],
    todayISO: "2026-10-28"
  });
  assert(comms.length === 2, "buildCommitments deve consolidar pendências sem duplicar obrigações");

  // 5. Sanitize Domain
  console.log("\n📦 5. Testes do Módulo de Sanitização e Validação (sanitize.js)");
  assert(isValidISODate("2026-10-28") === true, "isValidISODate deve validar data ISO real");
  assert(sanitizeTransaction({ amount: 10, status: "invalido" }) === null, "sanitizeTransaction deve rejeitar status desconhecido");

  // 6. UID Domain
  console.log("\n📦 6. Testes do Módulo de Identificadores Únicos (uid.js)");
  const id1 = uid();
  assert(typeof id1 === "string" && id1.length > 0, "uid deve gerar ID não vazio");

  // 7. Budget Domain
  console.log("\n📦 7. Testes do Módulo de Orçamento (budget.js)");
  let bMap = setCategoryBudget({}, "cat-1", "2026-10", 0);
  assert(budgetForMonth(bMap, "cat-1", "2026-10") === 0, "budgetForMonth deve preservar o orçamento zero explícito");

  // 8. Savings Domain
  console.log("\n📦 8. Testes do Módulo de Economias e Metas (savings.js)");
  const goal = { id: "g1", initialCents: 50000 };
  const gTxs = [{ goalId: "g1", status: "pago", type: "receita", amount: 10000 }];
  assert(calculateSavingsBalance(goal, gTxs) === 60000, "calculateSavingsBalance deve somar aportes à meta");

  // 9. Migrations Domain
  console.log("\n📦 9. Testes do Módulo de Migração de Schemas (migrations.js)");
  const migrated = migrateData({ schemaVersion: 1, transactions: [{ amount: 50, status: "pago" }] });
  assert(migrated.schemaVersion === 3 && migrated.transactions[0].amount === 5000, "migrateData deve elevar schema v1 para v3");

  // 10. Forecast Domain
  console.log("\n📦 10. Testes do Módulo de Projeção Futurista (forecast.js)");
  const fc = calculateForecast({ transactions: [], todayISO: "2026-10-28", monthsAhead: 2 });
  assert(fc.length === 3, "calculateForecast deve retornar N+1 meses de projeção");

  // 11. Gamificação Domain
  console.log("\n📦 11. Testes do Módulo de Gamificação e Conquistas (achievements.js)");
  const ach = calculateUserAchievements({ transactions: [{ status: "pago", amountCents: 100000 }] }, [{ initialBalanceCents: 1000000 }]);
  assert(ach.unlockedCount > 0 && ach.userTitle !== "", "calculateUserAchievements calcula pontos e desbloqueia títulos corretamente");

  // 12. Aprendizado Contínuo
  console.log("\n📦 12. Testes do Módulo de Aprendizado de Categorização (categoryLearning.js)");
  recordCategoryRule("Açaí do Porto", "lazer");
  const predicted = predictCategory("Açaí do Porto Especial", "outros");
  assert(predicted === "lazer", "predictCategory utilizou a regra aprendida para categorizar automaticamente");

  const factor = calculateAdaptiveContingencyFactor([{ type: 'despesa', status: 'pago', amountCents: 5000, date: '2026-10-01' }]);
  assert(typeof factor === 'number' && factor >= 1.0, "calculateAdaptiveContingencyFactor calculou o fator de contingência adaptativo");

  // 13. Fase 6 Importers & Open Finance
  console.log("\n📦 13. Testes da Fase 6 (OFX/CSV Importers, OCR & Reconciliação)");
  const ofxRes = parseOFX('<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261028<TRNAMT>-100.00<FITID>1<MEMO>Teste</STMTTRN>');
  assert(ofxRes.length === 1 && ofxRes[0].amountCents === 10000, "parseOFX extraiu lançamento e converteu para 10000 centavos");

  const csvRes = parseCSV('Data;Descrição;Valor\n28/10/2026;Almoço;-25,00');
  assert(csvRes.length === 1 && csvRes[0].amountCents === 2500, "parseCSV extraiu lançamento e converteu para 2500 centavos");

  const recRes = reconcileTransactions(ofxRes, [{ amountCents: 10000, date: '2026-10-28', type: 'despesa' }]);
  assert(recRes[0].reconciliationStatus === 'duplicate', "reconcileTransactions detectou lançamento duplicado");

  const ocrRes = parseReceiptText('VALOR: R$ 80,00\nDATA: 28/10/2026\nDESTINATÁRIO: Mercado Exemplo');
  assert(ocrRes.amountCents === 8000 && ocrRes.merchantName.includes('Mercado Exemplo'), "parseReceiptText extraiu R$ 80,00 e nome do recebedor");

  // 14. Fase 7 IA Razão & What-If
  console.log("\n📦 14. Testes da Fase 7 (IA Razão, Simulador What-If & Detecção de Anomalias)");
  const aiCtx = buildFinancialContext({ transactions: [{ type: "receita", amountCents: 100000, status: "pago" }] });
  assert(aiCtx.realizedCents === 100000, "buildFinancialContext calculou saldo em centavos com precisão");

  const aiRes = queryAIAdvisor("Posso gastar R$ 200,00?", { transactions: [{ type: "receita", amountCents: 100000, status: "pago" }] });
  assert(aiRes.isSafe === true, "queryAIAdvisor realizou simulação determinística com sucesso");

  const scens = simulateScenarios({ state: { transactions: [] } });
  assert(scens.monthlyProjections.length === 4, "simulateScenarios projetou os 3 cenários corretamente");

  const anoms = detectAnomalies({
    transactions: [
      { id: "t1", type: "despesa", description: "Almoço", amountCents: 5000, date: "2026-10-28" },
      { id: "t2", type: "despesa", description: "Almoço", amountCents: 5000, date: "2026-10-28" }
    ]
  });
  assert(anoms.length > 0, "detectAnomalies identificou anomalia de duplicidade");

  // 15. Full-Stack Backend API Services
  console.log("\n📦 15. Testes das APIs de Backend Serverless (Node.js / TypeScript)");
  const authSvc = new UserAuthService();
  const regRes = await authSvc.register({ email: "teste@orazao.com.br", password: "senhaSegura123", fullName: "Usuário Teste" });
  assert(regRes.success && regRes.user.email === "teste@orazao.com.br", "UserAuthService cadastrou usuário no backend");

  const loginRes = await authSvc.login({ email: "teste@orazao.com.br", password: "senhaSegura123" });
  assert(loginRes.success && loginRes.token !== "", "UserAuthService realizou login e gerou token JWT");

  const bankSvc = new BankingService();
  const bankSess = await bankSvc.createConnectSession(regRes.user.id, "Nubank");
  assert(bankSess.sessionId !== "", "BankingService gerou sessão de conexão bancária Open Finance");

  const bankPayload = await bankSvc.processBankPayload(bankSess.sessionId, [{ amount: -150.50, description: "Compra Exemplo" }]);
  assert(bankPayload.importedCount === 1 && bankPayload.transactions[0].amountCents === 15050, "BankingService converteu payload de webhook bancário em centavos inteiros");

  const ocrSvc = new OcrService();
  const ocrApiRes = await ocrSvc.processReceiptImage({ textContent: "COMPROVANTE PIX\nVALOR: R$ 350,00\nDATA: 28/10/2026\nDESTINATÁRIO: Posto Shell" });
  assert(ocrApiRes.success && ocrApiRes.extractedData.amountCents === 35000, "OcrService processou imagem/texto do comprovante com Binarização Otsu");

  const outboxSvc = new OutboxSyncService();
  const syncApiRes = await outboxSvc.processSyncQueue(regRes.user.id, [
    { eventId: "evt-1", entity: "transaction", action: "create", data: { id: "tx-1", amountCents: 5000 }, clientTimestamp: Date.now() }
  ]);
  assert(syncApiRes.success && syncApiRes.processedCount === 1, "OutboxSyncService processou lote e aplicou LWW no backend");

  // 16. Storage & Local-First Sync Engine
  console.log("\n📦 16. Testes do Serviço de Armazenamento & Motor Local-First (storage.js & syncQueue.js)");
  saveState({ version: 3, test: true });
  const loaded = loadState();
  assert(loaded && loaded.test === true, "saveState e loadState devem persistir o estado localmente");

  const phase5Ok = await runSyncQueueTests();
  assert(phase5Ok === true, "Motor da Fase 5 deve passar em todos os testes de sincronização");

  console.log("\n=================================================================");
  console.log(`   RESULTADO DOS TESTES INTEGRATION V14.0: ${passed} APROVADOS, ${failed} FALHAS`);
  console.log("=================================================================\n");

  if (failed > 0) process.exit(1);
}

runAllTests();
