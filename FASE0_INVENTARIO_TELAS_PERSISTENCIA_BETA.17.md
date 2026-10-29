# Fase 0 — Inventário de telas, persistência e mutações

**Projeto:** O Razão  
**Versão de referência:** `1.22.0-beta.17`  
**Data:** 28/10/2026  
**Método:** inspeção de código + suíte automatizada. **A inspeção visual com navegador real não foi executada**; itens de interface abaixo são inventário estático, não certificado visual.

## 1. Estados de implementação

Use o vocabulário do Plano Mestre: **PRODUTIVA E TESTADA / IMPLEMENTADA SEM E2E / PARCIAL / MOCK / PROTÓTIPO / PLANEJADA / BLOQUEADA**. “Implementada sem E2E” indica que há código e testes unitários/estáticos, mas não que a jornada final foi validada na interface.

| Área/função | Estado baseado no código disponível | Evidência / limite |
|---|---|---|
| Painel geral e resumo financeiro | IMPLEMENTADA SEM E2E | `ExecutiveBalanceHeader`, `dashboardSummary`, `financialPosition`; faltam validação visual e comparação manual independente. |
| Lançamentos CRUD e status | IMPLEMENTADA SEM E2E | `TransactionModal`, `TransactionFeed`, `App.jsx`; testes de domínio/integridade; falta jornada real. |
| Saldos e transferências | IMPLEMENTADA SEM E2E | `ledger.js`; testes de domínio; referências de conta e cenários completos ainda precisam de integração real. |
| Cartões e faturas | IMPLEMENTADA SEM E2E | `invoices.js`, `invoicePayment.js`; testes de pagamento/idempotência; falta E2E com múltiplos cartões/meses. |
| Conciliação de saldo | IMPLEMENTADA SEM E2E | `balanceCorrection.js`, modal e testes; não conecta ao extrato bancário real. |
| Importação OFX/transações | IMPLEMENTADA SEM E2E | `reconciliation.js`, `ImportReconciliationModal`; sem E2E com arquivos reais variados, sem codificações/extremos exaustivos. |
| Limites e orçamento | IMPLEMENTADA SEM E2E | orçamento por perfil/mês, auditoria e parser monetário estrito; falta executar UI e testar grande volume. |
| Recorrências e geração de ocorrências | IMPLEMENTADA SEM E2E | regras/generation/idempotência têm testes; faltam jornadas manuais nos meses 28–31 e semântica avançada de séries. |
| Gráficos e métricas | IMPLEMENTADA SEM E2E | `ExpenseAnalytics`, `FinancialCharts`; conferência visual e acessibilidade pendentes. |
| IA Razão e cenários | PARCIAL | Motor determinístico local e previsões; não equivale a provedor de IA externo nem foi validado em E2E. |
| “Open Finance” de demonstração | MOCK | `api/src/routes/openFinanceApi.js` mantém sessões em `Map` na memória e transforma payloads fornecidos; não conecta a bancos/fornecedor habilitado. Dados apresentados como demo devem permanecer explicitamente sintéticos. |
| OCR de comprovantes | MOCK | `api/src/routes/ocrService.js` usa texto/regex e retorno ilustrativo; não processa imagem por pipeline OCR real. |
| Cadastro/login remoto | BLOQUEADA | `userAuth.js` e `auth.js` falham fechado; não há backend persistente nem sessão real. Não anunciar autenticação produtiva. |
| Sincronização remota | MOCK / NÃO PRODUTIVA | `outboxSync.js` usa `Map` em memória e LWW simplificado; não há banco remoto durável, autenticação nem contrato de produção. |
| Perfil PF/PJ | PARCIAL | filtros, escopo de orçamento e isolamento dos painéis têm testes; falta uma jornada ponta a ponta envolvendo todas as entidades/ações/importações. |
| Histórico de auditoria | PARCIAL | eventos locais de lançamentos, fatura, conciliação, importação, recorrências e orçamento; não é imutável, retroativo nem assinado. |
| Integridade financeira | IMPLEMENTADA SEM E2E | verificador local de inconsistências; não prova autenticidade contra adulteração deliberada. |
| Diagnóstico, exportar e importar backup | IMPLEMENTADA SEM E2E | validação/checksum/limites/restauração; falta testar navegador/Electron real e condições ambientais de falha. |
| Recuperação de inicialização | IMPLEMENTADA SEM E2E | tela dedicada, fontes locais, validação e bloqueio de autosave em erro; tests simulados, não ensaio browser/Electron real. |
| Armazenamento web | IMPLEMENTADA COM LIMITAÇÕES | estado principal em `localStorage`, snapshot de recuperação, leitura/gravação confirmadas; sem criptografia em repouso e sem transação atômica do navegador. |
| Armazenamento desktop | IMPLEMENTADA SEM E2E | processo main usa `safeStorage` e snapshots; falta executar com Electron real no Windows e validar chaveiro/sistema alvo. |
| UX, acessibilidade e responsividade | PARCIAL / NÃO VALIDADA VISUALMENTE | há estrutura e alguns rótulos/ARIA; contraste, teclado, foco, zoom, mobile e leitores de tela ainda precisam de revisão manual. |

