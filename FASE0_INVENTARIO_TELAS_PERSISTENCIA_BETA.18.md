# Inventário técnico da Fase 0 — O Razão beta.18

**Método:** inspeção estática do código-fonte. Este documento não afirma revisão visual já feita.

## 1. Áreas, telas e estados a inspecionar

| Área / componente | Estados a verificar no notebook | Ações críticas |
|---|---|---|
| Splash / inicialização (`SplashScreen`, `App`) | carregando, primeira execução, versão migrada, armazenamento indisponível, erro de migração | Não sobrescrever estado em erro; texto de privacidade verdadeiro. |
| Painel principal | sem lançamentos, contas zeradas, saldo negativo, mês sem movimento, dados volumosos, valores ocultos | Troca de mês, navegação de períodos, perfil PF/PJ, ocultar valores. |
| Histórico (`TransactionFeed`) | vazio, filtro sem resultados, pesquisa, paginação/lista grande, erro de ação | criar, editar, excluir, pagar/pendenciar; validar auditoria/saldo. |
| Modal de lançamento (`TransactionModal`) | novo, edição, erro de valor, conta/categoria ausente, desktop/celular | valor inválido, centavos, destino/perfil; cancelamento sem mutação. |
| Faturas (`InvoiceCycleCard`) | sem cartão, fatura vazia, fatura com compras, pagamento parcial/completo | pagamento idempotente, saldo insuficiente, não duplicar despesa. |
| Orçamento | vazio, sem limite, limite zero, limite superado, inválido | definir/remover limite; verificar perfil, mês e auditoria. |
| Análises/gráficos | período sem dados, PF/PJ, muitas linhas | filtros, exportação e consistência com livro-razão. |
| Previsões/assistente determinístico (`AIPredictivePanel`) | sem dados, compromissos, mês atual/futuro, perfil trocado | confirmar que pago não entra duas vezes e PF não contamina PJ. |
| Importador/conciliação (`ImportReconciliationModal`) | Open Finance demo, CSV/OFX/texto inválido, sem conta, lista longa | demo não pré-selecionada; revisão manual, duplicidade, perfil e undo. |
| Histórico de auditoria | vazio, filtros, evento presente, volume | confirmar eventos para criação/edição/exclusão/recorrência/orçamento/fatura/restauração. |
| Integridade financeira | sem achados, inconsistências e lista grande | relatórios não se apresentam como certificação formal. |
| Perfil/conquistas | perfil vazio, editar dados, upload/avatar se aplicável | conferir que dados pessoais são localizados e não compartilhados. |
| Configurações/personalização | inicial, tema, moeda, ajuda e privacidade | persistência, texto verdadeiro, reset seguro. |
| Modal de conciliação de saldo | estado inicial, dados faltantes, ajuste, cancelamento | alteração rastreada e não duplicada. |
| Modal de diagnóstico/backups | sem cópias, cópia válida, inválida, restaurando, exportando | nenhum restore antes da validação; backup externo antes de teste destrutivo. |
| `StartupRecoveryScreen` | erro de leitura, cópia local válida/invalidada, arquivo externo inválido | retry; restauração confirmada; cópia corrompida não substitui estado ativo. |
| `ErrorBoundary` | crash render, recovery copy disponível/ausente, storage exception | cópia validada; erro explícito; nunca limpar sem confirmação. |
| Shell de navegação | menu aberto/fechado, mobile, tema, foco, PF/PJ | Tab, Shift+Tab, Escape, labels, contraste, zoom 200%, viewport 375 px. |

## 2. Telas/tab IDs no código

`dashboard`, `transactions`, `invoices`, `budget`, `analytics`, `ai_predictive`, `importer`, `audit`, `integrity`, `profile`, `settings`. Modais principais: lançamento, conferência de saldo, importação/conciliação, diagnóstico/backups. Componentes especiais: splash, tela de recuperação e ErrorBoundary.

## 3. Fontes e precedência de persistência

