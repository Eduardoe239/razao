/**
 * APRENDIZADO CONTÍNUO E PERFILAMENTO ADAPTATIVO (O RAZÃO v14.0)
 * Permite que O Razão aprenda com os hábitos do usuário, categorizando
 * automaticamente novas importações (OFX, Pix, Open Finance) e ajustando
 * margens de projeção preditiva de acordo com o histórico real.
 */

const LEARNING_RULES_KEY = 'razao_category_rules_v14';

/**
 * Carrega a memória de regras de categorização aprendidas do armazenamento local.
 */
export function loadLearningRules() {
  try {
    const raw = localStorage.getItem(LEARNING_RULES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Erro ao carregar regras de aprendizado:', err);
    return {};
  }
}

/**
 * Registra uma regra de aprendizado quando o usuário altera a categoria de um lançamento.
 */
export function recordCategoryRule(description, categoryId) {
  if (!description || !categoryId) return;
  const keyword = extractKeyword(description);
  if (!keyword) return;

  const rules = loadLearningRules();
  rules[keyword] = {
    categoryId,
    updatedAt: new Date().toISOString(),
    count: (rules[keyword]?.count || 0) + 1
  };

  try {
    localStorage.setItem(LEARNING_RULES_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error('Erro ao salvar regra de aprendizado:', err);
  }
  return rules;
}

/**
 * Tenta prever a categoria ideal de um lançamento importado usando as regras aprendidas.
 */
export function predictCategory(description, defaultCategoryId = 'outros') {
  if (!description) return defaultCategoryId;
  const keyword = extractKeyword(description);
  const rules = loadLearningRules();

  if (keyword && rules[keyword] && rules[keyword].categoryId) {
    return rules[keyword].categoryId;
  }

  // Regras de fallback inteligentes nativas
  const descLower = description.toLowerCase();
  if (descLower.includes('açaí') || descLower.includes('ifood') || descLower.includes('restaurante') || descLower.includes('padaria')) {
    return 'alimentacao';
  }
  if (descLower.includes('uber') || descLower.includes('posto') || descLower.includes('combustivel') || descLower.includes('99')) {
    return 'transporte';
  }
  if (descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('cinema') || descLower.includes('steam')) {
    return 'lazer';
  }

  return defaultCategoryId;
}

/**
 * Extrai a palavra-chave relevante de uma descrição comercial para pareamento.
 */
function extractKeyword(description) {
  const clean = description.trim().toLowerCase().replace(/[^a-z0-9áéíóúãõç\s]/g, '');
  const words = clean.split(/\s+/).filter(w => w.length > 2 && !['pagamento', 'pix', 'transf', 'compra', 'cartao', 'debito', 'credito'].includes(w));
  return words[0] || null;
}

/**
 * Avalia o perfil de volatilidade do usuário para ajustar o fator de contingência no simulador Conservador.
 */
export function calculateAdaptiveContingencyFactor(transactions = []) {
  if (!transactions || transactions.length < 5) return 1.15; // Padrão: +15% de contingência

  const monthlyExpenses = {};
  transactions
    .filter(t => t.type === 'despesa' && t.status === 'pago')
    .forEach(t => {
      const monthKey = t.date ? t.date.slice(0, 7) : '2026-10';
      monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + (t.amountCents || 0);
    });

  const totals = Object.values(monthlyExpenses);
  if (totals.length < 2) return 1.15;

  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const variance = totals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / totals.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / (avg || 1); // Coeficiente de Variação

  // Se o usuário possui padrão de gastos muito instável, eleva a margem de segurança conservadora até 25%
  return Math.min(1.30, Math.max(1.10, 1 + cv));
}
