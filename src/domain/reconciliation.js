/**
 * MÓDULO DE RECONCILIAÇÃO E DESDUPLICAÇÃO (O RAZÃO — FASE 6)
 * Evita lançamentos duplicados ao comparar importações bancárias com registros existentes.
 */

/**
 * Compara lançamentos importados com o histórico existente e identifica duplicatas ou fósseis.
 * @param {Array} importedList Lançamentos vindo do OFX, CSV ou OCR
 * @param {Array} existingTransactions Lançamentos já salvos no sistema
 * @returns {Array} Lista enriquecida com flag de reconciliação ('unique' | 'duplicate' | 'match_pending')
 */
export function reconcileTransactions(importedList = [], existingTransactions = []) {
  if (!Array.isArray(importedList)) return [];

  return importedList.map(imported => {
    // 1. Verificação de ID de importação idêntico
    const exactIdMatch = existingTransactions.find(t => t.importedId && t.importedId === imported.importedId);
    if (exactIdMatch) {
      return {
        ...imported,
        reconciliationStatus: 'duplicate',
        matchedWithId: exactIdMatch.id,
        confidence: 100,
        reason: 'ID de transação bancária já registrado'
      };
    }

    // 2. Busca por valor idêntico + data próxima (± 3 dias) + tipo idêntico
    const candidateMatches = existingTransactions.filter(existing => {
      if (existing.amountCents !== imported.amountCents) return false;
      if (existing.type !== imported.type) return false;

      // Cálculo de diferença de dias entre datas YYYY-MM-DD
      const dateA = new Date(imported.date);
      const dateB = new Date(existing.date);
      const diffDays = Math.abs((dateA - dateB) / (1000 * 60 * 60 * 24));

      return diffDays <= 3;
    });

    if (candidateMatches.length > 0) {
      // Verifica similaridade de descrição
      const bestMatch = candidateMatches.find(c => {
        const descA = (imported.description || '').toLowerCase();
        const descB = (c.description || '').toLowerCase();
        return descA.includes(descB) || descB.includes(descA) || calculateSimilarity(descA, descB) > 0.5;
      }) || candidateMatches[0];

      const isPendingMatch = bestMatch.status === 'pendente';

      return {
        ...imported,
        reconciliationStatus: isPendingMatch ? 'match_pending' : 'duplicate',
        matchedWithId: bestMatch.id,
        confidence: isPendingMatch ? 90 : 85,
        reason: isPendingMatch
          ? 'Liquida lançamento pendente existente'
          : 'Lançamento com mesmo valor e data similar já registrado'
      };
    }

    return {
      ...imported,
      reconciliationStatus: 'unique',
      matchedWithId: null,
      confidence: 0,
      reason: 'Novo lançamento validado'
    };
  });
}

/**
 * Similaridade simples por substrings/Dice coefficient
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  const set1 = new Set(str1.split(' '));
  const set2 = new Set(str2.split(' '));
  let intersection = 0;
  set1.forEach(word => {
    if (word.length > 2 && set2.has(word)) intersection++;
  });
  return (2 * intersection) / (set1.size + set2.size || 1);
}
