# O Razão — Registro de riscos

**Atualizado em:** 03/11/2026 (21.2) · 02/11/2026 (decisões D-002 a D-004 do proprietário) · **Base:** beta.20 (`f011bcf`) · **Plano:** §88 (prioridade), §89 (riscos)
**Fontes:** `docs/audit/fase0/RELATORIO_AUDITORIA_FASE0.md` (IDs FIN/FUN/DATA/SEC/EST/QA) e `docs/audit/fase0/RELATORIO_VALIDACAO_VISUAL_BETA20.md` (IDs V-xx). Prioridades marcadas **(D-00x)** foram decididas pelo proprietário; as demais são propostas técnicas. "Incremento" é alocação **proposta**; nenhum item está resolvido por correção.

Estados: `ABERTO` · `CONFIRMADO NA UI` (reproduzido na validação visual) · `MITIGADO` (contenção sem correção) · `VERIFICADO SEM DEFEITO` · `RESOLVIDO` (com evidência) · `ACEITO` (pelo proprietário).

## P0 — bloqueadores

| ID | Risco | Impacto em dados/dinheiro | Evidência | Incremento proposto | Depende de | Estado |
|---|---|---|---|---|---|---|
| FIN-01 | Parser CSV/OFX corrompe valores (ponto decimal, milhar múltiplo) | valor importado errado até 100× | `evidencias/probe-import-resultado.txt`; `visual/08-importacao/revisao-duplicatas.png` (−4.50 → R$ 450,00) | beta.21 (21.2) | gate Fase 0 | **CORRIGIDO NA 21.2, aguardando aprovação** (`parseStatementAmount`; `docs/audit/beta21/evidencias/21.2/`; `scripts/test-statement-import.mjs`). Contenção mantida até o fechamento da beta.21 (21.3 pendente) |
| FIN-02 | `importedId` não determinístico (`Date.now()`) | reimportação pode duplicar | `importers.js:36,135` | beta.21 (21.3) | FIN-01 | ABERTO |
| FIN-03 | Linha CSV descartada sem aviso (apóstrofo alterna aspas); linha inválida sem relatório | movimento faltando | probe; `visual/08-importacao/revisao-duplicatas.png` | beta.21 (21.2) | gate Fase 0 | **CORRIGIDO NA 21.2, aguardando aprovação** (leitor RFC 4180; todo registro não vazio vira válido ou rejeitado com linha e motivo; `docs/audit/beta21/evidencias/21.2/`; `scripts/test-statement-import.mjs`) |
| **FIN-05** **(D-002)** | Datas civis em UTC: após 21h (BRT) o lançamento recebe a data do dia seguinte; o painel o trata como futuro e o exclui do saldo | **saldo principal errado** por até 3 h/dia; mês, fatura e orçamento errados | `visual/03-lancamentos/modal-novo-lancamento.png` (03/11 às 23h de 02/11); `visual/02-dashboard/dashboard-com-dados-1440.png`; `dashboardSummary.js` (`tx.date <= todayISO` local); V-01, V-02 | beta.21 ou 1º item da beta.22 (a decidir no plano do incremento) | — | CONFIRMADO NA UI |
| **FIN-08** **(D-002)** | Divergência entre saldo do ledger e do painel; destaque "Saldo disponível" não corresponde ao saldo da conta (R$ 0,00 com realizado −R$ 1,23 mi) | usuário lê saldo errado | `ledger.js` × `dashboardSummary.js`; `visual/02-dashboard/dashboard-com-dados-1440.png`; `visual/responsivo/768x1024/dashboard.png`; V-04 | beta.22 (conceito único de saldo + rótulos) | FIN-05 | CONFIRMADO NA UI |
| **DATA-02** **(D-002)** | Recuperação silenciosa: com principal corrompido e LKG válido, o LKG sobrescreve o principal sem preservar os bytes corrompidos e sem avisar | perda de evidência e de dados não refletidos no LKG; usuário não sabe que houve recuperação | `storage.js:75-95`; `visual/14-recuperacao/principal-corrompido-com-copia.png`; V-07 | beta.22 | P0-5 | CONFIRMADO NA UI |
| FUN-01 | Sem UI de contas | jornada essencial ausente | Relatório §6 | Alpha 2 | Alpha 1 (Workspace) | ABERTO |
| FUN-02 | Cartões/faturas inalcançáveis pela UI (sem cadastro de cartão nem compra no cartão) | recurso anunciado inutilizável | Relatório §6; `visual/13-cartoes/estado-sem-cartao.png` | Alpha 3 (ou rotular antes) | Alpha 1/2 | CONFIRMADO NA UI — **D-018:** ocultar funções operacionais durante a Alpha 1; disponíveis só na Alpha 3 (tarefa de interface a programar) |
| P0-5 | Sucesso exibido antes de a persistência confirmar | viola invariante §64.11 | Relatório §9.1, FUN-05 | beta.22 | beta.21 | ABERTO |
| **DATA-05** **(D-009; era P1)** | Recuperação local do `ErrorBoundary` (Web) leva à **perda de acesso** aos dados: o app reabre vazio sem aviso e o salvamento automático sobrescreve o principal e a última cópia válida com estado vazio; os lançamentos ficam apenas numa cópia interna sem caminho na aplicação | perda de acesso comprovada; perda física definitiva **não comprovada** (ver ficha abaixo) | teste dedicado T2 (`visual/dedicados/recuperacao-local/`, `_resultados/dedicated.json`); `ErrorBoundary.jsx:27-70`; `storage.js:74-76`; V-22 | **Alpha 1 — correção obrigatória e prioritária** (ficha abaixo) | P0-5 | CONFIRMADO NA UI — contenção operacional ativa |