| Fonte/chave | Uso / precedência | Garantia conhecida / limitação |
|---|---|---|
| Web `localStorage: razao_app_state_v3` | Estado financeiro canônico; leitura validada, migração v1–v4, `last-known-good` em corrupção | Não criptografado em repouso; sem transação ACID. A ausência explícita da chave não ressuscita snapshot. |
| Web `razao_app_state_v3.last-known-good` | Último estado aceito; recupera estado principal semântico/JSON inválido | Snapshot validado e atualizado depois de restauração válida; dependente de quota/localStorage. |
| Web `razao_app_state_v3.pre-restore-backup` | Fallback de segunda prioridade em recuperação/rollback | Pode representar estado anterior à restauração, não necessariamente o mais atual. |
| Web `razao_backup_history_v1` | Catálogo de backups JSON locais (até 5/limite 3 MB) | Catálogo corrompido falha fechado, não é substituído como vazio; JSON em claro. |
| Web `razao_outbox_queue_v1` | Fila auxiliar de operações pendentes | Corrupção/estrutura inválida é erro, não fila vazia; não comprova sincronização remota. |
| Web `razao_category_rules_v14` | Catálogo legado de aprendizado de categoria | Se corrompido não é regravado como vazio; os dados de palavras-chave são dados locais sensíveis. Migração per-profile segue estado canônico. |
| `ErrorBoundary` recovery key local | Cópia de emergência em render/erro | Verificar em perfil isolado; não é substituto para backup externo. |
| Electron `razao_app_db.enc` em `userData/RazaoData` | Estado primário criptografado pelo `safeStorage` do SO | Exige `safeStorage` disponível; testes atuais usam Electron simulado, não Windows real. |
| Electron `razao_app_db.last-known-good.enc` | Snapshot protegido do último estado válido | Lido/validado pelo processo principal. Falta ensaio de OS/quota/interrupção reais. |
| Electron `razao_app_db.json` | Legado de migração | Validar e criar cópias protegidas antes de remover; se inválido, fonte legada é preservada. |
| Electron `.razao-desktop-test-profile/RazaoData` | Perfil isolado somente no modo desenvolvimento via `RAZAO_TEST_USER_DATA` | Deve ser comprovado no notebook; app empacotado ignora a variável de teste. |
| API `outboxSync.js` | Demonstração de sync/controle de conflito em `Map` em memória | Não durável entre reinícios; não é backend de produção. |
| Estado em React (`App.jsx`) | Mutação efêmera até persistência confirmada/autosave | E2E real ainda necessário para garantir rollback sem divergência visual. |

Não há evidência no fluxo atual de banco IndexedDB ou SQLite como fonte canônica. Não alegar que existe.

## 4. Mapa de mutações financeiras

| Mutação | Entrada principal | Validação/efeito esperado | Evidência automatizada / teste manual pendente |
|---|---|---|---|
| Criar/editar lançamento | `TransactionModal` → `handleSaveTransaction` | Parser estrito; conta/categoria/cartão/perfil válidos; valida antes de alterar estado; cria evento de auditoria | `test-transaction-mutation-guard`, `test-money-input-validation`; J02–J04/J10. |
| Excluir lançamento | `TransactionFeed` → handler do App | Exclusão da entidade correta e evento com snapshot anterior; saldo/projeção recalculados | Testes de domínio/auditoria; verificar confirmação real e reversão manual. |
| Alternar pago/pendente | `TransactionFeed` | Saldo realizado e compromissos mudam uma vez; evento de auditoria | Cobertura de domínio; J05. |
| Transferência entre contas | `TransactionModal` + referência `toAccountId` | origem/destino são contas distintas e do mesmo perfil; não classificar como receita/despesa | Validação estrutural e livro-razão; J06/J13. |
| Pagar fatura | `invoicePayment.js` → handler App | origem bancária válida, destino cartão; parcial/completa, saldo, idempotência, evento/auditoria | `test-invoice-payment`; J07. |
| Corrigir/conferir saldo | `AccountBalanceReconciliationModal` | ajuste representado explicitamente e rastreado; evitar duplicar ajuste | `test-balance-reconciliation`, UI; J08. |
| Definir/remover orçamento | formulário de orçamento | moeda estrita, chave PF/PJ + categoria + mês, zero preservado, auditoria | `test-budget-profile-isolation`; J09. |
| Criar/pausar/excluir recorrência | `RecurringManager` | conta/categoria e perfil validados; evento auditável | testes recurring + audit; J10. |
| Materializar ocorrência recorrente | `recurringGeneration.js` | idempotência por regra/data; nunca duplicar ocorrência; filtro de perfil | testes recurring generation; J10. |
| Importar/conciliar | parser → revisão → `reconciliation.js` → handler App | itens revistos, duplicates, conta/categoria do perfil, nenhuma aplicação silenciosa | testes import/reconcile; J15/J16. |
| Restaurar backup | `validateHistoricalBackupState` → migração → isolamento → validação estrita → `saveStateWithRecovery` | cópia validada antes da substituição; migração e snapshot; evento de auditoria | recovery/backup tests mockados; J11–J12. |
| Alterar perfil PF/PJ | AppShell / filtros derivados | não move nem mescla dados; não vaza agregados nem referência de catálogo | testes de isolamento estáticos; J14. |

## 5. Revisão visual não executada

As evidências existentes incluem parse de 23 arquivos JSX e verificações estáticas de alguns contratos/labels/zoom/CSP. Isso confirma sintaxe/contratos selecionados, não a aparência nem toda a acessibilidade. O roteiro real está em `GUIA_VALIDACAO_NOTEBOOK_FASE0_BETA.18.md`.
