# O Razão — Validação visual e funcional da beta.20

**Data:** 02/11/2026, 22h50–23h15 (horário de Brasília) · **Base:** `1.22.0-beta.20` (`f011bcf` + documentação `778fca0`)
**Checklist:** `CHECKLIST_VALIDACAO_VISUAL_BETA.20.md` (raiz) · **Norma:** Plano Mestre V2.0 §60, §63.5–63.6, §68
**Modo:** validação, sem alteração de código, estilos, regras, dependências ou dados do proprietário.

Classificação: **PASS** · **FAIL** · **BLOCKED** (impedimento descrito) · **N/A**. Uma funcionalidade inexistente é FAIL quando o checklist a exige; nunca PASS.

---

## 1. Ambiente e método

| Item | Valor |
|---|---|
| Máquina | Notebook do proprietário, Windows 11 Pro 10.0.26300, Node 24.19.0, npm 11.17.0 |
| Aplicação | `npm run dev` (Vite 8.3.5) em `http://localhost:3000` |
| Navegador | Google Chrome do sistema controlado por `playwright-core` 1.64.1 |
| Perfil do navegador | **temporário por contexto** (descartado ao fechar), `locale pt-BR`, `timezone America/Sao_Paulo` |
| Dados | **100% fictícios**, criados pela própria interface ("Salário fictício", "Mercado fictício"…). Nenhum armazenamento real foi aberto |
| Dependências | `npm ci` (fiel ao lockfile; `ELECTRON_SKIP_BINARY_DOWNLOAD=1`). `playwright-core` instalado **somente** em diretório temporário fora do projeto. `package.json`/`package-lock.json` com hash idêntico antes/depois |
| Roteiros e saídas brutas | `evidencias/visual/_roteiros/*.cjs`, `evidencias/visual/_resultados/*.json` |
| Capturas | 152 PNG em `evidencias/visual/` (por módulo, por resolução, acessibilidade e zoom) |

**Desvios do checklist (registrados, não ocultados):**
- `npm.cmd install` foi substituído por `npm ci`, que instala exatamente o lockfile; `npm install` poderia regravá-lo.
- A largura 1366×768 do checklist foi incluída além das 5 pedidas.
- **Injeção controlada:** como não existe tela para cadastrar cartão (FUN-02), um cartão fictício foi gravado diretamente no `localStorage` do **perfil temporário** para exercitar ciclo e pagamento. Os resultados com cartão valem para o domínio/UI de fatura, **não** para a jornada do usuário.
- Zoom 200% emulado como viewport CSS 720×450 com `deviceScaleFactor 2` (equivalente geométrico de 1440×900 a 200%); não é o comando de zoom do navegador.

---

## 2. Checklist preenchido

### 2.1 Inicialização
| Item | Resultado | Evidência / observação |
|---|---|---|
| `npm install` conclui sem erro | **PASS** (via `npm ci`) | exit 0; aviso de script de instalação não aprovado em `electron-winstaller` |
| `npm test` conclui com código 0 | **PASS** | exit 0 (`evidencias/npm-test-notebook-windows.log`) |
| `npm run build` conclui sem erro | **PASS** | exit 0; JS 480,90 kB / CSS 66,67 kB; `dist/` ignorado pelo Git |
| `npm run dev` abre sem tela branca | **PASS** | splash exibida com aviso de armazenamento sem criptografia → painel. `01-inicializacao/splash-1440.png`, `primeira-leitura-vazia-1440.png`. **Divergência:** o README indica `127.0.0.1:3000`, mas o Vite escuta em `localhost` (IPv6); `127.0.0.1` recusou conexão (V-19) |

### 2.2 Larguras
Para cada largura, as 11 telas + modais de lançamento, importação e diagnóstico foram capturados (`responsivo/<largura>/`) e auditados no DOM (rolagem horizontal, controles fora da viewport, controles sobrepostos, texto cortado, barra inferior).

| Largura | Resultado | Observações |
|---|---|---|
| 375 × 812 | **PASS** (estrutura) | Sem rolagem horizontal, sem controle fora da tela ou sobreposto; barra inferior não cobre o fim (rodapé termina 26 px acima). Alvos de toque de 22 px (V-12); título da barra superior abreviado com reticências (H1 completo logo abaixo) |
| 390 × 844 | **PASS** (estrutura) | Igual a 375 |
| 768 × 1024 | **PASS** (estrutura) | Barra lateral só com ícones; placeholder da busca do topo cortado ("Pergunte sobre suas finan…"); "3 meses" quebra em duas linhas |
| 1024 × 768 | **PASS** (estrutura) | — |
| 1366 × 768 | **PASS** (estrutura) | — |
| 1440 × 900 | **PASS** (estrutura) | Valor grande vaza do gráfico de rosca em Relatórios (V-08) |

