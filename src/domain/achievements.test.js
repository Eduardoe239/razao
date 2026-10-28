import { calculateUserAchievements, ACHIEVEMENTS_LIST } from "./achievements.js";

export function testAchievementsDomain() {
  console.log("📦 Testando Módulo de Gamificação e Conquistas (achievements.js)...");

  // 1. Estado inicial sem lançamentos
  const initialState = {
    transactions: [],
    categories: [],
    cards: [],
    goals: []
  };

  const res1 = calculateUserAchievements(initialState, 0, []);
  if (res1.unlockedCount !== 0) {
    throw new Error(`Esperado 0 conquistas desbloqueadas, obtido ${res1.unlockedCount}`);
  }

  // 2. Estado com 1 lançamento e saldo de 6.000,00 BRL
  const activeState = {
    transactions: [
      { id: 'tx-1', description: 'Salário', amountCents: 600000, type: 'receita', status: 'pago' }
    ],
    categories: [{ id: 'cat-1', name: 'Geral', budgetCents: 100000 }],
    cards: [],
    goals: []
  };

  const res2 = calculateUserAchievements(activeState, 600000, []);
  if (res2.unlockedCount < 2) {
    throw new Error(`Esperado ao menos 2 conquistas desbloqueadas, obtido ${res2.unlockedCount}`);
  }

  const firstTxAch = res2.achievements.find(a => a.id === 'ach-first-tx');
  if (!firstTxAch || !firstTxAch.unlocked) {
    throw new Error("Conquista 'Primeira Razão' deveria estar desbloqueada");
  }

  const wealthAch = res2.achievements.find(a => a.id === 'ach-wealth-5k');
  if (!wealthAch || !wealthAch.unlocked) {
    throw new Error("Conquista 'Patrimônio de Aço' deveria estar desbloqueada");
  }

  console.log("  ✅ [PASS] calculateUserAchievements avalia corretamente progresso e conquistas\n");
}
