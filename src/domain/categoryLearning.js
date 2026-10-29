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
function parseLearningRules(raw) {
  if (raw === null || raw === undefined || raw === '') return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('O arquivo de regras de categorização tem estrutura inválida.');
  }
  for (const [keyword, rule] of Object.entries(parsed)) {
    if (!keyword || !rule || typeof rule !== 'object' || Array.isArray(rule)
      || typeof rule.categoryId !== 'string' || !rule.categoryId.trim()
      || (rule.count !== undefined && (!Number.isSafeInteger(rule.count) || rule.count < 0))) {
      throw new Error('O arquivo de regras de categorização contém uma regra inválida.');
    }
  }
  return parsed;
}

const isDesktopStorage = () => typeof window !== 'undefined' && Boolean(window.electronAPI?.isDesktop);

/** Atualiza regras como dado puro, para serem persistidas junto ao estado canônico. */
export function updateCategoryRuleMap(currentRules, description, categoryId, now = new Date().toISOString()) {
  if (!description || !categoryId) return currentRules && typeof currentRules === 'object' ? currentRules : {};
  const keyword = extractKeyword(description);
  if (!keyword) return currentRules && typeof currentRules === 'object' ? currentRules : {};
  const rules = currentRules && typeof currentRules === 'object' && !Array.isArray(currentRules)
    ? currentRules
    : {};
  const previous = rules[keyword];
  return {
    ...rules,
    [keyword]: {
      categoryId,
      updatedAt: now,
      count: (Number.isSafeInteger(previous?.count) && previous.count >= 0 ? previous.count : 0) + 1
    }
  };
}

/** Descarta regras órfãs ou cruzadas entre os perfis PF/PJ. */
export function filterCategoryRuleMap(rules, categories, profileType = 'PF') {
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) return {};
  const categoryById = new Map((Array.isArray(categories) ? categories : [])
    .filter(category => category && typeof category.id === 'string')
    .map(category => [category.id, category]));
  const filtered = {};
  for (const [keyword, rule] of Object.entries(rules)) {
    const category = categoryById.get(rule?.categoryId);
    if (!keyword || !category || (category.profileType && category.profileType !== profileType)) continue;
    if (rule.count !== undefined && (!Number.isSafeInteger(rule.count) || rule.count < 0)) continue;
    filtered[keyword] = {
      categoryId: rule.categoryId,
      ...(typeof rule.updatedAt === 'string' ? { updatedAt: rule.updatedAt } : {}),
      ...(Number.isSafeInteger(rule.count) && rule.count >= 0 ? { count: rule.count } : {})
    };
  }
  return filtered;
}

function readLearningRulesStrict() {
  if (typeof localStorage === 'undefined') throw new Error('Armazenamento de regras de categorização indisponível.');
  return parseLearningRules(localStorage.getItem(LEARNING_RULES_KEY));
}

/**
 * Carrega regras de categorização. Um erro não é convertido em uma escrita vazia:
 * a leitura tolerante serve apenas para previsões, nunca para substituir o arquivo.
 */
export function loadLearningRules() {
  // Electron persiste esses metadados dentro do estado protegido do aplicativo;
  // nunca grava palavras-chave de descrições comerciais em localStorage do renderer.
  if (isDesktopStorage()) return {};
  try {
    return readLearningRulesStrict();
  } catch (err) {
    console.error('Erro ao carregar regras de aprendizado; as regras persistidas foram preservadas:', err);
    return {};
  }
}

/**
 * Registra uma regra sem sobrescrever silenciosamente um catálogo ilegível.
 */
export function recordCategoryRule(description, categoryId) {
  if (isDesktopStorage()) return { saved: false, reason: 'Aprendizado persistente desktop é mantido no estado protegido do aplicativo; gravação auxiliar no renderer desativada.' };
  if (!description || !categoryId) return { saved: false, reason: 'Descrição ou categoria ausente.' };
  const keyword = extractKeyword(description);
  if (!keyword) return { saved: false, reason: 'Não foi possível extrair uma palavra-chave.' };

  let rules;
  try {
    rules = readLearningRulesStrict();
  } catch (err) {
    const reason = err?.message || 'As regras de aprendizado não puderam ser lidas.';
    console.error(`Regra não salva para evitar sobrescrever dados de categorização: ${reason}`);
    return { saved: false, reason };
  }

  const previous = rules[keyword];
  rules[keyword] = {
    categoryId,
    updatedAt: new Date().toISOString(),
    count: (previous?.count || 0) + 1
  };

  try {
    const serialized = JSON.stringify(rules);
    localStorage.setItem(LEARNING_RULES_KEY, serialized);
    if (localStorage.getItem(LEARNING_RULES_KEY) !== serialized) {
      return { saved: false, reason: 'A gravação não pôde ser confirmada por leitura.' };
    }
    return { saved: true, rules };
  } catch (err) {
    const reason = err?.message || 'Falha ao gravar regras de aprendizado.';
    console.error('Erro ao salvar regra de aprendizado:', err);
    return { saved: false, reason };
  }
}

/**
 * Tenta prever a categoria ideal de um lançamento importado usando as regras aprendidas.
 */
export function predictCategory(description, defaultCategoryId = 'outros', suppliedRules = undefined) {
  if (!description) return defaultCategoryId;
  const keyword = extractKeyword(description);
  const rules = suppliedRules === undefined ? loadLearningRules() : parseLearningRules(JSON.stringify(suppliedRules));

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