"PASS (estrutura)" significa: layout íntegro nessa largura. Defeitos de conteúdo que aparecem em todas as larguras estão nas jornadas e nas verificações transversais.

### 2.3 Jornadas por tela
| Jornada | Resultado | Detalhe |
|---|---|---|
| **Dashboard** — navegação de período | **PASS** | Mês ‹ › e Semana/Mês/3 meses alteram o rótulo (`02-dashboard/periodo-3-meses.png`) |
| Dashboard — esconder/exibir valores | **PASS** | 13 valores visíveis → 0 com olho ativado (`valores-ocultos.png`) |
| Dashboard — abrir lançamento | **PASS** | — |
| Dashboard — abrir diagnóstico | **PASS** | `diagnostico-aberto.png`; Escape não fecha (V-10) |
| Dashboard — coerência dos números | **FAIL** | "Saldo disponível" R$ 0,00 com saldo realizado −R$ 1.229.826,13 (V-01) |
| **Lançamentos** — buscar | **PASS** | 9 → 1 resultado para "Mercado" |
| Lançamentos — alterar status | **PASS** | Pendente → pago persistido |
| Lançamentos — editar | **PASS** | Pré-preenchido; valor aparece como `245.9` em vez de `245,90` (V-17) |
| Lançamentos — excluir após confirmação | **PASS** | Cancelar mantém; confirmar remove e audita `transaction_deleted` (exclusão física, DATA-03 já conhecido) |
| Lançamentos — abrir e limpar filtros | **PASS** | Valor mínimo 1.000,00 → 2 itens; limpar → 9 |
| Lançamentos — exportar CSV | **PASS** | CSV `;` com BOM; **fórmula neutralizada** (`'=SOMA(1;1)…`) — fecha SEC-09 |
| **Cartões** — estado sem cartão | **PASS** | Mensagem honesta, sem cartão fictício (`13-cartoes/estado-sem-cartao.png`) |
| Cartões — cadastrar cartão / compra no cartão | **FAIL** | Inexistente na UI (FUN-02) |
| Cartões — ciclo da fatura | **PASS\*** | \*Cartão injetado: fechamento, vencimento, uso do limite, saldo devedor corretos |
| Cartões — pagamento e atualização da lista | **PASS\*** | \*Gera **1** transferência conta→cartão, fatura "PAGA", botão some, despesas do painel inalteradas (sem dupla contagem). Bloqueio "saldo insuficiente" quando a conta está negativa (decisão de produto, §6) |
| **Orçamentos** — salvar limite | **PASS** | — |
| Orçamentos — mostrar utilizado/restante | **FAIL** | Mostra "X% utilizado"; **não mostra o restante** (V-09) |
| Orçamentos — remover limite | **PASS** | Sem confirmação, mas auditado (`budget_limit_removed`) |
| **Relatórios** — mudar período | **PASS** | 3M/6M/1Y e Semanal/Mensal/3 Meses alteram os dados |
| Relatórios — ler tabelas/gráficos sem cortar valores | **FAIL** | Valor vaza da rosca; "-12.0 meses" de autonomia (V-08) |
| **Planejamento** — pergunta sugerida | **PASS** | Resposta exibida, rotulada "Motor determinístico" |
| Planejamento — pergunta digitada no painel | **PASS** | — |
| Planejamento — pergunta pela barra superior | **PASS** | Navega para Planejamento e responde |
| Planejamento — trocar cenários | **PASS** | `aria-pressed` atualizado |
| Planejamento — dispensar alerta | ~~BLOCKED~~ → **PASS** (teste dedicado T1, §9) | Alerta gerado com duplicidade sintética e dispensado pelo teclado. A dispensa **não persiste** ao navegar/recarregar (V-21) |
| Planejamento — conteúdo da resposta | **FAIL** | "−R$ 1.230.093,69 livres… finanças sob controle!" (V-05) |
| **Importação** — abrir modal | **PASS** | Rotulado "Demonstração local — sem conexão bancária real" |
| Importação — validar arquivo/linhas | **FAIL** | `-4.50` → **R$ 450,00** (FIN-01); linha `D'Avila` **sumiu sem aviso** (FIN-03); linha inválida descartada sem relatório; "Estorno de compra" +100 exibido como saída (FIN-04). Entrada é por **colagem de texto**; não há seletor de arquivo (`08-importacao/revisao-duplicatas.png`) |
| Importação — revisar possíveis duplicatas | **PASS** | "Possível duplicata… confiança 70%", desmarcada por padrão |
| Importação — cancelar sem aplicar | **PASS** | Nenhum lançamento criado |
| **Perfil** — abrir edição e salvar | **PASS** | Nome, e-mail, telefone, título; persiste após recarregar |
| **Preferências** — paleta e densidade com persistência | **PASS** | Persistem ao navegar e ao recarregar |
| **Histórico e integridade** — tabelas sem cortar controles | **PASS** | Sem corte/rolagem horizontal em 375–1440 |
| **Recuperação/erro** — textos não cortam | **PASS** | 1440 e 375 (`14-recuperacao/sem-copia-valida-375.png`) |
| Recuperação — ação destrutiva exige confirmação/backup | **PASS** (restauração e `ErrorBoundary`: confirmação exigida) / **FAIL** (resultado da recuperação local, teste dedicado T2, §9) | Restaurar backup exige `confirm` com resumo e preserva cópia. "Tentar recuperação local" pede confirmação e cria cópia verificada, mas o app reabre vazio sem aviso e o salvamento automático sobrescreve principal e última cópia válida com estado vazio (DATA-05, V-22) |
| Recuperação — principal corrompido com cópia válida | **FAIL** | Restaura em silêncio, **sem aviso e sem preservar os bytes corrompidos** (DATA-02 confirmado na UI) |

