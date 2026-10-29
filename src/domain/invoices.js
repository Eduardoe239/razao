/**
 * MÓDULO DE CICLO DE FATURAS E CARTÃO DE CRÉDITO (O RAZÃO 3.0)
 * Trata rigorosamente o ciclo de fechamento, vencimento e pagamentos.
 */

function isoDate(year, monthIndex, day) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.max(1, Math.min(Number(day) || 1, lastDay));
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function calculateInvoiceCycle(card, refDateISO) {
  if (!card) throw new Error("Cartão é obrigatório");
  const dateStr = refDateISO || new Date().toISOString().slice(0, 10);
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) throw new Error("Data de referência inválida");

  const closingDay = Math.max(1, Math.min(31, Number(card.closingDay) || 10));
  const dueDay = Math.max(1, Math.min(31, Number(card.dueDay) || 20));
  const dateMonthIndex = m - 1;
  const thisClosing = isoDate(y, dateMonthIndex, closingDay);
  // Compras após o fechamento pertencem ao ciclo seguinte.
  const statementMonthIndex = dateStr > thisClosing ? dateMonthIndex + 1 : dateMonthIndex;
  const statementYear = y + Math.floor(statementMonthIndex / 12);
  const normalizedMonth = ((statementMonthIndex % 12) + 12) % 12;
  const closingDate = isoDate(statementYear, normalizedMonth, closingDay);
  let dueMonthIndex = normalizedMonth;
  let dueYear = statementYear;
  if (dueDay <= Math.min(closingDay, new Date(statementYear, normalizedMonth + 1, 0).getDate())) {
    dueMonthIndex += 1;
    if (dueMonthIndex > 11) { dueMonthIndex = 0; dueYear += 1; }
  }
  const dueDate = isoDate(dueYear, dueMonthIndex, dueDay);
  return {
    monthKey: `${statementYear}-${String(normalizedMonth + 1).padStart(2, "0")}`,
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
  if (!card) return [];
  if (!/^\d{4}-\d{2}$/.test(String(currentMonthKey || ""))) {
    throw new Error("Mês de referência inválido; use YYYY-MM");
  }
  if (!todayISOValue) todayISOValue = new Date().toISOString().slice(0, 10);

  const [currYear, currMonth] = currentMonthKey.split('-').map(Number);
  const invoices = [];
  const closingDay = Math.max(1, Math.min(31, Number(card.closingDay) || 10));
  const dueDay = Math.max(1, Math.min(31, Number(card.dueDay) || 20));

  for (let i = -monthsBack; i <= monthsFwd; i++) {
    const d = new Date(currYear, currMonth - 1 + i, 1);
    const y = d.getFullYear();
    const monthIndex = d.getMonth();
    const monthKey = `${y}-${String(monthIndex + 1).padStart(2, '0')}`;
    const closingDateStr = isoDate(y, monthIndex, closingDay);
    const previousMonth = new Date(y, monthIndex - 1, 1);
    const previousClosingDateStr = isoDate(previousMonth.getFullYear(), previousMonth.getMonth(), closingDay);
    const dueMonthIndex = dueDay <= Math.min(closingDay, new Date(y, monthIndex + 1, 0).getDate()) ? monthIndex + 1 : monthIndex;
    const dueDateStr = isoDate(y + Math.floor(dueMonthIndex / 12), ((dueMonthIndex % 12) + 12) % 12, dueDay);

    // Cada compra entra em um único ciclo: após o fechamento anterior e até o fechamento atual.
    const cardTransactions = transactions.filter(t =>
      t.accountId === card.id &&
      t.type === 'despesa' &&
      t.status !== 'cancelado' &&
      typeof t.date === 'string' &&
      t.date > previousClosingDateStr && t.date <= closingDateStr
    );
    const totalCents = cardTransactions.reduce((acc, t) => acc + Math.max(0, Number(t.amountCents) || 0), 0);

    // Pagamentos de fatura são liquidações/transferências, nunca novas despesas.
    const paidCents = transactions
      .filter(t => t.linkedInvoiceKey === monthKey
        && t.type === 'transferencia'
        && t.status === 'pago'
        // A fatura pertence a um cartão específico. Aceita toAccountId para
        // compatibilidade com pagamentos anteriores e linkedCardId explícito.
        && (typeof t.linkedCardId === 'string' ? t.linkedCardId === card.id : t.toAccountId === card.id))
      .reduce((acc, t) => acc + (Number.isSafeInteger(t.amountCents) && t.amountCents > 0 ? t.amountCents : 0), 0);
    const remainingCents = Math.max(0, totalCents - paidCents);

    let status = 'aberta';
    if (totalCents > 0 && remainingCents === 0) status = 'paga';
    else if (todayISOValue > closingDateStr) status = todayISOValue > dueDateStr ? 'vencida' : 'fechada';

    invoices.push({ cardId: card.id, monthKey, closingDateStr, dueDateStr, totalCents, paidCents, remainingCents, status, items: cardTransactions });
  }
  return invoices;
}
