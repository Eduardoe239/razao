/**
 * MÓDULO DE IMPORTAÇÃO DE EXTRATOS CSV/OFX (O RAZÃO — beta.21/21.2)
 *
 * Converte texto de extrato (dado não confiável) em lançamentos em centavos
 * inteiros, sem gravar nada. Contratos:
 *
 * - parseCSVDetailed(text) / parseOFXDetailed(text) →
 *     { format, rows, rejected, warnings, fatal, stats }
 *   · rows: lançamentos válidos (forma legada + `sourceLine`);
 *   · rejected: { line, endLine, excerpt, code, reason } para TODO registro de
 *     dados não vazio que não virou lançamento — nenhuma linha some em silêncio;
 *   · warnings: { code, message } sobre o arquivo (ambiguidades, sinais, etc.);
 *   · fatal: null ou { code, message } quando o arquivo não pode ser lido com
 *     segurança (nesse caso rows e rejected ficam vazios: nada é importado
 *     parcialmente);
 *   · stats: contagens; invariante `stats.valid + stats.rejected === stats.dataRecords`.
 *
 * - parseCSV(text) / parseOFX(text) → Array (contrato anterior, inalterado):
 *     { importedId, description, amountCents (>0), type, date, status, source }.
 *
 * Regras: o sinal vem SÓ do valor (negativo = despesa, positivo = receita);
 * valores ambíguos são rejeitados (statementAmount.js); datas são datas civis
 * reais, sem conversão de fuso. O `importedId` continua o formato anterior;
 * a troca para o identificador determinístico é o subincremento 21.3.
 */

import { parseStatementAmount } from './statementAmount.js';
import { parseDelimited, detectDelimiter, isEmptyRecord, fitsColumns, stripBom } from './delimitedText.js';

export const IMPORT_LIMITS = Object.freeze({
  maxTextLength: 5 * 1024 * 1024,
  maxDataRecords: 50000
});

const EXCERPT_LENGTH = 120;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

const LEGACY_KEYS = ['importedId', 'description', 'amountCents', 'type', 'date', 'status', 'source'];

/** Remove metadados de diagnóstico e devolve exatamente a forma legada do lançamento. */
export function toLegacyImportRow(row) {
  const out = {};
  for (const key of LEGACY_KEYS) out[key] = row[key];
  return out;
}

