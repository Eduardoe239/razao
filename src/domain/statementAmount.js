/**
 * Valor monetário de extrato bancário (CSV/OFX) → centavos inteiros com sinal.
 *
 * Módulo puro, sem dependências. Não substitui `parseMoneyInputToCents`
 * (formulários); é específico para texto vindo de extratos, que pode trazer
 * sinal antes/depois de "R$", sinal no fim e separador decimal ponto ou vírgula.
 *
 * Regras (plano técnico da beta.21 §4, D-013):
 * - O parse é feito por string; nunca passa por ponto flutuante.
 * - O sinal vem só do texto do valor e é preservado.
 * - Padrão brasileiro (1.234,56) e internacional (1,234.56): o último separador
 *   é o decimal (1 ou 2 casas); o outro só vale como separador de milhar em
 *   grupos de 3 dígitos.
 * - Um único separador seguido de exatamente 3 dígitos (1.234 / 1,234) é
 *   AMBÍGUO e rejeitado — nunca adivinhado.
 * - Separador repetido em grupos de 3 (1.234.567) é inteiro.
 * - Mais de 2 casas decimais, parênteses, sufixos D/C, texto, vazio, zero e
 *   valores fora do inteiro seguro são rejeitados com motivo.
 *
 * Retorno: { valid: true, cents, reason: null, code: null }
 *       ou { valid: false, cents: null, reason, code }.
 */

export const STATEMENT_AMOUNT_MAX_LENGTH = 64;

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
// Milhar: primeiro grupo de 1 a 3 dígitos sem zero à esquerda, depois grupos de 3.
const GROUPED_DOT = /^[1-9]\d{0,2}(?:\.\d{3})+$/;
const GROUPED_COMMA = /^[1-9]\d{0,2}(?:,\d{3})+$/;

function reject(code, reason) {
  return { valid: false, cents: null, reason, code };
}

function accept(cents) {
  return { valid: true, cents, reason: null, code: null };
}

/**
 * Converte o corpo numérico (sem sinal nem moeda) em centavos (BigInt) ou
 * devolve um objeto de rejeição.
 */
function parseUnsignedBody(body) {
  if (!/^[\d.,]+$/.test(body)) {
    return reject('invalid_characters', 'O valor contém caracteres não numéricos.');
  }
  if (!/\d/.test(body)) {
    return reject('no_digits', 'O valor não contém dígitos.');
  }

  const dots = (body.match(/\./g) || []).length;
  const commas = (body.match(/,/g) || []).length;

  let integerPart;
  let decimalPart = '';

  if (dots === 0 && commas === 0) {
    integerPart = body;
  } else if (dots > 0 && commas > 0) {
    // Os dois separadores: o último é o decimal e deve aparecer uma única vez.
    const decimalSep = body.lastIndexOf('.') > body.lastIndexOf(',') ? '.' : ',';
    const groupSep = decimalSep === '.' ? ',' : '.';
    const decimalCount = decimalSep === '.' ? dots : commas;
    if (decimalCount !== 1) {
      return reject('malformed_separators', 'Separadores decimais e de milhar inconsistentes.');
    }
    const [intRaw, decRaw] = body.split(decimalSep);
    if (!/^\d{1,2}$/.test(decRaw)) {
      return decRaw.length > 2 && /^\d+$/.test(decRaw)
        ? reject('too_many_decimals', 'O valor tem mais de duas casas decimais.')
        : reject('malformed_separators', 'Parte decimal inválida.');
    }
    const groupRe = groupSep === '.' ? GROUPED_DOT : GROUPED_COMMA;
    if (!groupRe.test(intRaw)) {
      return reject('malformed_grouping', 'O separador de milhar deve separar grupos de 3 dígitos.');
    }
    integerPart = intRaw.split(groupSep).join('');
    decimalPart = decRaw;
  } else {
    // Um só tipo de separador.
    const sep = dots > 0 ? '.' : ',';
    const count = dots > 0 ? dots : commas;
    const pieces = body.split(sep);
    if (count > 1) {
      // Repetido: só pode ser milhar, então o valor é inteiro.
      const groupRe = sep === '.' ? GROUPED_DOT : GROUPED_COMMA;
      if (!groupRe.test(body)) {
        return reject('malformed_grouping', 'O separador de milhar deve separar grupos de 3 dígitos.');
      }
      integerPart = pieces.join('');
    } else {
      const [intRaw, decRaw] = pieces;
      if (!intRaw) {
        return reject('malformed_separators', 'O valor deve ter dígitos antes do separador decimal.');
      }
      if (decRaw.length === 0) {
        return reject('malformed_separators', 'O valor termina com separador sem casas decimais.');
      }
      if (decRaw.length === 3) {
        // "0,123" ou "1234.567" não podem ser milhar: são casas decimais demais.
        if (!/^[1-9]\d{0,2}$/.test(intRaw)) {
          return reject('too_many_decimals', 'O valor tem mais de duas casas decimais.');
        }
        return reject('ambiguous_separator', `Valor ambíguo: "${body}" pode ser milhar ou decimal com 3 casas. Use, por exemplo, 1.234,00 ou 1,23.`);
      }
      if (decRaw.length > 3) {
        return reject('too_many_decimals', 'O valor tem mais de duas casas decimais.');
      }
      integerPart = intRaw;
      decimalPart = decRaw;
    }
  }

  const cents = BigInt(integerPart) * 100n + BigInt((decimalPart + '00').slice(0, 2));
  return { cents };
}

