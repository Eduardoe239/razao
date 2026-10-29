import { isValidISODate } from './sanitize.js';

const RECORD_TYPES = new Set(['receita', 'despesa', 'transferencia']);
const RECORD_STATUSES = new Set(['pago', 'pendente', 'cancelado']);
const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Valida o rascunho antes de aplicar uma mutação pela interface.
 * A validação da persistência continua sendo uma segunda barreira obrigatória.
 */
export function validateTransactionMutation(draft, {
  accounts = [], cards = [], categories = [], profileType = 'PF'
} = {}) {
  if (!isRecord(draft)) return { valid: false, reason: 'O lançamento informado não é válido.' };
  const activeProfile = profileType === 'PJ' ? 'PJ' : 'PF';
  if (draft.profileType !== undefined && draft.profileType !== activeProfile) {
    return { valid: false, reason: 'O lançamento pertence a outro perfil financeiro.' };
  }
  if (typeof draft.description !== 'string' || !draft.description.trim()) {
    return { valid: false, reason: 'Informe uma descrição para o lançamento.' };
  }
  if (!Number.isSafeInteger(draft.amountCents) || draft.amountCents <= 0) {
    return { valid: false, reason: 'O valor deve ser positivo e expresso em centavos inteiros.' };
  }
  if (!RECORD_TYPES.has(draft.type)) return { valid: false, reason: 'O tipo de lançamento não é válido.' };
  if (!RECORD_STATUSES.has(draft.status)) return { valid: false, reason: 'A situação do lançamento não é válida.' };
  if (!isValidISODate(draft.date)) return { valid: false, reason: 'Informe uma data de calendário válida.' };

  const scopedAccounts = Array.isArray(accounts) ? accounts : [];
  const scopedCards = Array.isArray(cards) ? cards : [];
  const scopedCategories = Array.isArray(categories) ? categories : [];
  const origin = [...scopedAccounts, ...scopedCards].find(item => item?.id === draft.accountId);
  if (!origin || origin.profileType !== activeProfile) {
    return { valid: false, reason: 'Selecione uma conta ou cartão pertencente ao perfil ativo.' };
  }
  if (draft.categoryId) {
    const category = scopedCategories.find(item => item?.id === draft.categoryId);
    if (!category || category.profileType !== activeProfile) {
      return { valid: false, reason: 'A categoria selecionada não pertence ao perfil ativo.' };
    }
  }
  if (draft.linkedCardId) {
    const card = scopedCards.find(item => item?.id === draft.linkedCardId);
    if (!card || card.profileType !== activeProfile) {
      return { valid: false, reason: 'O cartão vinculado não pertence ao perfil ativo.' };
    }
  }
  if (draft.type === 'transferencia') {
    const destination = [...scopedAccounts, ...scopedCards].find(item => item?.id === draft.toAccountId);
    if (!destination || destination.profileType !== activeProfile || destination.id === origin.id) {
      return { valid: false, reason: 'A transferência exige um destino válido e diferente, no mesmo perfil financeiro.' };
    }
  }
  return { valid: true, reason: '' };
}
