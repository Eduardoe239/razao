/**
 * beta.21 / 21.2 — valores e linhas de extratos CSV/OFX.
 * Testes unitários, de propriedade (gerador próprio com seed fixa, D-015),
 * de regressão (fixtures sintéticas da Fase 0, linha a linha) e de integração
 * (parse → reconcile → apply). Somente dados fictícios.
 *
 * Seed: RAZAO_PROPERTY_SEED (padrão 0x5EED2112). Em falha, a seed e o caso são exibidos.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseStatementAmount } from '../src/domain/statementAmount.js';
import { parseDelimited, detectDelimiter, formatDelimitedRecord } from '../src/domain/delimitedText.js';
import {
  parseCSV, parseOFX, parseCSVDetailed, parseOFXDetailed,
  parseStatementDate, parseOfxDate, IMPORT_LIMITS, toLegacyImportRow
} from '../src/domain/importers.js';
import { reconcileTransactions, applyReconciliationDecisions } from '../src/domain/reconciliation.js';

const SEED = Number(process.env.RAZAO_PROPERTY_SEED ?? 0x5EED2112) >>> 0;
const CASES = 5000;
let checks = 0;

function check(name, fn) {
  try {
    fn();
    checks++;
  } catch (error) {
    console.error(`FALHA: ${name}`);
    throw error;
  }
}

// PRNG determinístico (mulberry32).
function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    bool: () => next() < 0.5
  };
}

function property(name, count, body) {
  const rng = makeRng(SEED ^ hash(name));
  for (let i = 0; i < count; i++) {
    let input;
    const note = (value) => { input = value; return value; };
    try {
      body(rng, note, i);
    } catch (error) {
      console.error(`FALHA de propriedade "${name}" — seed=${SEED} (0x${SEED.toString(16)}), caso #${i}${input !== undefined ? `, entrada=${JSON.stringify(input)}` : ''}`);
      console.error('Reproduza com: RAZAO_PROPERTY_SEED=' + SEED + ' node scripts/test-statement-import.mjs');
      throw error;
    }
  }
  checks++;
}

function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

// Gera centavos (BigInt) não nulos, com ênfase em limites.
function randomCents(rng) {
  const mode = rng.int(0, 9);
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (mode === 0) return BigInt(rng.int(1, 99));
  if (mode === 1) return max - BigInt(rng.int(0, 1000));
  if (mode === 2) return BigInt(rng.int(1, 9)) * 10n ** BigInt(rng.int(2, 15));
  const digits = rng.int(1, 16);
  let s = String(rng.int(1, 9));
  for (let i = 1; i < digits; i++) s += String(rng.int(0, 9));
  const v = BigInt(s);
  return v > max ? max : v;
}

function group(intStr, sep) {
  let out = '';
  for (let i = 0; i < intStr.length; i++) {
    if (i > 0 && (intStr.length - i) % 3 === 0) out += sep;
    out += intStr[i];
  }
  return out;
}

function formatAmount(centsBig, { style, grouped, negative, signPos, currency, oneDecimal }) {
  const intStr = (centsBig / 100n).toString();
  let dec = (centsBig % 100n).toString().padStart(2, '0');
  if (oneDecimal && dec.endsWith('0')) dec = dec[0];
  const decimalSep = style === 'br' ? ',' : '.';
  const groupSep = style === 'br' ? '.' : ',';
  const number = `${grouped ? group(intStr, groupSep) : intStr}${decimalSep}${dec}`;
  const sign = negative ? '-' : (signPos === 'plus' ? '+' : '');
  const cur = currency ? 'R$ ' : '';
  if (!negative && signPos !== 'plus') return `${cur}${number}`;
  if (signPos === 'afterCurrency' && currency) return `R$ ${sign}${number}`;
  if (signPos === 'trailing') return `${cur}${number}${sign}`;
  return `${sign}${cur}${number}`;
}

// ---------------------------------------------------------------------------
// 1. parseStatementAmount — tabela do plano (§4) e sonda da Fase 0
// ---------------------------------------------------------------------------
const ACCEPT = [
  ['1234,56', 123456], ['1.234,56', 123456], ['-1.234.567,89', -123456789],
  ['1234.56', 123456], ['1,234.56', 123456], ['-1,234,567.89', -123456789],
  ['1.234.567', 123456700], ['1,234,567', 123456700],
  ['-R$ 125,90', -12590], ['R$ -125,90', -12590], ['+100,00', 10000], ['100,00-', -10000],
  ['R$ 2.450,00', 245000], ['r$1,00', 100], ['45,9', 4590], ['45.9', 4590], ['7', 700], ['-7', -700],
  // sonda da auditoria (FIN-01)
  ['-45.90', -4590], ['-4.50', -450], ['-1.234,56', -123456],
  // espaço não separável e sinal de menos tipográfico
  ['R$ -1.000,00', -100000], ['− 12,34', -1234], ['  -12,34  ', -1234],
  // limites do inteiro seguro
  ['90.071.992.547.409,91', 9007199254740991], ['-90.071.992.547.409,91', -9007199254740991], ['0,01', 1], ['-0,01', -1]
];
const REJECT = [
  ['1.234', 'ambiguous_separator'], ['1,234', 'ambiguous_separator'], ['-12.345', 'ambiguous_separator'],
  ['45,901', 'ambiguous_separator'], ['0,123', 'too_many_decimals'], ['1234.567', 'too_many_decimals'], ['1.234,567', 'too_many_decimals'],
  ['(45,90)', 'parentheses'], ['45,90 D', 'dc_suffix'], ['45,90C', 'dc_suffix'], ['abc', 'invalid_characters'], ['12a,00', 'invalid_characters'],
  ['', 'empty'], ['   ', 'empty'], ['0,00', 'zero'], ['-0,00', 'zero'], ['0', 'zero'],
  ['90.071.992.547.409,92', 'out_of_range'], ['999999999999999999999,99', 'out_of_range'],
  ['--1,00', 'multiple_signs'], ['-1,00-', 'multiple_signs'], ['+-1,00', 'multiple_signs'],
  ['1,2,3', 'malformed_grouping'], ['12.34.567', 'malformed_grouping'], ['1.23,45', 'malformed_grouping'], ['01.234,00', 'malformed_grouping'],
  ['1,234,56', 'malformed_grouping'], ['1.234.56', 'malformed_grouping'],
  ['1.234,56,78', 'malformed_separators'], ['12,', 'malformed_separators'], [',50', 'malformed_separators'], ['1,5.0,0', 'malformed_separators'],
  ['R$', 'no_digits'], ['-', 'no_digits'], ['1-0', 'invalid_characters'], ['10R$', 'invalid_characters'],
  ['1'.repeat(65), 'too_long']
];

check('parseStatementAmount aceita os formatos da tabela', () => {
  for (const [raw, cents] of ACCEPT) {
    const r = parseStatementAmount(raw);
    assert.equal(r.valid, true, `${JSON.stringify(raw)} deveria ser aceito: ${r.reason}`);
    assert.equal(r.cents, cents, `${JSON.stringify(raw)} → ${cents}`);
    assert.equal(Number.isSafeInteger(r.cents), true);
  }
});
check('parseStatementAmount rejeita com motivo e código', () => {
  for (const [raw, code] of REJECT) {
    const r = parseStatementAmount(raw);
    assert.equal(r.valid, false, `${JSON.stringify(raw)} deveria ser rejeitado`);
    assert.equal(r.code, code, `${JSON.stringify(raw)}: código ${r.code}, esperado ${code}`);
    assert.equal(r.cents, null);
    assert.equal(typeof r.reason, 'string');
    assert.ok(r.reason.length > 5);
  }
});
check('parseStatementAmount rejeita entradas não textuais', () => {
  for (const raw of [null, undefined, 12.5, {}, []]) assert.equal(parseStatementAmount(raw).valid, false);
});

// ---------------------------------------------------------------------------
// 2. Propriedades de valor (D-015)
// ---------------------------------------------------------------------------
property('formatar e reler preserva centavos e sinal (BR e internacional)', CASES, (rng, note) => {
  const cents = randomCents(rng);
  const negative = rng.bool();
  const opts = {
    style: rng.pick(['br', 'intl']),
    grouped: rng.bool(),
    negative,
    signPos: rng.pick(['leading', 'afterCurrency', 'trailing', 'plus']),
    currency: rng.bool(),
    oneDecimal: rng.int(0, 5) === 0
  };
  const text = note(formatAmount(cents, opts));
  const r = parseStatementAmount(text);
  assert.equal(r.valid, true, `${text}: ${r.reason}`);
  assert.equal(BigInt(r.cents), negative ? -cents : cents, text);
});

property('um único separador seguido de 3 dígitos é sempre ambíguo', CASES, (rng, note) => {
  const text = note(`${rng.bool() ? '-' : ''}${rng.int(1, 999)}${rng.pick(['.', ','])}${String(rng.int(0, 999)).padStart(3, '0')}`);
  const r = parseStatementAmount(text);
  assert.equal(r.valid, false, text);
  assert.equal(r.code, 'ambiguous_separator', text);
});

property('mais de duas casas decimais nunca são arredondadas em silêncio', CASES, (rng, note) => {
  const style = rng.pick(['br', 'intl']);
  const decimals = rng.int(4, 8);
  let dec = '';
  for (let i = 0; i < decimals; i++) dec += String(rng.int(0, 9));
  const text = note(`${rng.int(0, 99999)}${style === 'br' ? ',' : '.'}${dec}`);
  const r = parseStatementAmount(text);
  assert.equal(r.valid, false, text);
  assert.equal(r.code, 'too_many_decimals', text);
});

property('texto arbitrário nunca produz valor não inteiro nem exceção', CASES, (rng, note) => {
  const alphabet = '0123456789.,-+R$ ()DCabc ';
  let text = '';
  const len = rng.int(0, 20);
  for (let i = 0; i < len; i++) text += alphabet[rng.int(0, alphabet.length - 1)];
  note(text);
  const r = parseStatementAmount(text);
  if (r.valid) {
    assert.equal(Number.isSafeInteger(r.cents), true, text);
    assert.notEqual(r.cents, 0, text);
  } else {
    assert.equal(r.cents, null);
    assert.equal(typeof r.code, 'string');
  }
});

// ---------------------------------------------------------------------------
// 3. Leitor RFC 4180
// ---------------------------------------------------------------------------
check('RFC 4180: aspas, aspas escapadas, apóstrofo e delimitador entre aspas', () => {
  const { records } = parseDelimited('a;"b;c";"d ""e"" f";D\'Avila', { delimiter: ';' });
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].fields, ['a', 'b;c', 'd "e" f', "D'Avila"]);
  assert.equal(records[0].error, null);
});
check('RFC 4180: quebra de linha dentro de aspas separa registro lógico de linha física', () => {
  const text = 'h1;h2;h3\r\n01/01/2026;"linha 1\r\nlinha 2\nlinha 3";-1,00\r\n02/01/2026;x;2,00';
  const { records, physicalLines } = parseDelimited(text, { delimiter: ';' });
  assert.equal(records.length, 3);
  assert.equal(physicalLines, 5);
  assert.deepEqual([records[1].line, records[1].endLine], [2, 4]);
  assert.equal(records[1].fields[1], 'linha 1\r\nlinha 2\nlinha 3');
  assert.deepEqual([records[2].line, records[2].endLine], [5, 5]);
});
check('RFC 4180: BOM, CR isolado, linha final sem quebra e linhas vazias', () => {
  const { records } = parseDelimited('﻿a,b\rc,d\n\n e , f ', { delimiter: ',' });
  assert.deepEqual(records.map(r => r.fields), [['a', 'b'], ['c', 'd'], [''], ['e', 'f']]);
});
check('RFC 4180: aspas sem fechamento e texto após fechar aspas marcam erro, sem descartar', () => {
  const unclosed = parseDelimited('a;b\n1;"aberto\n2;3', { delimiter: ';' }).records;
  assert.equal(unclosed.length, 2);
  assert.equal(unclosed[1].error.code, 'unclosed_quote');
  assert.deepEqual([unclosed[1].line, unclosed[1].endLine], [2, 3]);
  const malformed = parseDelimited('"abc"x;1', { delimiter: ';' }).records;
  assert.equal(malformed[0].error.code, 'malformed_quote');
  const literal = parseDelimited('TV 12" polegadas;1', { delimiter: ';' }).records;
  assert.equal(literal[0].fields[0], 'TV 12" polegadas');
  assert.equal(literal[0].error, null);
});
property('RFC 4180: serializar e reler preserva campos arbitrários', 2000, (rng, note) => {
  const delimiter = rng.pick([';', ',', '\t']);
  const alphabet = ['a', 'Z', 'ç', '"', "'", ';', ',', '\t', '\n', '\r\n', ' ', '1', '-', 'R$'];
  const rows = [];
  const columns = rng.int(1, 5);
  for (let r = 0; r < rng.int(1, 6); r++) {
    const fields = [];
    for (let c = 0; c < columns; c++) {
      let s = 'x';
      for (let k = 0; k < rng.int(0, 8); k++) s += rng.pick(alphabet);
      fields.push(s);
    }
    rows.push(fields);
  }
  const text = note(rows.map(f => formatDelimitedRecord(f, delimiter)).join(rng.pick(['\n', '\r\n'])));
  const { records } = parseDelimited(text, { delimiter });
  assert.deepEqual(records.map(r => r.fields), rows);
  assert.equal(records.every(r => r.error === null), true);
});

check('Detecção de delimitador fora de aspas e sem escolha silenciosa', () => {
  assert.equal(detectDelimiter('Data;Descrição;Valor\n01/01/2026;x;-1,00').delimiter, ';');
  assert.equal(detectDelimiter('Data,Descrição,Valor\n01/01/2026,x,-1.00').delimiter, ',');
  assert.equal(detectDelimiter('Data\tDescrição\tValor\n01/01/2026\tx\t-1,00').delimiter, '\t');
  // ";" dentro de aspas no cabeçalho não conta
  const quoted = detectDelimiter('Data,"Descrição; detalhe",Valor\n01/01/2026,x,-1.00');
  assert.equal(quoted.delimiter, ',');
  // ambíguo: dois delimitadores viáveis
  assert.equal(detectDelimiter('a;b;c,d,e\n1;2;3,4,5').status, 'ambiguous');
  assert.equal(detectDelimiter('só uma coluna\noutra').status, 'not_found');
});

// ---------------------------------------------------------------------------
// 4. Datas civis
// ---------------------------------------------------------------------------
check('Datas civis reais: rejeita 31/02, 29/02 fora de bissexto e 32/13', () => {
  assert.equal(parseStatementDate('28/10/2026').date, '2026-10-28');
  assert.equal(parseStatementDate('1/2/2026').date, '2026-02-01');
  assert.equal(parseStatementDate('29/02/2024').date, '2024-02-29');
  assert.equal(parseStatementDate('29/02/2025').valid, false);
  assert.equal(parseStatementDate('31/02/2026').code, 'invalid_date');
  assert.equal(parseStatementDate('32/13/2026').code, 'invalid_date');
  assert.equal(parseStatementDate('31/04/2026').valid, false);
  assert.equal(parseStatementDate('29/02/1900').valid, false);
  assert.equal(parseStatementDate('29/02/2000').valid, true);
  assert.equal(parseStatementDate('2026-10-28').date, '2026-10-28');
  // hora ignorada sem conversão de fuso: 23h30 UTC-3 continua dia 28
  assert.equal(parseStatementDate('2026-10-28T23:30:00-03:00').date, '2026-10-28');
  assert.equal(parseStatementDate('2026-02-30').valid, false);
  assert.equal(parseStatementDate('2026-10-28 10:15').date, '2026-10-28');
  assert.equal(parseStatementDate('2026-10-28Z').valid, false);
  assert.equal(parseStatementDate('2026-10-28 lixo').code, 'unsupported_date_format');
  assert.equal(parseStatementDate('28-10-2026').code, 'unsupported_date_format');
  assert.equal(parseStatementDate('').code, 'missing_date');
  assert.equal(parseStatementDate('01/01/1899').code, 'date_out_of_range');
  const two = parseStatementDate('05/03/26');
  assert.equal(two.date, '2026-03-05');
  assert.equal(two.twoDigitYear, true);
  assert.equal(parseOfxDate('20261028120000[-3:BRT]').date, '2026-10-28');
  assert.equal(parseOfxDate('20261028235959[+14]').date, '2026-10-28');
  assert.equal(parseOfxDate('20261332').code, 'invalid_date');
  assert.equal(parseOfxDate('2026-10-28').code, 'unsupported_date_format');
});
property('datas civis: aceitas sse o dia existe no calendário', CASES, (rng, note) => {
  const y = rng.int(1900, 2100), mo = rng.int(0, 13), d = rng.int(0, 32);
  const text = note(`${String(d).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`);
  const r = parseStatementDate(text);
  const js = new Date(Date.UTC(y, mo - 1, d));
  const real = mo >= 1 && mo <= 12 && d >= 1 && js.getUTCFullYear() === y && js.getUTCMonth() === mo - 1 && js.getUTCDate() === d;
  assert.equal(r.valid, real, text);
  if (real) assert.equal(r.date, `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
});

// ---------------------------------------------------------------------------
// 5. parseCSVDetailed
// ---------------------------------------------------------------------------
const E2E_CSV = 'Data;Descrição;Valor\n03/11/2026;Mercado fictício editado;-245,90\n03/11/2026;Padaria D\'Avila fictícia;-12,50\n03/11/2026;Estorno de compra fictício;100,00\n03/11/2026;Café fictício;-4.50\n32/13/2026;Linha inválida fictícia;abc';

check('CSV da validação visual: valor correto, D\'Avila presente, estorno como entrada, inválida rejeitada', () => {
  const r = parseCSVDetailed(E2E_CSV);
  assert.equal(r.fatal, null);
  assert.deepEqual(r.rows.map(x => [x.description, x.amountCents, x.type, x.sourceLine]), [
    ['Mercado fictício editado', 24590, 'despesa', 2],
    ["Padaria D'Avila fictícia", 1250, 'despesa', 3],
    ['Estorno de compra fictício', 10000, 'receita', 4],
    ['Café fictício', 450, 'despesa', 5]
  ]);
  assert.equal(r.rejected.length, 1);
  assert.equal(r.rejected[0].line, 6);
  assert.equal(r.rejected[0].code, 'invalid_date');
  assert.equal(r.stats.valid + r.stats.rejected, r.stats.dataRecords);
});

check('Sinal vem só do valor: "compra"/"pagamento" positivos são receita (FIN-04)', () => {
  const rows = parseCSV('Data;Descrição;Valor\n01/10/2026;Estorno de compra;100,00\n02/10/2026;Pagamento recebido;50,00\n03/10/2026;Compra;-10,00');
  assert.deepEqual(rows.map(x => x.type), ['receita', 'receita', 'despesa']);
});

check('Arquivo sem nenhum negativo gera aviso de sinal', () => {
  const r = parseCSVDetailed('Data;Descrição;Valor\n01/10/2026;A;10,00\n02/10/2026;B;20,00');
  assert.ok(r.warnings.some(w => w.code === 'no_negative_values'));
  const mixed = parseCSVDetailed('Data;Descrição;Valor\n01/10/2026;A;-10,00\n02/10/2026;B;20,00');
  assert.equal(mixed.warnings.some(w => w.code === 'no_negative_values'), false);
});

check('Valor internacional sem aspas com delimitador vírgula é rejeitado, não truncado', () => {
  const r = parseCSVDetailed('Data,Descrição,Valor\n01/10/2026,A,-1,234.56\n02/10/2026,B,"-1,234.56"\n03/10/2026,C,-7.50');
  assert.equal(r.stats.delimiter, ',');
  assert.deepEqual(r.rows.map(x => [x.description, x.amountCents]), [['B', 123456], ['C', 750]]);
  assert.equal(r.rejected.length, 1);
  assert.equal(r.rejected[0].code, 'column_count');
  assert.equal(r.rejected[0].line, 2);
});

check('Todo registro de dados não vazio é classificado; vazios não contam', () => {
  const text = [
    'Data;Descrição;Valor', '', '01/10/2026;Ok;-1,00', '   ', '31/02/2026;Data impossível;-1,00',
    '01/10/2026;Ambíguo;1.234', '01/10/2026;Zero;0,00', '01/10/2026;Curta', '01/10/2026;"aberta;-1,00'
  ].join('\n');
  const r = parseCSVDetailed(text);
  assert.equal(r.stats.dataRecords, 6);
  assert.equal(r.stats.emptyRecords, 2);
  assert.equal(r.rows.length, 1);
  assert.deepEqual(r.rejected.map(x => [x.line, x.code]), [
    [5, 'invalid_date'], [6, 'ambiguous_separator'], [7, 'zero'], [8, 'column_count'], [9, 'unclosed_quote']
  ]);
  assert.equal(r.stats.valid + r.stats.rejected, r.stats.dataRecords);
});

check('Campo de descrição com quebra de linha entre aspas é um único lançamento', () => {
  const r = parseCSVDetailed('Data;Descrição;Valor\n01/10/2026;"Mercado\nfictício";-3,00\n02/10/2026;Outro;-1,00');
  assert.deepEqual(r.rows.map(x => [x.description, x.sourceLine]), [['Mercado fictício', 2], ['Outro', 4]]);
  assert.equal(r.stats.physicalLines, 4);
  assert.equal(r.stats.dataRecords, 2);
});

check('Coluna extra vazia no fim é aceita; coluna extra com conteúdo é rejeitada', () => {
  const r = parseCSVDetailed('Data;Descrição;Valor\n01/10/2026;A;-1,00;\n01/10/2026;B;-1,00;lixo');
  assert.deepEqual(r.rows.map(x => x.description), ['A']);
  assert.equal(r.rejected[0].code, 'column_count');
});

check('Cabeçalho: colunas fora de ordem, sem cabeçalho e débito/crédito', () => {
  const reordered = parseCSV('Valor;Histórico;Data do lançamento\n-9,99;Mercado;05/10/2026');
  assert.deepEqual([reordered[0].amountCents, reordered[0].description, reordered[0].date], [999, 'Mercado', '2026-10-05']);
  const headerless = parseCSVDetailed('05/10/2026;Mercado;-9,99\n06/10/2026;Padaria;-1,00');
  assert.equal(headerless.rows.length, 2);
  assert.ok(headerless.warnings.some(w => w.code === 'no_header'));
  const dc = parseCSVDetailed('Data;Histórico;Débito;Crédito\n05/10/2026;Mercado;9,99;');
  assert.equal(dc.fatal.code, 'debit_credit_columns');
  assert.equal(dc.rows.length, 0);
  const multi = parseCSVDetailed('Data;Descrição;Valor;Valor original\n05/10/2026;X;-1,00;-2,00');
  assert.equal(multi.rows[0].amountCents, 100);
  assert.ok(multi.warnings.some(w => w.code === 'multiple_candidate_columns'));
});

check('Revisão 21.2: débito/crédito ou natureza D/C é erro explícito (débito positivo nunca vira entrada)', () => {
  for (const header of ['Data;Histórico;Valor Débito;Valor Crédito', 'Data;Descrição;Valor;Tipo (D/C)', 'Data;Descrição;Valor;Débito/Crédito', 'Data;Descrição;Valor;Natureza', 'Data;Descrição;Valor;Tipo']) {
    const r = parseCSVDetailed(`${header}\n01/10/2026;X;10,00;D`);
    assert.equal(r.fatal?.code, 'debit_credit_columns', header);
    assert.equal(r.rows.length, 0, header);
  }
  // Sem cabeçalho, "Débito" na descrição de um lançamento não é confundido com coluna.
  const headerless = parseCSVDetailed('01/10/2026;Débito automático fictício;-10,00\n02/10/2026;Crédito fictício;5,00');
  assert.equal(headerless.fatal, null);
  assert.deepEqual(headerless.rows.map(x => [x.type, x.amountCents]), [['despesa', 1000], ['receita', 500]]);
  // Primeira linha de dados com "Valor" na descrição também não vira cabeçalho.
  const headerless2 = parseCSVDetailed('01/10/2026;Valor fictício;-1,00');
  assert.equal(headerless2.rows.length, 1);
});

check('Revisão 21.2: aspas sem fechamento na 1ª linha de dados são rejeitadas, não confundem o delimitador', () => {
  const r = parseCSVDetailed('Data;Descrição;Valor\n01/10/2026;"aberta;-1,00\n02/10/2026;x;-2,00');
  assert.equal(r.fatal, null);
  assert.equal(r.stats.delimiter, ';');
  assert.equal(r.rejected.length, 1);
  assert.equal(r.rejected[0].code, 'unclosed_quote');
  assert.deepEqual([r.rejected[0].line, r.rejected[0].endLine], [2, 3]);
  assert.equal(r.stats.valid + r.stats.rejected, r.stats.dataRecords);
});

check('Ano com 2 dígitos gera aviso', () => {
  const r = parseCSVDetailed('Data;Descrição;Valor\n05/10/26;X;-1,00');
  assert.equal(r.rows[0].date, '2026-10-05');
  assert.ok(r.warnings.some(w => w.code === 'two_digit_year'));
});

check('Delimitador ambíguo ou ausente é erro explícito, sem importação parcial', () => {
  const amb = parseCSVDetailed('a;b;c,d,e\n1;2;3,4,5');
  assert.equal(amb.fatal.code, 'ambiguous_delimiter');
  assert.equal(amb.rows.length + amb.rejected.length, 0);
  assert.equal(parseCSVDetailed('texto sem colunas').fatal.code, 'delimiter_not_found');
  assert.equal(parseCSVDetailed('').fatal.code, 'empty_input');
  assert.equal(parseCSVDetailed(null).fatal.code, 'empty_input');
});

check('Limites de tamanho e de registros', () => {
  const big = 'Data;Descrição;Valor\n' + 'x'.repeat(IMPORT_LIMITS.maxTextLength);
  assert.equal(parseCSVDetailed(big).fatal.code, 'too_large');
  assert.equal(parseOFXDetailed('<STMTTRN>' + 'x'.repeat(IMPORT_LIMITS.maxTextLength)).fatal.code, 'too_large');
  const line = '01/01/2026;X;-1,00\n';
  const many = 'Data;Descrição;Valor\n' + line.repeat(IMPORT_LIMITS.maxDataRecords + 1);
  const r = parseCSVDetailed(many);
  assert.equal(r.fatal.code, 'too_many_records');
  assert.equal(r.rows.length, 0);
  const atLimit = parseCSVDetailed('Data;Descrição;Valor\n' + line.repeat(IMPORT_LIMITS.maxDataRecords));
  assert.equal(atLimit.fatal, null);
  assert.equal(atLimit.rows.length, IMPORT_LIMITS.maxDataRecords);
});

property('CSV gerado: cada registro de dados vira exatamente um válido ou um rejeitado', 400, (rng, note) => {
  const delimiter = rng.pick([';', '\t']);
  const n = rng.int(1, 25);
  const lines = [formatDelimitedRecord(['Data', 'Descrição', 'Valor'], delimiter)];
  const expected = [];
  for (let i = 0; i < n; i++) {
    const good = rng.int(0, 3) > 0;
    const cents = randomCents(rng);
    const negative = rng.bool();
    const value = good
      ? formatAmount(cents, { style: 'br', grouped: rng.bool(), negative, signPos: 'leading', currency: rng.bool() })
      : rng.pick(['1.234', 'abc', '', '(1,00)', '0,00', '1,999']);
    const day = good ? '15/06/2026' : rng.pick(['15/06/2026', '31/02/2026']);
    const desc = `Item ${i} ${rng.pick(['D\'Avila', 'com "aspas"', 'com;ponto', 'multi\nlinha', 'simples'])}`;
    lines.push(formatDelimitedRecord([day, desc, value], delimiter));
    if (rng.int(0, 4) === 0) lines.push('');
    expected.push(good ? (negative ? -cents : cents) : null);
  }
  const text = note(lines.join(rng.pick(['\n', '\r\n'])));
  const r = parseCSVDetailed(text);
  assert.equal(r.fatal, null, text);
  assert.equal(r.stats.dataRecords, n);
  assert.equal(r.rows.length + r.rejected.length, n);
  assert.deepEqual(r.rows.map(x => BigInt(x.type === 'despesa' ? -x.amountCents : x.amountCents)), expected.filter(v => v !== null));
});

// ---------------------------------------------------------------------------
// 6. parseOFXDetailed
// ---------------------------------------------------------------------------
const OFX = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261028120000[-3:BRT]
<TRNAMT>-1.234,56
<FITID>FICT-0001
<MEMO>MERCADO FICTICIO
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261027
<TRNAMT>2500.00
<FITID>FICT-0002
<NAME>SALARIO FICTICIO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261331
<TRNAMT>-1.00
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261026
<TRNAMT>1.234
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261026
<TRNAMT>15.00
<MEMO>ESTORNO FICTICIO
</STMTTRN>
<STMTTRN>
<DTPOSTED>20261025
</STMTTRN>
<STMTTRN>
<DTPOSTED>20261025
<TRNAMT>-3.00
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

check('OFX: valores BR e internacionais, datas civis, rejeições e avisos', () => {
  const r = parseOFXDetailed(OFX);
  assert.deepEqual(r.rows.map(x => [x.importedId, x.amountCents, x.type, x.date, x.description, x.sourceLine]), [
    ['FICT-0001', 123456, 'despesa', '2026-10-28', 'MERCADO FICTICIO', 3],
    ['FICT-0002', 250000, 'receita', '2026-10-27', 'SALARIO FICTICIO', 10],
    [r.rows[2].importedId, 1500, 'receita', '2026-10-26', 'ESTORNO FICTICIO', 27]
  ]);
  assert.deepEqual(r.rejected.map(x => [x.line, x.code]), [[17, 'invalid_date'], [22, 'ambiguous_separator'], [33, 'missing_amount'], [36, 'unclosed_block']]);
  assert.equal(r.stats.dataRecords, 7);
  assert.equal(r.stats.valid + r.stats.rejected, r.stats.dataRecords);
  assert.ok(r.warnings.some(w => w.code === 'trntype_sign_mismatch'));
  assert.equal(r.warnings.some(w => w.code === 'no_negative_values'), false);
});
check('OFX sem transações: aviso e lista vazia', () => {
  const r = parseOFXDetailed('conteudo invalido');
  assert.equal(r.rows.length, 0);
  assert.ok(r.warnings.some(w => w.code === 'no_transactions'));
  assert.deepEqual(parseOFX('conteudo invalido'), []);
});

// ---------------------------------------------------------------------------
// 7. Compatibilidade dos wrappers
// ---------------------------------------------------------------------------
const LEGACY_KEYS = ['importedId', 'description', 'amountCents', 'type', 'date', 'status', 'source'];
check('parseCSV/parseOFX mantêm a forma legada exata', () => {
  for (const rows of [parseCSV(E2E_CSV), parseOFX(OFX)]) {
    assert.ok(Array.isArray(rows) && rows.length > 0);
    for (const row of rows) {
      assert.deepEqual(Object.keys(row), LEGACY_KEYS);
      assert.equal(Number.isSafeInteger(row.amountCents) && row.amountCents > 0, true);
      assert.ok(['despesa', 'receita'].includes(row.type));
      assert.equal(row.status, 'pago');
    }
  }
  const detailed = parseCSVDetailed(E2E_CSV).rows.map(toLegacyImportRow);
  const plain = parseCSV(E2E_CSV);
  assert.deepEqual(plain.map(({ importedId, ...rest }) => rest), detailed.map(({ importedId, ...rest }) => rest));
  for (const bad of [undefined, null, 42, '', '   ']) {
    assert.deepEqual(parseCSV(bad), []);
    assert.deepEqual(parseOFX(bad), []);
  }
});

// ---------------------------------------------------------------------------
// 8. Regressão: fixtures sintéticas da Fase 0, linha a linha
// ---------------------------------------------------------------------------
// Oráculo independente: as fixtures usam sempre "[-]R$ <milhar com ponto>,<2 casas>".
function oracle(text) {
  return text.replace(/^﻿/, '').split(/\r?\n/).slice(1).filter(Boolean).map(line => {
    const [d, desc, v] = line.split(';');
    const m = v.match(/^(-?)R\$ ([\d.]+),(\d{2})$/);
    assert.ok(m, `fixture fora do formato do oráculo: ${v}`);
    const [dd, mm, yyyy] = d.split('/');
    return { date: `${yyyy}-${mm}-${dd}`, description: desc, amountCents: Number(m[2].replace(/\./g, '') + m[3]), type: m[1] ? 'despesa' : 'receita' };
  });
}
for (const name of ['fase0-importacao-controle.csv', 'fase0-dados-volumosos-2000.csv']) {
  check(`Regressão linha a linha: ${name}`, () => {
    const text = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
    const expected = oracle(text);
    const r = parseCSVDetailed(text);
    assert.equal(r.fatal, null);
    assert.equal(r.rejected.length, 0);
    assert.equal(r.rows.length, expected.length);
    r.rows.forEach((row, i) => {
      assert.deepEqual({ date: row.date, description: row.description, amountCents: row.amountCents, type: row.type }, expected[i], `linha ${i + 2}`);
      assert.equal(row.sourceLine, i + 2);
    });
  });
}

// ---------------------------------------------------------------------------
// 9. Integração: parse → reconcile → apply (PF/PJ, conta, só itens válidos)
// ---------------------------------------------------------------------------
check('Integração: só válidos chegam à conciliação; valores e sinais preservados até o lançamento', () => {
  const accounts = [
    { id: 'acc-pf', name: 'Conta PF fictícia', profileType: 'PF' },
    { id: 'acc-pj', name: 'Conta PJ fictícia', profileType: 'PJ' }
  ];
  const categories = [{ id: 'cat-pf', profileType: 'PF' }, { id: 'cat-pj', profileType: 'PJ' }];
  const detailed = parseCSVDetailed(E2E_CSV);
  const items = detailed.rows.map(toLegacyImportRow);
  const reconciled = reconcileTransactions(items, [], { accountId: 'acc-pf', profileType: 'PF' });
  assert.equal(reconciled.length, 4);
  assert.equal(reconciled.every(item => item.reconciliationStatus === 'unique'), true);
  let n = 0;
  const applied = applyReconciliationDecisions({
    existingTransactions: [], selectedItems: reconciled.map(i => ({ ...i, selected: true })),
    accountId: 'acc-pf', categoryId: 'cat-pf', profileType: 'PF', accounts, categories, createId: () => `tx-${++n}`
  });
  assert.equal(applied.addedCount, 4);
  const byDesc = Object.fromEntries(applied.transactions.map(t => [t.description, t]));
  assert.deepEqual([byDesc['Café fictício'].amountCents, byDesc['Café fictício'].type], [450, 'despesa']);
  assert.deepEqual([byDesc['Estorno de compra fictício'].amountCents, byDesc['Estorno de compra fictício'].type], [10000, 'receita']);
  assert.ok(byDesc["Padaria D'Avila fictícia"]);
  assert.equal(applied.transactions.some(t => t.description === 'Linha inválida fictícia'), false);
  assert.equal(applied.transactions.every(t => t.profileType === 'PF' && t.accountId === 'acc-pf' && !('sourceLine' in t)), true);

  // A conta PJ não aceita lançamentos no contexto PF.
  const crossed = applyReconciliationDecisions({
    existingTransactions: [], selectedItems: reconciled.map(i => ({ ...i, selected: true })),
    accountId: 'acc-pj', categoryId: 'cat-pf', profileType: 'PF', accounts, categories, createId: () => `tx-x-${++n}`
  });
  assert.equal(crossed.addedCount, 0);

  // Sem confirmação (nenhum item selecionado) nada é gravado.
  const none = applyReconciliationDecisions({
    existingTransactions: [], selectedItems: reconciled.map(i => ({ ...i, selected: false })),
    accountId: 'acc-pf', categoryId: 'cat-pf', profileType: 'PF', accounts, categories, createId: () => `tx-y-${++n}`
  });
  assert.equal(none.transactions.length, 0);
});

check('Integração OFX em contexto PJ preserva valores', () => {
  const accounts = [{ id: 'acc-pj', name: 'Conta PJ fictícia', profileType: 'PJ' }];
  const items = parseOFX(OFX);
  const reconciled = reconcileTransactions(items, [], { accountId: 'acc-pj', profileType: 'PJ' });
  let n = 0;
  const applied = applyReconciliationDecisions({
    existingTransactions: [], selectedItems: reconciled.map(i => ({ ...i, selected: true })),
    accountId: 'acc-pj', profileType: 'PJ', accounts, createId: () => `tx-${++n}`
  });
  assert.equal(applied.addedCount, 3);
  const sum = applied.transactions.reduce((acc, t) => acc + (t.type === 'despesa' ? -t.amountCents : t.amountCents), 0);
  assert.equal(sum, -123456 + 250000 + 1500);
});

console.log(`Statement import (21.2): ${checks} checks passed, 0 failed (seed=${SEED}, ${CASES} casos por propriedade).`);