Jornadas adicionais exercitadas: **recorrências/compromissos** PASS (cria regra, lista em "Próximos compromissos", gera 4 pendentes com confirmação); **conferir saldo do extrato** PASS (abre, somente leitura; Escape não fecha); **PF/PJ** PASS na exibição (PJ não mostra dados PF; aviso "separação PF/PJ ainda parcial" visível), mas o perfil volta a PF ao recarregar (FUN-07); **categorias** sem tela própria (N/A como jornada; defeito de filtro em V-03).

### 2.4 Verificações transversais
| Item | Resultado | Detalhe |
|---|---|---|
| Nenhum texto importante truncado, sobreposto ou ilegível | **FAIL** | V-08 (rosca); placeholder cortado em 768 (cosmético) |
| Nenhum botão fora da viewport, sob a navegação inferior ou atrás do menu | **PASS** | 0 ocorrências nas 6 larguras |
| Navegação móvel não cobre o último item | **PASS** | 375/390, todas as telas roladas até o fim |
| Foco visível, Escape fecha menu móvel, controles sem mouse | **FAIL** | Escape fecha o menu móvel (PASS); porém: modais não contêm o foco nem fecham com Escape; busca sem indicador de foco; "Restaurar Backup" inacessível por teclado; campos do modal sem rótulo associado (V-10, V-11, V-13) |
| Zoom não quebra layout | **PASS** | 200%: sem rolagem horizontal; modal rola e "Salvar" é alcançável (`zoom-200/`) |
| Valores grandes, negativos e nomes compridos | **FAIL** | Nomes longos quebram bem; negativos com sinal; **valor grande vaza na rosca** (V-08) |
| Cor não é a única indicação | **FAIL** | Lista e painel usam sinal +/− e texto "Despesa/Receita" (OK); na **revisão de importação** o tipo é indicado só pela cor vermelha (V-14) |

---

## 3. Problemas funcionais

