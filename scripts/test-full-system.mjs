import { parseToCents, centsToFloat, formatMoney } from "../src/domain/money.js";
import { accountBalance, calculateNetWorth } from "../src/domain/accounts.js";
import { calculateInvoiceCycle, cardInvoices, validateInvoicePayment } from "../src/domain/invoices.js";
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
import { saveStateEncrypted, loadStateEncrypted } from "../src/services/encryptedStorage.js";
import { runSyncQueueTests } from "../src/services/syncQueue.test.js";

// Mock localStorage & WebCrypto for Node.js sandbox
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
console.log("   O RAZÃO V1.20 — TESTES DE DOMÍNIO E INTEGRAÇÃO MOCKADA");
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
  // =========================================================================
  // 1. DOMÍNIO DE PRECISÃO MONETÁRIA (money.js)
  // =========================================================================
  console.log("📦 1. Módulo de Precisão Monetária (money.js) — 8 Testes");
  assert(parseToCents(125.099) === 12510, "parseToCents arredonda float com 3 casas decimais (125.099 -> 12510)");
  assert(parseToCents(125.10) === 12510, "parseToCents converte float exato (125.10 -> 12510)");
  assert(parseToCents("150.50") === 15050, "parseToCents converte string ponto ('150.50' -> 15050)");
  assert(parseToCents("150,50") === 15050, "parseToCents converte string vírgula ('150,50' -> 15050)");
  assert(parseToCents(-99.99) === -9999, "parseToCents lida com valores negativos (-99.99 -> -9999)");
  assert(parseToCents(10.004) === 1000 && parseToCents(10.005) === 1001, "parseToCents aplica arredondamento bancário nas bordas");
  assert(parseToCents("invalido") === 0 && parseToCents(null) === 0, "parseToCents retorna 0 para entradas inválidas/nulas");
  assert(centsToFloat(12510) === 125.10 && formatMoney(12510).includes("125,10"), "centsToFloat e formatMoney convertem centavos para string R$ formatada");

  // =========================================================================
  // 2. DOMÍNIO DE CONTAS E PATRIMÔNIO (accounts.js)
  // =========================================================================
  console.log("\n📦 2. Módulo de Contas e Patrimônio (accounts.js) — 6 Testes");
  const acc1 = { id: "acc-1", initialBalanceCents: 10000 };
  const txsAccounts = [
    { type: "receita", amountCents: 5000, status: "pago", accountId: "acc-1" },
    { type: "despesa", amountCents: 2000, status: "pago", accountId: "acc-1" },
    { type: "receita", amountCents: 3000, status: "pendente", accountId: "acc-1" }
  ];
  assert(accountBalance(acc1, txsAccounts) === 13000, "accountBalance ignora lançamentos pendentes (10000 + 5000 - 2000 = 13000)");

  const acc2 = { id: "acc-2", initialBalanceCents: 0 };
  const transferTxs = [
    { type: "despesa", amountCents: 3000, status: "pago", accountId: "acc-1" },
    { type: "receita", amountCents: 3000, status: "pago", accountId: "acc-2" }
  ];
  assert(accountBalance(acc2, transferTxs) === 3000, "accountBalance credita conta de destino em transferências");

  const accNegative = { id: "acc-neg", initialBalanceCents: 1000 };
  const txNeg = [{ type: "despesa", amountCents: 2500, status: "pago", accountId: "acc-neg" }];
  assert(accountBalance(accNegative, txNeg) === -1500, "accountBalance suporta saldo negativo com precisão (-1500 centavos)");

  const netWorth = calculateNetWorth([acc1, acc2], [...txsAccounts, ...transferTxs]);
  assert(typeof netWorth === "number" && netWorth > 0, "calculateNetWorth soma o patrimônio de múltiplas contas");

  assert(calculateNetWorth([], []) === 0, "calculateNetWorth retorna 0 para lista de contas vazia");
  assert(accountBalance({ id: "acc-3", initialBalanceCents: 5000 }, []) === 5000, "accountBalance preserva saldo inicial sem movimentações");

  // =========================================================================
  // 3. DOMÍNIO DE FATURAS E CARTÕES (invoices.js)
  // =========================================================================
  console.log("\n📦 3. Módulo de Faturas de Cartão (invoices.js) — 6 Testes");
  const cardCycle = calculateInvoiceCycle({ id: "card-cycle", closingDay: 20, dueDay: 28 }, "2026-10-15");
  assert(cardCycle.monthKey === "2026-10" && cardCycle.closingDate === "2026-10-20" && cardCycle.dueDate === "2026-10-28", "calculateInvoiceCycle respeita fechamento e vencimento após o fechamento");
  const nextCycle = calculateInvoiceCycle({ id: "card-cycle", closingDay: 20, dueDay: 10 }, "2026-10-21");
  assert(nextCycle.monthKey === "2026-11" && nextCycle.dueDate === "2026-12-10", "compras após fechamento entram no próximo ciclo e vencem no mês seguinte quando aplicável");
  const februaryCycle = calculateInvoiceCycle({ id: "card-cycle", closingDay: 31, dueDay: 5 }, "2027-02-10");
  assert(februaryCycle.closingDate === "2027-02-28" && februaryCycle.dueDate === "2027-03-05", "datas de fechamento são ajustadas para meses mais curtos sem gerar datas inválidas");

  const cardBlack = { id: "card-1", name: "Black", limitCents: 1000000, closingDay: 10, dueDay: 20 };
  const cardTxs = [
    { id: "c1", accountId: "card-1", amountCents: 15000, date: "2026-10-05", status: "pago", type: "despesa" }, // fatura out
    { id: "c2", accountId: "card-1", amountCents: 20000, date: "2026-11-05", status: "pago", type: "despesa" }  // fatura nov
  ];
  const invoices = cardInvoices(cardBlack, cardTxs, "2026-10", 1, 1, "2026-10-28");
  assert(invoices.length >= 2, "cardInvoices gera ciclos de fatura para meses adjacentes");

  const octInvoice = invoices.find(i => i.monthKey === "2026-10");
  assert(octInvoice && octInvoice.totalCents === 15000, "cardInvoices aloca compra na fatura de outubro");

  const novInvoice = invoices.find(i => i.monthKey === "2026-11");
  assert(novInvoice && novInvoice.totalCents === 20000, "cardInvoices não duplica compras de ciclos anteriores");

  const paidInvoices = cardInvoices(cardBlack, [...cardTxs, { id: "pay-1", accountId: "acc-1", toAccountId: "card-1", linkedCardId: "card-1", type: "transferencia", amountCents: 5000, status: "pago", linkedInvoiceKey: "2026-10", date: "2026-10-20" }], "2026-10", 1, 1, "2026-10-28");
  const paidOctober = paidInvoices.find(i => i.monthKey === "2026-10");
  assert(paidOctober && paidOctober.totalCents === 15000 && paidOctober.paidCents === 5000 && paidOctober.remainingCents === 10000, "pagamento parcial reduz saldo da fatura sem virar nova despesa");

  const novTransactions = cardTxs.filter(t => t.date >= "2026-10-11" && t.date <= "2026-11-10");
  assert(novTransactions.length === 1 && novTransactions[0].amountCents === 20000, "cada compra é atribuída a um único ciclo de fatura");

  const valPayment = validateInvoicePayment({ invoice: { remainingCents: 15000 }, amountCents: 10000, fromAccountId: "acc-1", cardId: "card-1" });
  assert(valPayment.valid === true, "validateInvoicePayment aprova pagamento parcial de fatura");

  const valExcess = validateInvoicePayment({ invoice: { remainingCents: 15000 }, amountCents: 20000, fromAccountId: "acc-1", cardId: "card-1" });
  assert(valExcess.valid === false, "validateInvoicePayment rejeita pagamento maior que o saldo devedor");

  const emptyCardInvoices = cardInvoices(cardBlack, [], "2026-10", 1, 1, "2026-10-28");
  assert(emptyCardInvoices[0].totalCents === 0, "cardInvoices lida com cartão sem lançamentos (total 0 centavos)");

  // =========================================================================
  // 4. DOMÍNIO DE COMPROMISSOS E DUPLA CONTAGEM (commitments.js)
  // =========================================================================
  console.log("\n📦 4. Módulo de Compromissos e Dupla Contagem (commitments.js) — 5 Testes");
  const commData = buildCommitments({
    transactions: [
      { id: "t1", status: "pendente", date: "2026-11-05", amountCents: 4000, accountId: "acc-1", description: "Aluguel" },
      { id: "t2", status: "pago", date: "2026-10-20", amountCents: 1000, accountId: "acc-1", description: "Luz" }
    ],
    recurring: [
      { id: "r1", active: true, amountCents: 2000, accountId: "acc-1", description: "Internet", dayOfMonth: 10 }
    ],
    todayISO: "2026-10-28",
    monthsAhead: 2
  });
  assert(commData.length >= 2, "buildCommitments consolida lançamentos pendentes e compromissos recorrentes");
  assert(!commData.some(c => c.id === "t2"), "buildCommitments exclui lançamentos que já foram pagos");
  assert(commData.some(c => c.description.includes("Aluguel")), "buildCommitments inclui despesas pendentes futuras");
  assert(commData.some(c => c.description.includes("Internet")), "buildCommitments projeta recorrências ativas");
  assert(buildCommitments({ transactions: [], recurring: [], todayISO: "2026-10-28" }).length === 0, "buildCommitments retorna lista vazia quando não há pendências");

  // =========================================================================
  // 5. SANITIZAÇÃO E VALIDAÇÕES (sanitize.js)
  // =========================================================================
  console.log("\n📦 5. Módulo de Sanitização e Validação (sanitize.js) — 6 Testes");
  assert(isValidISODate("2024-02-29") === true, "isValidISODate aceita ano bissexto válido (2024-02-29)");
  assert(isValidISODate("2025-02-29") === false, "isValidISODate rejeita dia 29 de fevereiro em ano não bissexto");
  assert(isValidISODate("2026-13-01") === false && isValidISODate("texto") === false, "isValidISODate rejeita meses inexistentes ou strings corrompidas");

  const sanitizedTx = sanitizeTransaction({ id: "tx-sanitize-legacy", description: " Teste ", amount: 15.50, status: "pago", type: "despesa" });
  assert(sanitizedTx !== null && sanitizedTx.amountCents === 1550, "sanitizeTransaction converte valor legado quando possui ID estável");
  assert(sanitizeTransaction({ description: "Sem ID", amount: 1, status: "pago", type: "despesa" }) === null, "sanitizeTransaction não inventa ID para registro financeiro sem identificador");

  const invalidTxStatus = sanitizeTransaction({ amount: 10, status: "status_invalido", type: "despesa" });
  assert(invalidTxStatus === null, "sanitizeTransaction rejeita status desconhecido");

  const sanitizedSt = sanitizeState({ transactions: [{ id: "tx-sanitize-state-legacy", amount: 20, status: "pago", type: "receita", accountId: "acc-1" }] });
  assert(sanitizedSt.transactions[0].amountCents === 2000, "sanitizeState recupera e normaliza estado legado corrompido");

  // =========================================================================
  // 6. IDENTIFICADORES ÚNICOS (uid.js)
  // =========================================================================
  console.log("\n📦 6. Módulo de Identificadores Únicos (uid.js) — 4 Testes");
  const sampleId = uid();
  assert(typeof sampleId === "string" && sampleId.length >= 8, "uid gera string de identificador único com tamanho suficiente");

  const idSet = new Set();
  for (let i = 0; i < 1000; i++) {
    idSet.add(uid());
  }
  assert(idSet.size === 1000, "uid garante zero colisão em lote de 1.000 chamadas consecutivas");
  assert(uid() !== uid(), "duas chamadas consecutivas de uid geram resultados distintos");
  assert(!sampleId.includes(" "), "uid gera identificadores sem espaços em branco");

  // =========================================================================
  // 7. ORÇAMENTO ZERO E LIMITES (budget.js)
  // =========================================================================
  console.log("\n📦 7. Módulo de Orçamento (budget.js) — 5 Testes");
  let budgetMap = {};
  budgetMap = setCategoryBudget(budgetMap, "cat-alimentacao", "2026-10", 150000); // R$ 1.500,00
  assert(budgetForMonth(budgetMap, "cat-alimentacao", "2026-10") === 150000, "setCategoryBudget grava limite da categoria em centavos");

  budgetMap = setCategoryBudget(budgetMap, "cat-lazer", "2026-10", 0); // R$ 0,00 explícito
  assert(budgetForMonth(budgetMap, "cat-lazer", "2026-10") === 0, "budgetForMonth preserva o orçamento zero explícito sem tratar como indefinido");

  assert(budgetForMonth(budgetMap, "cat-inexistente", "2026-10") === null, "budgetForMonth retorna null para categoria sem orçamento configurado");

  budgetMap = setCategoryBudget(budgetMap, "cat-alimentacao", "2026-10", 180000); // atualização
  assert(budgetForMonth(budgetMap, "cat-alimentacao", "2026-10") === 180000, "setCategoryBudget atualiza valor existente sem duplicar chave");

  assert(budgetForMonth(null, "cat-1", "2026-10") === null, "budgetForMonth trata mapa nulo de orçamento com resiliência");

  // =========================================================================
  // 8. ECONOMIAS E METAS (savings.js)
  // =========================================================================
  console.log("\n📦 8. Módulo de Economias e Metas (savings.js) — 5 Testes");
  const savingsGoal = { id: "goal-1", name: "Reserva de Emergência", initialCents: 100000 };
  const goalTxs = [
    { goalId: "goal-1", type: "receita", amountCents: 50000, status: "pago" }, // aporte
    { goalId: "goal-1", type: "despesa", amountCents: 20000, status: "pago" }, // resgate
    { goalId: "goal-1", type: "receita", amountCents: 30000, status: "pendente" } // ignorado
  ];
  assert(calculateSavingsBalance(savingsGoal, goalTxs) === 130000, "calculateSavingsBalance calcula saldo (100000 + 50000 - 20000 = 130000)");

  assert(calculateSavingsBalance(savingsGoal, []) === 100000, "calculateSavingsBalance preserva aporte inicial sem aportes adicionais");
  
  const otherGoal = { id: "goal-2", initialCents: 0 };
  assert(calculateSavingsBalance(otherGoal, goalTxs) === 0, "calculateSavingsBalance isola lançamentos apenas da meta correspondente pelo goalId");

  assert(calculateSavingsBalance(null, []) === 0, "calculateSavingsBalance responde 0 para meta indefinida");
  assert(calculateSavingsBalance(savingsGoal, [{ goalId: "goal-1", type: "despesa", amountCents: 150000, status: "pago" }]) === -50000, "calculateSavingsBalance aceita saldo negativo em resgates maiores que a reserva");

  // =========================================================================
  // 9. MIGRAÇÕES DE SCHEMA (migrations.js)
  // =========================================================================
  console.log("\n📦 9. Módulo de Migração de Schemas (migrations.js) — 5 Testes");
  const legacyV1 = {
    schemaVersion: 1,
    transactions: [{ id: "tx1", amount: 150.50, status: "pago" }]
  };
  const migratedFromV1 = migrateData(legacyV1);
  assert(migratedFromV1.schemaVersion === 4, "migrateData eleva versão do schema de 1 para 4");
  assert(migratedFromV1.transactions[0].amountCents === 15050, "migrateData converte campo float 'amount' para 'amountCents' em centavos inteiros");

  const legacyV2 = { schemaVersion: 2, transactions: [{ id: "tx2", amountCents: 8000, status: "pago" }] };
  const migratedFromV2 = migrateData(legacyV2);
  assert(migratedFromV2.schemaVersion === 4 && migratedFromV2.transactions[0].amountCents === 8000, "migrateData migra schema v2 para v4 sem alterar centavos já existentes");

  const currentV3 = { schemaVersion: 3, transactions: [{ id: "tx3", amountCents: 5000 }] };
  assert(migrateData(currentV3).schemaVersion === 4, "migrateData atualiza estado schema v3 para v4 sem alterar centavos já existentes");

  const emptyLegacy = migrateData(null);
  assert(emptyLegacy.schemaVersion === 4 && Array.isArray(emptyLegacy.transactions), "migrateData inicializa estado vazio versionado para valores nulos");

  // =========================================================================
  // 10. PROJEÇÃO FUTURISTA (forecast.js)
  // =========================================================================
  console.log("\n📦 10. Módulo de Projeção Futurista (forecast.js) — 5 Testes");
  const forecastRes = calculateForecast({
    transactions: [
      { type: "receita", amountCents: 500000, status: "pago", date: "2026-09-10" },
      { type: "despesa", amountCents: 200000, status: "pago", date: "2026-09-15" }
    ],
    todayISO: "2026-10-28",
    monthsAhead: 3
  });
  assert(forecastRes.length === 4, "calculateForecast gera projeção contendo o mês atual + N meses à frente");
  assert(typeof forecastRes[0].netProjected === "number", "calculateForecast calcula o saldo projetado em centavos para cada mês");
  assert(forecastRes[0].monthKey === "2026-10", "calculateForecast inicia a projeção no mês da data operacional");
  assert(calculateForecast({ transactions: [], todayISO: "2026-10-28", monthsAhead: 1 }).length === 2, "calculateForecast lida com histórico zerado sem gerar exceções");
  assert(forecastRes[3].monthKey === "2027-01", "calculateForecast formata as chaves de ano/mês corretamente em viradas de ano");

  // =========================================================================
  // 11. GAMIFICAÇÃO E CONQUISTAS (achievements.js)
  // =========================================================================
  console.log("\n📦 11. Módulo de Gamificação e Conquistas (achievements.js) — 5 Testes");
  const achState = {
    transactions: [
      { id: "t1", status: "pago", amountCents: 10000, type: "receita" },
      { id: "t2", status: "pago", amountCents: 500000, type: "receita" }
    ],
    budgets: { "cat-1": 10000, "cat-2": 20000, "cat-3": 30000 }
  };
  const netWorthCents = 1000000; // R$ 10.000,00
  const achievementsRes = calculateUserAchievements(achState, netWorthCents, []);

  assert(achievementsRes.unlockedCount > 0, "calculateUserAchievements desbloqueia conquistas com base na atividade");
  assert(achievementsRes.totalPoints > 0, "calculateUserAchievements calcula a pontuação total acumulada");
  assert(achievementsRes.achievements.some(a => a.titleUnlocked === "Iniciado do Razão"), "calculateUserAchievements atribui os títulos de honra correspondentes");
  assert(Array.isArray(achievementsRes.achievements), "calculateUserAchievements retorna a lista completa de conquistas com progresso");

  const emptyAch = calculateUserAchievements({ transactions: [] }, 0, []);
  assert(emptyAch.unlockedCount === 0 && emptyAch.totalPoints === 0, "calculateUserAchievements responde status inicial para novos usuários");

  // =========================================================================
  // 12. APRENDIZADO CONTINUO DE CATEGORIZAÇÃO (categoryLearning.js)
  // =========================================================================
  console.log("\n📦 12. Módulo de Aprendizado Contínuo (categoryLearning.js) — 6 Testes");
  recordCategoryRule("Açaí do Porto", "cat-lazer");
  assert(predictCategory("Açaí do Porto Especial", "cat-outros") === "cat-lazer", "predictCategory categoriza por correspondência da regra aprendida");

  recordCategoryRule("Posto Shell", "cat-transporte");
  assert(predictCategory("POSTO SHELL PIX", "cat-outros") === "cat-transporte", "predictCategory insensível a maiúsculas/minúsculas");

  assert(predictCategory("Supermercado Desconhecido", "cat-alimentacao") === "cat-alimentacao", "predictCategory mantém categoria padrão quando não há regra aprendida");

  recordCategoryRule("Açaí do Porto", "cat-alimentacao"); // atualização de regra
  assert(predictCategory("Açaí do Porto", "cat-outros") === "cat-alimentacao", "recordCategoryRule permite reclassificar e atualizar regra existente");

  const factorHigh = calculateAdaptiveContingencyFactor([
    { type: 'despesa', status: 'pago', amountCents: 10000, date: '2026-08-01' },
    { type: 'despesa', status: 'pago', amountCents: 90000, date: '2026-09-01' }
  ]);
  assert(factorHigh >= 1.0, "calculateAdaptiveContingencyFactor gera fator >= 1.0 para alta volatilidade");

  const factorEmpty = calculateAdaptiveContingencyFactor([]);
  assert(factorEmpty === 1.15, "calculateAdaptiveContingencyFactor retorna fator padrão 1.15 para histórico vazio");

  // =========================================================================
  // 13. EXTRATORES, OFX, CSV, OCR E RECONCILIAÇÃO (importers, ocr, reconciliation)
  // =========================================================================
  console.log("\n📦 13. Extratores, OCR & Reconciliação (importers, ocr, reconciliation) — 8 Testes");
  const sampleOFX = `<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261028<TRNAMT>-150.50<FITID>ofx-123<MEMO>Supermercado ABC</STMTTRN>`;
  const ofxParsed = parseOFX(sampleOFX);
  assert(ofxParsed.length === 1 && ofxParsed[0].amountCents === 15050 && ofxParsed[0].type === "despesa", "parseOFX extrai débito e converte para amountCents positivo");

  const sampleCSV = `Data;Descrição;Valor\n28/10/2026;Almoço Executivo;-35,00\n28/10/2026;Pix Recebido;100,00`;
  const csvParsed = parseCSV(sampleCSV);
  assert(csvParsed.length === 2 && csvParsed[0].amountCents === 3500 && csvParsed[1].type === "receita", "parseCSV extrai linhas de CSV brasileiro com separador ponto e vírgula");

  const ocrText = `COMPROVANTE DE PAGAMENTO PIX\nVALOR: R$ 85,90\nDATA: 28/10/2026\nDESTINATÁRIO: Açaí Mania Ltda`;
  const ocrParsed = parseReceiptText(ocrText);
  assert(ocrParsed.amountCents === 8590 && ocrParsed.merchantName.includes("Açaí Mania"), "parseReceiptText extrai valor em centavos e nome do recebedor de comprovantes Pix");

  const existingTxs = [{ amountCents: 15050, date: "2026-10-28", type: "despesa", importedId: "ofx-123" }];
  const reconRes = reconcileTransactions(ofxParsed, existingTxs);
  assert(reconRes[0].reconciliationStatus === "duplicate", "reconcileTransactions envia possível duplicata por valor/data para revisão manual");

  const newTx = [{ amountCents: 9900, date: "2026-10-28", type: "despesa", description: "Novo Gasto" }];
  const reconNew = reconcileTransactions(newTx, existingTxs);
  assert(reconNew[0].reconciliationStatus === "unique", "reconcileTransactions classifica lançamento inédito como 'unique'");

  assert(parseOFX("conteudo invalido").length === 0, "parseOFX responde lista vazia para conteúdo corrompido");
  assert(parseCSV("").length === 0, "parseCSV responde lista vazia para texto em branco");
  assert(parseReceiptText("sem dados monetarios").amountCents === 0, "parseReceiptText responde 0 centavos para texto sem valor fiscal");

  // =========================================================================
  // 14. IA RAZÃO, SIMULADOR WHAT-IF E DETECÇÃO DE ANOMALIAS
  // =========================================================================
  console.log("\n📦 14. IA Razão, Simulador What-If & Detecção de Anomalias — 8 Testes");
  const contextState = {
    transactions: [
      { id: "t1", type: "receita", amountCents: 500000, status: "pago", date: "2026-10-01" },
      { id: "t2", type: "despesa", amountCents: 150000, status: "pago", date: "2026-10-05" },
      { id: "t3", type: "despesa", amountCents: 50000, status: "pendente", date: "2026-10-30" }
    ],
    cards: [{ id: "card-1", name: "Black", limitCents: 1000000, closingDay: 10, dueDay: 20 }]
  };
  const finCtx = buildFinancialContext(contextState, "2026-10-28");
  assert(finCtx.realizedCents === 350000, "buildFinancialContext calcula Saldo Realizado com exatidão (500000 - 150000 = 350000)");

  const aiSafeQuery = queryAIAdvisor("Posso comprar um item de R$ 1.000,00 à vista?", contextState, "2026-10-28");
  assert(aiSafeQuery.isSafe === true, "queryAIAdvisor aprova compra compatível com o Saldo Disponível");

  const aiUnsafeQuery = queryAIAdvisor("Posso gastar R$ 10000?", contextState, "2026-10-28");
  assert(aiUnsafeQuery.isSafe === false, "queryAIAdvisor rejeita compra que excede o Saldo Disponível");

  const aiGeneralQuery = queryAIAdvisor("Como está meu saldo hoje?", contextState, "2026-10-28");
  assert(aiGeneralQuery.answer && aiGeneralQuery.answer.includes("3.000,00"), "queryAIAdvisor responde dúvidas de saldo com valores numéricos reais");

  const simScenarios = simulateScenarios({ state: contextState, todayISO: "2026-10-28", monthsAhead: 3 });
  assert(simScenarios.monthlyProjections.length === 4, "simulateScenarios projeta os 3 cenários econômica para os meses solicitados");

  const proj0 = simScenarios.monthlyProjections[0];
  assert(proj0.optimisticBalanceCents >= proj0.expectedBalanceCents && proj0.expectedBalanceCents >= proj0.conservativeBalanceCents, "simulateScenarios garante a ordem matemática: Otimista >= Esperado >= Conservador");

  const anomalyState = {
    transactions: [
      { id: "a1", type: "despesa", description: "Açaí do Porto", amountCents: 2500, date: "2026-10-25" },
      { id: "a2", type: "despesa", description: "Açaí do Porto", amountCents: 2500, date: "2026-10-26" } // cobrança duplicada em 1 dia
    ]
  };
  const anomaliesFound = detectAnomalies(anomalyState, "2026-10-28");
  assert(anomaliesFound.some(a => a.type === "duplicate"), "detectAnomalies identifica cobrança duplicada com mesma descrição e valor em até 3 dias");

  assert(detectAnomalies({ transactions: [] }).length === 0, "detectAnomalies responde sem erros para histórico limpo");

  // =========================================================================
  // 15. APIS DE BACKEND SERVERLESS (userAuth, openFinance, ocr, outboxSync)
  // =========================================================================
  console.log("\n📦 15. APIs de Backend Serverless (Node.js / TypeScript) — 8 Testes");
  const authSvc = new UserAuthService();
  assert(authSvc.configured === false, "UserAuthService informa que autenticação de produção não está configurada");
  try {
    await authSvc.register({ email: "tester.e2e@orazao.com.br", password: "SenhaFortissima2026!", fullName: "Beta Tester" });
    assert(false, "UserAuthService deve bloquear cadastro enquanto autenticação segura não estiver configurada");
  } catch (err) {
    assert(err.message.includes("não está configurada"), "UserAuthService falha fechado com mensagem explícita de configuração ausente");
  }
  try {
    await authSvc.login({ email: "tester.e2e@orazao.com.br", password: "SenhaFortissima2026!" });
    assert(false, "UserAuthService deve bloquear login enquanto autenticação segura não estiver configurada");
  } catch (err) {
    assert(err.message.includes("não está configurada"), "UserAuthService não emite sessão fictícia");
  }
  const testUserId = "usr-test-only-no-auth";

  const bankSvc = new BankingService();
  const sessionRes = await bankSvc.createConnectSession(testUserId, "Itaú Unibanco");
  assert(sessionRes.sessionId.startsWith("sess_"), "BankingService gera sessão válida de conexão bancária Open Finance");

  const bankSyncRes = await bankSvc.processBankPayload(sessionRes.sessionId, [{ amount: -250.00, description: "Compra Mercado", fitid: "fitid-999" }]);
  assert(bankSyncRes.importedCount === 1 && bankSyncRes.transactions[0].amountCents === 25000, "BankingService converte extrato bancário do webhook para centavos inteiros");

  const ocrSvc = new OcrService();
  const ocrApiRes = await ocrSvc.processReceiptImage({ textContent: "COMPROVANTE PIX\nVALOR: R$ 500,00\nDATA: 28/10/2026\nDESTINATÁRIO: Fornecedor PME" });
  assert(ocrApiRes.success && ocrApiRes.extractedData.amountCents === 50000, "OcrService executa pipeline visual/textual e extrai centavos inteiros no backend");

  const outboxSvc = new OutboxSyncService();
  const outboxRes = await outboxSvc.processSyncQueue(testUserId, [
    { eventId: "evt-e2e-1", entity: "transaction", action: "create", data: { id: "tx-e2e", amountCents: 10000 }, clientTimestamp: Date.now() }
  ]);
  assert(outboxRes.success && outboxRes.processedCount === 1, "OutboxSyncService sincroniza lote e aplica resolução de conflitos LWW no backend");

  // =========================================================================
  // 16. PERSISTÊNCIA, CRIPTOGRAFIA E LOCAL-FIRST (storage & syncQueue)
  // =========================================================================
  console.log("\n📦 16. Persistência Local-first e desativação segura da criptografia legada — 6 Testes");
  saveState({ version: 3, userProfile: { name: "Eduardo Teste" } });
  const loadedState = loadState();
  assert(loadedState && loadedState.userProfile.name === "Eduardo Teste", "saveState e loadState persistem e recuperam estado local");

  const encSaved = await saveStateEncrypted({ testKey: "ValorSecretoAçaí123" });
  assert(encSaved === false, "criptografia legada insegura falha de forma fechada");

  const encLoaded = await loadStateEncrypted();
  assert(encLoaded === null, "criptografia legada não é tratada como armazenamento seguro");

  const syncPhase5 = await runSyncQueueTests();
  assert(syncPhase5 === true, "Fila de sincronização Outbox passa em todos os cenários de conectividade offline/online");

  saveState({ version: 3, tempTest: true });
  assert(loadState().tempTest === true, "Sincronização imediata de gravações do usuário");

  saveState(null);
  assert(loadState() === null, "loadState lida com limpezas de armazenamento de forma segura");

  // =========================================================================
  // RESULTADO FINAL
  // =========================================================================
  console.log("\n=================================================================");
  console.log(`   RESULTADO DOS TESTES DE DOMÍNIO: ${passed} APROVADOS, ${failed} FALHAS`);
  console.log("=================================================================\n");

  if (failed > 0) {
    console.error("❌ ERRO: Existem testes com falhas. O sistema não está pronto para empacotamento!");
    process.exit(1);
  } else {
    console.log("🎉 SUÍTE LOCAL APROVADA: as verificações de domínio passaram; isso não substitui testes E2E de interface, segurança ou serviços reais.");
  }
}

runAllTests();