### Ficha DATA-05 — perda de acesso a dados após "Tentar recuperação local"

**Prioridade:** P0 (decisão D-009 do proprietário, 02/11/2026). **Plataforma:** Web. Desktop: **NÃO VERIFICADO** (a tela de erro Desktop não oferece redefinição e não foi exercitada).

**Resultado observado no T2** (perfil de navegador temporário, dados fictícios; medição direta das chaves do `localStorage`):

| Momento | `razao_app_state_v3` (principal) | `…last-known-good` (última cópia válida) | `…pre-restore-backup` (cópia interna) |
|---|---|---|---|
| Antes do erro | 2 lançamentos | 2 lançamentos | inexistente |
| Tela de erro; "Tentar recuperação local" → Cancelar | 2 | 2 | inexistente |
| → OK, após recarga e salvamento automático | **0 (estado vazio gravado)** | **0 (estado vazio gravado)** | **2 lançamentos (preservados)** |

**Distinção obrigatória:**
- **Perda física comprovada:** o conteúdo anterior do principal e da última cópia válida foi substituído pelo estado vazio.
- **Perda de acesso comprovada:** os 2 lançamentos permaneceram na cópia interna `…pre-restore-backup`, mas a aplicação abriu vazia, não avisou, e o Gerenciador de backups informou "Nenhuma cópia histórica disponível". Pela leitura do código, a tela de inicialização só consulta essa cópia quando o principal é inválido — o que deixa de ocorrer depois que o estado vazio é gravado.
- **Perda física definitiva da cópia interna: NÃO comprovada.** Ao fim do T2 a cópia interna existia e continha os dados. Pela leitura do código (não testado), uma restauração posterior reutiliza a mesma chave e poderia sobrescrevê-la; limpar os dados do site também a removeria.

**Impacto:** o usuário vê o aplicativo vazio após uma ação apresentada como recuperação; pode concluir que perdeu tudo, recomeçar o cadastro (agravando a divergência) ou executar uma restauração que, segundo o código, sobrescreveria a única cópia remanescente. Viola Plano §64.10/§64.11 e a regra de recuperação do `CLAUDE.md`.

**Reprodução (somente em perfil temporário, dados fictícios):** 1) criar lançamentos; 2) provocar erro de renderização (no T2: injeção de falha no navegador de teste para o valor 777,77, sem alterar o código); 3) na tela "O Razão encontrou um problema", clicar "Tentar recuperação local" e confirmar; 4) aguardar a recarga; 5) observar app vazio e chaves conforme a tabela. Roteiro: `docs/audit/fase0/evidencias/visual/_roteiros/dedicated.cjs`.

**Contenção (até a correção, sem alteração de código):**
- Aviso operacional em `docs/PROJECT_STATUS.md`: diante da tela de erro, usar **"Recarregar aplicação"**; não usar "Tentar recuperação local" sem antes exportar backup JSON.
- Se a recuperação local já tiver sido usada: **não** executar nova restauração nem limpar dados do site; a cópia interna pode ser recuperada por intervenção técnica de suporte (procedimento manual, não é funcionalidade do produto).
- Usar somente dados fictícios na beta enquanto DATA-05 estiver aberto.

