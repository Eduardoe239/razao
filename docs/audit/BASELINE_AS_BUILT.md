# O Razão — Baseline as-built da beta.20

**Data:** 02/11/2026 · **Base:** `main@f011bcf` (≡ ZIP beta.20 `b3f897ef…9b41` + lockfile + residuais) · **Plano:** §10 e §92

Este documento é o índice consolidado do baseline exigido pelo Plano §10. Os achados detalhados e as evidências estão em [`fase0/RELATORIO_AUDITORIA_FASE0.md`](./fase0/RELATORIO_AUDITORIA_FASE0.md) (citado como "Relatório"). Convenção: **[FATO]** verificado; **[HIPÓTESE]** não comprovado.

## 1. Identidade e ambiente [FATO]

| Item | Valor |
|---|---|
| Versão | `1.22.0-beta.20` (README alinhado no Incremento 0.1) |
| Commit da base | `f011bcf718a140ee3c9d43d2b2cb47f1875d8964` |
| Identidade com o ZIP beta.20 | conteúdo idêntico (módulo CRLF), exceto lockfile, `electron/main.js`, `electron/preload.js`, `dir`, `type` (só no repositório) e diretórios vazios `api/src/controllers`, `api/src/lib` (só no ZIP) |
| Stack | React 19.3.1, Vite 8.3.5, @vitejs/plugin-react 6.1.2, Electron 45.1.0, electron-builder 26.18.1; `engines.node >=22.12.0` |
| Lockfile | `package-lock.json` v3, 324 pacotes; `npm ci` OK |
| Vulnerabilidades | 15 moderadas (cadeia electron-builder, dev); 0 em produção (`npm audit --omit=dev`) |
| Ambientes de teste | Windows 11/Node 24.19.0 (notebook) e Linux/Node 22.23.4 (nuvem): `npm test` exit 0 |

## 2. Mapa de scripts (`package.json`)

| Script | Uso | Observação |
|---|---|---|
| `test` | 55 scripts Node encadeados | 3 testes de domínio não incluídos (`phase6`, `achievements`, `balance-correction`); 18 scripts puramente estáticos (QA-01) |
| `dev` | Vite em `127.0.0.1:3000` | — |
| `desktop:*` | Electron (dev em 5173) / build | build e instalador fora de escopo até a fase de release (Plano C.3) |

## 3. Mapa de telas

Navegação definida em `src/components/AppShell.jsx`; renderização condicional por `activeTab` em `src/App.jsx` (sem roteador).

| Aba (`id`) | Componente(s) | Estado |
|---|---|---|
| `dashboard` — Visão geral | `ExecutiveBalanceHeader`, `TransactionFeed`, `RecurringManager` | ISE |
| `transactions` — Lançamentos | `TransactionFeed` (+ modal `TransactionModal`) | ISE (sem transferência, sem filtro de categoria por tipo) |
| `invoices` — Cartões e faturas | `InvoiceCycleCard` (apenas `cards[0]`) | DEF — sem cadastro de cartão nem compra no cartão |
| `budget` — Orçamentos | inline em `App.jsx` | ISE |
| `analytics` — Relatórios | `ExpenseAnalytics`, `FinancialCharts` | ISE |
| `importer` — Importar dados | conteúdo inline em `App.jsx` que abre `ImportReconciliationModal` | DEF (parser) / DEMO (Open Finance, OCR) |
| `ai_predictive` — Planejamento | `AIPredictivePanel` | PROT |
| `profile` — Perfil | `UserProfilePanel` | PARC (PII local sem finalidade definida) |
| `settings` — Preferências | `PersonalizationPanel` | PARC |
| `audit` — Histórico de Auditoria | `AuditHistoryPanel` | PARC (500 eventos FIFO) |
| `integrity` — Integridade Financeira | `AuditIntegrityPanel` | ISE |
| Modais | `TransactionModal`, `AccountBalanceReconciliationModal`, `ImportReconciliationModal`, `DiagnosticModal` | ver Relatório §4 |
| Estados globais | `SplashScreen`, `StartupRecoveryScreen` (fail-closed), `ErrorBoundary` | ISE; `ErrorBoundary` com risco DATA-05 |

Não existe tela de criação/edição de contas, cartões, transferências, cadastro ou login.

## 4. Inventário de capacidades

Ver Relatório §4 (tabela completa com evidências). Resumo em `docs/PROJECT_STATUS.md` §3.

## 5. Mapa de persistência [FATO]

### 5.1 Web (`src/services/storage.js`) — `localStorage`, **sem cifragem**

