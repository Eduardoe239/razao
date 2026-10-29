import { reconcileAccountBalance, isValidStatementDate } from './balanceReconciliation.js';

const ADJUSTMENT_KIND = Object.freeze({ income: 'receita', expense: 'despesa', transfer: 'transferencia' });

/** Produces hypotheses for a human to review; it never mutates transactions. */
export function analyzeBalanceDiscrepancy(result) {
  if (!result?.valid) return { status: 'invalid', sign: 0, suggestions: [], cautions: ['Confira os dados da conta e do extrato antes de continuar.'] };
  if (result.differenceCents === 0) return { status: 'matched', sign: 0, suggestions: [], cautions: [] };

  const positive = result.differenceCents > 0;
  const suggestions = positive
    ? [
        { id: 'missing_income', title: 'Entrada não registrada', description: 'Confira Pix recebidos, depósitos, estornos ou rendimentos que estejam no extrato e não no Razão.', adjustmentKind: 'income' },
        { id: 'missing_transfer', title: 'Transferência recebida ausente', description: 'Verifique se o dinheiro veio de outra conta sua. Uma transferência não deve ser classificada como receita.', adjustmentKind: 'transfer' },
        { id: 'wrong_amount_or_date', title: 'Valor, data ou classificação incorreta', description: 'Revise os lançamentos próximos da data de referência antes de criar um ajuste.', adjustmentKind: null }
      ]
    : [
        { id: 'missing_expense', title: 'Despesa não registrada', description: 'Confira compras, débitos automáticos, tarifas e taxas bancárias presentes no extrato.', adjustmentKind: 'expense' },
        { id: 'missing_transfer', title: 'Transferência enviada ausente', description: 'Verifique se houve saída para outra conta sua. Uma transferência não deve ser classificada como despesa.', adjustmentKind: 'transfer' },
        { id: 'wrong_amount_or_date', title: 'Valor, data ou classificação incorreta', description: 'Revise os lançamentos próximos da data de referência antes de criar um ajuste.', adjustmentKind: null }
      ];

  const counts = result.counts || {};
  const cautions = [];
  if ((counts.pendingExcluded || 0) > 0) cautions.push(`${counts.pendingExcluded} lançamento(s) pendente(s) foram excluídos do saldo calculado; confira se algum já foi efetivado pelo banco.`);
  if ((counts.futureExcluded || 0) > 0) cautions.push(`${counts.futureExcluded} lançamento(s) posteriores à data do extrato não entraram no cálculo.`);
  if ((counts.invalidDateExcluded || 0) > 0) cautions.push(`${counts.invalidDateExcluded} lançamento(s) com data inválida precisam ser revisados.`);
  if ((counts.invalidMovementExcluded || 0) > 0) cautions.push(`${counts.invalidMovementExcluded} lançamento(s) com dados inválidos precisam ser revisados.`);
  return { status: 'difference', sign: positive ? 1 : -1, amountCents: Math.abs(result.differenceCents), suggestions, cautions };
}