| ID | Sev. proposta | Problema | Evidência | Impacto | Recomendação |
|---|---|---|---|---|---|
| **V-01** | **P0 (proposta de elevação do FIN-05)** | Lançamento feito após 21h (Brasília) recebe a data UTC do dia seguinte e **não entra no "Saldo disponível"**, pois o painel exclui datas "futuras" | Modal com data padrão **03/11/2026** às 23h de 02/11 (`03-lancamentos/modal-novo-lancamento.png`; auditoria registrou 02/11 23:00); painel com **R$ 0,00** disponível e −R$ 1.229.826,13 realizado (`02-dashboard/dashboard-com-dados-1440.png`); código `dashboardSummary.js` (`tx.date <= todayISO` local) | Saldo principal errado por até 3 horas por dia; registro no dia errado afeta mês, fatura e orçamento | Data civil local em todo ponto de criação (FIN-05) + teste com relógio às 23h BRT |
| V-02 | P1 | Datas em UTC também na recorrência (data inicial), no nome do CSV exportado e do backup (`…-2026-11-03`) | `_resultados/functional.json`, `restore.json` | Inconsistência de datas | Mesmo item V-01 |
| V-03 | P1 | Receita recebe categoria de despesa ("Salário fictício · Alimentação"); seletor de despesa oferece "Salário" | `02-dashboard/dashboard-com-dados-1440.png` | Relatórios por categoria errados | FUN-04 |
| V-04 | P1 | "Saldo disponível" (destaque) não é o saldo da conta e muda de significado com a massa (R$ 0,00 em um caso; −R$ 320,50 em outro com realizado −R$ 1,23 mi) | `02-dashboard/dashboard-com-dados-1440.png`, `responsivo/768x1024/dashboard.png` | Usuário lê o número errado como seu saldo | Definir um conceito único de saldo (FIN-08) e rotular o destaque |
| V-05 | P1 | Assistente afirma "finanças… sob controle!" com −R$ 1,23 mi livres | `07-planejamento/pergunta-barra-superior.png` | Orientação enganosa (Plano §40) | Mensagem condicionada ao sinal/limiares; caso de avaliação |
| V-06 | P1 | Importação: valor 100× maior, linha descartada sem aviso, linha inválida sem relatório, estorno como saída | `08-importacao/revisao-duplicatas.png` | Confirma FIN-01, FIN-03, FIN-04 na UI | beta.21 (21.2) |
| V-07 | P1 | Recuperação silenciosa com perda dos bytes corrompidos | `14-recuperacao/principal-corrompido-com-copia.png`, `_resultados/functional.json` | Confirma DATA-02 na UI | beta.22 |
| V-09 | P2 | Orçamento não mostra o valor restante | `05-orcamentos/limite-salvo.png` | Item do checklist não atendido | Exibir "restam R$ X" |
| V-15 | P2 | Perfil PF/PJ e aba ativa voltam ao padrão após recarregar | `_resultados/functional.json` (`pf_pj`, `perfil`) | Confirma FUN-07 | Persistir workspace ativo |
| V-16 | P2 | Backup exportado em JSON legível, sem aviso; o catálogo local guarda o texto integral do backup no `localStorage` | `_resultados/restore.json` | Confirma SEC-03; consome a cota do DATA-01 | Aviso + ADR-003 |
| V-18 | P3 | Tela Lançamentos tem dois botões "Novo lançamento" | `responsivo/375x812/lancamentos.png` | Redundância | Unificar |

## 4. Problemas visuais e de acessibilidade