**Correção obrigatória na Alpha 1 — critérios de aceite:**
1. **Recuperação acessível:** toda cópia criada pela recuperação (inclusive a pré-restauração) é listada na aplicação e pode ser restaurada pelo usuário, com resumo de conteúdo (contagens, data).
2. **Preservação antes de sobrescrita:** nenhum principal, última cópia válida ou cópia de recuperação é sobrescrito sem que exista antes uma cópia verificada do conteúdo anterior; cópias de recuperação não são reutilizadas/sobrescritas por operações seguintes.
3. **Sem salvamento automático destrutivo:** durante e logo após uma recuperação, o salvamento automático fica bloqueado até ação explícita do usuário; estado vazio nunca é gravado por cima de dados existentes sem confirmação informada.
4. **Aviso explícito:** após recuperação, a interface informa o estado dos dados (o que foi preservado, onde, o que está ativo) e as opções disponíveis.
5. **Ação segura e informada:** nenhuma recuperação descarta ou sobrescreve dados sem ação explícita do usuário, precedida de explicação das consequências.
6. **Testes de regressão automatizados:** corrupção do principal (com e sem cópia válida), recuperação local, restauração encadeada, falha de gravação durante recuperação e recarga no meio do fluxo — verificando contagens/somas em todas as chaves antes e depois.


## P1 — essenciais

| ID | Risco | Evidência | Incremento proposto | Depende de | Estado |
|---|---|---|---|---|---|
| **AI-01** **(D-003)** | Assistente comunica situação positiva ("finanças… sob controle!") diante de saldo negativo/inconsistente | `visual/07-planejamento/pergunta-barra-superior.png`; V-05 | beta.22 ou Alpha 1 (regras de mensagem + caso de avaliação, Plano §40/§42) | FIN-08 | CONFIRMADO NA UI |
| SEC-01 | `electron/main.js`/`preload.js` residuais e inseguros (inativos) | `git show f011bcf --stat` | beta.21 (21.1) | gate Fase 0 | ABERTO |
| EST-05/EST-06 | 3 testes fora do runner; sem CI | `package.json` | beta.21 (21.1) | — | ABERTO |
| FIN-04 | "compra"/"pagamento" na descrição força despesa (estorno vira saída) | probe; `visual/08-importacao/revisao-duplicatas.png` | beta.21 (21.2) | — | **CORRIGIDO NA 21.2, aguardando aprovação** (sinal só do valor; `docs/audit/beta21/evidencias/21.2/`; `scripts/test-statement-import.mjs`) |
| FIN-06 | Sanitizador inventa `status`/`date`/`type` e descarta campos | `sanitize.js:44-50` | beta.22 — exige backup, dry-run e regra aprovada | P0-5 | ABERTO |
| FIN-07 | Sem moeda explícita | busca por `currency` | Alpha 1 | ADR-004 | ABERTO |
| FIN-09 | Idempotência em `useRef`/`setTimeout` | `App.jsx:584-658` | Alpha 1 (casos de uso) | ADR-003 | ABERTO |
| FUN-03 | Sem transferência na UI | `TransactionModal.jsx` | Alpha 2 | Alpha 1 | ABERTO |
| **IMP-01** | Importação: `predictCategory` (`categoryLearning.js:144-152`) devolve IDs fixos inexistentes (`alimentacao`, `transporte`, `lazer`) para descrições com "padaria", "restaurante", "açaí", "ifood", "uber", "posto", "combustivel", "99", "netflix", "spotify", "cinema", "steam"; `applyReconciliationDecisions` rejeita a categoria e **ignora o item** na confirmação (aviso no diálogo, não silencioso). Existia na beta.20, mascarado por FIN-03. Achado no E2E da 21.2 | `docs/audit/beta21/evidencias/21.2/e2e-21.2-resultado.json` (`csv_apply`) | **a decidir pelo proprietário** (fora do escopo da 21.2) | — | ABERTO |
| FUN-04 / V-03 | Categorias não filtradas por tipo; receita recebe "Alimentação" por padrão | `visual/02-dashboard/dashboard-com-dados-1440.png` | Alpha 2 | Alpha 1 | CONFIRMADO NA UI |
| FUN-05 | Pagamento de fatura: alerta de sucesso antes da persistência | `App.jsx:593-617`; diálogo registrado em `_resultados/responsive.json` | beta.22 (com P0-5) | — | CONFIRMADO NA UI |
| REQ-INV-PAY-001 | Pagamento de fatura hoje bloqueado com saldo insuficiente; requisito aprovado para permitir registro com aviso e confirmação | `docs/PRODUCT/REQUIREMENTS.md`; `visual/13-cartoes/apos-pagamento.png` | Alpha 3 | P0-5, FUN-02, FUN-09, FIN-08 | REQUISITO APROVADO (D-005), não implementado |
| DATA-01 | `localStorage` canônico, quota ~5 MB; catálogo de backups também guarda o texto integral | `storage.js`; `_resultados/restore.json` | Alpha 1 (POC) | ADR-003 | ABERTO |
| DATA-03 | Exclusão física de lançamento efetivado | Relatório §9.1 | Alpha 2 | DATA-04 | CONFIRMADO NA UI |
| DATA-04 | Auditoria truncada em 500 eventos (FIFO) | `auditLog.js:55,76`; UI exibe "máximo de 500 armazenados" | Alpha 1, após ADR-003 (mitigação na beta.22: aviso + exportação) | ADR-003 | ABERTO |
| SEC-02 | Web sem cifragem em repouso (dados + PII) | E2E smoke; aviso na splash | ADR-003 / privacidade | ADR-001 | ABERTO — declarado na UI |
| SEC-03 | Backup exportado em JSON legível, sem aviso de sensibilidade | `_resultados/restore.json` | Alpha 4 | — | CONFIRMADO NA UI |
| SEC-04 | Sync demo usa LWW | `outboxSync.js` | não evoluir; ADR-006 | — | ABERTO |
| EST-01/02/03 | `App.jsx` monolítico; mocks no bundle; documento único PF+PJ | Relatório §7 | Alpha 1 | ADR-002/003 | ABERTO |
| QA-01/QA-02 | Testes estáticos; sem E2E/propriedade/cobertura | Relatório §10 | contínuo, a partir da beta.21 (roteiros da validação são base de E2E) | — | ABERTO |
| PFPJ-01 | PF/PJ é filtro, não boundary (Plano §89) | `docs/audit/BASELINE_AS_BUILT.md` §7 | Alpha 1 | ADR-002 | ABERTO |

