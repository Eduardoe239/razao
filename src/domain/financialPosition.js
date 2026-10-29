import { calculateNetWorth } from './accounts.js';

/** Valida uma data civil ISO sem aceitar normalizações automáticas do JavaScript. */
export function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function referenceDate(value) {
  return isValidISODate(value) ? value : new Date().toISOString().slice(0, 10);
}

/**
 * Saldo consolidado disponível na data de referência.
 * Usa as contas e o livro-razão como fonte de verdade, incluindo saldos iniciais
 * e movimentos pagos até a data. Transferências internas se anulam no total.
 *
 * A soma histórica receita-despesa é mantida apenas para consumidores legados
 * que não forneçam a propriedade `accounts`; a aplicação deve fornecer as contas.
 */
export function calculateCurrentBalanceCents(state = {}, asOfISO) {
  const transactions = Array.isArray(state?.transactions) ? state.transactions : [];
  const asOf = referenceDate(asOfISO ?? state?.todayISO);
  const paidAsOf = transactions.filter(tx => {
    if (tx?.status !== 'pago') return false;
    // Lançamentos legados sem data são mantidos por compatibilidade. Uma data
    // presente, mas inválida, não entra em cálculo financeiro.
    if (tx.date === undefined || tx.date === null || tx.date === '') return true;
    return isValidISODate(tx.date) && tx.date <= asOf;
  });

  if (Array.isArray(state?.accounts)) {
    return calculateNetWorth(state.accounts, paidAsOf);
  }

  return paidAsOf.reduce((total, tx) => {
    if (!Number.isSafeInteger(tx?.amountCents) || tx.amountCents <= 0) return total;
    if (tx.type === 'receita') return total + tx.amountCents;
    if (tx.type === 'despesa') return total - tx.amountCents;
    return total;
  }, 0);
}

/**
 * Compromissos pendentes que devem afetar a projeção do mês corrente.
 * Inclui itens vencidos ainda pendentes e itens com vencimento até o fim do mês.
 * Transferências não alteram o saldo consolidado.
 */
export function getCurrentMonthPendingTransactions(transactions = [], todayISO) {
  const asOf = referenceDate(todayISO);
  const [year, month] = asOf.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return (Array.isArray(transactions) ? transactions : []).filter(tx =>
    tx?.status === 'pendente' &&
    (tx.type === 'receita' || tx.type === 'despesa') &&
    isValidISODate(tx.date) &&
    tx.date <= lastDay
  );
}

/** Compromissos pendentes agendados para um mês futuro específico. */
export function getMonthPendingTransactions(transactions = [], monthKey) {
  if (typeof monthKey !== 'string' || !/^\d{4}-\d{2}$/.test(monthKey)) return [];
  return (Array.isArray(transactions) ? transactions : []).filter(tx =>
    tx?.status === 'pendente' &&
    (tx.type === 'receita' || tx.type === 'despesa') &&
    isValidISODate(tx.date) &&
    tx.date.slice(0, 7) === monthKey
  );
}

/** Fluxo líquido pendente em centavos, sem transferências internas. */
export function calculatePendingNetCents(transactions = []) {
  return (Array.isArray(transactions) ? transactions : []).reduce((total, tx) => {
    if (!Number.isSafeInteger(tx?.amountCents) || tx.amountCents <= 0) return total;
    if (tx.type === 'receita') return total + tx.amountCents;
    if (tx.type === 'despesa') return total - tx.amountCents;
    return total;
  }, 0);
}

/** Soma apenas despesas pendentes válidas, em centavos inteiros. */
export function calculatePendingExpenseCents(transactions = []) {
  return (Array.isArray(transactions) ? transactions : []).reduce((total, tx) => {
    return tx?.type === 'despesa' && Number.isSafeInteger(tx.amountCents) && tx.amountCents > 0
      ? total + tx.amountCents
      : total;
  }, 0);
}