| ID | Sev. proposta | Problema | Evidência | Recomendação |
|---|---|---|---|---|
| V-08 | P2 | Valor grande ultrapassa a rosca; "Independência (runway) **-12.0 meses**" (negativo, ponto decimal) | `06-relatorios/relatorios-periodo-alterado.png` | Ajuste de fonte/abreviação; formatar pt-BR; tratar saldo negativo |
| V-10 | P2 | Modais (lançamento, diagnóstico, conferência de saldo) **não fecham com Escape** e **não contêm o foco** (foco sai após 11 Tabs) | `_resultados/responsive.json` (`keyboard`), `acessibilidade/foco-modal-lancamento.png` | Diálogo acessível (WCAG 2.1.2/2.4.3) |
| V-11 | P2 | Campos Descrição, Categoria, Conta, Data e Status do modal sem rótulo associado; botão "✕" sem nome acessível | `_resultados/responsive.json` (`unlabeledControls`) | `label for`/`aria-label` |
| V-12 | P2 | Alvos de toque de 22 px (Pendente/Editar/Excluir, "Ver todas") em 375–768 | `_resultados/responsive.json` (`smallTargets`) | ≥24 px (WCAG 2.5.8) |
| V-13 | P2 | "Restaurar Backup" é um `<label>` sobre input oculto: **não recebe foco**; campo de busca sem indicador de foco; ao abrir o menu móvel o foco não entra nele | `_resultados/restore.json`, `responsive.json` | Botão real que aciona o input; estilo `:focus-visible` |
| V-14 | P2 | Revisão de importação indica entrada/saída apenas pela cor | `08-importacao/revisao-duplicatas.png` | Texto/sinal +/− (WCAG 1.4.1) |
| V-17 | P3 | Datas em ISO (`2026-11-03`, `2026-11`) em listas, compromissos, importação e planejamento; valor editado como `245.9` | várias capturas | Formatação pt-BR (Plano C.3) |
| V-19 | P3 | README aponta `127.0.0.1:3000`; servidor escuta em `localhost` | §2.1 | Corrigir documentação ou `server.host` |
| V-20 | P3 | Seletor de arquivo nativo sem estilo na tela de recuperação | `14-recuperacao/sem-copia-valida-375.png` | Botão estilizado |
| V-21 | P2 | Dispensa de alerta não persiste (estado só em memória); valor do alerta formatado como `R$ 59.90` | `dedicados/alerta/03-apos-recarregar.png` | Persistir dispensa por workspace; formatar pt-BR |
| V-22 | **P0 (DATA-05, D-009)** | Recuperação local do `ErrorBoundary` resulta em app vazio sem aviso; principal e LKG sobrescritos com estado vazio; dados preservados só na cópia interna pré-restauração, sem caminho na UI (perda de acesso; perda física definitiva não comprovada) | `dedicados/recuperacao-local/02-…`, `03-…` | Correção obrigatória na Alpha 1 (ficha DATA-05 em `RISK_REGISTER.md`) |

**Falsos positivos descartados após inspeção:** textos "cortados" `Buscar lançamentos`/`Filtrar por tipo`/`Sua pergunta financeira` são rótulos `.sr-only` (corretos); barra inferior/lateral no meio de capturas de página inteira é efeito da captura de elementos fixos; "texto abaixo do rodapé" em Integridade é o conteúdo recolhido de `<details>`; transparência do modal em 375 era a animação de abertura (refeita após 1,2 s).

**Identidade visual:** logo oficial presente na splash, barra lateral e menu móvel; paleta azul/branco/cinza sóbria em todas as telas, sem neon ou efeitos. Hierarquia, espaçamento e legibilidade consistentes nas 6 larguras. PASS.

## 5. Erros de console

| Origem | Resultado |
|---|---|
| Todas as jornadas e resoluções (≈ 25 contextos) | **0** erros/avisos de console e **0** `pageerror` |
| Teste de armazenamento corrompido | 2 `console.error` **esperados** ("Falha ao carregar o estado local… Cópia de recuperação ausente"), provocados deliberadamente |
| Log do servidor Vite | somente os 2 erros acima |

## 6. Limitações não verificáveis nesta execução

- **Electron/Windows desktop**, `safeStorage`, arquivos `.enc` e recuperação desktop: não executados (binário Electron não baixado; fase de release).
- **Leitor de tela (NVDA/Narrador)** e axe-core: não executados; a acessibilidade acima vem de inspeção de DOM e teclado.
- **Zoom real do navegador** (emulado por viewport) e preferências do sistema (alto contraste, movimento reduzido).
- **Navegadores** além do Chrome (Edge, Firefox, Safari/iOS) e dispositivos móveis reais (toque, teclado virtual).
- **Build de produção servido** (`vite preview`) não foi percorrido; a validação foi no servidor de desenvolvimento, como pede o checklist.
- **Jornada real de cartão**: exercitada só com cartão injetado; a jornada do usuário não existe.
- ~~**Dispensar alerta** do Planejamento e **"Tentar recuperação local"** do `ErrorBoundary`: BLOCKED (§2.3).~~ Desbloqueados pelos testes dedicados de §9. O `ErrorBoundary` no **Desktop** continua não verificado (exibe outra mensagem; Electron fora do escopo).
- **Volume** (10k+ lançamentos), cota do `localStorage` e performance: fora do escopo do checklist.
- Validação executada por automação: **não substitui o julgamento visual do proprietário**.

## 7. Relação com o gate da Fase 0 (Plano §68)