function excerptOf(raw) {
  const flat = String(raw || '').replace(/\r\n|\r|\n/g, ' ↵ ');
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH)}…` : flat;
}

function normalizeHeader(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function cleanDescription(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function daysInMonth(year, month) {
  return [31, (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function civilDate(year, month, day) {
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return { valid: false, code: 'date_out_of_range', reason: `Ano fora do intervalo aceito (${MIN_YEAR}–${MAX_YEAR}).` };
  }
  if (month < 1 || month > 12) return { valid: false, code: 'invalid_date', reason: 'Data inválida: mês inexistente.' };
  if (day < 1 || day > daysInMonth(year, month)) return { valid: false, code: 'invalid_date', reason: 'Data inválida: dia inexistente no mês.' };
  const date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { valid: true, date };
}

/**
 * Data civil de extrato CSV. Aceita DD/MM/AAAA, D/M/AAAA, DD/MM/AA (→ 20AA) e
 * AAAA-MM-DD (opcionalmente seguida de hora, que é ignorada sem conversão de fuso).
 */
export function parseStatementDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { valid: false, code: 'missing_date', reason: 'Data ausente.' };
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) {
    const twoDigitYear = m[3].length === 2;
    const result = civilDate(twoDigitYear ? 2000 + Number(m[3]) : Number(m[3]), Number(m[2]), Number(m[1]));
    return result.valid ? { ...result, twoDigitYear } : result;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (m) return civilDate(Number(m[1]), Number(m[2]), Number(m[3]));
  return { valid: false, code: 'unsupported_date_format', reason: 'Formato de data não reconhecido (use DD/MM/AAAA ou AAAA-MM-DD).' };
}

/** Data civil de OFX: só os 8 primeiros dígitos (AAAAMMDD) de DTPOSTED; hora e fuso são ignorados. */
export function parseOfxDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { valid: false, code: 'missing_date', reason: 'DTPOSTED ausente.' };
  const m = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return { valid: false, code: 'unsupported_date_format', reason: 'DTPOSTED fora do formato AAAAMMDD.' };
  return civilDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

function emptyResult(format, fatal, extraStats = {}) {
  return {
    format,
    rows: [],
    rejected: [],
    warnings: [],
    fatal,
    stats: { physicalLines: 0, dataRecords: 0, valid: 0, rejected: 0, emptyRecords: 0, ...extraStats }
  };
}

function finalizeSignWarnings(rows, warnings) {
  if (rows.length > 0 && !rows.some(row => row.type === 'despesa')) {
    warnings.push({
      code: 'no_negative_values',
      message: 'Nenhum valor negativo encontrado. Confirme se o arquivo usa sinal negativo para saídas antes de importar: todos os itens serão tratados como entradas.'
    });
  }
}

function buildRow({ cents, date, description, importedId, source, sourceLine }) {
  return {
    importedId,
    description,
    amountCents: Math.abs(cents),
    type: cents < 0 ? 'despesa' : 'receita',
    date,
    status: 'pago',
    source,
    sourceLine
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

const DATE_EXACT = ['data', 'date', 'data lancamento', 'data de lancamento', 'data do lancamento', 'data movimento', 'data da transacao'];
const VALUE_EXACT = ['valor', 'amount', 'value', 'valor (r$)', 'valor r$', 'valor em r$'];
// Colunas separadas de débito/crédito ou coluna de natureza (D/C) indicam que o
// sinal NÃO está no valor. Esse formato não é suportado nesta versão: interpretar
// só a coluna de valor transformaria débitos positivos em entradas.
const DEBIT_CREDIT = /\b(debitos?|creditos?|debits?|credits?)\b|\b[dc] ?\/ ?[dc]\b|^(entradas?|saidas?|natureza|tipo)$/;

function pickColumn(headers, exact, matches, taken) {
  const free = headers.map((h, idx) => ({ h, idx })).filter(({ idx }) => !taken.has(idx));
  const exactHit = free.find(({ h }) => exact.includes(h));
  const candidates = free.filter(({ h }) => matches(h));
  const chosen = exactHit || candidates[0];
  return { idx: chosen ? chosen.idx : -1, alternatives: candidates.filter(c => !chosen || c.idx !== chosen.idx).map(c => c.idx) };
}

function resolveColumns(headerFields) {
  const headers = headerFields.map(normalizeHeader);
  const warnings = [];
  const taken = new Set();

  // A primeira linha é um lançamento (arquivo sem cabeçalho) se tiver data e valor válidos nas colunas 1 e 3.
  const looksLikeData = headerFields.length >= 3
    && parseStatementDate(headerFields[0]).valid
    && parseStatementAmount(headerFields[2]).valid;

  if (!looksLikeData && headers.some(h => DEBIT_CREDIT.test(h))) {
    return { fatal: { code: 'debit_credit_columns', message: 'O arquivo usa colunas de débito/crédito ou de natureza (D/C), em vez do sinal no valor. Esse formato ainda não é suportado; nenhum lançamento foi importado.' } };
  }

  const date = pickColumn(headers, DATE_EXACT, h => h.includes('data') || h.includes('date'), taken);
  if (date.idx >= 0) taken.add(date.idx);
  const value = pickColumn(headers, VALUE_EXACT, h => h.includes('valor') || h.includes('amount') || h.includes('val'), taken);
  if (value.idx >= 0) taken.add(value.idx);
  const desc = pickColumn(headers, [], h => h.includes('descr') || h.includes('hist') || h.includes('memo') || h.includes('title'), taken);

  const anyNamed = !looksLikeData && (date.idx >= 0 || value.idx >= 0 || desc.idx >= 0);

  if (!anyNamed) {
    // Sem cabeçalho reconhecível: posições 1, 2 e 3. Se a primeira linha já for
    // um lançamento válido, o arquivo não tem cabeçalho e ela é tratada como dado.
    warnings.push(looksLikeData
      ? { code: 'no_header', message: 'O arquivo não tem cabeçalho reconhecível: a primeira linha foi tratada como lançamento, com Data, Descrição e Valor nas colunas 1, 2 e 3.' }
      : { code: 'assumed_columns', message: 'Cabeçalho não reconhecido: foram assumidas Data, Descrição e Valor nas colunas 1, 2 e 3. Confira os lançamentos.' });
    return { columns: { date: 0, desc: 1, value: 2 }, hasHeader: !looksLikeData, warnings, fatal: null };
  }

  if (value.idx < 0) {
    return { fatal: { code: 'missing_value_column', message: 'Não foi possível identificar a coluna de valor pelo cabeçalho; nenhum lançamento foi importado.' } };
  }
  if (date.idx < 0) {
    return { fatal: { code: 'missing_date_column', message: 'Não foi possível identificar a coluna de data pelo cabeçalho; nenhum lançamento foi importado.' } };
  }

  let descIdx = desc.idx;
  if (descIdx < 0) {
    descIdx = headers.findIndex((_, idx) => !taken.has(idx));
    if (descIdx >= 0) {
      warnings.push({ code: 'assumed_description_column', message: `Coluna de descrição não identificada pelo nome: usada a coluna "${headerFields[descIdx]}".` });
    }
  }

  for (const [role, pick] of [['data', date], ['valor', value], ['descrição', desc]]) {
    if (pick.alternatives.length > 0 && pick.idx >= 0) {
      warnings.push({
        code: 'multiple_candidate_columns',
        message: `Mais de uma coluna pode ser ${role}: usada "${headerFields[pick.idx]}"; ignoradas ${pick.alternatives.map(i => `"${headerFields[i]}"`).join(', ')}.`
      });
    }
  }

  return { columns: { date: date.idx, desc: descIdx, value: value.idx }, hasHeader: true, warnings, fatal: null };
}

const DELIMITER_NAMES = { ';': 'ponto e vírgula', ',': 'vírgula', '\t': 'tabulação' };

export function parseCSVDetailed(csvText) {
  if (typeof csvText !== 'string' || csvText.trim().length === 0) {
    return emptyResult('csv', { code: 'empty_input', message: 'Nenhum conteúdo CSV informado.' });
  }
  if (csvText.length > IMPORT_LIMITS.maxTextLength) {
    return emptyResult('csv', { code: 'too_large', message: `O conteúdo excede o limite de ${IMPORT_LIMITS.maxTextLength / (1024 * 1024)} MB; nada foi importado.` });
  }

  const detection = detectDelimiter(csvText);
  if (detection.status === 'ambiguous') {
    return emptyResult('csv', {
      code: 'ambiguous_delimiter',
      message: `Não foi possível decidir o delimitador com segurança (${detection.others.map(d => DELIMITER_NAMES[d]).join(' ou ')}). Nada foi importado.`
    });
  }
  if (detection.status === 'not_found') {
    return emptyResult('csv', { code: 'delimiter_not_found', message: 'Não foi possível identificar o delimitador (; , ou tabulação) com pelo menos 3 colunas. Nada foi importado.' });
  }
  const delimiter = detection.delimiter;

  const { records, physicalLines } = parseDelimited(csvText, { delimiter });
  const nonEmpty = records.filter(record => !isEmptyRecord(record));
  const emptyRecords = records.length - nonEmpty.length;
  if (nonEmpty.length === 0) {
    return emptyResult('csv', { code: 'empty_input', message: 'Nenhum registro encontrado.' }, { physicalLines, emptyRecords });
  }

  const headerRecord = nonEmpty[0];
  const resolved = resolveColumns(headerRecord.fields);
  if (resolved.fatal) {
    return emptyResult('csv', resolved.fatal, { physicalLines, emptyRecords, delimiter });
  }
  const { columns, hasHeader } = resolved;
  const dataRecords = hasHeader ? nonEmpty.slice(1) : nonEmpty;
  if (dataRecords.length > IMPORT_LIMITS.maxDataRecords) {
    return emptyResult('csv', {
      code: 'too_many_records',
      message: `O arquivo tem ${dataRecords.length} registros; o limite é ${IMPORT_LIMITS.maxDataRecords}. Nada foi importado.`
    }, { physicalLines, emptyRecords, delimiter });
  }

  const warnings = [];
  if (detection.others.length > 0) {
    warnings.push({
      code: 'delimiter_detected',
      message: `Delimitador identificado: ${DELIMITER_NAMES[delimiter]}. O cabeçalho também contém ${detection.others.map(d => DELIMITER_NAMES[d]).join(' e ')}, que foi tratado como texto.`
    });
  }
  warnings.push(...resolved.warnings);

  const expectedColumns = headerRecord.fields.length;
  const rows = [];
  const rejected = [];
  let twoDigitYears = 0;

  dataRecords.forEach((record, index) => {
    const reject = (code, reason) => rejected.push({ line: record.line, endLine: record.endLine, excerpt: excerptOf(record.raw), code, reason });

    if (record.error) return reject(record.error.code, record.error.message);

    const { fields } = record;
    if (!fitsColumns(fields, expectedColumns)) {
      return reject('column_count', `O registro tem ${fields.length} coluna(s); o cabeçalho tem ${expectedColumns}. Pode haver delimitador sem aspas dentro de um campo.`);
    }

    const date = parseStatementDate(fields[columns.date]);
    if (!date.valid) return reject(date.code, date.reason);
    if (date.twoDigitYear) twoDigitYears++;

    const amount = parseStatementAmount(fields[columns.value] ?? '');
    if (!amount.valid) return reject(amount.code, amount.reason);

    rows.push(buildRow({
      cents: amount.cents,
      date: date.date,
      description: cleanDescription(fields[columns.desc]) || 'Lançamento CSV',
      importedId: `csv-${index + 1}-${Date.now()}`,
      source: 'csv',
      sourceLine: record.line
    }));
  });

  if (twoDigitYears > 0) {
    warnings.push({ code: 'two_digit_year', message: `${twoDigitYears} data(s) com ano de 2 dígitos foram interpretadas como 20AA.` });
  }
  finalizeSignWarnings(rows, warnings);

  return {
    format: 'csv',
    rows,
    rejected,
    warnings,
    fatal: null,
    stats: {
      physicalLines,
      dataRecords: dataRecords.length,
      valid: rows.length,
      rejected: rejected.length,
      emptyRecords,
      delimiter,
      hasHeader
    }
  };
}

/**
 * Parser de arquivos CSV — contrato anterior: lista de lançamentos válidos.
 * @param {string} csvText Conteúdo bruto do arquivo .csv
 * @returns {Array} Lista de lançamentos extraídos
 */
export function parseCSV(csvText) {
  return parseCSVDetailed(csvText).rows.map(toLegacyImportRow);
}

// ---------------------------------------------------------------------------
// OFX
// ---------------------------------------------------------------------------

function getTagValue(block, tagName) {
  const regex = new RegExp(`<${tagName}>([^<\\r\\n]+)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

