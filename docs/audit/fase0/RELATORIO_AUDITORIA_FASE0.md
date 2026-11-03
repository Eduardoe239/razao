# O Razão — Relatório de Auditoria da Fase 0 (Baseline As-Built)

**Data:** 03/11/2026
**Norma de referência:** `PLANO_MESTRE_O_RAZAO_V2.0.md` (SHA-256 `d2069c09…a044`), `CLAUDE.md` do pacote V2.0
**Modo:** somente leitura sobre o código. Nenhum arquivo rastreado foi alterado; nenhum commit, push, pull, reset, checkout, merge ou migração foi executado.
**Situação da Fase 0:** **ABERTA** — diagnóstico entregue; aguarda avaliação do proprietário. Há itens não verificáveis neste ambiente (ver §12.2).

> **Encerramento (02/11/2026):** Fase 0 **ENCERRADA** por aprovação formal do proprietário (D-012, `docs/PRODUCT/DECISIONS.md`). A situação "ABERTA" acima é o registro histórico da data da auditoria. Baseline, evidências e limitações: `docs/PROJECT_STATUS.md` §2.

> **Atualização 02/11/2026 (Incremento 0.1, executado no notebook do proprietário):** a identidade do notebook e o hash do ZIP beta.20 foram **verificados** e `npm test` foi executado no notebook (exit 0). Ver §2.3 e `evidencias/notebook-verificacao.txt`. Pendências remanescentes do gate: validação visual/manual pelo proprietário e aprovação formal (ver `docs/PROJECT_STATUS.md`). As seções originais abaixo foram mantidas como registro histórico; onde a atualização as supera, isso está indicado.

> **Atualização 02/11/2026 (validação visual e decisões do proprietário):** checklist visual/funcional executado e **aprovado como evidência técnica** (D-001) — ver §2.4 e `RELATORIO_VALIDACAO_VISUAL_BETA20.md`. **FIN-05, FIN-08 e DATA-02 elevados a P0** (D-002); **DATA-05 elevado a P0 e alocado como correção obrigatória da Alpha 1** (D-009); evidências visuais mantidas no Git normal, sem LFS (D-010); assistente enganoso registrado como **AI-01 (P1)** (D-003); requisito de pagamento de fatura com saldo insuficiente aprovado (`docs/PRODUCT/REQUIREMENTS.md`, REQ-INV-PAY-001). Severidades vigentes: `docs/risks/RISK_REGISTER.md`. A Fase 0 **não** está concluída: falta a aprovação formal do fechamento.

Convenção: **[FATO]** = verificado por código, comando ou execução; **[HIPÓTESE]** = inferência ainda não comprovada; **[RECOMENDAÇÃO]** = proposta técnica sujeita a aprovação.

---

## 0. Hierarquia normativa adotada

1. Decisões explícitas do proprietário (mensagens desta sessão e futuras).
2. `PLANO_MESTRE_O_RAZAO_V2.0.md` — referência normativa central (o próprio plano declara que código/evidência prevalecem sobre README/changelogs desatualizados).
3. `CLAUDE.md` do pacote — instruções curtas e permanentes; aponta para o plano.
4. `RESUMO_EXECUTIVO_E_AUDITORIA_O_RAZAO_V2.0.md` e `LEIA_PRIMEIRO` — material de consulta.
5. Skills `razao-*` — complementam, não substituem 2 e 3.
6. Documentos históricos do repositório (`AUDITORIA_FASE0_*`, `CHANGELOG_*`, `FASE_*`, README) — evidência histórica a ser reconciliada, não norma.

Incorporação feita (arquivos **novos, não commitados**): `CLAUDE.md` e `PLANO_MESTRE_O_RAZAO_V2.0.md` na raiz (conforme `LEIA_PRIMEIRO`, mesmos nomes); pacote original íntegro em `docs/plano-mestre-v2.0/`. Não existia `CLAUDE.md` anterior no repositório, portanto nada foi sobrescrito.

### 0.1 Skills
Carregada e utilizada nesta fase: **`razao-baseline-audit`** (contrato da Fase 0). As demais skills `razao-*` estão listadas como disponíveis (governance, product-spec, architecture, financial-domain, pf-pj-isolation, database-engineering, security-privacy, qa-engineering, ux-accessibility, ai-engineering, import-reconciliation, devops-release, code-review), mas **não foram carregadas** nesta sessão; os critérios correspondentes foram aplicados a partir do próprio Plano Mestre. Não declaro uso de especialização que não carreguei.

---

## 1. Estado real do projeto

| Item | Evidência |
|---|---|
| Ambiente desta auditoria | **Container de nuvem** (Claude Code remoto), Linux, Node `v22.23.4`, npm `10.9.9`. **Não é o notebook.** |
| Repositório | `github.com/Eduardoe239/razao` (clone fresco) |
| Branch de trabalho | `claude/upbeat-feynman-4m2y0k` = `main` = `origin/main` = `f011bcf718a140ee3c9d43d2b2cb47f1875d8964` |
| Branches remotas (`git ls-remote`) | apenas `refs/heads/main` |
| Tags / releases | **nenhuma** |
| Working tree | limpa (antes desta auditoria); agora apenas arquivos novos não rastreados (`CLAUDE.md`, `PLANO_MESTRE…md`, `docs/`) |
| Versão declarada | `package.json` → `1.22.0-beta.20`; **README → `1.22.0-beta.18`** (divergente) |
| Arquivos rastreados | 232; `src/` com 80 arquivos; ~10,6 mil linhas JS/JSX/CSS |
| Lockfile | `package-lock.json` v3 presente (324 pacotes) — **diferença em relação ao ZIP beta.20 descrito no plano, que não tinha lockfile** |

### 1.1 Histórico Git (fato)
```
* f011bcf 2026-10-29 Eduardoe239  Resolve merge priorizando a versão beta local   (HEAD, main)
|\
| * 0fcd406 2026-10-28 Luís Eduardo backend, open finance, criptografia local…   (package.json version "12.0.0")
| * … 89ef4a7, 43dd804, 2e5d943, 8015709, 9c77638
| * b21812c / 9aa207c / 11390b0 (ago/2026, "fase 1-3", version "1.0.0")
* e6f2f17 2026-10-29 Eduardoe239  Atualiza O Razão para a versão beta atual        (raiz órfã: +22.683 linhas, 230 arquivos)
```
- `e6f2f17` é um commit **sem pai** que importou a beta local inteira; o merge `f011bcf` uniu-o a uma linha histórica antiga e divergente (versão `12.0.0`).
- **O merge resultou em apenas 2 arquivos adicionais vindos da linha antiga:** `electron/main.js` (108 linhas) e `electron/preload.js` (19 linhas). Ver achado **SEC-01**.
- Arquivos vazios `dir` e `type` na raiz (provável resíduo de comando Windows `type nul > …`).