| Critério | Antes | Após esta validação |
|---|---|---|
| Versão/hash confirmados | ✅ | ✅ |
| Riscos P0 conhecidos | ✅ | ✅ confirmação na UI de FIN-01/03/04, DATA-02, FUN-02, FUN-04, FUN-07, SEC-03; elevações decididas pelo proprietário: FIN-05, FIN-08, DATA-02 (D-002) e DATA-05 (D-009) |
| Integridade de dados durante a Fase 0 | ✅ (dados reais) | ✅ **dados reais e ambiente principal intactos:** nenhum dado real usado; perfis de navegador temporários; lockfile/package intactos; nenhum arquivo rastreado de código alterado. ❌ **Produto:** no perfil sintético e isolado do T2, o principal e a última cópia válida **foram sobrescritos** com estado vazio; os dados fictícios ficaram preservados na cópia interna, porém **inacessíveis** pela aplicação (perda física definitiva não comprovada). DATA-05 é **P0** (D-009), T2 = **FAIL**, correção obrigatória na **Alpha 1** |
| Testes reproduzíveis | ✅ | ✅ roteiros arquivados em `_roteiros/` |
| Documentação alinhada | ✅ | ⚠️ divergência menor V-19 (README) |
| **Evidências visuais/manuais** | ⏳ | **Produzidas** (152 capturas + 7 dos testes dedicados, checklist completo). **Aprovadas como evidência técnica pelo proprietário em 02/11/2026 (D-001)** |
| Aprovação formal | ⏳ | ⏳ |

O gate da Fase 0 exige evidências e riscos **conhecidos**, não resolvidos. Os FAIL acima são achados de baseline, que alimentam o backlog; eles não impedem o fechamento da Fase 0, mas impedem qualquer declaração de prontidão do produto (Plano §88: "não liberar com P0 aberto").

## 8. Recomendação técnica

1. **A Fase 0 está tecnicamente apta a fechar**: base identificada, testes reproduzíveis, riscos mapeados e agora evidência visual/funcional completa do checklist. **Não declaro o gate aprovado**: o fechamento depende da revisão destas evidências e do aceite formal do proprietário.
2. Decisões pedidas ao proprietário junto com o aceite:
   - **Elevar FIN-05 a P0** (V-01: saldo principal errado após 21h) e incluí-lo na beta.21 ou como primeiro item da beta.22.
   - Regra de produto para pagamento de fatura com saldo insuficiente (hoje bloqueado).
   - Tratamento dos BLOCKED (dispensar alerta; recuperação do `ErrorBoundary`) — aceitar como pendência ou exigir massa/teste dedicado.
3. Incorporar V-03…V-20 ao `docs/risks/RISK_REGISTER.md` na próxima atualização documental (não feito nesta etapa, que é somente de validação).
4. Itens de acessibilidade (V-10…V-14) pertencem à Alpha 5/design system, mas V-10/V-13 afetam jornadas críticas e devem entrar como critério de aceite das telas tocadas nas próximas fases.

---

## 9. Testes dedicados aos itens BLOCKED (02/11/2026, após decisão D-006)

Ambiente idêntico ao §1: Chrome com perfil **temporário e isolado**, dados fictícios, servidor de desenvolvimento local. Nenhum arquivo do aplicativo foi alterado. Roteiro: `evidencias/visual/_roteiros/dedicated.cjs`; saída: `_resultados/dedicated.json`; capturas: `evidencias/visual/dedicados/`.

### T1 — Gerar alerta com dados sintéticos e dispensá-lo → **PASS** (com achado V-21)
| Passo | Resultado |
|---|---|
| Criar pela UI duas despesas "Assinatura de streaming fictícia", R$ 59,90, mesma data | 2 lançamentos |
| Planejamento → "Alertas e possíveis anomalias" | **1 alerta**: "Possível Cobrança Duplicada — dois lançamentos de R$ 59.90…" (`01-alerta-gerado.png`) |
| Focar "Dispensar alerta" e pressionar Enter (teclado) | **0 alertas**, estado vazio exibido; nenhum lançamento alterado (`02-alerta-dispensado.png`) |
| Navegar para outra aba e voltar | **1 alerta** novamente |
| Recarregar a página | **1 alerta** novamente (`03-apos-recarregar.png`) |

Conclusão: a ação de dispensar funciona e não altera dados financeiros; a dispensa é apenas em memória (V-21, P2). Valor no texto do alerta usa ponto decimal (V-21).

### T2 — Recuperação local do `ErrorBoundary` em perfil isolado → **executado; resultado FAIL (DATA-05 confirmado)**

