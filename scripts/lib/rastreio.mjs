// Rastreio requisito → teste (Volume 03, seção 1).
// Todo teste começa o título com o ID do requisito que cobre, por exemplo "[LAN-004] ...".

const ID = '[A-Z]{2,4}-\\d{2,3}';
// Só conta o ID que abre o título de um it, test ou describe.
const MARCA = new RegExp(
  `\\b(?:it|test|describe)(?:\\.\\w+)?\\(\\s*['"\`]\\[(${ID}(?:\\s*,\\s*${ID})*)\\]`,
  'g',
);
const LINHA_REQUISITO = new RegExp(
  `^\\| (${ID}) \\| ([^|]+)\\|.*\\| (Deve|Deveria|Poderia|Cancelado) \\| ([^|]+) \\|$`,
  'gm',
);

/** Lê a tabela de requisitos do Volume 03 em Markdown. */
export function lerCatalogo(markdown) {
  return [...markdown.matchAll(LINHA_REQUISITO)].map((m) => ({
    id: m[1],
    titulo: m[2].trim(),
    prioridade: m[3],
    fase: m[4].trim(),
  }));
}

/** Acha os IDs marcados entre colchetes num arquivo de teste. */
export function idsMarcados(texto) {
  const ids = [];
  for (const m of texto.matchAll(MARCA)) ids.push(...m[1].split(',').map((s) => s.trim()));
  return ids;
}

/**
 * Monta o rastreio da fase.
 * @param catalogo lista do Volume 03
 * @param testes mapa arquivo → texto
 * @param verificacoes mapa ID → descrição da verificação feita fora dos testes (job da CI, revisão)
 */
export function montarRastreio(catalogo, testes, verificacoes, fase) {
  const conhecidos = new Map(catalogo.map((r) => [r.id, r]));
  const cobertura = new Map();
  const desconhecidos = [];
  for (const [arquivo, texto] of Object.entries(testes)) {
    for (const id of idsMarcados(texto)) {
      const req = conhecidos.get(id);
      if (!req || req.prioridade === 'Cancelado') {
        desconhecidos.push({ id, arquivo });
        continue;
      }
      if (!cobertura.has(id)) cobertura.set(id, new Set());
      cobertura.get(id).add(arquivo);
    }
  }
  for (const id of Object.keys(verificacoes)) {
    if (!conhecidos.has(id)) desconhecidos.push({ id, arquivo: 'rastreio/verificacoes.json' });
  }
  const daFase = catalogo.filter((r) => r.fase === fase && r.prioridade !== 'Cancelado');
  const linhas = daFase.map((r) => ({
    ...r,
    testes: [...(cobertura.get(r.id) ?? [])].sort(),
    verificacao: verificacoes[r.id] ?? null,
  }));
  const semCobertura = linhas.filter((l) => l.prioridade === 'Deve' && !l.testes.length && !l.verificacao);
  return { fase, linhas, semCobertura, desconhecidos };
}

/** Gera o relatório em Markdown. */
export function relatorioMarkdown(r, data) {
  const cabecalho = [
    `# Rastreio — ${r.fase}`,
    '',
    `Gerado em ${data}. ${r.linhas.length - r.semCobertura.length} de ${r.linhas.length} requisitos com teste ou verificação.`,
    '',
    '| Requisito | Prioridade | Situação | Testes ou verificação |',
    '|---|---|---|---|',
  ];
  const corpo = r.linhas.map((l) => {
    const onde = l.testes.length ? l.testes.map((t) => `\`${t}\``).join(', ') : (l.verificacao ?? '—');
    const situacao = l.testes.length || l.verificacao ? 'Com teste' : 'Sem teste';
    return `| ${l.id} — ${l.titulo} | ${l.prioridade} | ${situacao} | ${onde} |`;
  });
  return [...cabecalho, ...corpo, ''].join('\n');
}