/** Builds a proposal only. The caller must ask for confirmation before applying it. */
export function prepareBalanceAdjustment({
  result,
  account,
  accounts = [],
  adjustmentKind,
  description,
  date,
  categoryId,
  targetAccountId,
  profileType = 'PF'
} = {}) {
  if (!result?.valid || result.status !== 'difference' || !Number.isSafeInteger(result.differenceCents) || result.differenceCents === 0) {
    return { valid: false, reason: 'Não há uma divergência válida para preparar um ajuste.' };
  }
  if (!account?.id || account.id !== result.accountId) return { valid: false, reason: 'A conta selecionada não corresponde à conferência.' };
  if (!Object.hasOwn(ADJUSTMENT_KIND, adjustmentKind)) return { valid: false, reason: 'Selecione uma classificação de ajuste válida.' };
  if (typeof description !== 'string' || !description.trim() || description.trim().length > 120) {
    return { valid: false, reason: 'Informe uma descrição de até 120 caracteres.' };
  }
  if (!isValidStatementDate(date) || date > result.asOfDate) return { valid: false, reason: 'A data do lançamento deve ser válida e não pode ser posterior à data do extrato.' };

  const positive = result.differenceCents > 0;
  if (adjustmentKind === 'income' && !positive) return { valid: false, reason: 'O saldo do extrato está menor; uma receita aumentaria a divergência.' };
  if (adjustmentKind === 'expense' && positive) return { valid: false, reason: 'O saldo do extrato está maior; uma despesa aumentaria a divergência.' };

  let transactionAccountId = account.id;
  let toAccountId;
  if (adjustmentKind === 'transfer') {
    const target = accounts.find(item => item?.id === targetAccountId);
    if (!target || target.id === account.id) return { valid: false, reason: 'Para uma transferência, selecione outra conta válida como contraparte.' };
    if (positive) {
      transactionAccountId = target.id;
      toAccountId = account.id;
    } else {
      toAccountId = target.id;
    }
  }

  const amountCents = Math.abs(result.differenceCents);
  const normalizedKind = ADJUSTMENT_KIND[adjustmentKind];
  const reconciliationKey = [account.id, result.asOfDate, result.differenceCents, adjustmentKind, adjustmentKind === 'transfer' ? targetAccountId : ''].join(':');
  return {
    valid: true,
    draft: {
      accountId: transactionAccountId,
      reconciledAccountId: account.id,
      ...(toAccountId ? { toAccountId } : {}),
      type: normalizedKind,
      amountCents,
      date,
      description: description.trim(),
      ...(adjustmentKind !== 'transfer' && categoryId ? { categoryId } : {}),
      profileType: profileType === 'PJ' ? 'PJ' : 'PF',
      adjustmentKind,
      statementDate: result.asOfDate,
      statementBalanceCents: result.statementBalanceCents,
      expectedCalculatedBalanceCents: result.calculatedBalanceCents,
      expectedDifferenceCents: result.differenceCents,
      reconciliationKey
    }
  };
}

/**
 * Applies a reviewed adjustment only if the account balance still matches the
 * reviewed result. An adjustment is an auditable new transaction, not a silent
 * edit of an existing one.
 */