**Método de provocação do erro (sem alterar código):** o roteiro substitui, **apenas no navegador de teste** (`addInitScript`), o construtor `Intl.NumberFormat` por um envoltório que lança erro ao formatar exclusivamente o valor sentinela 777,77. Ao lançar um valor de 777,77 pela UI, `formatMoney` (código do app, inalterado) falha durante a renderização, acionando o `ErrorBoundary` real. É injeção de falha de teste (Plano §63.8), não altera o aplicativo e não força resultado positivo: todo o comportamento observado após o erro é o do código existente.

| Passo | Armazenamento (lançamentos) | Resultado |
|---|---|---|
| Estado inicial: 2 lançamentos fictícios | principal 2 · LKG 2 | — |
| Lançar 777,77 → erro de renderização | principal 2 · LKG 2 (lançamento sentinela não gravado) | Tela "O Razão encontrou um problema" exibida, textos legíveis em 1440 e 375 (`01-…`, `01b-…`). **PASS** |
| "Tentar recuperação local" → **Cancelar** | principal 2 · LKG 2 | Confirmação exigida; nada alterado. **PASS** |
| "Tentar recuperação local" → **OK** | — | Cópia pré-restauração criada e verificada; chave principal removida; recarga |
| Após recarga (1,5 s) | **principal 0 · LKG 0 · pré-restauração 2** | App abre **vazio**, sem aviso de que os dados foram movidos (`02-…`). Salvamento automático **sobrescreveu o principal e a última cópia válida** com estado vazio. **FAIL** |
| Diagnóstico → Gerenciador de backups | — | "Nenhuma cópia histórica disponível" — **não há caminho na UI** para voltar à cópia pré-restauração (`03-…`). **FAIL** |

Conclusão: a confirmação e a cópia prévia funcionam, mas o desfecho deixa o usuário com o app vazio e sem aviso.
- **Comprovado (medição das chaves):** o principal e a última cópia válida foram sobrescritos com o estado vazio pelo salvamento automático; os 2 lançamentos **permaneceram preservados** na cópia interna `…pre-restore-backup`.
- **Comprovado (UI):** nenhuma tela dá acesso à cópia interna; o Gerenciador de backups informa "Nenhuma cópia histórica disponível". Trata-se de **perda de acesso**, recuperável hoje só por intervenção técnica.
- **Não comprovado:** perda física definitiva da cópia interna. Pela leitura do código, uma restauração posterior reutilizaria a mesma chave e poderia sobrescrevê-la — inferência não testada.

Resultado do T2: **FAIL**. Confirma **DATA-05**, elevado a **P0** pelo proprietário (D-009) e alocado como correção obrigatória e prioritária da **Alpha 1**, com critérios de aceite em `docs/risks/RISK_REGISTER.md` (ficha DATA-05).

Limitação: o `ErrorBoundary` do **Desktop** (mensagem diferente, sem redefinição) não foi exercitado — permanece **NÃO VERIFICADO** (Electron fora do escopo desta fase).

## 10. Decisões do proprietário sobre esta validação

Registradas em [`docs/PRODUCT/DECISIONS.md`](../../PRODUCT/DECISIONS.md): D-001 (validação aprovada como evidência técnica), D-002 (FIN-05, FIN-08, DATA-02 → P0), D-003 (assistente enganoso → P1, AI-01), D-004 (demais prioridades mantidas), D-005 (requisito de pagamento de fatura com saldo insuficiente → [`REQ-INV-PAY-001`](../../PRODUCT/REQUIREMENTS.md)), D-006 (testes dedicados, §9), D-007 (preservação das evidências, [`evidencias/visual/INDICE.md`](./evidencias/visual/INDICE.md)), D-009 (DATA-05 → P0 e Alpha 1), D-010 (evidências no Git normal, sem LFS). D-009 e D-010 estão registradas em `docs/PRODUCT/DECISIONS.md`, `docs/PROJECT_STATUS.md` e `docs/risks/RISK_REGISTER.md`.

**Situação de BLOCKED após §9:** nenhum item do checklist Web permanece BLOCKED. T1 = **PASS**; T2 = **FAIL**. A tela de erro da versão **Desktop** permanece **NÃO VERIFICADA** — é limitação desta validação, não aprovação.

**Evidências (D-010):** as 159 capturas originais, `evidencias/visual/INDICE.md` e `evidencias/visual/SHA256SUMS` são mantidos no Git normal, sem Git LFS, sem redimensionamento ou substituição.
