/**
 * MÓDULO DE EXTRATOR OCR DE COMPROVANTES PIX E NOTAS (O RAZÃO — FASE 6)
 * Processa texto bruto de OCR de fotos ou PDFs de comprovantes e extrai dados financeiros.
 */

/**
 * Analisa o texto bruto extraído de um comprovante e identifica os campos estruturados.
 * @param {string} text Texto obtido via OCR/comprovante
 * @returns {Object} Dados estruturados para pré-preenchimento
 */
export function parseReceiptText(text) {
  if (!text || typeof text !== 'string') {
    return {
      description: '',
      amountCents: 0,
      date: new Date().toISOString().slice(0, 10),
      type: 'despesa',
      merchantName: '',
      pixKey: ''
    };
  }

  const cleanText = text.replace(/\r/g, '');

  let amountCents = 0;
  const amountRegex = /(?:VALOR|TOTAL|R\$)\s*:?\s*R?\$?\s*([\d.]+,\d{2}|\d+,\d{2}|\d+\.\d{2})/i;
  const amountMatch = cleanText.match(amountRegex);

  if (amountMatch) {
    const rawValStr = amountMatch[1].replace('.', '').replace(',', '.');
    const floatVal = parseFloat(rawValStr);
    if (!isNaN(floatVal)) {
      amountCents = Math.round(floatVal * 100);
    }
  } else {
    const genericAmountMatch = cleanText.match(/R\$\s*([\d.,]+)/i);
    if (genericAmountMatch) {
      const floatVal = parseFloat(genericAmountMatch[1].replace('.', '').replace(',', '.'));
      if (!isNaN(floatVal)) {
        amountCents = Math.round(floatVal * 100);
      }
    }
  }

  let dateISO = new Date().toISOString().slice(0, 10);
  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/;
  const dateMatch = cleanText.match(dateRegex);

  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    dateISO = `${year}-${month}-${day}`;
  }

  let merchantName = 'Comprovante Importado';
  const merchantRegex = /(?:DESTINATÁRIO|PAGO PARA|RECEBEDOR|NOME|ESTABELECIMENTO|EMPRESA)\s*:?\s*([^\n\r]+)/i;
  const merchantMatch = cleanText.match(merchantRegex);

  if (merchantMatch && merchantMatch[1].trim()) {
    merchantName = merchantMatch[1].trim().slice(0, 40);
  } else {
    const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    if (lines.length > 0) {
      merchantName = lines[0].slice(0, 40);
    }
  }

  const isPix = /PIX|TRANSFERÊNCIA/i.test(cleanText);
  const isIncome = /RECEBIDO|COMPROVANTE DE RECEBIMENTO/i.test(cleanText);

  return {
    description: isPix ? `Pix - ${merchantName}` : merchantName,
    amountCents,
    date: dateISO,
    type: isIncome ? 'receita' : 'despesa',
    merchantName,
    source: 'ocr_receipt'
  };
}
