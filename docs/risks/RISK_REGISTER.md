# O Razão — Registro de riscos

**Data:** 02/11/2026 · **Base:** beta.20 (`f011bcf`) · **Plano:** §88 (prioridade), §89 (riscos)
**Fonte dos achados:** `docs/audit/fase0/RELATORIO_AUDITORIA_FASE0.md` (IDs preservados). Prioridade conforme Plano §88. "Incremento" é a alocação **proposta** (PROPOSED), sujeita à aprovação do proprietário; nenhum item está resolvido.

Estados: `ABERTO` · `MITIGADO` (contenção sem correção) · `RESOLVIDO` (com evidência) · `ACEITO` (pelo proprietário).

## P0 — bloqueadores

| ID | Risco | Impacto em dados/dinheiro | Evidência | Incremento proposto | Depende de | Estado |
|---|---|---|---|---|---|---|
| FIN-01 | Parser CSV/OFX corrompe valores (ponto decimal, milhar múltiplo) | valor importado errado até 100× | `evidencias/probe-import-resultado.txt`; `importers.js:25,127` | beta.21 (21.2) | gate Fase 0 | ABERTO — contenção: não importar extratos reais |
| FIN-02 | `importedId` não determinístico (`Date.now()`) | reimportação pode duplicar | `importers.js:36,135` | beta.21 (21.3) | FIN-01 | ABERTO |
| FIN-03 | Linha CSV descartada sem aviso (apóstrofo alterna aspas) | movimento faltando | `importers.js` `parseLine` | beta.21 (21.2) | gate Fase 0 | ABERTO |
| FUN-01 | Sem UI de contas | jornada essencial ausente | Relatório §6 | Alpha 2 | Alpha 1 (Workspace) | ABERTO |
| FUN-02 | Cartões/faturas inalcançáveis pela UI | recurso anunciado inutilizável | Relatório §6 | Alpha 3 (ou rotular antes) | Alpha 1/2 | ABERTO — decisão do proprietário sobre rotulagem |
| P0-5 | Sucesso exibido antes de a persistência confirmar | viola invariante §64.11 | Relatório §9.1, FUN-05 | beta.22 | beta.21 | ABERTO |

## P1 — essenciais

| ID | Risco | Evidência | Incremento proposto | Depende de | Estado |
|---|---|---|---|---|---|
| SEC-01 | `electron/main.js`/`preload.js` residuais e inseguros (inativos) | `git show f011bcf --stat` | beta.21 (21.1) | gate Fase 0 | ABERTO |
| EST-05/EST-06 | 3 testes fora do runner; sem CI | `package.json` | beta.21 (21.1) | — | ABERTO |
| FIN-04 | "compra"/"pagamento" na descrição força despesa | probe | beta.21 (21.2) | — | ABERTO |
| FIN-05 | Datas civis em UTC (31 pontos) | `TransactionModal.jsx:20,30,38` | beta.22 | — | ABERTO |
| FIN-06 | Sanitizador inventa `status`/`date`/`type` e descarta campos | `sanitize.js:44-50` | beta.22 — exige backup, dry-run e regra aprovada pelo proprietário | P0-5 | ABERTO |
| FIN-07 | Sem moeda explícita | busca por `currency` | Alpha 1 | ADR-004 | ABERTO |
| FIN-08 | Ledger e painel com conceitos de saldo diferentes (pago futuro) | `ledger.js` × `dashboardSummary.js:123` | Alpha 1/2 | — | ABERTO |
| FIN-09 | Idempotência em `useRef`/`setTimeout` | `App.jsx:584-658` | Alpha 1 (casos de uso) | ADR-003 | ABERTO |
| FUN-03/FUN-04 | Sem transferência na UI; categorias não filtradas por tipo | `TransactionModal.jsx` | Alpha 2 | Alpha 1 | ABERTO |
| FUN-05 | Pagamento de fatura: falso sucesso | `App.jsx:593-617` | beta.22 (com P0-5) | — | ABERTO |
| DATA-01 | `localStorage` canônico, quota ~5 MB duplicada | `storage.js` | Alpha 1 (POC) | ADR-003 | ABERTO |
| DATA-02 | LKG sobrescreve principal sem preservar bytes nem avisar | `storage.js:75-80`; `main.cjs` | beta.22 | P0-5 | ABERTO |
| DATA-03 | Exclusão física de lançamento efetivado | Relatório §9.1 | Alpha 2 | DATA-04 | ABERTO |
| DATA-04 | Auditoria truncada em 500 eventos (FIFO) | `auditLog.js:55,76` | Alpha 1, após ADR-003 (mitigação na beta.22: aviso + exportação) | ADR-003 | ABERTO |
| DATA-05 | "Redefinir estado" do `ErrorBoundary` pode perder a última cópia | `ErrorBoundary.jsx:27-70` | beta.22 | — | ABERTO |
| SEC-02 | Web sem cifragem em repouso (dados + PII) | E2E smoke | ADR-003 / privacidade | ADR-001 | ABERTO — declarado na UI |
| SEC-03 | Backup exportado em texto puro | `DiagnosticModal.jsx:131-138` | Alpha 4 | — | ABERTO |
| SEC-04 | Sync demo usa LWW | `outboxSync.js` | não evoluir; ADR-006 | — | ABERTO |
| EST-01/02/03 | `App.jsx` monolítico; mocks no bundle; documento único PF+PJ | Relatório §7 | Alpha 1 | ADR-002/003 | ABERTO |
| QA-01/QA-02 | Testes estáticos; sem E2E/propriedade/cobertura | Relatório §10 | contínuo, a partir da beta.21 | — | ABERTO |
| PFPJ-01 | PF/PJ é filtro, não boundary (Plano §89) | `docs/audit/BASELINE_AS_BUILT.md` §7 | Alpha 1 | ADR-002 | ABERTO |

## P2 / P3

Ver Relatório §13 (P2: FUN-06..09, FIN-10, SEC-05..07, UX-01, EST-04, EST-08, DOC-01; P3: FIN-11, DEP-01, backend, sync, LLM, OCR visual, Open Finance, PJ avançado). SEC-05 (dados demo gravados no livro real) depende do workspace de demonstração (Alpha 1).

## Riscos de processo

| ID | Risco | Mitigação |
|---|---|---|
| PROC-01 | Avançar para código com gate da Fase 0 aberto | `docs/PROJECT_STATUS.md` §2; nenhum incremento de código antes da aprovação |
| PROC-02 | Documentação histórica (60+ arquivos na raiz) contradiz o estado real | README alinhado; consolidação em `docs/` prevista (EST-07, P3) |
| PROC-03 | IDs antigos de importação não serão reconhecidos após 21.3 | documentar limitação; manter heurística de revisão; sem migração |

## Histórico

| Data | Alteração |
|---|---|
| 02/11/2026 | Criação a partir do Relatório da Fase 0 (Incremento 0.1) |