| Chave | Conteúdo | Escopo PF/PJ |
|---|---|---|
| `razao_app_state_v3` | estado completo (contas, categorias, cartões, lançamentos, recorrências, orçamento, auditoria, perfil) | **único documento PF+PJ** |
| `razao_app_state_v3.last-known-good` | cópia integral do último estado gravado com sucesso (formato `orazao-last-known-good-snapshot`) | PF+PJ |
| `razao_app_state_v3.pre-restore-backup` | cópia anterior à última restauração (formato `orazao-pre-restore-snapshot`) | PF+PJ |
| `razao_backup_history_v1` | catálogo do histórico de backups (`src/services/backupHistory.js`) | sem escopo de perfil |
| `razao_category_rules_v14` | regras de aprendizado de categoria (`src/domain/categoryLearning.js`) | filtradas pelo perfil da categoria na leitura |
| `razao_outbox_queue_v1` | fila outbox (`syncQueue.js`) | código não importado pela UI (morto) |

Ordem: leitura do principal → se inválido e LKG válido, **LKG sobrescreve o principal sem preservar bytes corrompidos** (DATA-02) → se nenhum válido, tela de recuperação (fail-closed, bytes preservados). Escrita: `setState` → efeito → `saveState` regrava estado inteiro + LKG, com verificação por releitura; falha gera evento `razao:storage-health`, mas a UI já exibiu sucesso (P0-5).

### 5.2 Desktop (`electron/main.cjs`) — arquivo cifrado com `safeStorage`

| Arquivo (diretório de dados do app) | Conteúdo |
|---|---|
| `razao_app_db.enc` | estado principal, gravação atômica |
| `razao_app_db.last-known-good.enc` | cópia após commit do principal |
| `razao_app_db.pre-restore-<data>-<uuid>.enc` | cópias anteriores a restaurações, com rollback verificado |
| `razao_app_db.json` | legado em texto puro (migração) |

Sem fallback em texto puro quando `safeStorage` indisponível. Execução em Windows real: **não verificada**. `electron/main.js`/`preload.js` são residuais inativos e inseguros (SEC-01).

### 5.3 Schema e migrações
`src/domain/migrations.js` + `migrateProfileScopedEntities` (`src/domain/profileIsolation.js`): registros sem `profileType` → PF; IDs colididos ganham sufixo `__PF`/`__PJ`. Prisma (`api/prisma/schema.prisma`) não é usado em runtime e não tem `workspaceId`.

## 6. Matriz de mutações financeiras
Ver Relatório §9.1 (efeitos em saldo, fatura, orçamento, auditoria, idempotência e reversão).

## 7. Matriz de isolamento PF/PJ [FATO]

Mecanismo atual: atributo `profileType` por registro + filtro em memória (`entitiesForProfile`, filtros em `App.jsx:207-249`); perfil ativo `useState('PF')`, não persistido. **Não há Workspace, Membership nem autorização** — o seletor é apenas filtro de exibição (o Plano veda tratá-lo como controle de segurança).

| Camada / dado | Separação atual | Teste existente | Lacuna |
|---|---|---|---|
| Armazenamento (Web e Desktop) | nenhuma — um documento PF+PJ | — | Workspace como unidade de persistência (ADR-002/003) |
| Contas, categorias, cartões | filtro por `profileType` | `test-profile-isolation-*` | filtro, não boundary |
| Lançamentos | filtro + validação cruzada (`stateValidation.js`, `transactionMutationValidation.js`) | `test-transaction-mutation-guard`, `test-state-validation` | — |
| Recorrências | filtro + checagem no toggle | `test-recurring-*` | — |
| Orçamento | chave `PF:/PJ:` (`budget.js`) | `test-budget-profile-isolation` | — |
| Auditoria | `profileType` por evento; `auditEventsForProfile` | `test-audit-profile-isolation` | limite de 500 é global (eventos de um perfil podem expulsar os do outro) [HIPÓTESE a testar] |
| Assistente/IA | contexto filtrado por perfil | `test-ai-profile-isolation` | regras locais, sem LLM |
| Importação/conciliação | `profileType` + `accountId` no match | `test-reconciliation` | — |
| Regras de categoria | uma chave; filtradas por perfil da categoria | `test-category-learning-*` | — |
| Backup / exportação / histórico de backup | **arquivo único PF+PJ** | `test-backup-*` | exportar só um perfil inexistente |
| Restauração | substitui PF+PJ; evento registrado com perfil fixo PF | `test-restore-recovery-*` | — |
| Perfil do usuário (nome, e-mail, telefone) | compartilhado | — | finalidade/LGPD indefinidas |
| API/backend | inexistente | `test-auth-disabled-until-configured` | — |

## 8. Riscos e backlog
Ver [`docs/risks/RISK_REGISTER.md`](../risks/RISK_REGISTER.md) e Relatório §13–§14.

## 9. Limitações deste baseline
- Validação visual/manual da beta.20 no notebook: **pendente do proprietário**.
- Electron/`safeStorage` em Windows real, acessibilidade (axe/NVDA), breakpoints 390/768/1024/1440, performance 10k–100k, quota do `localStorage`, secret scanning automatizado e licenças: **não verificados**.
- Mapa de telas obtido por leitura de código; estados vazios/loading/erro de cada tela não foram inspecionados visualmente.
