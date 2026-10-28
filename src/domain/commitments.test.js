import { buildCommitments } from "./commitments.js";

export function runCommitmentsTests(assert) {
  const transactions = [
    { id: "t1", date: "2026-11-05", amount: 12000, type: "despesa", status: "pendente", description: "Conta de Luz" }
  ];
  const recurring = [
    { id: "r1", description: "Internet Fibra", amount: 15000, dayOfMonth: 10, type: "despesa", active: true }
  ];

  const commitments = buildCommitments({ transactions, recurring, todayISO: "2026-10-28", monthsAhead: 1 });
  assert.ok(commitments.length >= 2, "Deve gerar compromissos a partir de transações e recorrências");
  
  const txCommitment = commitments.find(c => c.id === "t1");
  assert.ok(txCommitment, "Compromisso de transação deve existir");
  assert.strictEqual(txCommitment.sourceType, "transaction", "Identificação de origem de transação");
}
