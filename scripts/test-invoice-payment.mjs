import assert from 'node:assert/strict';
import { prepareInvoicePayment } from '../src/domain/invoicePayment.js';
import { cardInvoices } from '../src/domain/invoices.js';
import { sanitizeTransaction } from '../src/domain/sanitize.js';
import { auditLedger } from '../src/domain/ledger.js';

const card = { id: 'card-1', name: 'Cartão Principal' };
const account = { id: 'checking', name: 'Conta corrente', initialBalanceCents: 100000 };
const invoice = { monthKey: '2026-10', totalCents: 50000, paidCents: 0, remainingCents: 50000 };
const base = {
  card,
  invoice,
  accounts: [account],
  transactions: [],
  fromAccountId: account.id,
  todayISO: '2026-10-28',
  profileType: 'PF',
  transactionId: 'payment-1'
};

const valid = prepareInvoicePayment(base);
assert.equal(valid.valid, true, 'aceita pagamento com conta válida e saldo suficiente');
assert.equal(valid.transaction.amountCents, 50000, 'usa o saldo devedor em centavos exatos');
assert.equal(valid.transaction.linkedCardId, card.id, 'vincula pagamento ao cartão correto');
assert.equal(valid.transaction.idempotencyKey, 'invoice-payment:card-1:2026-10:remaining:50000', 'gera chave de idempotência determinística');

assert.equal(prepareInvoicePayment({ ...base, fromAccountId: 'missing-account' }).valid, false, 'rejeita conta de origem inexistente');
assert.equal(prepareInvoicePayment({ ...base, accounts: [{ ...account, initialBalanceCents: 49999 }] }).valid, false, 'rejeita saldo insuficiente');
assert.equal(prepareInvoicePayment({ ...base, invoice: { ...invoice, remainingCents: 0 } }).valid, false, 'rejeita fatura já quitada');
assert.equal(prepareInvoicePayment({ ...base, todayISO: '2026-02-31' }).valid, false, 'rejeita data inexistente no calendário');
assert.equal(prepareInvoicePayment({ ...base, invoice: { ...invoice, remainingCents: 49000 } }).valid, false, 'rejeita fatura desatualizada em relação ao histórico');
assert.equal(prepareInvoicePayment({ ...base, transactions: [{ id: 'old', type: 'transferencia', status: 'pago', amountCents: 50000, accountId: 'checking', toAccountId: card.id, linkedCardId: card.id, linkedInvoiceKey: invoice.monthKey, idempotencyKey: valid.transaction.idempotencyKey }] }).valid, false, 'rejeita repetição da mesma operação');
assert.equal(prepareInvoicePayment({ ...base, transactions: [{ id: 'existing-id', type: 'receita', status: 'pago', amountCents: 100, accountId: 'checking' }] , transactionId: 'existing-id' }).valid, false, 'rejeita identificador já utilizado');

const cardB = { id: 'card-2', closingDay: 31, dueDay: 20 };
const cardA = { id: 'card-1', closingDay: 31, dueDay: 20 };
const cardTransactions = [
  { id: 'purchase-a', accountId: 'card-1', type: 'despesa', status: 'pago', amountCents: 10000, date: '2026-10-15' },
  { id: 'purchase-b', accountId: 'card-2', type: 'despesa', status: 'pago', amountCents: 15000, date: '2026-10-15' },
  { id: 'payment-a', accountId: 'checking', toAccountId: 'card-1', linkedCardId: 'card-1', linkedInvoiceKey: '2026-10', type: 'transferencia', status: 'pago', amountCents: 10000, date: '2026-10-20' }
];
const invoiceA = cardInvoices(cardA, cardTransactions, '2026-10', 0, 0, '2026-10-28')[0];
const invoiceB = cardInvoices(cardB, cardTransactions, '2026-10', 0, 0, '2026-10-28')[0];
assert.equal(invoiceA.paidCents, 10000, 'considera pagamento ligado ao cartão A');
assert.equal(invoiceB.paidCents, 0, 'não aplica pagamento de outro cartão à fatura B');

const sanitizedPayment = sanitizeTransaction(valid.transaction);
assert.equal(sanitizedPayment.linkedInvoiceKey, '2026-10', 'preserva o mês da fatura após sanitização');
assert.equal(sanitizedPayment.linkedCardId, 'card-1', 'preserva o vínculo com o cartão após sanitização');
assert.equal(sanitizedPayment.idempotencyKey, valid.transaction.idempotencyKey, 'preserva chave de idempotência após sanitização');
assert.equal(sanitizedPayment.profileType, 'PF', 'preserva o perfil financeiro após sanitização');
const cancelledTransaction = sanitizeTransaction({ id: 'cancelled-1', type: 'despesa', status: 'cancelado', amountCents: 100, accountId: 'checking', date: '2026-10-28' });
assert.equal(cancelledTransaction.status, 'cancelado', 'preserva status cancelado após sanitização');
assert.notEqual(cancelledTransaction, null, 'não descarta transação cancelada durante a hidratação');

const audit = auditLedger([account], [valid.transaction], { virtualAccountIds: [card.id] });
assert.equal(audit.valid, true, 'diagnóstico aceita cartão como destino virtual sem tratá-lo como conta bancária');
console.log('Pagamento de fatura: 20 verificações aprovadas.');