export function parseStatementAmount(raw) {
  if (typeof raw !== 'string') {
    return reject('not_text', 'Valor ausente ou em formato não textual.');
  }
  if (raw.length > STATEMENT_AMOUNT_MAX_LENGTH) {
    return reject('too_long', 'O texto do valor é longo demais.');
  }

  // Remove todos os espaços (inclui NBSP e espaço fino usados como milhar em alguns sistemas).
  let s = raw.replace(/[\s   ]+/g, '').replace(/−/g, '-');
  if (!s) return reject('empty', 'Valor vazio.');

  if (/[()]/.test(s)) {
    return reject('parentheses', 'Valores entre parênteses não são aceitos: informe o sinal explicitamente.');
  }
  if (/\d[DC]$/i.test(s)) {
    return reject('dc_suffix', 'Sufixos D/C não são aceitos: informe o sinal explicitamente.');
  }

  let sign = 0;
  let signCount = 0;
  const takeSign = (ch) => {
    signCount++;
    sign = ch === '-' ? -1 : 1;
  };

  // Formas aceitas: [sinal][R$][sinal]número[sinal], com no máximo um sinal.
  if (s[0] === '-' || s[0] === '+') { takeSign(s[0]); s = s.slice(1); }
  if (/^R\$/i.test(s)) s = s.slice(2);
  if (s[0] === '-' || s[0] === '+') { takeSign(s[0]); s = s.slice(1); }
  const last = s[s.length - 1];
  if (last === '-' || last === '+') { takeSign(last); s = s.slice(0, -1); }

  if (signCount > 1) {
    return reject('multiple_signs', 'O valor tem mais de um sinal.');
  }
  if (!s) return reject('no_digits', 'O valor não contém dígitos.');
  if (/[+\-]/.test(s) || /R\$/i.test(s)) {
    return reject('invalid_characters', 'Sinal ou símbolo de moeda em posição inválida.');
  }

  const body = parseUnsignedBody(s);
  if (body.valid === false) return body;

  if (body.cents === 0n) return reject('zero', 'Valor zero não é um lançamento.');
  if (body.cents > MAX_SAFE) {
    return reject('out_of_range', 'O valor está fora do intervalo seguro.');
  }
  const cents = Number(body.cents);
  return accept(sign === -1 ? -cents : cents);
}
