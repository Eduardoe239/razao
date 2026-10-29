import { calculateNetWorth } from './accounts.js';

const pad = (value) => String(value).padStart(2, '0');

export function toLocalISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftedDate(date, monthOffset) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth() + monthOffset;
  const targetLastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(date.getDate(), targetLastDay));
}

function monthBounds(year, monthIndex) {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 0)
  };
}

/**
 * Retorna o intervalo do painel. A navegação muda o mês-base; semanal usa a
 * semana que contém o mesmo dia deslocado, mensal cobre o mês e trimestral
 * cobre o mês selecionado e os dois anteriores.
 */
export function getDashboardRange({ period = 'monthly', monthOffset = 0, now = new Date() } = {}) {
  const anchorDate = shiftedDate(now, Number.isInteger(monthOffset) ? monthOffset : 0);
  let startDate;
  let endDate;

  if (period === 'weekly') {
    startDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());
    const weekday = (startDate.getDay() + 6) % 7; // segunda-feira = 0
    startDate.setDate(startDate.getDate() - weekday);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
  } else if (period === 'quarterly') {
    startDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 2, 1);
    endDate = monthBounds(anchorDate.getFullYear(), anchorDate.getMonth()).end;
  } else {
    ({ start: startDate, end: endDate } = monthBounds(anchorDate.getFullYear(), anchorDate.getMonth()));
  }

  return {
    period: ['weekly', 'monthly', 'quarterly'].includes(period) ? period : 'monthly',
    anchorDate,
    startDate,
    endDate,
    startISO: toLocalISODate(startDate),
    endISO: toLocalISODate(endDate),
    monthKey: `${anchorDate.getFullYear()}-${pad(anchorDate.getMonth() + 1)}`
  };
}

function dateLabel(date, options) {
  return date.toLocaleDateString('pt-BR', options);
}

export function formatDashboardRangeLabel(range) {
  if (!range?.startDate || !range?.endDate) return '';
  const { period, startDate, endDate, anchorDate } = range;
  if (period === 'monthly') {
    return dateLabel(anchorDate, { month: 'long', year: 'numeric' });
  }
  if (period === 'quarterly') {
    const startMonth = dateLabel(startDate, { month: 'long' });
    const endMonth = dateLabel(endDate, { month: 'long', year: 'numeric' });
    return `${startMonth} – ${endMonth}`;
  }

  const sameMonth = startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth();
  if (sameMonth) {
    return `${startDate.getDate()}–${endDate.getDate()} de ${dateLabel(endDate, { month: 'long', year: 'numeric' })}`;
  }
  return `${dateLabel(startDate, { day: 'numeric', month: 'short' })} – ${dateLabel(endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function validAmount(tx) {
  return Number.isSafeInteger(tx?.amountCents) && tx.amountCents > 0 ? tx.amountCents : 0;
}

/**
 * Calcula os indicadores de fluxo do intervalo e separa isso do saldo atual
 * das contas. Transferências não contam como receita nem como despesa.
 */
export function calculateDashboardSummary({
  transactions = [],
  accounts = [],
  period = 'monthly',
  monthOffset = 0,
  now = new Date(),
  committedCents = 0
} = {}) {
  const range = getDashboardRange({ period, monthOffset, now });
  const validTransactions = Array.isArray(transactions) ? transactions : [];
  const periodTransactions = validTransactions.filter(tx =>
    typeof tx?.date === 'string' &&
    tx.date >= range.startISO && tx.date <= range.endISO &&
    tx.status !== 'cancelado'
  );

  let incomeCents = 0;
  let expenseCents = 0;
  let realizedCents = 0;
  let pendingNetCents = 0;

  for (const tx of periodTransactions) {
    if (tx.type !== 'receita' && tx.type !== 'despesa') continue;
    const amount = validAmount(tx);
    if (!amount) continue;
    const sign = tx.type === 'receita' ? 1 : -1;

    if (tx.status === 'pago') {
      realizedCents += sign * amount;
      if (tx.type === 'receita') incomeCents += amount;
      else expenseCents += amount;
    } else if (tx.status === 'pendente') {
      pendingNetCents += sign * amount;
    }
  }

  const todayISO = toLocalISODate(now);
  const balanceTransactions = validTransactions.filter(tx =>
    typeof tx?.date !== 'string' || tx.date <= todayISO
  );
  const netWorthCents = calculateNetWorth(Array.isArray(accounts) ? accounts : [], balanceTransactions);
  const safeCommittedCents = Number.isSafeInteger(committedCents) ? committedCents : 0;

  return {
    range,
    periodTransactions,
    realizedCents,
    pendingNetCents,
    projectedCents: realizedCents + pendingNetCents,
    incomeCents,
    expenseCents,
    netWorthCents,
    committedCents: safeCommittedCents,
    availableCents: netWorthCents - safeCommittedCents
  };
}
