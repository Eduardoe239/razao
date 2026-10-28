/**
 * MÓDULO DE CONTAS E SALDOS (O RAZÃO 3.0)
 * Regras determinísticas de saldo e patrimônio líquido.
 */

export function accountBalance(account, transactions = []) {
  if (!account) return 0;
  const initial = account.initialBalanceCents || 0;

  const netTransactions = transactions
    .filter(t => t.status === 'pago')
    .reduce((acc, t) => {
      if (t.accountId === account.id) {
        if (t.type === 'receita') return acc + (t.amountCents || 0);
        if (t.type === 'despesa') return acc - (t.amountCents || 0);
        if (t.type === 'transferencia') return acc - (t.amountCents || 0);
      }
      if (t.toAccountId === account.id && t.type === 'transferencia') {
        return acc + (t.amountCents || 0);
      }
      return acc;
    }, 0);

  return initial + netTransactions;
}

export function calculateNetWorth(accounts = [], transactions = []) {
  return accounts.reduce((acc, account) => acc + accountBalance(account, transactions), 0);
}
