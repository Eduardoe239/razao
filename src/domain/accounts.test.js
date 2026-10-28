import { accountBalance, calculateNetWorth } from "./accounts.js";

export function runAccountsTests(assert) {
  const account = { id: "acc-1", initialBalanceCents: 10000 };

  const transactions = [
    { id: "1", accountId: "acc-1", type: "receita", amountCents: 5000, status: "pago" },
    { id: "2", accountId: "acc-1", type: "despesa", amountCents: 2000, status: "pago" },
    { id: "3", accountId: "acc-1", type: "despesa", amountCents: 3000, status: "pendente" } // Não deve afetar realizado
  ];

  const balance = accountBalance(account, transactions);
  assert.strictEqual(balance, 13000, "Saldo realizado deve ser 100 + 50 - 20 = 130 BRL em centavos");

  const netWorth = calculateNetWorth([account], transactions);
  assert.strictEqual(netWorth, 13000, "Patrimônio líquido igual a 130 BRL em centavos");
}
