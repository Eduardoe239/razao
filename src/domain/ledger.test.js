import { accountLedger, auditLedger, transactionImpactOnAccount, validateLedgerTransaction } from './ledger.js';

export function runLedgerTests(assert) {
  const accounts = [
    { id: 'checking', initialBalanceCents: 100000 },
    { id: 'savings', initialBalanceCents: 50000 }
  ];
  const transactions = [
    { id: 'salary', type: 'receita', status: 'pago', amountCents: 200000, accountId: 'checking', date: '2026-10-01' },
    { id: 'rent', type: 'despesa', status: 'pago', amountCents: 80000, accountId: 'checking', date: '2026-10-02' },
    { id: 'move', type: 'transferencia', status: 'pago', amountCents: 30000, accountId: 'checking', toAccountId: 'savings', date: '2026-10-03' },
    { id: 'pending', type: 'despesa', status: 'pendente', amountCents: 90000, accountId: 'checking', date: '2026-10-04' },
    { id: 'cancelled', type: 'receita', status: 'cancelado', amountCents: 10000, accountId: 'checking', date: '2026-10-05' }
  ];
  assert(accountLedger(accounts[0], transactions).balanceCents === 190000, 'Livro-razão calcula saldo da conta de origem com transferências debitadas uma vez');
  assert(accountLedger(accounts[1], transactions).balanceCents === 80000, 'Livro-razão credita a conta de destino da transferência');
  assert(transactionImpactOnAccount(transactions[2], 'checking') === -30000, 'Transferência gera impacto negativo na origem');
  assert(transactionImpactOnAccount(transactions[2], 'savings') === 30000, 'Transferência gera impacto positivo no destino');
  assert(transactionImpactOnAccount(transactions[3], 'checking') === 0, 'Lançamento pendente não altera saldo realizado');
  assert(transactionImpactOnAccount(transactions[4], 'checking') === 0, 'Lançamento cancelado não altera saldo realizado');
  assert(validateLedgerTransaction(transactions[2]).valid, 'Transferência válida exige duas contas diferentes');
  assert(!validateLedgerTransaction({ ...transactions[2], toAccountId: 'checking' }).valid, 'Transferência para a mesma conta é rejeitada');
  assert(!validateLedgerTransaction({ ...transactions[0], amountCents: 1.5 }).valid, 'Valor fracionário de centavo é rejeitado');
  assert(!validateLedgerTransaction({ ...transactions[0], amountCents: -1 }).valid, 'Valor negativo é rejeitado');
  assert(auditLedger(accounts, transactions).valid, 'Auditoria aceita livro-razão consistente');
  assert(!auditLedger(accounts, [...transactions, transactions[0]]).valid, 'Auditoria identifica identificador duplicado');
  assert(!auditLedger(accounts, [{ ...transactions[0], accountId: 'missing' }]).valid, 'Auditoria identifica conta inexistente');
}
