/**
 * Demonstração de extração por texto, não OCR de imagem.
 * Não fabricar comprovantes de exemplo nem declarar confiança de OCR sem um
 * motor real. O fluxo de produção deverá integrar um provedor revisado e obter
 * confirmação humana antes de criar qualquer movimentação.
 */
export class OcrService {
  preprocessImageData(imageBuffer) {
    if (!imageBuffer) throw new Error('Imagem não fornecida para processamento OCR.');
    throw new Error('OCR e pré-processamento real de imagem não estão implementados nesta versão. Cole o texto do comprovante para usar a extração demonstrativa.');
  }

  async processReceiptImage({ imageUrl, textContent } = {}) {
    if (!textContent || typeof textContent !== 'string' || !textContent.trim()) {
      if (imageUrl) {
        throw new Error('A URL da imagem não foi processada: OCR visual não está implementado nesta versão. Forneça o texto extraído manualmente.');
      }
      throw new Error('Forneça o texto do comprovante. OCR real de imagem não está disponível nesta versão.');
    }

    const valueMatch = textContent.match(/R\$\s*([\d.,]+)/i);
    if (!valueMatch?.[1]) throw new Error('Não foi possível identificar um valor monetário no texto fornecido. Nenhum lançamento foi criado.');
    const cleanValue = valueMatch[1].replace(/\./g, '').replace(',', '.');
    const amount = Number(cleanValue);
    const amountCents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(amountCents)) {
      throw new Error('O valor extraído não é um valor monetário válido. Nenhum lançamento foi criado.');
    }

    const dateMatch = textContent.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
    let dateISO = new Date().toISOString().slice(0, 10);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const candidate = `${year}-${month}-${day}`;
      const parsed = new Date(`${candidate}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate) {
        throw new Error('A data encontrada no texto é inválida. Nenhum lançamento foi criado.');
      }
      dateISO = candidate;
    }

    const destMatch = textContent.match(/(?:DESTINATÁRIO|RECEBEDOR|ESTABELECIMENTO):\s*([^\n\r]+)/i);
    const merchantName = destMatch?.[1]?.trim() || 'Estabelecimento não identificado';

    return {
      success: true,
      mode: 'text-regex-demo',
      extractedData: {
        amountCents,
        date: dateISO,
        merchantName,
        type: 'despesa',
        status: 'pago',
        confidenceScore: null
      }
    };
  }
}
