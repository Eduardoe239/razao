/** Módulo de contas e patrimônio, usando o livro-razão como fonte de impacto. */
import { accountLedger } from './ledger.js';

export function accountBalance(account, transactions = []) {
  return accountLedger(account, transactions).balanceCents;
}

export function calculateNetWorth(accounts = [], transactions = []) {
  return (Array.isArray(accounts) ? accounts : []).reduce(
    (sum, account) => sum + accountBalance(account, transactions),
    0
  );
}