function lineAt(lineStarts, index) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= index) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

export function parseOFXDetailed(ofxText) {
  if (typeof ofxText !== 'string' || ofxText.trim().length === 0) {
    return emptyResult('ofx', { code: 'empty_input', message: 'Nenhum conteúdo OFX informado.' });
  }
  if (ofxText.length > IMPORT_LIMITS.maxTextLength) {
    return emptyResult('ofx', { code: 'too_large', message: `O conteúdo excede o limite de ${IMPORT_LIMITS.maxTextLength / (1024 * 1024)} MB; nada foi importado.` });
  }
  const text = stripBom(ofxText);
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
  const physicalLines = lineStarts.length;

  const openRe = /<STMTTRN>/gi;
  const opens = [];
  let m;
  while ((m = openRe.exec(text)) !== null) opens.push(m.index);

  if (opens.length > IMPORT_LIMITS.maxDataRecords) {
    return emptyResult('ofx', {
      code: 'too_many_records',
      message: `O arquivo tem ${opens.length} transações; o limite é ${IMPORT_LIMITS.maxDataRecords}. Nada foi importado.`
    }, { physicalLines });
  }

  const warnings = [];
  const rows = [];
  const rejected = [];
  let typeMismatch = 0;

  opens.forEach((start, idx) => {
    const nextOpen = idx + 1 < opens.length ? opens[idx + 1] : text.length;
    const closeRe = /<\/STMTTRN>/gi;
    closeRe.lastIndex = start;
    const close = closeRe.exec(text);
    const line = lineAt(lineStarts, start);
    const closed = close && close.index < nextOpen;
    const end = closed ? close.index + close[0].length : nextOpen;
    const block = text.slice(start, end);
    const endLine = lineAt(lineStarts, Math.max(start, end - 1));
    const reject = (code, reason) => rejected.push({ line, endLine, excerpt: excerptOf(block), code, reason });

    if (!closed) return reject('unclosed_block', 'Bloco <STMTTRN> sem </STMTTRN> correspondente.');

    const date = parseOfxDate(getTagValue(block, 'DTPOSTED'));
    if (!date.valid) return reject(date.code, date.reason);

    const rawAmount = getTagValue(block, 'TRNAMT');
    if (!rawAmount) return reject('missing_amount', 'TRNAMT ausente.');
    const amount = parseStatementAmount(rawAmount);
    if (!amount.valid) return reject(amount.code, amount.reason);

    const trnType = getTagValue(block, 'TRNTYPE').toUpperCase();
    if ((trnType === 'DEBIT' && amount.cents > 0) || (trnType === 'CREDIT' && amount.cents < 0)) typeMismatch++;

    const fitId = getTagValue(block, 'FITID');
    const memo = getTagValue(block, 'MEMO') || getTagValue(block, 'NAME') || 'Lançamento Importado';
    rows.push(buildRow({
      cents: amount.cents,
      date: date.date,
      description: cleanDescription(memo) || 'Lançamento Importado',
      importedId: fitId || `ofx-${idx}-${Date.now()}`,
      source: 'ofx',
      sourceLine: line
    }));
  });

  if (opens.length === 0) {
    warnings.push({ code: 'no_transactions', message: 'Nenhum bloco de transação <STMTTRN> foi encontrado no conteúdo.' });
  }
  if (typeMismatch > 0) {
    warnings.push({
      code: 'trntype_sign_mismatch',
      message: `${typeMismatch} transação(ões) com TRNTYPE (DEBIT/CREDIT) contrário ao sinal de TRNAMT. O sinal do valor foi mantido; confira antes de importar.`
    });
  }
  finalizeSignWarnings(rows, warnings);

  return {
    format: 'ofx',
    rows,
    rejected,
    warnings,
    fatal: null,
    stats: { physicalLines, dataRecords: opens.length, valid: rows.length, rejected: rejected.length, emptyRecords: 0 }
  };
}

/**
 * Parser de arquivos OFX — contrato anterior: lista de lançamentos válidos.
 * @param {string} ofxText Conteúdo bruto do arquivo .ofx
 * @returns {Array} Lista de lançamentos extraídos
 */
export function parseOFX(ofxText) {
  return parseOFXDetailed(ofxText).rows.map(toLegacyImportRow);
}