---

## 2. Comparação Notebook × GitHub × beta.20

| Referência | Disponível? | Identidade | Observação |
|---|---|---|---|
| **Notebook** | **NÃO VERIFICADO** | — | Nenhuma pasta de computador está conectada à sessão (`list_computer_folders` → vazio). Não há como ler branch, commit, `git status`, alterações não commitadas ou testes do notebook. |
| **GitHub** | Sim | `f011bcf` (main) | Auditado integralmente. |
| **ZIP beta.20** (`razao-v1.22.0-beta.20-redesign-ui-ux.zip`, SHA-256 esperado `b3f897ef…9b41`) | **NÃO** | — | O ZIP enviado (`SHA-256 488732a7…d658`) é o pacote de **documentação** do Plano Mestre; não contém código. Hash da beta.20 não pôde ser confirmado. |

### 2.1 Comparação GitHub × inventário beta.20 descrito no Plano (§7)

| Métrica do Plano (beta.20) | GitHub `f011bcf` | Resultado |
|---|---|---|
| `version` 1.22.0-beta.20 | 1.22.0-beta.20 | igual |
| React 19.3.1 / Vite 8.3.5 / plugin-react 6.1.2 / Electron 45.1.0 / electron-builder 26.18.1 | idênticos | igual |
| `engines.node >=22.12.0` | idem | igual |
| `src/` = 80 arquivos | 80 | igual |
| `src/App.jsx` = 1.026 linhas | 1.026 | igual |
| `electron/main.cjs` = 520 linhas | 520 | igual |
| `npm test`: 55 scripts, 101 testes de domínio, exit 0 | 55 scripts, 101 de domínio, exit 0 | igual |
| README declara beta.18 | declara beta.18 | igual (divergência herdada) |
| **Sem lockfile** | **Com `package-lock.json`** | **diferente** |
| — | `electron/main.js` + `electron/preload.js` legados | **diferente (adicionado pelo merge)** |
| — | arquivos vazios `dir`, `type` | **diferente** |

**[HIPÓTESE forte]** O commit `e6f2f17` é a beta.20 do notebook enviada ao GitHub em 29/10/2026, acrescida de `package-lock.json` gerado localmente. Todas as métricas estruturais coincidem. **Não é prova de identidade byte a byte** — isso exige o hash do ZIP ou acesso ao notebook.

### 2.2 Possíveis perdas/regressões
- Nenhuma perda detectada entre `e6f2f17` e `f011bcf` (o merge apenas adicionou 2 arquivos).
- A linha antiga (`0fcd406`, "12.0.0") é **anterior e inferior**; o merge corretamente priorizou a beta local. Seus artefatos residuais (`main.js`/`preload.js`) devem ser removidos (ver SEC-01).
- **Risco não verificável:** se o notebook tiver commits/alterações posteriores a 29/10, o GitHub está desatualizado. → **Superado em §2.3: não há.**

### 2.3 Verificação no notebook (Incremento 0.1, 02/11/2026) — [FATO]
| Item | Resultado |
|---|---|
| Ambiente | Windows 11 Pro 10.0.26300, Node `v24.19.0`, npm `11.17.0`, `core.autocrlf=true` |
| Branch / commit | `claude/upbeat-feynman-4m2y0k` @ `f59a67e` = origin; `main` @ `f011bcf` = `origin/main` |
| Árvore de trabalho | limpa; sem stash |
| ZIP beta.20 (`Desktop\razao-v1.22.0-beta.20-redesign-ui-ux.zip`) | SHA-256 `b3f897efe047ccd6986c9b9599284de6eef4fc7ad30f4242aa82c0dcecb29b41` — **coincide** com o Plano §7 |
| ZIP × árvore de trabalho (`diff -rq --strip-trailing-cr`) | **conteúdo idêntico** exceto: no repositório, `package-lock.json`, `electron/main.js`, `electron/preload.js`, `dir`, `type` e a documentação do Plano/auditoria; no ZIP, os diretórios **vazios** `api/src/controllers/` e `api/src/lib/` (não versionáveis pelo Git). Diferenças restantes são apenas CRLF |
| `npm test` no notebook | **exit 0**, todos os scripts com 0 falhas — `evidencias/npm-test-notebook-windows.log` |

**Conclusão:** a [HIPÓTESE forte] de §2.1 passa a **[FATO]**: o código em `f011bcf`/`f59a67e` é a beta.20 de referência + lockfile + 4 arquivos residuais do merge. Não existe versão posterior à beta.20 no notebook. A base oficial recomendada em §3 está confirmada (sujeita à aprovação do proprietário); o item 1 e o item 2 das condições de §3 estão cumpridos. O item 3 (remoção dos residuais) permanece para a beta.21.

### 2.4 Validação visual e funcional da beta.20 (02/11/2026) — [FATO]
Checklist `CHECKLIST_VALIDACAO_VISUAL_BETA.20.md` executado integralmente no notebook (Chrome, perfil temporário, dados fictícios), 6 larguras + zoom 200%, 159 capturas com índice e `SHA256SUMS` (`evidencias/visual/INDICE.md`). Relatório: `RELATORIO_VALIDACAO_VISUAL_BETA20.md`. Resultado: estrutura responsiva íntegra; falhas confirmadas na UI para FIN-01/03/04/05/08, DATA-02/05, FUN-02/04/07, SEC-03 e acessibilidade (V-10…V-14); SEC-09 verificado sem defeito. Testes dedicados: T1 alerta gerado e dispensado (**PASS**, dispensa não persiste); T2 recuperação local do `ErrorBoundary` Web (**FAIL**, DATA-05 — perda de acesso; cópia interna preservada). Tela de erro Desktop: **NÃO VERIFICADA**. Aprovado pelo proprietário como evidência técnica da baseline (D-001).

---

## 3. Melhor base de desenvolvimento