## P2 — expansão / qualidade (inclui achados da validação visual, D-004)

| ID | Risco | Evidência | Incremento proposto | Estado |
|---|---|---|---|---|
| V-08 | Relatórios: valor grande vaza da rosca; "Independência -12.0 meses" | `visual/06-relatorios/relatorios-periodo-alterado.png` | Alpha 4 (relatórios) | CONFIRMADO NA UI |
| V-09 | Orçamento não mostra valor restante | `visual/05-orcamentos/limite-salvo.png` | Alpha 3 | CONFIRMADO NA UI |
| V-10 | Modais sem Escape e sem foco contido | `visual/acessibilidade/foco-modal-lancamento.png` | design system / Alpha 5; critério nas telas tocadas antes | CONFIRMADO NA UI |
| V-11 | Campos do modal de lançamento sem rótulo associado; "✕" sem nome acessível | `_resultados/responsive.json` | idem | CONFIRMADO NA UI |
| V-12 | Alvos de toque de 22 px em 375–768 | `_resultados/responsive.json` | idem | CONFIRMADO NA UI |
| V-13 | "Restaurar Backup" inacessível por teclado; busca sem indicador de foco; foco não entra no menu móvel | `_resultados/restore.json`, `responsive.json` | idem | CONFIRMADO NA UI |
| V-14 | Revisão de importação indica entrada/saída só por cor | `visual/08-importacao/revisao-duplicatas.png` | beta.21 (21.2) se a tela for tocada; senão Alpha 4 | **CORRIGIDO NA 21.2, aguardando aprovação** ("Entrada +"/"Saída −" em texto; `evidencias/21.2/01-csv-revisao.png`) |
| UX-02 | Importador: fechar pelo ✕ mantém a etapa de revisão; ao reabrir, aparece a revisão anterior (comportamento da beta.20, observado no E2E da 21.2) | `docs/audit/beta21/evidencias/21.2/e2e-import-21-2.cjs` (`closeModal`) | Alpha 4 ou próximo incremento que tocar o modal | ABERTO |
| V-21 | Dispensa de alerta não persiste; valor do alerta com ponto decimal | `visual/dedicados/alerta/` | Alpha 3/5 | CONFIRMADO NA UI |
| FUN-06 | Recorrência só mensal | `recurring.js` | Alpha 3 | ABERTO |
| FUN-07 / V-15 | Perfil ativo e aba não persistem | `_resultados/functional.json` | Alpha 1 (workspace ativo) | CONFIRMADO NA UI |
| FUN-08 | Fluxos com `window.prompt/confirm/alert` | diálogos registrados em `_resultados/*.json` | Alpha 2/3 | CONFIRMADO NA UI |
| FUN-09 | Pagamento só total; refazer pagamento cancelado bloqueado | `invoicePayment.js` | Alpha 3 | ABERTO |
| FIN-10 | Fatura vazia vencida; faturas só do primeiro cartão | `invoices.js`; `App.jsx:226` | Alpha 3 | ABERTO |
| SEC-05 | Dados demo podem ser gravados no livro real | `ImportReconciliationModal.jsx` | Alpha 1 (workspace demo) | ABERTO |
| SEC-06/SEC-07/SEC-08 | Vulnerabilidades moderadas (dev); `saveFileDialog` sem sanitização; CSP com origens dev | Relatório §8 | release / Alpha 5 | ABERTO |
| UX-01, EST-04, EST-08 | Estilos inline, código morto, portas/CSP | Relatório §7, §10 | contínuo | ABERTO |