## 2. Inventário de navegação/telas

Os IDs são extraídos de `src/components/AppShell.jsx` e das condições de renderização de `src/App.jsx`.

| ID | Tela | Conteúdo/ação observada | Estado vazio/erro conhecido a testar | Revisão visual real |
|---|---|---|---|---|
| `dashboard` | Painel Geral | Períodos semanal/mensal/trimestral, navegar mês, resumo, últimos lançamentos, recorrências, próximos compromissos, conciliação e importação. | Sem lançamentos/compromissos; sem cartões; gravação falha; overflow em dados grandes. | NÃO EXECUTADA |
| `transactions` | Lançamentos | Histórico, filtros, novo/editar/excluir e alternar status, importar. | Histórico vazio, busca sem resultados, lançamento inválido/duplicado, erro de importação. | NÃO EXECUTADA |
| `invoices` | Cartões & Faturas | Ciclos/faturas por cartão, saldo devedor e pagar fatura. | Nenhum cartão; fatura zerada; saldo insuficiente; pagamento repetido ou referência inválida. | NÃO EXECUTADA |
| `budget` | Limites & Orçamento | Definir limite mensal por categoria e perfil, visualizar gasto/utilização, remover limite. | Sem categorias de despesa, sem limites, limite zero, valor monetário ambíguo/ inválido. | NÃO EXECUTADA |
| `analytics` | Gráficos & Métricas | Indicadores e visualizações financeiras. | Nenhuma transação, períodos vazios, séries grandes, rótulos truncados/contraste. | NÃO EXECUTADA |
| `ai_predictive` | IA Razão & Cenários | Assistente determinístico, projeções/cenários e anomalias pelo perfil. | Ausência de histórico, pergunta vazia, orçamento sem limite; não há provedor real. | NÃO EXECUTADA |
| `importer` | Extrator & Open Finance | Entrada de importação/demonstração, conforme opções exibidas na tela. | Arquivo não suportado, dados sintéticos, sem conexão bancária; mensagens de mock. | NÃO EXECUTADA |
| `profile` | Conquistas & Perfil | Perfil, preferências e conquistas. | Perfil não preenchido, gravação falha, dados históricos insuficientes. | NÃO EXECUTADA |
| `settings` | Personalização & Ajustes | Preferências/personalização. | Preferências default, persistência negada. | NÃO EXECUTADA |
| `audit` | Histórico de Auditoria | Pesquisa/filtros de eventos e snapshots. | Histórico vazio, filtros sem resultado, catálogo grande, evento inconsistente. | NÃO EXECUTADA |
| `integrity` | Integridade Financeira | Verificações locais e resultados de integridade. | Tudo íntegro, achados, estado inválido, referências ausentes. | NÃO EXECUTADA |

### Componentes transversais, modais e telas de contingência

