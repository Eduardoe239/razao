/**
 * MÓDULO DE IMPORTAÇÃO E PARSER MULTIFORMATO (O RAZÃO — FASE 6)
 * Processa arquivos OFX e CSV convertendo em lançamentos sanitizados em centavos inteiros.
 */

/**
 * Parser de arquivos OFX (Extrato Bancário Padrão)
 * @param {string} ofxText Conteúdo bruto do arquivo .ofx
 * @returns {Array} Lista de lançamentos extraídos
 */
export function parseOFX(ofxText) {
  if (!ofxText || typeof ofxText !== 'string') return [];

  const transactions = [];
  const stmtTrnMatches = ofxText.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];

  stmtTrnMatches.forEach((block, idx) => {
    const trnType = getTagValue(block, 'TRNTYPE');
    const dtPosted = getTagValue(block, 'DTPOSTED');
    const trnAmt = getTagValue(block, 'TRNAMT');
    const fitId = getTagValue(block, 'FITID');
    const memo = getTagValue(block, 'MEMO') || getTagValue(block, 'NAME') || 'Lançamento Importado';

    if (trnAmt && dtPosted) {
      const amountVal = parseFloat(trnAmt.replace(',', '.'));
      if (!isNaN(amountVal)) {
        const isExpense = amountVal < 0;
        const absAmountCents = Math.round(Math.abs(amountVal) * 100);

        const year = dtPosted.slice(0, 4);
        const month = dtPosted.slice(4, 6);
        const day = dtPosted.slice(6, 8);
        const dateISO = `${year}-${month}-${day}`;

        transactions.push({
          importedId: fitId || `ofx-${idx}-${Date.now()}`,
          description: memo.trim(),
          amountCents: absAmountCents,
          type: isExpense ? 'despesa' : 'receita',
          date: dateISO,
          status: 'pago',
          source: 'ofx'
        });
      }
    }
  });

  return transactions;
}

function getTagValue(block, tagName) {
  const regex = new RegExp(`<${tagName}>([^<\\r\\n]+)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Parser de arquivos CSV (Planilhas de extrato)
 * @param {string} csvText Conteúdo bruto do arquivo .csv
 * @returns {Array} Lista de lançamentos extraídos
 */
export function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const parseLine = (line) => {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());
    return cols;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase());
  
  let dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'));
  let descIdx = headers.findIndex(h => h.includes('descr') || h.includes('hist') || h.includes('memo') || h.includes('title'));
  let valIdx = headers.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('val'));

  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;
  if (valIdx === -1) valIdx = 2;

  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length <= Math.max(dateIdx, descIdx, valIdx)) continue;

    const rawDate = cols[dateIdx];
    const rawDesc = cols[descIdx];
    const rawVal = cols[valIdx];

    if (!rawDate || !rawVal) continue;

    let dateISO = '';
    if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        dateISO = `${year}-${month}-${day}`;
      }
    } else if (rawDate.includes('-')) {
      dateISO = rawDate.slice(0, 10);
    }

    if (!dateISO) continue;

    const cleanValStr = rawVal.replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
    const valNum = parseFloat(cleanValStr);
    if (isNaN(valNum)) continue;

    const isExpense = valNum < 0 || rawDesc.toLowerCase().includes('pagamento') || rawDesc.toLowerCase().includes('compra');
    const absAmountCents = Math.round(Math.abs(valNum) * 100);

    transactions.push({
      importedId: `csv-${i}-${Date.now()}`,
      description: rawDesc || 'Lançamento CSV',
      amountCents: absAmountCents,
      type: isExpense ? 'despesa' : 'receita',
      date: dateISO,
      status: 'pago',
      source: 'csv'
    });
  }

  return transactions;
}