## P3 — hipótese / posterior

| ID | Item | Estado |
|---|---|---|
| V-17 | Datas em ISO, não pt-BR; valor editado como `245.9` | CONFIRMADO NA UI (formatação; correção junto com FIN-05) |
| V-18 | Dois botões "Novo lançamento" na tela Lançamentos | CONFIRMADO NA UI |
| V-19 | README aponta `127.0.0.1:3000`; servidor responde em `localhost` | CONFIRMADO |
| V-20 | Seletor de arquivo nativo sem estilo na recuperação | CONFIRMADO NA UI |
| EST-09 | `AppShell.jsx:3` importa o `package.json` inteiro só para exibir a versão: scripts, dependências e configuração de build vão para o bundle do cliente (sem segredos; exposição desnecessária e bundle maior). Achado durante a 21.1 | ABERTO — fora do escopo da beta.21; propor importação só da versão em incremento futuro |
| FIN-11, DEP-01, EST-07 | Journal de partidas dobradas, política de dependências, raiz poluída | ABERTO |
| Backend, sync, LLM, OCR visual, Open Finance, PJ avançado | gates próprios (Plano §91) | PLANEJADO |

## Verificados sem defeito

| ID | Item | Evidência |
|---|---|---|
| SEC-09 | Exportação CSV neutraliza fórmulas (`'=SOMA…`) | `_resultados/export-csv-ficticio.csv`; validação §2.3 |

## Riscos de processo

| ID | Risco | Mitigação |
|---|---|---|
| PROC-01 | Avançar para código com gate da Fase 0 aberto | `docs/PROJECT_STATUS.md` §2; nenhum incremento de código antes da aprovação |
| PROC-02 | Documentação histórica (60+ arquivos na raiz) contradiz o estado real | README alinhado; consolidação em `docs/` prevista (EST-07, P3) |
| PROC-03 | IDs antigos de importação não serão reconhecidos após 21.3 | documentar limitação; manter heurística de revisão; sem migração |
| PROC-04 | Evidências visuais (~17 MB) no repositório aumentam o histórico Git | **Decidido (D-010):** manter no Git normal, sem Git LFS; preservar originais, `INDICE.md` e `SHA256SUMS`; risco aceito pelo proprietário |

## Histórico

| Data | Alteração |
|---|---|
| 02/11/2026 | Criação a partir do Relatório da Fase 0 (Incremento 0.1) |
| 02/11/2026 | Validação visual: FIN-05, FIN-08, DATA-02 → P0 (D-002); AI-01 P1 (D-003); V-xx incorporados (D-004); DATA-05 confirmado por teste dedicado; SEC-09 verificado sem defeito; REQ-INV-PAY-001 registrado (D-005) |
| 02/11/2026 | DATA-05 → **P0** (D-009), com ficha (perda de acesso × perda física), contenção e critérios de aceite obrigatórios na Alpha 1; PROC-04 decidido: evidências no Git normal (D-010) |
| 03/11/2026 | 21.2 implementada (aguarda aprovação do proprietário): FIN-01, FIN-03, FIN-04 e V-14 corrigidos com testes unitários, de propriedade, de regressão e E2E. Novos achados IMP-01 (P1, categoria inexistente na importação) e UX-02 (P2, modal reabre na revisão anterior). Formatos com colunas de débito/crédito ou natureza D/C passam a ser recusados explicitamente (pipeline completo §27.2 fica para Alpha 2/4) |
| 03/11/2026 | 21.1 concluída (commit `4549207`, CI verde em 4 combinações): SEC-01 tratado no repositório (residuais removidos + teste de contrato); EST-05/EST-06 tratados (3 testes de domínio no runner; CI). Novo achado EST-09 (P3) registrado. Status final de SEC-01/EST-05/EST-06 será atualizado no fechamento da beta.21 |