| Componente / fluxo | Como é acionado | Risco / estados que devem ser testados | Revisão visual real |
|---|---|---|---|
| `SplashScreen` | Durante hidratação e janela de abertura | Leitura lenta/falha, splash sem travar, sem alegações falsas de criptografia. | NÃO EXECUTADA |
| `TransactionModal` | Novo/editar lançamento | Campos vazios, valor fora de faixa, sem conta/categoria, cancelamento, teclado, foco. | NÃO EXECUTADA |
| `AccountBalanceReconciliationModal` | Botão “Conferir saldo do extrato” | Conta ausente, data/valor inválido, divergência, cancelar/aplicar ajuste. | NÃO EXECUTADA |
| `ImportReconciliationModal` | Importar OFX/Pix | Arquivo inválido, duplicatas, correspondências ambíguas, nenhuma linha válida, seleção e confirmação. | NÃO EXECUTADA |
| `DiagnosticModal` | Botão de diagnóstico | Exportar/importar/validar/restaurar backup, tamanho >25 MB, checksum inválido, catálogo indisponível. | NÃO EXECUTADA |
| `StartupRecoveryScreen` | Falha ao carregar persistência | Nenhum backup, catálogo quebrado, cópia inválida, cancelar restauração, arquivo inválido, retry falhando. | NÃO EXECUTADA |
| `ErrorBoundary` | Exceção de renderização não tratada | Reload; reset apenas Web após confirmação e backup verificado; desktop não limpa localStorage. | NÃO EXECUTADA |
| `storage-health-warning` | Evento de persistência degradada | Fechar aviso, gravação principal confirmada mas snapshot secundário falhou, erro de quota. | NÃO EXECUTADA |
| `RecurringManager` | Dashboard | Criar/pausar/remover regra, campos inválidos, lista vazia, gerar uma/todas as ocorrências. | NÃO EXECUTADA |
| Drawer/menu e alternador PF/PJ | AppShell | Teclado Escape, menu mobile, trocar perfil sem resíduo visual de dados do perfil anterior. | NÃO EXECUTADA |

> Este inventário é extraído do código, não uma afirmação de que cada estado visual foi observado. A linha “Revisão visual real” permanece NÃO EXECUTADA até teste no browser/Electron em viewport real.

## 3. Fontes de persistência e precedência

### Navegador (Web)

| Chave/recurso | Conteúdo | Garantia implementada | Limite / risco residual |
|---|---|---|---|
| `razao_app_state_v3` | Estado principal financeiro e de aplicação, serializado em JSON | Leitura validada; gravação confirmada por leitura; validação estrutural antes de sanitização para schema atual; fila de escritas encadeada. | `localStorage` não é banco transacional, não é criptografado em repouso, pode ser limpo por usuário/browser ou falhar por quota. |
| `razao_app_state_v3.last-known-good` | Último payload principal confirmado | Tentativa de recuperação em corrupção/estado semanticamente inválido. Restauração atualiza snapshot. | Falha secundária pode impedir atualização; exige mensagem/backup externo. |
| `razao_app_state_v3.pre-restore-backup` | Estado anterior à restauração/reset de contingência | Preservado/verificado antes de operações destrutivas, como alternativa posterior ao snapshot recente. | Limitado ao mesmo storage/origem; não é cópia independente contra limpeza total/perda do perfil. |
| `razao_backup_history_v1` | Histórico local limitado (até 5 cópias / 3 MB) | JSON/estrutura/tamanho validados; catálogo corrompido não é convertido em array vazio e sobrescrito; gravação verificada por leitura. | Ainda sujeito a quota, corrupção, limpeza e limite de tamanho. |
| `razao_category_rules_v14` | Regras locais de categorização aprendida | Validação e gravação confirmada; catálogo corrompido não é sobrescrito ao aprender nova regra. | Regras auxiliares ficam no localStorage e podem ser perdidas; erro de leitura usado apenas como fallback para predição. |
| `razao_outbox_queue_v1` | Operações pendentes da fila de sincronização | Estrutura e leitura/gravação validadas; falha não se converte em fila vazia. | LocalStorage não criptografado; sincronização remota de produção não existe, não presumir entrega/ack. |

**Precedência de estado Web:** se a chave principal estiver ausente por uma limpeza explícita, não ressuscitar `last-known-good` automaticamente; isso respeita a intenção explícita de excluir/resetar. Se o principal existir mas falhar na leitura ou validação semântica, tentar recuperação com cópia confirmada; a cópia pré-restauração é alternativa posterior. Se nenhuma cópia for válida, falhar fechado, mostrar fluxo de recuperação e não salvar estado vazio sobre os bytes originais.

