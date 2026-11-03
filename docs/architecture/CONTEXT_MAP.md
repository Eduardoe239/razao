# O Razão — Mapa de contexto

**Data:** 02/11/2026 · **Plano:** §44–47 · **Status:** as-built = [FATO]; alvo = **PROPOSED** (depende de ADR-001/002/003)

## 1. Contexto do sistema (as-built)

```
            Usuário (PF e/ou PJ, mesma pessoa, mesmo dispositivo)
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
   Navegador (Web)                         Electron (Desktop)
   index.html + bundle Vite                renderer = mesmo bundle
          │                                       │ IPC (preload.cjs, remetente validado)
   localStorage (texto puro)               main.cjs → safeStorage → arquivos .enc
          │
   Sem backend real. Sem rede financeira. Sem LLM.
   "api/" = classes JS importadas pelo próprio bundle (mocks fail-closed / demo).
```

Sistemas externos: **nenhum integrado de forma produtiva** (Open Finance, OCR, IA, sync, autenticação = demo, inexistentes ou fail-closed).

## 2. Containers e componentes (as-built)

| Container | Conteúdo | Dependências |
|---|---|---|
| Presentation | `src/App.jsx` (1.026 linhas: estado global, handlers, abas), `src/components/*` (22) | Domain, Services |
| Domain | `src/domain/*` (~35 módulos JS puros: ledger, invoices, invoicePayment, budget, recurring, reconciliation, importers, backup, auditLog, profileIsolation, stateValidation, sanitize, money…) | nenhuma (bom ponto de partida) |
| Services | `storage.js` (Web/IPC), `backupHistory.js`, `apiClient.js` (importa `api/src/routes/*`), código morto: `localDb.js`, `syncQueue.js`, `encryptedStorage.js` | Domain, browser APIs |
| Desktop main | `electron/main.cjs`, `preload.cjs` (ativos); `main.js`, `preload.js` (residuais) | Electron, fs, safeStorage |
| "API" | `api/src/routes/*` (mocks), `api/prisma/schema.prisma` (sem uso em runtime) | — |

Acoplamentos relevantes: regras de negócio no `App.jsx` (EST-01); servidor fictício no bundle cliente (EST-02); persistência do documento inteiro PF+PJ (EST-03).

## 3. Contextos delimitados

| Contexto (Plano §47) | Módulos as-built | Situação | Alvo (PROPOSED) |
|---|---|---|---|
| `workspace` (identidade, PF/PJ, membership) | `profileIsolation.js`, `profileType`, `UserProfilePanel` | filtro, sem entidade | Workspace como unidade de persistência e autorização (ADR-002) |
| `ledger` (contas, lançamentos, transferências, saldo) | `ledger.js`, `accounts.js`, `transactionMutationValidation.js`, `financialPosition.js`, `dashboardSummary.js` | domínio sólido; UI incompleta | casos de uso fora do React; journal (ADR-004, futuro) |
| `cards` (cartões, ciclos, faturas, pagamento) | `invoices.js`, `invoicePayment.js` | domínio testado; inalcançável pela UI | Alpha 3 |
| `planning` (orçamento, recorrência, compromissos, previsão) | `budget.js`, `recurring*.js`, `commitments.js`, `forecast.js`, `scenarioSimulator.js`, `savings.js` | parcial/protótipo | Alpha 3 |
| `imports-reconciliation` | `importers.js`, `reconciliation.js`, `balanceReconciliation.js`, `balanceCorrection.js`, `categoryLearning.js` | parser defeituoso; conciliação ISE | beta.21 (correção) → Alpha 2/4 |
| `audit-recovery` | `auditLog.js`, `auditIntegrity.js`, `backup.js`, `backupHistory.js`, `storage.js`, `StartupRecoveryScreen`, `ErrorBoundary` | ISE com riscos DATA-02..05 | beta.22 / Alpha 4 |
| `reporting` | `ExpenseAnalytics`, `FinancialCharts`, `transactionSearch.js` | ISE | Alpha 4 |
| `assistant-ai` | `aiContextEngine.js`, `anomalyDetector.js`, `receiptOcr.js` | protótipo/demo | gates próprios (ADR-007/009) |
| `platform-adapters` | `storage.js`, `electron/*`, `apiClient.js` | sem contrato de repositório | Ports/Adapters + POC IndexedDB/SQLite (ADR-003) |

## 4. Camadas-alvo (Plano §45) — PROPOSED

```
Presentation (React) → Application (casos de uso com WorkspaceContext, idempotência persistida,
                                    sucesso só após persistência confirmada)
                     → Domain (puro, centavos + moeda)
                     → Ports (WorkspaceRepository, AuditRepository, Clock, IdGenerator)
                     → Adapters (localStorage legado → IndexedDB | IPC → SQLite/arquivo cifrado | HTTP futuro)
```

Regra de evolução: incremental, sem reescrita (Plano C.3, §44); cada mudança estrutural exige ADR aceito.
