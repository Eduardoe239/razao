import { parseOFX, parseCSV } from './importers.js';
import { reconcileTransactions } from './reconciliation.js';
import { parseReceiptText } from './receiptOcr.js';

console.log("==================================================");
console.log("   O RAZÃO FASE 6 — TESTES DE OPEN FINANCE & IMPORTERS");
console.log("==================================================\n");

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

// 1. Testes do Parser OFX
const sampleOFX = `
<OFX>
  <BANKMSGSRSV1>
    <STMTTRN>
      <TRNTYPE>DEBIT
      <DTPOSTED>20261028120000[-3:BRT]
      <TRNAMT>-185.50
      <FITID>20261028001
      <MEMO>SUPERMERCADO DIA
    </STMTTRN>
    <STMTTRN>
      <TRNTYPE>CREDIT
      <DTPOSTED>20261025120000[-3:BRT]
      <TRNAMT>2500.00
      <FITID>20261025002
      <MEMO>PIX RECEBIDO CLIENTE
    </STMTTRN>
  </BANKMSGSRSV1>
</OFX>
`;

const ofxResult = parseOFX(sampleOFX);
assert(ofxResult.length === 2, "parseOFX deve extrair exatamente 2 lançamentos");
assert(ofxResult[0].amountCents === 18550 && ofxResult[0].type === 'despesa', "parseOFX converteu o valor de débito para 18550 centavos inteiros despesa");
assert(ofxResult[1].amountCents === 250000 && ofxResult[1].type === 'receita', "parseOFX converteu crédito de 250000 centavos receita");
assert(ofxResult[0].date === '2026-10-28', "parseOFX formatou a data ISO corretamente (2026-10-28)");

// 2. Testes do Parser CSV
const sampleCSV = `Data;Descrição;Valor
28/10/2026;Restaurante Almoço;-45,50
27/10/2026;Transferência Recebida;300,00
`;

const csvResult = parseCSV(sampleCSV);
assert(csvResult.length === 2, "parseCSV deve extrair 2 lançamentos do CSV com ponto e vírgula");
assert(csvResult[0].amountCents === 4550 && csvResult[0].date === '2026-10-28', "parseCSV processou centavos e data em português corretamente");

// 3. Testes do Módulo de Reconciliação
const existing = [
  { id: 'tx-100', description: 'Supermercado Dia', amountCents: 18550, type: 'despesa', date: '2026-10-28', status: 'pago' },
  { id: 'tx-101', description: 'Assinatura Nu', amountCents: 2990, type: 'despesa', date: '2026-10-28', status: 'pendente' }
];

const reconciled = reconcileTransactions(ofxResult, existing);
assert(reconciled[0].reconciliationStatus === 'duplicate', "reconcileTransactions marcou a transação de mesmo valor/data como duplicada");
assert(reconciled[1].reconciliationStatus === 'unique', "reconcileTransactions marcou a nova transação como única");

// 4. Testes do OCR de Comprovantes
const sampleReceiptText = `
COMPROVANTE DE PAGAMENTO PIX
DESTINATÁRIO: Posto Shell Combustíveis
VALOR: R$ 150,00
DATA: 28/10/2026
AUTENTICAÇÃO: 981273981273
`;

const ocrParsed = parseReceiptText(sampleReceiptText);
assert(ocrParsed.amountCents === 15000, "parseReceiptText extraiu R$ 150,00 como 15000 centavos");
assert(ocrParsed.date === '2026-10-28', "parseReceiptText extraiu a data 28/10/2026 como 2026-10-28");
assert(ocrParsed.merchantName.includes('Posto Shell'), "parseReceiptText identificou o recebedor Posto Shell");

console.log(`\n--------------------------------------------------`);
console.log(`RESULTADO DA FASE 6: ${passed} aprovados, ${failed} falhas`);
console.log(`--------------------------------------------------\n`);

if (failed > 0) process.exit(1);
