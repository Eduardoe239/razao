/**
 * MÓDULO DE COMPROMISSOS E CONSOLIDAÇÃO DE OBRIGAÇÕES (O RAZÃO 3.0)
 * Elimina a dupla contagem entre parcelamento, fatura e contas fixas.
 */

export function buildCommitments({ transactions = [], recurring = [], todayISO = new Date().toISOString().slice(0, 10), monthsAhead = 3 }) {
  const pendingTransactions = transactions.filter(t => t.status === 'pendente' && t.date >= todayISO);

  const commitmentsFromTx = pendingTransactions.map(t => ({
    id: t.id,
    sourceType: t.installmentsGroup ? 'installment' : 'transaction',
    sourceId: t.id,
    description: t.description,
    date: t.date,
    amountCents: Number.isInteger(t.amountCents) ? t.amountCents : Math.round((t.amount || 0) * 100),
    accountId: t.accountId
  }));

  const commitmentsFromRecurring = (recurring || [])
    .filter(r => r.active)
    .map(r => ({
      id: `rec-${r.id}`,
      sourceType: 'recurring',
      sourceId: r.id,
      description: r.description,
      date: todayISO,
      amountCents: Number.isInteger(r.amountCents) ? r.amountCents : Math.round((r.amount || 0) * 100),
      accountId: r.accountId
    }));

  return [...commitmentsFromTx, ...commitmentsFromRecurring].sort((a, b) => a.date.localeCompare(b.date));
}
