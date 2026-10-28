/**
 * MÓDULO DE CICLO DE FATURAS E CARTÃO DE CRÉDITO (O RAZÃO 3.0)
 * Trata rigorosamente o ciclo de fechamento, vencimento e pagamentos.
 */

export function calculateInvoiceCycle(card, refDateISO) {
  if (!card) throw new Error("Cartão é obrigatório");
  const dateStr = refDateISO || new Date().toISOString().slice(0, 10);
  const [y, m] = dateStr.split("-").map(Number);
  const monthKey = `${y}-${String(m).padStart(2, "0")}`;

  const closingDay = card.closingDay || 10;
  const dueDay = card.dueDay || 20;

  const closingDate = `${monthKey}-${String(closingDay).padStart(2, "0")}`;
  const dueDate = `${monthKey}-${String(dueDay).padStart(2, "0")}`;

  return {
    monthKey,
    closingDate,
    dueDate
  };
}

export function validateInvoicePayment({ invoice, amountCents, fromAccountId, cardId }) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { valid: false, reason: "Valor de pagamento inválido" };
  }
  if (!fromAccountId || fromAccountId === cardId) {
    return { valid: false, reason: "Conta de origem de pagamento inválida" };
  }
  if (invoice && invoice.remainingCents !== undefined && amountCents > invoice.remainingCents) {
    return { valid: false, reason: "Pagamento excede o saldo devedor da fatura" };
  }
  return { valid: true };
}

export function cardInvoices(card, transactions = [], currentMonthKey, monthsBack = 2, monthsFwd = 2, todayISOValue) {
  if (!todayISOValue) {
    todayISOValue = new Date().toISOString().slice(0, 10);
  }

  const invoices = [];
  const [currYear, currMonth] = currentMonthKey.split('-').map(Number);

  for (let i = -monthsBack; i <= monthsFwd; i++) {
    const d = new Date(currYear, currMonth - 1 + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${y}-${m}`;

    const closingDay = card.closingDay || 10;
    const dueDay = card.dueDay || 20;

    const closingDateStr = `${monthKey}-${String(closingDay).padStart(2, '0')}`;
    const dueDateStr = `${monthKey}-${String(dueDay).padStart(2, '0')}`;

    const cardTransactions = transactions.filter(t => {
      return t.accountId === card.id && t.date <= closingDateStr;
    });

    const totalCents = cardTransactions.reduce((acc, t) => acc + (t.amountCents || t.amount || 0), 0);

    const paidCents = transactions
      .filter(t => t.linkedInvoiceKey === monthKey && t.type === 'despesa')
      .reduce((acc, t) => acc + (t.amountCents || t.amount || 0), 0);

    const remainingCents = Math.max(0, totalCents - paidCents);

    let status = 'aberta';
    if (remainingCents === 0 && totalCents > 0) {
      status = 'paga';
    } else if (todayISOValue > closingDateStr) {
      status = todayISOValue > dueDateStr && remainingCents > 0 ? 'vencida' : 'fechada';
    }

    invoices.push({
      cardId: card.id,
      monthKey,
      closingDateStr,
      dueDateStr,
      totalCents,
      paidCents,
      remainingCents,
      status,
      items: cardTransactions
    });
  }

  return invoices;
}