**[RECOMENDAÇÃO] Base oficial provisória: `main@f011bcf` (≡ `e6f2f17` + 2 arquivos legados)**, condicionada a:
1. o proprietário executar no notebook (somente leitura) e devolver a saída de:
   ```bash
   git status --short && git branch -avv && git log -5 --oneline && git rev-parse HEAD
   ```
   ```bash
   git diff --stat f011bcf
   ```
   ```bash
   npm test
   ```
2. se existir o ZIP beta.20, fornecer `sha256sum` dele para fechar a identidade;
3. remover, em incremento próprio, `electron/main.js`, `electron/preload.js`, `dir`, `type`.

Justificativa: é a única fonte de código verificada; coincide com todas as métricas da beta.20; possui lockfile reproduzível (`npm ci` OK); build e testes passam. Se o notebook divergir, **o notebook prevalece** e esta comparação deve ser refeita.

---

## 4. Inventário completo de funcionalidades

Legenda do Plano: **PV** produtiva e validada · **ISE** implementada sem E2E · **PARC** parcial · **DEMO** demonstrativa/mock · **PROT** protótipo · **PLAN** planejada · **INEX** inexistente · **DEF** defeituosa/não confiável · **NV** não verificada.

Observação geral: **nada é PV.** Não existe suíte E2E no repositório; o smoke E2E desta auditoria (Chromium, §11.3) cobre só o fluxo básico.

| Capacidade | Estado | Evidência principal |
|---|---|---|
| Cadastro / autenticação | **INEX (fail-closed)** | `api/src/routes/userAuth.js`, `auth.js` lançam erro; nenhuma tela de cadastro/login. Perfil local (`UserProfilePanel`) guarda nome, e-mail e telefone sem finalidade definida. |
| Separação PF/PJ | **PARC** | `profileType` por registro, `entitiesForProfile`, `migrateProfileScopedEntities`, validação cruzada em `stateValidation.js`. É **um único estado/arquivo** com filtro; não há Workspace/Membership. A UI exibe aviso honesto ("isolamento ainda parcial"). Perfil ativo não é persistido (sempre abre em PF). |
| Workspaces / autorização | **INEX** | Nenhuma entidade Workspace/Membership; Prisma sem `workspaceId`. |
| Contas | **DEF (jornada incompleta)** | Saldo derivado em `ledger.js` OK, mas **não existe UI para criar, editar, arquivar ou excluir contas**. Estado inicial cria 1 conta PF e 1 PJ fixas (`createFreshState`). Smoke E2E confirma ausência. |
| Transações (receita/despesa) | **ISE** | Criar/editar/excluir/alternar status funcionam (E2E smoke). Defeitos: exclusão física (DATA-03), data padrão em UTC (FIN-05), categorias de receita oferecidas para despesa, sem split, sem estorno formal. |
| Transferências | **PARC** | Domínio suporta (`ledger.js`, validação). **Sem UI para criar transferência** — `TransactionModal` só oferece receita/despesa. |
| Cartões e faturas | **DEF (inalcançável)** | Domínio de ciclos (`invoices.js`) e pagamento (`invoicePayment.js`) testados, mas **não há UI para cadastrar cartão** nem para lançar compra no cartão (o modal lista apenas contas). Só o primeiro cartão (`cards[0]`) é exibido. Sem pagamento parcial, estorno, crédito, limite. *Validação 02/11:* com cartão fictício injetado, ciclo e pagamento funcionam (1 transferência, sem dupla contagem); pagamento bloqueado com saldo insuficiente (ver REQ-INV-PAY-001). |
| Parcelamentos | **INEX** | Apenas campos `installmentsTotal/Index` no sanitizador; nenhuma lógica/UI. |
| Orçamentos | **ISE** | Limite mensal por categoria, mês atual apenas; inclui compras de cartão por data de compra (correto); sem rollover, sem períodos, sem orçado×projetado. |
| Recorrências | **PARC** | Só **mensal** (`dayOfMonth`); geração idempotente por `recurring:{id}:{date}` (bom); sem exceções, edição "esta e futuras", fim de mês documentado. |
| Compromissos / calendário | **PARC** | Lista "Próximos compromissos" (3 meses); sem calendário. |
| Previsões | **PROT** | `scenarioSimulator.js` usa multiplicadores fixos (0,85/0,90/1,15) — o Plano veda isso como probabilidade. `forecast.js` e `savings.js` só usados em testes. |
| Relatórios | **ISE** | `FinancialCharts`, `ExpenseAnalytics` (gráficos simples, sem alternativa tabular verificada). |
| Busca / exportação de lançamentos | **ISE** | `transactionSearch.js` com testes. Proteção contra CSV formula injection **verificada na UI em 02/11/2026** (`'=SOMA…`, SEC-09). |
| Importação CSV/OFX | **DEF** | Erros de escala monetária comprovados (FIN-01), IDs não determinísticos (FIN-02), perda silenciosa de linhas (FIN-03). |
| Conciliação de importação | **ISE** | Heurística explicável; não descarta por similaridade; baixa pendentes por match. Bom desenho; depende de parser defeituoso. |
| Conferência de saldo de extrato / ajuste | **ISE** | `balanceReconciliation.js` + `balanceCorrection.js` com chave de reconciliação. |
| Metas / poupança | **INEX na UI** | `savings.js` apenas em testes. |
| Dívidas, patrimônio, investimentos | **INEX** | — |
| Títulos a pagar/receber, clientes, centros de custo, DRE (PJ) | **INEX** | PJ = mesma UI de PF com filtro. |
| Backup / restauração | **ISE** | Exportação JSON, validação semântica, histórico local, restauração com pré-cópia e rollback (Web e Electron). Bem construído; não exercitado em Windows real. Backup exportado em texto puro. |
| Recuperação de boot (fail-closed) | **ISE** | E2E smoke: armazenamento corrompido → tela "Recuperação segura", bytes corrompidos preservados, autosave bloqueado. |
| Trilha de auditoria | **PARC** | Eventos com before/after locais; **limitada a 500 eventos com descarte FIFO** (DATA-04); mutável; não é append-only. |
| Painel de integridade / diagnóstico | **ISE** | `auditIntegrity.js`, `DiagnosticModal`. |
| IA (Assistente) | **PROT** | Regras determinísticas locais (`aiContextEngine.js`, `anomalyDetector.js`); **sem LLM**. Rotulagem verificada em 02/11 ("Motor determinístico"); resposta pode ser enganosa com saldo negativo (AI-01, P1). |
| OCR | **DEMO** | Regex sobre texto colado (`ocrService.js`); sem OCR de imagem; fail-closed para imagem. |
| Open Finance | **DEMO** | Simulador em memória com dados sintéticos; rotulado como demonstração; **itens sintéticos podem ser importados no livro real se selecionados** (SEC-05). |
| Backend | **INEX** | `api/` não tem servidor, `package.json`, rotas HTTP nem Prisma Client; as "rotas" são classes importadas **pelo frontend** (`src/services/apiClient.js`). Prisma schema sem workspace. |
| Sincronização | **DEMO / código morto** | `syncQueue.js`/`localDb.js` não são importados pela UI; `outboxSync.js` usa `Map` em memória e **LWW** (proibido pelo Plano para dados financeiros). |
| Segurança Electron | **ISE (boa)** | `main.cjs`: `contextIsolation`, `sandbox:true`, `nodeIntegration:false`, validação de remetente por URL exata, `safeStorage` sem fallback em texto puro, escrita atômica, bloqueio de popups/navegação. Windows real **NV**. |
| Segurança Web | **PARC** | CSP em `<meta>` (inclui origens de dev em produção); `localStorage` **sem cifragem** (o app declara isso). |
| Responsividade | **ISE** | *Validação 02/11:* 375/390/768/1024/1366/1440 e zoom 200% sem rolagem horizontal, controles fora da tela ou cobertos pela navegação inferior; defeitos pontuais V-08/V-12. |
| Acessibilidade | **PARC / NV** | Há `aria-*`, roles, foco em alguns componentes; modal de transação sem foco contido/Escape; uso de `alert/confirm/prompt` nativos para fluxos financeiros; sem axe/NVDA. *Validação 02/11:* confirmados V-10 a V-14 (modais sem Escape/foco contido, campos sem rótulo, alvos de 22 px, restauração inacessível por teclado, cor como único indicador). |
| Build Web | **ISE** | `vite build` exit 0 (480,9 kB JS / 137,7 kB gzip). |
| Build/distribuição desktop | **NV** (fora de escopo pela regra C.3) | `desktop:build` não executado. |

