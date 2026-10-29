# O Razão — Redesign de UI/UX beta.20

**Data:** 29 de outubro de 2026  
**Escopo:** revisão ampla da camada de apresentação e dos fluxos visuais; regras financeiras e armazenamento foram preservados como fonte de verdade.

## 1. Pesquisa de referências públicas

As referências foram usadas para estudar padrões de produto, não para reproduzir telas, identidade ou propriedade intelectual.

| Referência | Padrão observado na comunicação pública | Decisão aplicada ao Razão |
|---|---|---|
| Organizze — https://www.organizze.com.br/ | Controle cotidiano de contas e cartões, registro de movimentos, organização por categorias e relatórios. | Destacar movimentações recentes, faturas, compromissos e organização simples da rotina financeira. |
| Mobills — https://www.mobills.com.br/ | Gestão de orçamento, acompanhamento de despesas, cartões e visualização de indicadores. | Manter visão geral, indicadores, filtros e relatórios, com hierarquia entre saldo, fluxo do período e detalhe por categoria. |
| Pierre — https://lp.pierre.finance/lp/converse | Posicionamento centrado na conversa e na leitura de contexto financeiro. | Dar um ponto de entrada conversacional ao assistente, mas explicitar que as respostas do Razão são produzidas por um motor determinístico local; não sugerir integração bancária ou inteligência remota que não esteja configurada. |

## 2. Direção visual

- Paleta clara e institucional: azul sóbrio, branco e cinzas frios; verde e vermelho são reservados aos estados financeiros; âmbar é reservado a atenção/pendências.
- Sem neon, brilho ciano/roxo, superfícies de vidro, sombras luminosas ou gradientes multicoloridos.
- Tipografia de sistema com números tabulares para facilitar a comparação de valores; tamanhos responsivos e conteúdo com quebras seguras.
- Cartões com bordas neutras, sombras discretas e raio consistente; menos decoração, mais distinção entre saldo, indicadores, lista e ações.
- Ícones de traço simples na navegação; emoji não é usado como principal sinal de estado em novos módulos reformulados.
- O tema inicial é claro; preferências disponíveis: azul institucional, azul ardósia e verde sóbrio.

## 3. Áreas reformuladas

- **Estrutura do app:** navegação agrupada em desktop, barra superior consistente, ação de novo lançamento, diagnóstico, modo de privacidade visual e seletor PF/PJ.
- **Celular:** menu lateral completo, navegação inferior com cinco destinos frequentes, botão flutuante controlado por breakpoint, áreas seguras do dispositivo e modais como folhas inferiores.
- **Tablet:** menu lateral compacto, grids fluidos e hierarquia que reduz colunas antes de comprimir conteúdo.
- **Dashboard:** período e navegação de data, ações rápidas, saldo disponível com indicadores separados, entradas/saídas, últimas movimentações, próximos compromissos e gerenciador de recorrências.
- **Lançamentos:** busca, filtros por status e filtros avançados por conta/cartão, categoria, datas e faixa de valores; ações explicitamente nomeadas, exportação CSV e estado vazio útil.
- **Planejamento:** perguntas sugeridas, envio de pergunta pelo topo, seleção de cenários, tabela comparativa e alertas com possibilidade de dispensar cada item.
- **Recorrências:** formulário em grupos lógicos, rótulos explícitos, feedback de validação e lista das regras com status e ações separadas.
- **Perfil e preferências:** API do componente alinhada às propriedades passadas pela aplicação; edição de perfil e preferências visuais com aplicação de atributos no documento.
- **Entrada, recuperação e erro:** telas de inicialização/recuperação usando a mesma linguagem visual; texto de armazenamento Web preservado; recuperação não promete integridade que não conseguiu verificar.
- **Componentes legados:** normalização global de superfícies, campos, tabelas e botões para reduzir diferenças entre módulos não reescritos integralmente.

## 4. Responsividade e acessibilidade implementadas no código

- Breakpoints principais: 1180 px, 980 px, 767 px, 560 px, 440 px e 420 px, além de ajustes para telas largas.
- Layout usa minmax, grids adaptativos, largura mínima segura e rolagem horizontal explícita para tabelas de dados que não cabem em celular.
- Estados de foco visíveis em controles interativos, títulos de seção e rótulos associados a campos; estados ativos expostos com `aria-pressed`/`aria-current` quando aplicável.
- Escape fecha o menu móvel; menu fechado é marcado como inerte para evitar tabulação em seus controles.
- Preferência de movimento reduzido respeitada com `prefers-reduced-motion`.
- Modais usam limites de altura com unidades dinâmicas de viewport e respeitam áreas seguras inferiores.
- O recurso de ocultar valores é apenas privacidade visual: não equivale a criptografia ou controle de acesso.

## 5. Segurança de apresentação e transparência

- O painel avisa que a alternância PF/PJ não é, por si só, barreira de acesso nem garantia de segregação contábil/fiscal. Isso não deve ser removido apenas para deixar a tela visualmente mais limpa.
- A tela de importação informa que a opção de conexão bancária disponível é demonstrativa e que não existe conexão real com instituições financeiras.
- Projeções são apresentadas como estimativas, não garantias.
- O assistente é descrito como motor determinístico, sem inventar uma IA remota ou uma conexão bancária.

## 6. Validação executada nesta revisão

- `npm test`: **terminou com código 0**, com os testes de domínio, integração, persistência/recuperação, contratos estáticos e os 10 testes finais de domínio sem falhas reportadas.
- Parser TypeScript usado como verificação sintática: **23/23 arquivos JSX** analisados sem diagnósticos de sintaxe.
- Parser PostCSS: `src/styles/theme.css` analisado sem erro de sintaxe.
- Atualizada a verificação de contrato estático para a versão `1.22.0-beta.20`.

## 7. Limites conhecidos — não declarar como concluído

- `npm install --ignore-scripts --no-audit --no-fund` excedeu o limite de execução deste ambiente; por isso não foi possível executar `npm run build` com as dependências reais nesta sessão.
- A tentativa de captura headless com Chromium ficou bloqueada por inicialização do navegador no ambiente. Portanto não há uma inspeção visual real e validada do produto renderizado nesta entrega.
- Não foram executados testes E2E de navegador, testes de toque reais em dispositivo, nem testes manuais de acessibilidade com leitor de tela.
- A responsividade foi implementada no código e verificada sintaticamente, mas ainda precisa de verificação visual do build real nos tamanhos recomendados no checklist.
- **A beta.20 é candidata de revisão de UI/UX; não significa aprovação da Fase 0 nem autorização para empacotamento/lançamento.**
