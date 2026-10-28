import { calculateForecast } from "./forecast.js";

export function runForecastTests(assert) {
  const transactions = [
    { id: "1", date: "2026-10-15", amount: 10000, type: "receita", status: "pago" },
    { id: "2", date: "2026-10-20", amount: 4000, type: "despesa", status: "pago" }
  ];

  const forecast = calculateForecast({ transactions, todayISO: "2026-10-28", monthsAhead: 2 });
  assert.strictEqual(forecast.length, 3, "Deve retornar previsão para o mês atual + 2 meses futuros");
  assert.strictEqual(forecast[0].realizedIncomes, 10000, "Receitas realizadas no mês");
  assert.strictEqual(forecast[0].realizedExpenses, 4000, "Despesas realizadas no mês");
}