---

## 5. Arquitetura existente e arquitetura necessária

### 5.1 Existente (as-built)
```
index.html ─ main.jsx ─ App.jsx (1.026 linhas: estado global único, handlers de domínio, 276 estilos inline no total)
   ├─ components/ (22 telas/modais)
   ├─ domain/ (≈35 módulos puros, JS sem tipos)  ← bom ponto de partida
   ├─ services/storage.js  → Web: localStorage (estado + "last-known-good" duplicado)
   │                        → Desktop: IPC → electron/main.cjs → safeStorage + arquivo .enc atômico
   └─ services/apiClient.js → importa api/src/routes/*.js (mocks) para dentro do bundle do navegador
electron/main.cjs + preload.cjs (ativos)    electron/main.js + preload.js (legados, inativos, inseguros)
api/prisma/schema.prisma (sem backend)
```
- Um único documento JSON contém PF e PJ; toda gravação regrava o estado inteiro (e duas vezes na Web).
- Regras de negócio relevantes ainda vivem no `App.jsx` (orçamento inline, orquestração de pagamento, importação, ajustes).
- Não há camadas Application/Ports/Adapters, TypeScript, validação de schema em runtime (Zod etc.), roteamento nem design system de componentes.

### 5.2 Necessária (Plano §44–47)
Monólito modular: Presentation → Application (casos de uso com contexto de workspace, idempotência persistida) → Domain (puro) → Ports → Adapters (IndexedDB/SQLite/IPC/HTTP) → Backend Node/TS + PostgreSQL (somente quando houver decisão de modo online). Módulos-alvo: `workspace`, `ledger`, `cards`, `planning`, `imports-reconciliation`, `audit-recovery`, `reporting`, `assistant-ai`, `platform-adapters`.

### 5.3 Lacunas estruturais prioritárias
1. **Workspace como unidade de persistência** (um repositório por workspace), não filtro sobre um array comum.
2. **Camada de casos de uso** fora do React, que confirme persistência antes de reportar sucesso.
3. **Contrato de repositório** para trocar `localStorage` → IndexedDB sem tocar o domínio.
4. **Moeda explícita** (`currency`) em todo valor — hoje inexistente.
5. Remoção do código de servidor do bundle do cliente.

---

## 6. Problemas funcionais

| ID | Sev. | Problema | Evidência | Impacto | Recomendação |
|---|---|---|---|---|---|
| FUN-01 | **P0** | Não há UI para criar/editar/arquivar **contas** | `App.jsx` sem handler de contas; E2E: 0 elementos "nova conta" | Usuário fica preso a "Minha conta principal"; saldo inicial não editável | Alpha 2: CRUD de contas com saldo de abertura datado |
| FUN-02 | **P0** | Não há UI para **cartões** nem para **compra no cartão**; módulo de faturas é inalcançável | `TransactionModal` recebe só `accounts`; nenhum handler de cartão; `primaryCard = cards[0]` | Funcionalidade anunciada no menu não utilizável | Alpha 3 (cartão completo) ou ocultar/rotular até lá |
| FUN-03 | P1 | Sem UI para **transferência** | `TransactionModal.jsx` só receita/despesa | Usuário registra transferência como despesa+receita → infla receitas/despesas | Alpha 2 |
| FUN-04 | P1 | Seletor de categoria não filtra por tipo | E2E: "Salário" ofertado para despesa | Classificação incoerente, relatórios errados | Filtrar por `category.type` |
| FUN-05 | P1 | Pagamento de fatura: mensagem de sucesso exibida **antes** do updater validar; a 2ª validação pode descartar silenciosamente | `App.jsx:593-617` | Falso sucesso | Mover para caso de uso que retorna resultado confirmado |
| FUN-06 | P2 | Recorrência só mensal | `recurring.js` (`dayOfMonth`) | Escopo do Plano §20 não atendido | Alpha 3 |
| FUN-07 | P2 | Perfil ativo PF/PJ não persiste; sempre abre em PF | `useState('PF')` | Confusão de contexto | Persistir workspace ativo |
| FUN-08 | P2 | Fluxos financeiros dependem de `window.prompt/confirm/alert` | ex.: escolha de conta para pagar fatura via `prompt` digitando número | UX e acessibilidade ruins, erro de digitação | ConfirmDialog/Select acessíveis |
| FUN-09 | P2 | Pagamento de fatura somente total; após cancelar um pagamento, o novo é bloqueado pela mesma `idempotencyKey` | `invoicePayment.js` (chave inclui só saldo restante; ignora status cancelado) | Usuário não consegue refazer o pagamento | Chave por operação + exclusão de cancelados |