### Desktop (Electron)

| Arquivo / interface | Conteúdo | Garantia implementada | Limite / risco residual |
|---|---|---|---|
| `RazaoData/razao_app_db.enc` | Estado financeiro principal cifrado via `safeStorage` do processo main | Escrita temporária + rename/commit, validação de schema atual, snapshot anterior em operações de escrita/recuperação. | Não executado em Electron/Windows real nesta fase; disponibilidade e proteção do backend `safeStorage` dependem do sistema operacional. |
| `RazaoData/razao_app_db.last-known-good.enc` | Snapshot criptografado | Recuperação se principal ausente/corrompido ou semanticamente inválido. | Ainda reside no mesmo dispositivo/perfil. |
| `RazaoData/razao_app_db.pre-restore-*.enc` | Cópias pré-restauração enumeráveis | Validar antes de carregar/restaurar; nomes e conteúdo controlados pelo processo main. | Sem cópia externa automática; testar retenção/limites no Electron real. |
| `RazaoData/razao_app_db.json` | Formato legado de migração | Compatibilidade explícita e migração ao ler formatos antigos, quando válidos. | Precisa de fixtures históricas e teste real de rollback/migração; não deve ser usado como fallback plain-text para novas gravações. |
| IPC `desktop:*` | Leitura/gravação/restauração/diálogo/diagnóstico | Sender limitado à URL exata do renderer empacotado ou origem de desenvolvimento permitida; validação de payload; `safeStorage`, nenhum fallback em texto puro. | Os testes atuais simulam Electron; ameaça/modelagem e execução com Electron real permanecem pendentes. |

### Outros recursos

- `localStorage` auxiliar continua sendo usado por regras de categorização e fila outbox na renderização Web. Mesmo no desktop, esses dois artefatos são mantidos no contexto do renderer, não no arquivo cifrado principal. Isso precisa ser considerado no aviso de privacidade desktop.
- `api/src/routes/userAuth.js` e `auth.js`: autenticação desligada/fail-closed; não há usuários/sessões persistentes.
- `api/src/routes/openFinanceApi.js`: sessão em `Map` na memória e processamento de payload fornecido; sem conexão real com banco ou provedor.
- `api/src/routes/ocrService.js`: regex/texto e dados demonstrativos; sem motor OCR real de imagem.
- `api/src/routes/outboxSync.js`: `Map` em memória, LWW simplificado; não é backend remoto durável/produtivo.
- `src/services/localDb.js`: estado principal delega para a camada canônica `storage.js`; outbox tem leitura/gravação auxiliares separadas e deve falhar fechado.
- Não foi encontrado uso produtivo de IndexedDB/SQLite no estado principal. Não assumir que o nome histórico `localDb` signifique IndexedDB.

## 4. Mapa das mutações financeiras observadas

