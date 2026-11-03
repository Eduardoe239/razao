// Gera INDICE.md e SHA256SUMS das evidências visuais (não modifica as imagens).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const E = 'C:/Users/<usuario>/Desktop/razao/docs/audit/fase0/evidencias/visual';
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.png')) files.push(path.relative(E, p).replace(/\\/g, '/')); } })(E);
files.sort();

// Mapeamento fluxo/resultado por arquivo (módulos) — ★ = evidência selecionada
const M = {
  '01-inicializacao/splash-1440.png': ['1440×900', 'Splash', 'Inicialização', 'PASS', true],
  '01-inicializacao/primeira-leitura-vazia-1440.png': ['1440×900', 'Visão geral (vazia)', 'Primeira leitura sem tela branca', 'PASS'],
  '02-dashboard/dashboard-com-dados-1440.png': ['1440×900', 'Visão geral', 'Dados fictícios; saldo disponível R$ 0,00 × realizado negativo; datas UTC/ISO; receita "Alimentação"', 'FAIL (V-01, V-03, V-04, V-17)', true],
  '02-dashboard/periodo-3-meses.png': ['1440×900', 'Visão geral', 'Navegação de período', 'PASS'],
  '02-dashboard/valores-ocultos.png': ['1440×900', 'Visão geral', 'Ocultar valores', 'PASS', true],
  '02-dashboard/diagnostico-aberto.png': ['1440×900', 'Diagnóstico', 'Abrir diagnóstico', 'PASS (Escape não fecha — V-10)'],
  '02-dashboard/conferir-saldo-extrato.png': ['1440×900', 'Conferência de saldo', 'Abrir modal (somente leitura)', 'PASS (Escape não fecha — V-10)'],
  '03-lancamentos/modal-novo-lancamento.png': ['1440×900', 'Modal de lançamento', 'Data padrão 03/11 às 23h de 02/11 (UTC)', 'FAIL (V-01/FIN-05)', true],
  '03-lancamentos/lista-1440.png': ['1440×900', 'Lançamentos', 'Lista com nomes longos e valores grandes', 'PASS'],
  '03-lancamentos/busca-mercado.png': ['1440×900', 'Lançamentos', 'Busca', 'PASS'],
  '03-lancamentos/filtro-valor-minimo.png': ['1440×900', 'Lançamentos', 'Filtro avançado', 'PASS'],
  '04-recorrencias-compromissos/recorrencia-adicionada.png': ['1440×900', 'Visão geral', 'Recorrência e próximos compromissos', 'PASS'],
  '05-orcamentos/orcamento-inicial.png': ['1440×900', 'Orçamentos', 'Estado inicial', 'PASS'],
  '05-orcamentos/limite-salvo.png': ['1440×900', 'Orçamentos', 'Salvar limite; sem valor restante', 'FAIL (V-09)', true],
  '06-relatorios/relatorios-padrao.png': ['1440×900', 'Relatórios', 'Período padrão', 'PASS'],
  '06-relatorios/relatorios-periodo-alterado.png': ['1440×900', 'Relatórios', 'Mudança de período; valor vaza da rosca; "-12.0 meses"', 'FAIL (V-08)', true],
  '07-planejamento/planejamento-inicial.png': ['1440×900', 'Planejamento', 'Estado inicial', 'PASS'],
  '07-planejamento/pergunta-sugerida.png': ['1440×900', 'Planejamento', 'Pergunta sugerida', 'PASS'],
  '07-planejamento/pergunta-barra-superior.png': ['1440×900', 'Planejamento', 'Pergunta pela barra; resposta "sob controle" com saldo negativo', 'FAIL (AI-01)', true],
  '07-planejamento/cenario.png': ['1440×900', 'Planejamento', 'Troca de cenários', 'PASS'],
  '08-importacao/tela-importar.png': ['1440×900', 'Importar dados', 'Tela', 'PASS'],
  '08-importacao/modal-importacao.png': ['1440×900', 'Importador', 'Abrir modal (rótulo de demonstração)', 'PASS'],
  '08-importacao/revisao-duplicatas.png': ['1440×900', 'Importador', 'Revisão: R$ 450,00 para -4.50; linha D\'Avila ausente; estorno como saída; tipo só por cor', 'FAIL (FIN-01, FIN-03, FIN-04, V-14)', true],
  '09-perfil/perfil-resumo.png': ['1440×900', 'Perfil', 'Resumo', 'PASS'],
  '09-perfil/perfil-edicao.png': ['1440×900', 'Perfil', 'Edição e salvamento', 'PASS'],
  '10-preferencias/preferencias-padrao.png': ['1440×900', 'Preferências', 'Padrão', 'PASS'],
  '10-preferencias/ardosia-compacto.png': ['1440×900', 'Preferências', 'Trocar paleta e densidade', 'PASS'],
  '10-preferencias/apos-recarregar.png': ['1440×900', 'Preferências', 'Persistência após recarregar', 'PASS'],
  '11-historico-integridade/historico.png': ['1440×900', 'Histórico de Auditoria', 'Tabela/lista', 'PASS'],
  '11-historico-integridade/integridade.png': ['1440×900', 'Integridade', 'Tela', 'PASS'],
  '11-historico-integridade/integridade-executada.png': ['1440×900', 'Integridade', 'Verificação', 'PASS'],
  '12-pf-pj/lancamentos-pj.png': ['1440×900', 'Lançamentos (PJ)', 'PJ não exibe dados PF (filtro de exibição)', 'PASS'],
  '13-cartoes/estado-sem-cartao.png': ['1440×900', 'Cartões', 'Estado sem cartão; sem cadastro de cartão', 'PASS (estado) / FAIL (FUN-02)', true],
  '13-cartoes/ciclo-fatura-cartao-ficticio.png': ['1440×900', 'Cartões', 'Ciclo com cartão INJETADO', 'PASS*'],
  '13-cartoes/apos-pagamento.png': ['1440×900', 'Cartões', 'Pagamento bloqueado por saldo insuficiente (cartão injetado)', 'Observação → requisito REQ-INV-PAY-001'],
  '13-cartoes/pagamento-saldo-suficiente.png': ['1440×900', 'Cartões', 'Pagamento: 1 transferência, fatura PAGA (cartão injetado)', 'PASS*', true],
  '13-cartoes/dashboard-apos-pagamento.png': ['1440×900', 'Visão geral', 'Despesas inalteradas após pagamento (sem dupla contagem)', 'PASS*'],
  '14-recuperacao/principal-corrompido-com-copia.png': ['1440×900', 'Visão geral', 'Recuperação silenciosa (principal corrompido, cópia válida)', 'FAIL (DATA-02)', true],
  '14-recuperacao/sem-copia-valida.png': ['1440×900', 'Recuperação segura', 'Sem cópia válida: fail-closed', 'PASS'],
  '14-recuperacao/sem-copia-valida-375.png': ['375×812', 'Recuperação segura', 'Textos sem corte', 'PASS'],
  '14-recuperacao/apos-exportar-backup.png': ['1440×900', 'Diagnóstico', 'Exportar backup (JSON legível, sem aviso)', 'FAIL (SEC-03)'],
  '14-recuperacao/restaurar-confirmacao.png': ['1440×900', 'Diagnóstico', 'Restaurar backup com confirmação', 'PASS'],
  'acessibilidade/foco-teclado-1440.png': ['1440×900', 'Visão geral', 'Ordem de foco por Tab', 'PASS parcial (busca sem indicador — V-13)'],
  'acessibilidade/foco-modal-lancamento.png': ['1440×900', 'Modal de lançamento', 'Foco não contido no modal', 'FAIL (V-10)', true],
  'dedicados/alerta/01-alerta-gerado.png': ['1440×900', 'Planejamento', 'T1: alerta gerado com duplicidade sintética', 'PASS', true],
  'dedicados/alerta/02-alerta-dispensado.png': ['1440×900', 'Planejamento', 'T1: alerta dispensado pelo teclado', 'PASS', true],
  'dedicados/alerta/03-apos-recarregar.png': ['1440×900', 'Planejamento', 'T1: alerta reaparece após recarregar', 'FAIL (V-21)', true],
  'dedicados/recuperacao-local/01-tela-erro-interface.png': ['1440×900', 'Erro de interface (ErrorBoundary)', 'T2: falha injetada no harness', 'PASS (tela)', true],
  'dedicados/recuperacao-local/01b-tela-erro-interface-375.png': ['375×812', 'Erro de interface (ErrorBoundary)', 'T2: textos em 375', 'PASS'],
  'dedicados/recuperacao-local/02-apos-recuperacao-local.png': ['1440×900', 'Visão geral', 'T2: app reabre vazio sem aviso; LKG sobrescrito', 'FAIL (DATA-05)', true],
  'dedicados/recuperacao-local/03-diagnostico-apos-recuperacao.png': ['1440×900', 'Diagnóstico', 'T2: nenhuma cópia acessível pela UI', 'FAIL (DATA-05)', true],
  'zoom-200/dashboard.png': ['720×450 @2x (zoom 200%)', 'Visão geral', 'Zoom', 'PASS'],
  'zoom-200/lancamentos.png': ['720×450 @2x (zoom 200%)', 'Lançamentos', 'Zoom', 'PASS'],
  'zoom-200/orcamentos.png': ['720×450 @2x (zoom 200%)', 'Orçamentos', 'Zoom', 'PASS'],
  'zoom-200/modal-lancamento.png': ['720×450 @2x (zoom 200%)', 'Modal de lançamento', 'Rolagem interna; Salvar alcançável', 'PASS', true]
};
const TELA = { dashboard: 'Visão geral', lancamentos: 'Lançamentos', cartoes: 'Cartões', orcamentos: 'Orçamentos', relatorios: 'Relatórios', importar: 'Importar dados', planejamento: 'Planejamento', perfil: 'Perfil', preferencias: 'Preferências', historico: 'Histórico de Auditoria', integridade: 'Integridade', 'modal-lancamento': 'Modal de lançamento', 'modal-importacao': 'Modal de importação', 'modal-diagnostico': 'Diagnóstico', 'menu-movel-aberto': 'Menu móvel', 'titulo-barra-superior': 'Barra superior' };
const SELECTED_RESP = new Set(['responsivo/375x812/lancamentos.png', 'responsivo/375x812/modal-lancamento.png', 'responsivo/375x812/menu-movel-aberto.png', 'responsivo/375x812/dashboard-fim-da-pagina.png', 'responsivo/768x1024/dashboard.png', 'responsivo/1024x768/dashboard.png', 'responsivo/1366x768/dashboard.png', 'responsivo/390x844/titulo-barra-superior.png']);
const rows = [];
for (const f of files) {
  let r = M[f];
  if (!r && f.startsWith('responsivo/')) {
    const [, res, file] = f.split('/'); const base = file.replace('.png', '');
    const end = base.endsWith('-fim-da-pagina'); const key = base.replace('-fim-da-pagina', '');
    let result = 'PASS (estrutura)';
    if (key === 'relatorios' && res === '1440x900') result = 'FAIL (V-08)';
    if (key === 'titulo-barra-superior') result = 'PASS (título abreviado; H1 completo)';
    if (key === 'menu-movel-aberto') result = 'PASS (Escape fecha; foco não entra no menu — V-13)';
    if (key === 'modal-lancamento') result = 'PASS (layout) / campos sem rótulo (V-11)';
    if (key === 'dashboard' && !end) result = 'PASS (estrutura) / conteúdo: V-01, V-04';
    if (key === 'importar' || key === 'modal-importacao') result = 'PASS (estrutura)';
    r = [res.replace('x', '×'), TELA[key] || key, end ? 'Rolagem até o fim: barra inferior não cobre conteúdo' : 'Varredura responsiva', result, SELECTED_RESP.has(f)];
  }
  if (!r) r = ['?', '?', '?', 'não classificado'];
  const buf = fs.readFileSync(path.join(E, f));
  rows.push({ f, r, sha: crypto.createHash('sha256').update(buf).digest('hex'), size: buf.length });
}
const total = rows.reduce((a, x) => a + x.size, 0);
let md = `# Índice das evidências visuais — validação beta.20\n\n` +
  `**Gerado em:** 02/11/2026 · **Arquivos:** ${rows.length} PNG · **Total:** ${(total / 1048576).toFixed(1)} MiB · **Integridade:** \`SHA256SUMS\` (mesma pasta)\n\n` +
  `As capturas são os **originais** da validação, sem redimensionamento ou substituição posterior. Durante a própria validação, alguns arquivos foram regravados por reexecuções do roteiro antes da ordem de preservação (ver "Reexecuções" abaixo). ★ = evidência selecionada (citada nos relatórios). \`PASS*\` = obtido com cartão fictício injetado no perfil temporário (não existe cadastro de cartão na UI).\n\n` +
  `Relatórios: [\`../../RELATORIO_VALIDACAO_VISUAL_BETA20.md\`](../../RELATORIO_VALIDACAO_VISUAL_BETA20.md). Roteiros: \`_roteiros/\`. Saídas brutas: \`_resultados/\`. Dados: 100% fictícios.\n\n` +
  `## Reexecuções durante a validação\n- \`responsivo/375x812/modal-lancamento.png\` e \`responsivo/1440x900/modal-lancamento.png\`: recapturados após 1,2 s (a primeira captura pegou a animação de abertura).\n- \`responsivo/{375x812,390x844}/*-fim-da-pagina.png\`: recapturados com rolagem real (a primeira medição não rolava o documento).\n- \`responsivo/{375x812,390x844}/modal-diagnostico.png\`: capturados pelo menu móvel (o botão da barra superior não existe nessas larguras).\n- Módulos \`01\`–\`14\`: segunda execução do roteiro funcional (a primeira falhou a partir de Perfil por um modal deixado aberto pelo próprio roteiro).\n\n` +
  `| ★ | Arquivo | Resolução | Tela | Fluxo | Resultado | Bytes |\n|---|---|---|---|---|---|---|\n`;
for (const { f, r, size } of rows) md += `| ${r[4] ? '★' : ''} | [\`${f}\`](./${f}) | ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${size} |\n`;
fs.writeFileSync(path.join(E, 'INDICE.md'), md);
fs.writeFileSync(path.join(E, 'SHA256SUMS'), rows.map(x => `${x.sha}  ${x.f}`).join('\n') + '\n');
console.log(rows.length, 'arquivos;', rows.filter(x => x.r[4]).length, 'selecionados;', rows.filter(x => x.r[3] === 'não classificado').map(x => x.f));