---

## 7. Problemas estruturais

| ID | Sev. | Problema | Evidência | Recomendação |
|---|---|---|---|---|
| EST-01 | P1 | `App.jsx` concentra estado, regras e telas | 1.026 linhas; orçamento implementado inline (linha 893/899) | Extrair casos de uso e view models gradualmente |
| EST-02 | P1 | Código "backend" importado no bundle do frontend | `src/services/apiClient.js` importa `../../api/src/routes/*` | Separar pacote `api/` real ou remover mocks do bundle |
| EST-03 | P1 | Estado único PF+PJ; gravação integral a cada mudança, duplicada na Web (principal + LKG) | `App.jsx:199-204`, `storage.js` | Workspace por repositório; IndexedDB (ADR-003) |
| EST-04 | P2 | Código morto/legado: `syncQueue.js`, `localDb.js`, `encryptedStorage.js`, `savings.js`, `forecast.js`, `getInitialState()` (dados fictícios), `parseToCents` (converte falha em 0) | grep de imports | Remover ou isolar com teste; impedir uso acidental |
| EST-05 | P2 | 3 testes de domínio não executados por `npm test` | `phase6.test.js`, `achievements.test.js`, `balance-correction.test.js` (passam quando executados manualmente) | Incluir no runner |
| EST-06 | P2 | Ausência de lint, typecheck, CI, runner de testes padrão | sem `.github/workflows`, sem ESLint/TS | Alpha 1: CI mínima (npm ci, test, build) |
| EST-07 | P3 | Raiz poluída: 60+ relatórios/changelogs por versão, arquivos vazios `dir`/`type` | `ls` | Consolidar em `docs/` e `CHANGELOG.md` único |
| EST-08 | P3 | Vite dev em 3000 vs Electron dev em 5173; CSP de produção inclui origens de dev | `vite.config.js`, `index.html` | CSP por ambiente |

---

## 8. Riscos de segurança e privacidade

| ID | Sev. | Risco | Evidência | Recomendação |
|---|---|---|---|---|
| SEC-01 | **P1** | Merge reintroduziu `electron/main.js`/`preload.js` legados: estado em **JSON texto puro**, `sandbox:false`, IPC sem validação de remetente, `loadState` retorna `null` em erro (provocaria estado vazio sobre dados), `openFileDialog` lê qualquer arquivo para o renderer | `git show f011bcf --stat`; arquivos lidos integralmente | Inativo hoje (`package.json main = main.cjs`; nada referencia `main.js`), mas é armadilha. Remover em incremento isolado |
| SEC-02 | P1 | Web: dados financeiros e perfil (e-mail, telefone) em `localStorage` **sem cifragem** | E2E: descrição legível no storage | Já declarado na UI; tratar em ADR-003/Privacidade; minimizar PII |
| SEC-03 | P1 | Backup exportado é JSON em texto puro, sem aviso de sensibilidade verificado | `DiagnosticModal.jsx:131-138` | Aviso + opção cifrada futura (Plano §29) |
| SEC-04 | P1 | Servidor de sync demonstrativo usa **LWW** | `api/src/routes/outboxSync.js` | Não evoluir este código; ADR-006 |
| SEC-05 | P2 | Dados sintéticos do "Open Finance demo" podem ser gravados no livro real se o usuário selecioná-los | `ImportReconciliationModal.jsx:43-77, 176` | Bloquear gravação de `open_finance_demo` fora de workspace de demonstração |
| SEC-06 | P2 | 15 vulnerabilidades **moderadas** em dependências de build (cadeia `electron-builder`: minimatch, glob, temp…); **0 em produção** (`npm audit --omit=dev`) | `evidencias/npm-audit.txt` | Tratar na fase de release; não atualizar em massa |
| SEC-07 | P2 | `saveFileDialog` aceita `filters` sem sanitização; `openFileDialog` OK | `main.cjs:461-475` | Sanitizar como em `openFileDialog` |
| SEC-08 | P3 | CSP só por `<meta>` e com origens dev | `index.html` | Header/CSP por build |
| SEC-09 | — | Proteção contra CSV formula injection na exportação | **verificado sem defeito em 02/11/2026** (`evidencias/visual/_resultados/export-csv-ficticio.csv`) | Manter como teste de regressão |

Pontos positivos comprovados: auth falha fechada; OCR/Open Finance não fingem sucesso; Electron `main.cjs` segue a maioria dos controles do Plano §53; nenhum segredo encontrado no repositório (inspeção manual dos arquivos lidos; secret scanning automatizado **não** executado).

---

## 9. Problemas de integridade financeira

