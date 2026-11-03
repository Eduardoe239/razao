/**
 * Leitor de texto delimitado compatível com RFC 4180 (O Razão — beta.21/21.2).
 *
 * - Lê o texto inteiro como fluxo de caracteres; não divide por linha antes.
 *   Assim separa REGISTROS LÓGICOS (que podem ocupar várias linhas físicas,
 *   quando um campo entre aspas contém quebra de linha) das LINHAS FÍSICAS.
 * - Só a aspa dupla (") delimita campos; "" dentro de campo entre aspas é uma
 *   aspa literal. O apóstrofo (') é um caractere comum.
 * - Aceita CRLF, LF e CR isolado como fim de registro.
 * - Remove o BOM UTF-8 inicial.
 * - Campo sem aspas é aparado (trim), por compatibilidade com o parser anterior;
 *   campo entre aspas é preservado como está.
 * - Aspa no meio de campo sem aspas é literal (ex.: 12" TV).
 * - Caractere não-espaço depois de fechar aspas, ou aspas sem fechamento até o
 *   fim do texto, marcam o registro com `error` — o registro nunca é descartado
 *   em silêncio; quem chama decide rejeitá-lo.
 *
 * Função pura: não executa nada do conteúdo.
 */

export const DELIMITER_CANDIDATES = [';', ',', '\t'];

export function stripBom(text) {
  return typeof text === 'string' && text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

/**
 * @param {string} text
 * @param {{ delimiter: string, maxRecords?: number }} options
 * @returns {{ records: Array<{fields: string[], line: number, endLine: number, raw: string, error: null|{code: string, message: string}}>, physicalLines: number, truncated: boolean }}
 */
export function parseDelimited(text, { delimiter, maxRecords = Infinity } = {}) {
  if (typeof text !== 'string') return { records: [], physicalLines: 0, truncated: false };
  if (typeof delimiter !== 'string' || delimiter.length !== 1 || delimiter === '"' || delimiter === '\r' || delimiter === '\n') {
    throw new TypeError('parseDelimited: delimitador inválido');
  }
  const src = stripBom(text);
  const records = [];
  let fields = [];
  let field = '';
  let quoted = false;
  let fieldWasQuoted = false;
  let afterQuote = false;
  let error = null;
  let line = 1;
  let recStartLine = 1;
  let recStartIdx = 0;
  let truncated = false;

  const pushField = () => {
    fields.push(fieldWasQuoted ? field : field.trim());
    field = '';
    fieldWasQuoted = false;
    afterQuote = false;
  };
  const pushRecord = (endIdx, endLine) => {
    pushField();
    records.push({ fields, line: recStartLine, endLine, raw: src.slice(recStartIdx, endIdx), error });
    fields = [];
    error = null;
  };
  const markError = (code, message) => {
    if (!error) error = { code, message };
  };

  const n = src.length;
  for (let i = 0; i < n; i++) {
    const c = src[i];

    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; continue; }
        quoted = false;
        afterQuote = true;
        continue;
      }
      if (c === '\r' || c === '\n') {
        if (c === '\r' && src[i + 1] === '\n') { field += '\r\n'; i++; } else { field += c; }
        line++;
        continue;
      }
      field += c;
      continue;
    }

    if (c === delimiter) { pushField(); continue; }

    if (c === '\r' || c === '\n') {
      const endIdx = i;
      if (c === '\r' && src[i + 1] === '\n') i++;
      pushRecord(endIdx, line);
      line++;
      recStartLine = line;
      recStartIdx = i + 1;
      if (records.length >= maxRecords) {
        truncated = i + 1 < n;
        return { records, physicalLines: line - 1, truncated };
      }
      continue;
    }

    if (afterQuote) {
      if (c !== ' ' && c !== '\t') {
        markError('malformed_quote', 'Texto após o fechamento de aspas no mesmo campo.');
        field += c;
      }
      continue;
    }

    if (c === '"' && !fieldWasQuoted && field.trim() === '') {
      quoted = true;
      fieldWasQuoted = true;
      field = '';
      continue;
    }

    field += c;
  }

  if (quoted) markError('unclosed_quote', 'Aspas abertas sem fechamento até o fim do arquivo.');
  const pendingContent = fields.length > 0 || field !== '' || fieldWasQuoted || error;
  if (pendingContent) {
    pushRecord(n, line);
  }
  const physicalLines = n === 0 ? 0 : (pendingContent ? line : line - 1);
  return { records, physicalLines, truncated };
}

/**
 * O registro tem o número de colunas do cabeçalho, admitindo apenas colunas
 * extras vazias no fim (delimitador final, comum em exportações bancárias).
 */
export function fitsColumns(fields, expectedColumns) {
  if (fields.length === expectedColumns) return true;
  return fields.length > expectedColumns && fields.slice(expectedColumns).every(value => value.trim() === '');
}

export function isEmptyRecord(record) {
  return !record.error && record.fields.every(value => value.trim() === '');
}

/**
 * Detecta o delimitador contando ocorrências FORA de aspas no primeiro registro
 * não vazio (cabeçalho) e conferindo a consistência do número de colunas numa
 * amostra de registros seguintes. Nunca escolhe em silêncio quando há empate:
 * devolve `ambiguous`.
 *
 * @returns {{ delimiter: string|null, status: 'ok'|'ambiguous'|'not_found', others: string[], details: object }}
 */
export function detectDelimiter(text, { sampleSize = 50, minColumns = 3 } = {}) {
  const viable = [];
  const present = [];
  const details = {};
  for (const delimiter of DELIMITER_CANDIDATES) {
    const { records } = parseDelimited(text, { delimiter, maxRecords: sampleSize + 20 });
    const nonEmpty = records.filter(record => !isEmptyRecord(record));
    if (nonEmpty.length === 0) continue;
    const header = nonEmpty[0];
    const occurrences = header.fields.length - 1;
    // Registros com aspas malformadas não votam: serão rejeitados individualmente.
    const sample = nonEmpty.slice(1, sampleSize + 1).filter(record => !record.error);
    const consistent = sample.filter(record => fitsColumns(record.fields, header.fields.length)).length;
    details[delimiter] = { occurrences, columns: header.fields.length, sample: sample.length, consistent };
    if (occurrences > 0) present.push(delimiter);
    const majority = sample.length === 0 || consistent * 2 >= sample.length;
    if (header.fields.length >= minColumns && majority) viable.push(delimiter);
  }
  if (viable.length === 1) {
    return { delimiter: viable[0], status: 'ok', others: present.filter(d => d !== viable[0]), details };
  }
  if (viable.length > 1) return { delimiter: null, status: 'ambiguous', others: viable, details };
  return { delimiter: null, status: 'not_found', others: present, details };
}

/**
 * Serializa campos conforme RFC 4180 (usado em testes de ida e volta).
 */
export function formatDelimitedRecord(fields, delimiter) {
  return fields.map(value => {
    const s = String(value);
    return /["\r\n]/.test(s) || s.includes(delimiter) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(delimiter);
}
