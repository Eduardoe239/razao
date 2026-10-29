import { accountLedger } from './ledger.js';
import { validateInvoicePayment } from './invoices.js';

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validMonthKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  return true;
}

function isPaymentForCard(transaction, cardId, monthKey) {
  return transaction?.type === 'transferencia'
    && transaction.status === 'pago'
    && transaction.linkedInvoiceKey === monthKey
    && (typeof transaction.linkedCardId === 'string' ? transaction.linkedCardId === cardId : transaction.toAccountId === cardId);
}

/**
 * Cria uma proposta de pagamento de fatura após validar conta, saldo, valor,
 * fatura e repetição. É uma função pura; não grava nada por conta própria.
 */
export function prepareInvoicePayment({
  card,
  invoice,
  accounts = [],
  transactions = [],
  fromAccountId,
  todayISO,
  profileType,
  transactionId
}) {
  if (!card?.id) return { valid: false, reason: 'Cartão inválido.' };
  if (!invoice || !validMonthKey(invoice.monthKey)) return { valid: false, reason: 'Fatura inválida ou sem mês de referência.' };
  if (!Number.isSafeInteger(invoice.totalCents) || invoice.totalCents < 0
      || !Number.isSafeInteger(invoice.remainingCents) || invoice.remainingCents < 0) {
    return { valid: false, reason: 'Os valores da fatura são inválidos.' };
  }
  if (invoice.remainingCents === 0) return { valid: false, reason: 'Esta fatura já está quitada.' };
  if (!isValidDate(todayISO)) {
    return { valid: false, reason: 'Data do pagamento inválida.' };
  }

  const source = (Array.isArray(accounts) ? accounts : []).find(account => account?.id === fromAccountId);
  if (!source) return { valid: false, reason: 'Selecione uma conta bancária existente.' };

  const allTransactions = Array.isArray(transactions) ? transactions : [];
  const priorPayments = allTransactions.filter(tx => isPaymentForCard(tx, card.id, invoice.monthKey));
  const paidCents = priorPayments.reduce((sum, tx) => sum + (Number.isSafeInteger(tx.amountCents) && tx.amountCents > 0 ? tx.amountCents : 0), 0);
  const actualRemainingCents = Math.max(0, invoice.totalCents - paidCents);
  if (actualRemainingCents === 0) return { valid: false, reason: 'Esta fatura já foi quitada; atualize os dados antes de tentar novamente.' };
  if (actualRemainingCents !== invoice.remainingCents) {
    return { valid: false, reason: 'A fatura mudou desde a última atualização. Atualize os dados e tente novamente.' };
  }

  const validation = validateInvoicePayment({
    invoice: { remainingCents: actualRemainingCents },
    amountCents: actualRemainingCents,
    fromAccountId,
    cardId: card.id
  });
  if (!validation.valid) return validation;
  if (!transactionId || typeof transactionId !== 'string') {
    return { valid: false, reason: 'Não foi possível gerar o identificador do pagamento.' };
  }
  if (allTransactions.some(tx => tx?.id === transactionId)) {
    return { valid: false, reason: 'O identificador do pagamento já existe.' };
  }

  // Mesmo estado da fatura + mesma quantia produz a mesma chave. Isso bloqueia
  // double-click e reenvio da mesma operação. Um pagamento posterior de saldo
  // remanescente terá outra chave, pois o saldo é diferente.
  const idempotencyKey = `invoice-payment:${card.id}:${invoice.monthKey}:remaining:${actualRemainingCents}`;
  if (allTransactions.some(tx => tx?.idempotencyKey === idempotencyKey)) {
    return { valid: false, reason: 'Este pagamento já foi registrado.' };
  }

  const availableBalanceCents = accountLedger(source, allTransactions).balanceCents;
  if (!Number.isSafeInteger(availableBalanceCents) || availableBalanceCents < actualRemainingCents) {
    return {
      valid: false,
      reason: 'Saldo insuficiente na conta selecionada para quitar esta fatura.',
      availableBalanceCents,
      requiredBalanceCents: actualRemainingCents
    };
  }

  const transaction = {
    id: transactionId,
    type: 'transferencia',
    description: `Pagamento da fatura ${card.name || 'Cartão'} (${invoice.monthKey})`,
    amountCents: actualRemainingCents,
    date: todayISO,
    accountId: source.id,
    toAccountId: card.id,
    status: 'pago',
    profileType: profileType === 'PJ' ? 'PJ' : 'PF',
    linkedInvoiceKey: invoice.monthKey,
    linkedCardId: card.id,
    idempotencyKey
  };
  return { valid: true, transaction, availableBalanceCents, requiredBalanceCents: actualRemainingCents };
}

/** Revalida uma proposta contra um estado atualizado antes de anexá-la. */
export function validatePreparedPaymentAgainstCurrentState({ proposal, card, invoice, accounts, transactions, todayISO, profileType }) {
  if (!proposal?.valid || !proposal.transaction) return { valid: false, reason: 'Proposta de pagamento inválida.' };
  return prepareInvoicePayment({
    card,
    invoice,
    accounts,
    transactions,
    fromAccountId: proposal.transaction.accountId,
    todayISO,
    profileType,
    transactionId: proposal.transaction.id
  });
}