| ID | Sev. | Problema | Evidência reproduzível | Impacto |
|---|---|---|---|---|
| FIN-01 | **P0** | **Parser CSV/OFX corrompe valores** | `evidencias/probe-import-resultado.txt`: CSV `-45.90` → **459000** centavos (R$ 4.590,00, 100×); `-1.234.567,89` → **123457** (R$ 1.234,57); OFX `-1.234,56` → **123** (R$ 1,23). Causa: `replace('.', '')` remove só o 1º ponto e trata ponto decimal como milhar (`importers.js`) | Lançamentos importados com valor errado; saldo errado. As fixtures da Fase 0 só usam vírgula decimal, por isso os testes passam |
| FIN-02 | **P0** | Importação CSV **não idempotente**: `importedId = csv-${linha}-${Date.now()}`; OFX sem FITID idem | probe: IDs diferentes a cada importação | Reimportar o mesmo arquivo não é bloqueado por ID; depende da heurística "revisar" → risco de duplicidade |
| FIN-03 | **P0** | **Perda silenciosa de linhas** no CSV: apóstrofo alterna "aspas" | probe: linha `D'Avila` desaparece sem aviso | Movimentos faltando sem erro |
| FIN-04 | P1 | Descrição contendo "compra"/"pagamento" força **despesa** mesmo com valor positivo | probe: "Estorno de compra" +100 → despesa | Estorno vira gasto (erro de sinal = 2× o valor) |
| FIN-05 | **P0** (D-002; era P1) | Datas civis calculadas em **UTC** (`toISOString().slice(0,10)`) em 31 pontos; ex.: data padrão do novo lançamento | `TransactionModal.jsx:20,30,38` | Após 21h (BRT) o lançamento cai no dia seguinte → mês/fatura/orçamento errados. **Confirmado na UI:** o painel exclui esses lançamentos do "Saldo disponível" (saldo errado) |
| FIN-06 | P1 | Sanitizador **inventa valores**: sem `status` → `pago`; sem `date` → hoje; sem `type` → despesa; e **descarta campos não listados** | `sanitize.js:44-50` | Contradiz o próprio comentário do módulo; pode efetivar pendências e apagar metadados futuros |
| FIN-07 | P1 | Nenhuma noção de **moeda** nos registros | busca por `currency` | Bloqueia multi-moeda e viola Plano §33.1 |
| FIN-08 | **P0** (D-002; era P1) | Saldo do ledger inclui lançamentos `pago` com **data futura**; painel exclui → dois "saldos" diferentes | `ledger.js` vs `dashboardSummary.js:123` | Inconsistência entre validação de pagamento e painel |
| FIN-09 | P1 | Idempotência só em `useRef` + `setTimeout` para ajustes e pagamentos (além da chave persistida no pagamento) | `App.jsx:584-616, 625-658` | Plano §33.5 exige unicidade persistida |
| FIN-10 | P2 | Fatura vazia vencida aparece como "vencida"; faturas só do cartão principal | `invoices.js:97-99`; `App.jsx:226` | Indicadores confusos |
| FIN-11 | P2 | Journal de partidas dobradas inexistente (transferência de 2 pernas apenas) | `ledger.js` | Direção arquitetural (ADR-004), não bloqueio imediato |

### 9.1 Matriz de mutações financeiras (as-built)

| Mutação | Onde | Validação prévia | Saldo | Fatura | Orçamento | Auditoria | Idempotência | Reversão |
|---|---|---|---|---|---|---|---|---|
| Criar receita/despesa | `handleSaveTransaction` | `validateTransactionMutation` | sim (se `pago`) | se conta=cartão (não alcançável pela UI) | sim (despesa) | `transaction_created` | não (ID novo a cada clique) | — |
| Editar | idem | idem | recalculado | idem | idem | `transaction_updated` before/after | n/a | sem histórico além do audit |
| Alternar status | `handleToggleStatus` | perfil | sim | — | — | `transaction_status_changed` | n/a | toggle |
| Excluir | `handleDeleteTransaction` | `confirm` | **remove fisicamente** | sim | sim | `transaction_deleted` (snapshot) | — | **inexistente** (só backup) |
| Pagar fatura | `handlePayInvoice` | `prepareInvoicePayment` ×2 | transferência conta→cartão | `paidCents` | não conta como despesa ✔ | `invoice_payment_registered` | chave persistida + `useRef` | cancelar manualmente |
| Ajuste de saldo | `handleApplyBalanceAdjustment` | `applyBalanceAdjustment` | sim | — | — | `balance_adjustment_applied` | `reconciliationKey` + `useRef` | — |
| Gerar recorrência | `handleGenerateRecurringOccurrences` | `materializeRecurringOccurrences` ×2 | pendente (não afeta) | — | ao pagar | por transação | chave `recurring:id:data` ✔ | excluir |
| Importar/conciliar | `handleImportConfirmed` | `applyReconciliationDecisions` ×2 | sim | — | sim | **só evento-resumo** | `importedId` (instável no CSV) | **inexistente** |
| Orçamento | inline `App.jsx:893` | `parseMoneyInputToCents` | — | — | sim | `budget_limit_set/removed` | n/a | remover |
| Restaurar backup | `handleRestoreBackup` | validação histórica + estrutural | substitui tudo | — | — | `backup_restored` (perfil fixo PF no boot) | n/a | pré-cópia ✔ |

**Persistência:** toda mutação → `setState` → efeito → `saveState` (assíncrono). O resultado `false` gera apenas `console.error` + evento de saúde; a UI já exibiu sucesso (viola Plano §5.10/§64.11 em termos de UX).

---

## 10. Dívida técnica

| ID | Sev. | Item |
|---|---|---|
| DATA-01 | P1 | `localStorage` como fonte canônica (quota ~5 MB, dobrada pelo LKG); sem IndexedDB/SQLite |
| DATA-02 | **P0** (D-002; era P1) | Recuperação silenciosa: se o principal está inválido e o LKG é válido, o LKG **sobrescreve o principal sem preservar os bytes corrompidos e sem avisar o usuário** (`storage.js:75-80`; `main.cjs` `recoverLastKnownGood`) |
| DATA-03 | P1 | Exclusão física de lançamentos efetivados (Plano §15.3/§28.2 exige reversão) |
| DATA-04 | P1 | Trilha de auditoria truncada em **500 eventos** (FIFO, `auditLog.js:55,76`) — histórico perdido silenciosamente |
| DATA-05 | **P0** (D-009; era P1) | "Redefinir estado" do `ErrorBoundary` (Web): remove a chave principal, recarrega em estado vazio, e o autosave **sobrescreve o principal e o LKG com o estado vazio**; a única cópia passa a ser o slot `pre-restore` (`ErrorBoundary.jsx:27-70`). **Confirmado por teste dedicado em 02/11/2026:** principal 0 · LKG 0 · pré-restauração 2 lançamentos. **Perda de acesso comprovada** (app vazio, sem aviso, sem caminho na UI); **perda física definitiva da cópia interna não comprovada** (a cópia existia ao fim do teste; sobrescrita por restauração posterior é inferência do código, não testada). Correção obrigatória e prioritária na **Alpha 1** — critérios em `docs/risks/RISK_REGISTER.md` (ficha DATA-05). Desktop: NÃO VERIFICADO. |
| QA-01 | P1 | 18 dos 55 scripts de teste são **puramente estáticos** (regex sobre o código-fonte) e outros 10 mistos — passam mesmo que o comportamento esteja errado |
| QA-02 | P1 | Sem E2E automatizado, sem testes de propriedade, sem cobertura medida |
| UX-01 | P2 | 276 blocos de estilo inline; sem design system de componentes (Plano §58) |
| DOC-01 | P2 | README em beta.18; documentação fragmentada em ~60 arquivos de versões anteriores |
| DEP-01 | P3 | Dependências exatas sem política de atualização; sem SBOM/licenças |

---

## 11. Resultados dos testes executados