| Operação | Ponto/caso de uso | Efeitos que precisam permanecer sincronizados | Testes existentes / pendência |
|---|---|---|---|
| Criar lançamento | `handleSaveTransaction` → `transaction_created` | Lista de transações, saldo derivado, resumo/projeções, auditoria. | Domínio/integridade e verificações estáticas; E2E pendente. |
| Editar lançamento | `handleSaveTransaction` → `transaction_updated` | Substituir a versão correspondente sem duplicar ID; auditoria before/after; recalcular saldos/projeções. | Snapshot/integração testados parcialmente; E2E pendente. |
| Excluir lançamento | `handleDeleteTransaction` → `transaction_deleted` | Remover uma entidade; registrar before; recalcular projeções e histórico de integridade. | Coberto parcialmente por teste de auditoria; confirmar na UI. |
| Alterar status | `handleToggleStatus` → `transaction_status_changed` | Pendente/pago/cancelado altera ledger/projeção conforme regra, não duplica valores. | Testes de domínio; teste manual de ponta a ponta pendente. |
| Transferência | Registro de `type='transferencia'` com conta destino | Debitar origem e creditar destino; não classificar como receita/despesa consolidada; destino diferente e existente. | Ledger/validação têm testes; multi-conta E2E pendente. |
| Pagar fatura | `prepareInvoicePayment` + lock de repetição + `invoice_payment_registered` | Transação de pagamento associada a cartão/mês/idempotência; não reduzir outra fatura; impedir duplo clique. | 20 testes de pagamento + posição financeira; E2E com cartões múltiplos pendente. |
| Ajuste de saldo | `applyBalanceAdjustment` → `balance_adjustment_applied` | Registrar lançamento identificado, impedir repetição e usar chave de conciliação; atualizar ledger. | Domínio/UI estáticos; teste real pendente. |
| Importar/conciliação | `applyReconciliationDecisions` → `import_reconciliation_summary` | Duplicatas bloqueadas, correspondência ambígua revisada, baixar pendente em vez de duplicar, trilha de contagens. | Suites de domínio e integração mockada; arquivos reais/E2E pendentes. |
| Gerar recorrência | `materializeRecurringOccurrences` | Chave por regra/data de ocorrência e idempotência; gerar apenas uma vez; preservar perfil e atributos. | Regras/geração testadas; calendário/uso real pendente. |
| Criar/pausar/excluir regra recorrente | `handleAddRecurring`, `handleToggleRecurring`, `handleDeleteRecurring` | Atualizar regra/perfil e gerar eventos de auditoria antes/depois; repercutir em compromissos. | Eventos de auditoria adicionados; sem jornada visual. |
| Definir/remover orçamento | `setCategoryBudget` | Chave por perfil/categoria/mês; registrar evento; gastos calculados por transações filtradas. | Testes escopo PF/PJ; casos de entrada testados pelo parser; E2E pendente. |
| Restaurar backup | `handleRestoreBackup` / `handleStartupRestore` | Validação semântica antes de sanitização, evento de restauração, gravação confirmada, atualização de snapshot; não mudar UI se gravação falhar. | Mock/web/desktop testados; Electron e navegador reais pendentes. |

**Limite:** a tabela cobre os caminhos identificados, mas não é prova final de que toda operação financeira secundária da aplicação esteja rastreada visualmente. A revisão completa das mutações requer execução E2E e comparação de estado antes/depois por fixtures independentes.

## 5. Alertas de segurança/privacidade derivados do código

1. O modo Web guarda estado financeiro em `localStorage` sem criptografia em repouso. Não usar perfis de dispositivo compartilhado sem considerar isso.
2. O armazenamento auxiliar da outbox e aprendizado de categorias também está em `localStorage`, inclusive no renderer desktop.
3. O catálogo/histórico de auditoria é local e editável; não é trilha inviolável nem prova jurídica.
4. Login/cadastro remoto estão desativados. Não inserir credenciais bancárias em telas demo.
5. Open Finance, OCR e sincronização são mock/protótipo, e a documentação pública não deve chamar isso de integração real.
6. O build/instalador e a distribuição são gates posteriores. A correção de confiança do IPC ainda precisa de ensaio no Electron e revisão independente.

## 6. Checklist de revisão visual antes de dar como revisado

Para cada tela/modal, executar com 360×800, 768×1024, 1366×768 e zoom de 200%; tema claro/escuro se disponível; teclado sem mouse; foco visível; rótulos e anúncios de erros; navegação de Escape; contraste; conteúdo sem scroll horizontal indevido; estado vazio; estado carregando; erro; sucesso; confirmação de ação destrutiva. **Nenhuma destas combinações é marcada como executada por este inventário estático.**


## Achado de migração que impede assumir compatibilidade histórica

`src/domain/migrations.js` declara `CURRENT_SCHEMA_VERSION = 3` e opera sobre `schemaVersion`. O formato que `sanitizeState()` retorna usa `version: 4`. A busca por chamadas de `migrateData()` encontrou apenas sua declaração e teste, sem consumidor no boot/restauração da aplicação. O fluxo ativo usa validação, `migrateProfileScopedEntities()` e `sanitizeState()`. Isso é uma divergência concreta entre a migração declarada e o carregamento real. Até existir um pipeline único ligado ao carregamento, com fixtures por versão, conferência de saldo/contagens e rollback, a migração histórica fica classificada como **bloqueador S1 / G3 parcial**. Não é seguro alegar que todos os estados legados estão migrados apenas porque os testes atuais passam.
