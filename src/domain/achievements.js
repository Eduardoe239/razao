/**
 * MÓDULO DE GAMIFICAÇÃO E CONQUISTAS INTERATIVAS (O RAZÃO 3.0)
 * Avalia o estado financeiro do usuário e calcula o progresso de conquistas,
 * desbloqueando títulos honoríficos e recompensas de motivação.
 */

export const ACHIEVEMENTS_LIST = [
  {
    id: 'ach-first-tx',
    name: 'Primeira Razão',
    description: 'Registrou o primeiro lançamento no sistema com precisão.',
    titleUnlocked: 'Iniciado do Razão',
    icon: '🌱',
    points: 100,
    check: (state, netWorth, commitments) => (state.transactions || []).length >= 1,
    target: 1
  },
  {
    id: 'ach-analytics',
    name: 'Analista Rigoroso',
    description: 'Acumulou ao menos 5 lançamentos devidamente sanitizados.',
    titleUnlocked: 'Analista Financeiro',
    icon: '🎯',
    points: 250,
    check: (state, netWorth, commitments) => (state.transactions || []).length >= 5,
    target: 5
  },
  {
    id: 'ach-card-master',
    name: 'Sábio das Faturas',
    description: 'Liquidou o saldo devedor de uma fatura de cartão de crédito.',
    titleUnlocked: 'Mestre dos Cartões',
    icon: '💳',
    points: 400,
    check: (state, netWorth, commitments) => (state.transactions || []).some(t => t.linkedInvoiceKey || (t.description || '').toLowerCase().includes('fatura')),
    target: 1
  },
  {
    id: 'ach-wealth-5k',
    name: 'Patrimônio de Aço',
    description: 'Alcançou um patrimônio líquido realizado superior a R$ 5.000,00.',
    titleUnlocked: 'Estrategista de Ouro',
    icon: '🏛️',
    points: 500,
    check: (state, netWorth, commitments) => netWorth >= 500000,
    target: 500000
  },
  {
    id: 'ach-budget-keeper',
    name: 'Guardião do Orçamento',
    description: 'Definiu limites orçamentários determinísticos para suas categorias.',
    titleUnlocked: 'Comandante Financeiro',
    icon: '🛡️',
    points: 300,
    check: (state, netWorth, commitments) => Object.keys(state.budgets || {}).length > 0 || (state.categories || []).some(c => c.budgetCents !== undefined),
    target: 1
  },
  {
    id: 'ach-visionary',
    name: 'Visionário Futurista',
    description: 'Mapeou pendências e compromissos futuros sem dupla contagem.',
    titleUnlocked: 'Visionário do Razão',
    icon: '🔮',
    points: 350,
    check: (state, netWorth, commitments) => (commitments || []).length > 0 || (state.transactions || []).some(t => t.status === 'pendente'),
    target: 1
  },
  {
    id: 'ach-savings-goal',
    name: 'Construtor do Futuro',
    description: 'Estabeleceu ou contribuiu para uma meta de reserva financeira.',
    titleUnlocked: 'Guardião das Reservas',
    icon: '💎',
    points: 450,
    check: (state, netWorth, commitments) => (state.goals || []).length > 0 || (state.transactions || []).some(t => t.goalId),
    target: 1
  },
  {
    id: 'ach-master-razao',
    name: 'Mestre da Razão',
    description: 'Manteve disciplina impecável com mais de 15 movimentações ativas.',
    titleUnlocked: 'Mestre de O Razão',
    icon: '👑',
    points: 1000,
    check: (state, netWorth, commitments) => (state.transactions || []).length >= 15 && netWorth > 0,
    target: 15
  }
];

export function calculateUserAchievements(state = {}, netWorthCents = 0, commitments = []) {
  const transactions = state.transactions || [];
  
  const evaluated = ACHIEVEMENTS_LIST.map(ach => {
    const isUnlocked = ach.check(state, netWorthCents, commitments);
    let currentProgress = 0;

    if (ach.id === 'ach-first-tx' || ach.id === 'ach-analytics' || ach.id === 'ach-master-razao') {
      currentProgress = Math.min(transactions.length, ach.target);
    } else if (ach.id === 'ach-wealth-5k') {
      currentProgress = Math.min(netWorthCents, ach.target);
    } else {
      currentProgress = isUnlocked ? ach.target : 0;
    }

    const percentage = Math.min(100, Math.round((currentProgress / ach.target) * 100));

    return {
      ...ach,
      unlocked: isUnlocked,
      progress: currentProgress,
      percentage
    };
  });

  const unlockedCount = evaluated.filter(a => a.unlocked).length;
  const totalPoints = evaluated.filter(a => a.unlocked).reduce((acc, a) => acc + a.points, 0);

  return {
    achievements: evaluated,
    unlockedCount,
    totalAchievements: ACHIEVEMENTS_LIST.length,
    totalPoints,
    completionPercentage: Math.round((unlockedCount / ACHIEVEMENTS_LIST.length) * 100)
  };
}