### 11.1 `npm test` (sem instalar dependências)
- Comando: `npm test` · Node v22.23.4 · npm 10.9.9 · **exit 0** · 3,4 s.
- 55 scripts encadeados; suíte de domínio: **101 aprovados, 0 falhas**; demais scripts: todos "0 failed".
- Log completo: `evidencias/npm-test.log`.
- Testes gravam apenas em diretórios temporários do SO (`mkdtemp`); nenhum dado real envolvido.
- **Não executados pelo runner:** `phase6.test.js` (11 ok), `achievements.test.js` (ok, sem saída), `balance-correction.test.js` (20 ok) — executados manualmente nesta auditoria.

### 11.2 Reprodutibilidade, dependências e build
| Comando | Resultado |
|---|---|
| `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --ignore-scripts` | exit 0 (lockfile coerente com `package.json`) — scripts de instalação desativados por segurança; `node_modules/` é ignorado pelo Git |
| `npm audit` | 15 moderadas (cadeia electron-builder) |
| `npm audit --omit=dev` | **0** |
| `npx vite build --outDir <scratchpad>` | exit 0; JS 480,90 kB (137,68 kB gzip), CSS 66,67 kB |
| `desktop:build` / Electron | **não executado** (regra C.3 do Plano; binário Electron não baixado) |

### 11.3 Smoke E2E real (Chromium/Playwright, build de produção, dados fictícios)
Script: `evidencias/smoke.cjs` · resultado: `evidencias/e2e-smoke-resultado.json` · capturas `01…05.png`.
| Verificação | Resultado |
|---|---|
| App carrega após splash, sem erro de página | ✔ |
| Criar despesa "Teste fictício" R$ 45,90 → persiste após reload | ✔ |
| Alternar para PJ oculta o lançamento PF | ✔ (isolamento de exibição) |
| UI para criar conta / cartão | ✘ inexistente |
| Mobile 375 px sem rolagem horizontal | ✔ |
| Storage corrompido sem cópia → tela de recuperação, bytes preservados, sem autosave | ✔ |
| Storage em texto legível | ✔ confirmado (limitação conhecida) |

### 11.4 Sondas de domínio
`evidencias/probe-import.mjs` → `probe-import-resultado.txt` (base dos achados FIN-01 a FIN-04).

---

## 12. Falhas e limitações

### 12.1 Falhas comprovadas
FIN-01, FIN-02, FIN-03, FIN-04, FUN-01, FUN-02, FUN-03, FUN-04, SEC-01 (presença), DATA-04, EST-05, QA-01 — todas com evidência reproduzível acima.

### 12.2 Não verificado nesta sessão
- ~~**Estado do notebook** (branch, commits, alterações locais, testes) — sem acesso.~~ **Verificado em 02/11/2026 (§2.3).**
- ~~**Hash do ZIP beta.20** — arquivo não fornecido.~~ **Verificado em 02/11/2026 (§2.3).**
- ~~**Validação visual/manual da beta.20 no notebook**~~ — **executada e aprovada como evidência técnica em 02/11/2026** (§2.4).
- Execução Electron em Windows real; `safeStorage`; instalador.
- Acessibilidade com axe e NVDA; teclado e zoom 200% foram verificados em 02/11 (§2.4). Breakpoints 390/768/1024/1440 verificados em 02/11.
- Performance com 10k/50k/100k lançamentos e limite de quota do `localStorage`.
- Secret scanning automatizado e licenças.
- ~~Rotulagem visual do Assistente/IA e de todas as telas~~ — verificada em 02/11 (§2.4). Permanecem NV: `ErrorBoundary` Desktop, outros navegadores, dispositivos reais.
- Comportamento com fixtures volumosas pela UI (somente via testes de domínio).

---

## 13. Backlog priorizado

### P0 — bloqueadores de integridade/jornada
| # | Item | Achados | Critério de aceite resumido |
|---|---|---|---|
| P0-1 | Confirmar base: notebook × GitHub (+ hash beta.20) | §2 | Proprietário fornece saídas; divergências registradas |
| P0-2 | Reescrever parser monetário de importação usando `parseMoneyInputToCents` com política explícita (vírgula/ponto, milhar), CSV com aspas RFC 4180, sinal sem heurística de palavras | FIN-01, FIN-03, FIN-04 | Testes de propriedade + fixtures com ponto decimal, milhar múltiplo, apóstrofo, estorno; nenhuma linha descartada sem relatório |
| P0-3 | `importedId` determinístico (hash de conta+data+valor+descrição normalizada+ocorrência no arquivo; FITID quando houver) | FIN-02 | Reimportar o mesmo arquivo → 0 novos |
| P0-4 | Decisão sobre cartões/contas na UI: implementar (Alpha 2/3) **ou** rotular/ocultar módulos inalcançáveis até lá | FUN-01, FUN-02 | Nenhuma tela anunciada sem jornada utilizável |
| P0-5 | Falha de persistência visível e bloqueante (sem mensagem de sucesso antes da confirmação) | FUN-05, §9.1 | Teste de gravação falhando → UI mostra erro, sem "sucesso" |
| P0-6 (D-002) | Datas civis no fuso local em todo ponto de criação/filtro | FIN-05 | Lançamento às 23h BRT recebe a data local; entra no saldo do dia |
| P0-7 (D-002) | Conceito único de saldo entre ledger e painel, com rótulos claros | FIN-08 | Mesmo saldo por data de referência em ledger, painel e assistente |
| P0-8 (D-002) | Recuperação que preserva bytes corrompidos e avisa o usuário | DATA-02 | Principal corrompido → bytes preservados + aviso explícito |
| P0-9 (D-009) | Recuperação local sem perda de acesso nem sobrescrita destrutiva — **Alpha 1, obrigatória** | DATA-05 | 6 critérios da ficha DATA-05 (`RISK_REGISTER.md`): cópias acessíveis, preservação antes de sobrescrita, sem autosave destrutivo, aviso explícito, ação informada, testes de regressão |