export function applyBalanceAdjustment({ accounts = [], transactions = [], result, draft, transactionId } = {}) {
  if (!draft || !result?.valid || result.status !== 'difference') return { valid: false, reason: 'A conferência não contém uma divergência aplicável.' };
  if (!transactionId || typeof transactionId !== 'string') return { valid: false, reason: 'Não foi possível gerar o identificador do ajuste.' };
  const account = accounts.find(item => item?.id === draft.reconciledAccountId);
  if (!account || draft.reconciledAccountId !== result.accountId) return { valid: false, reason: 'A conta da conferência não existe mais ou não corresponde ao resultado revisado.' };
  if (draft.statementDate !== result.asOfDate || draft.statementBalanceCents !== result.statementBalanceCents
      || draft.expectedCalculatedBalanceCents !== result.calculatedBalanceCents || draft.expectedDifferenceCents !== result.differenceCents) {
    return { valid: false, reason: 'Os dados de referência do rascunho não correspondem à conferência revisada.' };
  }
  const expectedKey = [account.id, result.asOfDate, result.differenceCents, draft.adjustmentKind,
    draft.adjustmentKind === 'transfer' ? (draft.accountId === account.id ? draft.toAccountId : draft.accountId) : ''].join(':');
  if (!['income', 'expense', 'transfer'].includes(draft.adjustmentKind) || draft.reconciliationKey !== expectedKey) {
    return { valid: false, reason: 'A classificação ou a chave do ajuste é inválida.' };
  }
  if ((Array.isArray(transactions) ? transactions : []).some(tx => tx?.id === transactionId)) return { valid: false, reason: 'O identificador do lançamento já existe.' };
  if ((Array.isArray(transactions) ? transactions : []).some(tx => tx?.reconciliationKey === draft.reconciliationKey && tx?.status !== 'cancelado')) {
    return { valid: false, reason: 'Este ajuste para a mesma divergência já foi registrado.' };
  }

  const currentResult = reconcileAccountBalance({
    account,
    transactions,
    statementBalanceCents: result.statementBalanceCents,
    asOfDate: result.asOfDate
  });
  if (!currentResult.valid || currentResult.calculatedBalanceCents !== draft.expectedCalculatedBalanceCents || currentResult.differenceCents !== draft.expectedDifferenceCents) {
    return { valid: false, reason: 'Os dados mudaram desde a conferência. Execute a conferência novamente antes de aplicar o ajuste.' };
  }
  if (!Number.isSafeInteger(draft.amountCents) || draft.amountCents !== Math.abs(currentResult.differenceCents)) {
    return { valid: false, reason: 'O valor do ajuste não corresponde à divergência atual.' };
  }
  if (!isValidStatementDate(draft.date) || draft.date > currentResult.asOfDate || !draft.description?.trim()) {
    return { valid: false, reason: 'A data ou a descrição do ajuste é inválida.' };
  }
  const expectedType = ADJUSTMENT_KIND[draft.adjustmentKind];
  if (draft.type !== expectedType) return { valid: false, reason: 'O tipo do lançamento não corresponde à classificação revisada.' };
  const impactMatches = (currentResult.differenceCents > 0 && draft.type === 'receita')
    || (currentResult.differenceCents < 0 && draft.type === 'despesa')
    || draft.type === 'transferencia';
  if (!impactMatches) return { valid: false, reason: 'A classificação do ajuste não corrige a direção da divergência.' };

  if (draft.type === 'transferencia') {
    const ids = new Set((Array.isArray(accounts) ? accounts : []).map(item => item?.id).filter(Boolean));
    if (!draft.toAccountId || draft.accountId === draft.toAccountId || !ids.has(draft.accountId) || !ids.has(draft.toAccountId)) {
      return { valid: false, reason: 'A transferência exige contas de origem e destino válidas e diferentes.' };
    }
    if (draft.reconciledAccountId !== draft.toAccountId && draft.reconciledAccountId !== draft.accountId) {
      return { valid: false, reason: 'A transferência não afeta a conta que está sendo conciliada.' };
    }
    if (currentResult.differenceCents > 0 && draft.toAccountId !== account.id) {
      return { valid: false, reason: 'Para corrigir um saldo maior no extrato, a transferência precisa entrar na conta conciliada.' };
    }
    if (currentResult.differenceCents < 0 && draft.accountId !== account.id) {
      return { valid: false, reason: 'Para corrigir um saldo menor no extrato, a transferência precisa sair da conta conciliada.' };
    }
  } else if (draft.accountId !== account.id || !['receita', 'despesa'].includes(draft.type)) {
    return { valid: false, reason: 'O ajuste de receita ou despesa precisa pertencer à conta conferida.' };
  }

  const transaction = {
    id: transactionId,
    accountId: draft.accountId,
    ...(draft.toAccountId ? { toAccountId: draft.toAccountId } : {}),
    type: draft.type,
    amountCents: draft.amountCents,
    date: draft.date,
    description: draft.description.trim(),
    status: 'pago',
    ...(draft.categoryId ? { categoryId: draft.categoryId } : {}),
    profileType: draft.profileType === 'PJ' ? 'PJ' : 'PF',
    source: 'balance_reconciliation_adjustment',
    reconciliationKey: draft.reconciliationKey,
    reconciliationAdjustment: {
      kind: draft.adjustmentKind,
      statementDate: draft.statementDate,
      statementBalanceCents: draft.statementBalanceCents,
      priorCalculatedBalanceCents: draft.expectedCalculatedBalanceCents,
      priorDifferenceCents: draft.expectedDifferenceCents,
      note: 'Ajuste manual confirmado pelo usuário após conferência de saldo.'
    }
  };
  return { valid: true, transaction, reason: null };
}