### P1 — essenciais
P1-1 Remover `electron/main.js`, `preload.js`, `dir`, `type` (SEC-01, EST-07) · P1-2 Datas civis em fuso local/workspace (FIN-05) · P1-3 Sanitizador sem defaults inventados e preservando campos (FIN-06) · P1-4 Auditoria sem truncamento silencioso + arquivamento (DATA-04) · P1-5 Recuperação que preserva bytes corrompidos e avisa (DATA-02) · P1-6 Corrigir "redefinir estado" (DATA-05) — **reclassificado P0 (D-009) e substituído por P0-9, Alpha 1** · P1-7 Exclusão → cancelamento/reversão (DATA-03) · P1-8 UI de transferência + filtro de categorias (FUN-03, FUN-04) · P1-9 Moeda explícita (FIN-07) · P1-10 Um conceito de saldo por data de referência (FIN-08) · P1-11 Runner de testes completo + CI mínima (npm ci/test/build) (EST-05, EST-06) · P1-12 Substituir testes estáticos críticos por testes comportamentais (QA-01) · P1-13 ADR-001/002/003 (modo local, Workspace, storage) · P1-14 Workspace/Membership local + migração dry-run (Plano §11.7) · P1-15 Remover mocks de backend do bundle (EST-02) · P1-16 Bloquear gravação de dados demo no livro real (SEC-05) · P1-17 README/versão alinhados (DOC-01).

### P2 — expansão/qualidade
Recorrências completas (FUN-06) · persistir workspace ativo (FUN-07) · substituir `prompt/confirm` (FUN-08) · pagamento parcial e refazer pagamento cancelado (FUN-09) · faturas multi-cartão (FIN-10) · IndexedDB (DATA-01) · design system/tokens (UX-01) · E2E Playwright + axe (QA-02) · CSP por ambiente, sanitizar `saveFileDialog` (SEC-07, SEC-08) · aviso/cifra de backup (SEC-03) · remover código morto (EST-04) · previsão sem multiplicadores fixos.

### P3 — hipótese/posterior
Journal de partidas dobradas (ADR-004, FIN-11) · backend/PostgreSQL · sync · LLM · OCR visual · Open Finance · patrimônio/dívidas · módulos PJ (títulos, DRE) — cada um com gate próprio e decisão do proprietário (Plano §91).

---

## 14. Dependências entre tarefas
```
P0-1 (base confirmada) ─┬─> todas as demais
                        ├─> P1-1 limpeza legado ─> P1-11 CI
                        ├─> P0-2 parser ─> P0-3 IDs determinísticos ─> (Alpha 4 conciliação)
                        ├─> P1-2 datas ─┐
                        ├─> P1-3 sanitizador ─┤
                        │               └─> P1-9 moeda ─> P1-13 ADRs ─> P1-14 Workspace+migração
                        │                                                  └─> P0-4 contas/cartões na UI (Alpha 2/3)
                        ├─> P0-5 persistência confirmada ─> P1-5/P1-6 recuperação ─> DATA-01 IndexedDB
                        └─> P1-12 testes comportamentais (habilitador de todas as refatorações)
P1-7 reversão depende de P1-4 auditoria.  P1-16 depende de P1-14 (workspace demo).
```

---

## 15. Plano recomendado das próximas fases

**Incremento 0.1 — Fechamento da Fase 0 (sem código de produto)**
1. Proprietário: saídas do notebook (§3) e hash do ZIP beta.20.
2. Autorizar commit destes documentos na branch `claude/upbeat-feynman-4m2y0k` (hoje **não commitados**; o container é efêmero).
3. Validação manual guiada nas telas (checklist já existente `CHECKLIST_VALIDACAO_VISUAL_BETA.20.md`), sem dados reais.
4. Decidir as questões abertas mais urgentes: modo local vs. online (Plano §91 itens 1–2).

**beta.21 — "Higiene e integridade de importação" (primeiro incremento de código, pequeno)**
P1-1, P1-11 (CI mínima + runner completo), P0-2, P0-3 — escopo restrito a `importers.js`, testes e remoção de legados. Critério: novas fixtures com ponto decimal/milhar/apóstrofo/estorno; reimportação idempotente; CI verde.

**beta.22 — "Verdade da persistência e das datas"**
P0-5, P1-2, P1-3, P1-5, P1-6, P1-4.

**Alpha 1 — Fundação** (Plano §69): ADR-001…004, Workspace/Membership local, migração beta.20 → workspaces com dry-run/rollback, moeda explícita, contratos de repositório, POC IndexedDB.

**Alpha 2/3** conforme Plano: contas, transferências, categorias, cartões, faturas, parcelas, orçamento, recorrências completas — resolvendo FUN-01/02/03.

Nenhuma implementação será iniciada sem autorização explícita do proprietário.

---

## Anexo A — Evidências (`docs/audit/fase0/evidencias/`)
| Arquivo | Conteúdo |
|---|---|
| `npm-test.log` | saída integral de `npm test` (container de nuvem, Node 22) |
| `npm-test-notebook-windows.log` | saída integral de `npm test` no notebook (Windows 11, Node 24.19.0), exit 0 |
| `notebook-verificacao.txt` | estado Git, hash e comparação do ZIP beta.20 com a árvore do notebook |
| `npm-ci.log`, `npm-audit.txt`, `vite-build.log` | reprodutibilidade, SCA e build |
| `probe-import.mjs`, `probe-import-resultado.txt` | sonda dos parsers (dados sintéticos) |
| `smoke.cjs`, `e2e-smoke-resultado.json`, `01…05.png` | smoke E2E Chromium (dados fictícios) |

## Anexo B — Identidade de arquivos (SHA-256)
| Arquivo | SHA-256 |
|---|---|
| Pacote ZIP do Plano Mestre V2.0 | `488732a7abe265d5dc9c79807a35ebc88a61ab9c07d9ab8035e062c68979d658` |
| `PLANO_MESTRE_O_RAZAO_V2.0.md` | `d2069c09dae468fc54c9dffa0eab4ad8c2620af4dccd8db1f408ea4b26109f27` |
| `CLAUDE.md` (pacote) | `6241dfbfa589325da9f2041ccc6659115fd51948454408d7815fbe48a533b4e4` |
| `package.json` @f011bcf | `86bab5a52f510d7f07d6974a4145e42cb525aaa5a92ecc3903a1ea7b85c85e7d` |
| `package-lock.json` @f011bcf | `7eb32f5bf49f219dd4ac623f100d4662364d18583eaaae0bd4e3dec2d546ac70` |
| `src/App.jsx` @f011bcf | `cd5c59e65aaf0929d717cdc2fcbd85a4e09ecd16e8bf0f6be9e50ead07301841` |
| `electron/main.cjs` @f011bcf | `133846251019cbdef60aae73aeda1af02a5a0fc536318fc2094cc3f96039d575` |
