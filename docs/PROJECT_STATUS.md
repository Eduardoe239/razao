# O Razão — Estado do projeto

**Atualizado em:** 02/11/2026 (decisões D-001…D-018 — Fase 0 encerrada; Alpha 1 em andamento) · **Norma:** `PLANO_MESTRE_O_RAZAO_V2.0.md` (raiz; cópia arquivada em `docs/plano-mestre-v2.0/`)

> Este arquivo registra fatos verificados e pendências. Propostas não são decisões: tudo marcado `PROPOSED` aguarda aprovação do proprietário.

## 1. Versão e base

| Item | Valor | Evidência |
|---|---|---|
| Versão técnica | `1.22.0-beta.20` (`package.json`) | — |
| Base oficial (**aprovada**, D-012) | `main@f011bcf` = beta.20 de referência + `package-lock.json` + 4 arquivos residuais do merge | `docs/audit/fase0/RELATORIO_AUDITORIA_FASE0.md` §2.3 |
| Hash do ZIP beta.20 | `b3f897ef…9b41` — confere com o Plano §7 | `docs/audit/fase0/evidencias/notebook-verificacao.txt` |
| Branch de trabalho | `claude/upbeat-feynman-4m2y0k` (somente documentação acima de `main`) | `git log` |
| Tags / releases | nenhuma | `git ls-remote` |
| Runtime verificado | Windows 11 + Node 24.19.0/npm 11.17.0 (notebook); Linux + Node 22.23.4/npm 10.9.9 (nuvem) | logs em `docs/audit/fase0/evidencias/` |
| `npm test` | exit 0 em ambos os ambientes | `npm-test-notebook-windows.log`, `npm-test.log` |

## 2. Fase atual

**Fase 0 — Auditoria e baseline: ENCERRADA em 02/11/2026** (aprovação formal do proprietário, D-012).
**Próxima etapa autorizada: Alpha 1 — Fundação e modelo de workspace** (Plano §69), sob o Plano Mestre V2.0 e a governança complementar D-011 (RC-001).

### Baseline auditada (registro de encerramento da Fase 0)

| Item | Registro |
|---|---|
| Versão | `1.22.0-beta.20` (sem incremento de versão no encerramento) |
| Código | `main@f011bcf` ≡ ZIP beta.20 (`b3f897ef…9b41`) + `package-lock.json` + 4 arquivos residuais (`electron/main.js`, `electron/preload.js`, `dir`, `type`) |
| Documentação da Fase 0 | commits `f59a67e`, `778fca0` e atualizações de 02/11/2026 **ainda não commitadas** (validação visual, decisões D-001…D-012, evidências) |
| Testes | `npm test` exit 0 (Windows/Node 24.19.0 e Linux/Node 22.23.4); `npm run build` exit 0 |
| Evidências | `docs/audit/fase0/` — relatório de auditoria, relatório de validação visual, checklist preenchido, 159 capturas com `INDICE.md` e `SHA256SUMS` (Git normal, D-010) |
| Testes dedicados | **T1 = PASS** (alerta gerado e dispensado; dispensa não persiste, V-21) · **T2 = FAIL** (recuperação local do `ErrorBoundary` Web, DATA-05) |
| Riscos P0 abertos herdados | FIN-01, FIN-02, FIN-03, FIN-05, FIN-08, DATA-02, **DATA-05**, FUN-01, FUN-02, P0-5 — nenhum resolvido; ver `docs/risks/RISK_REGISTER.md` |
| Limitações de validação | **NÃO VERIFICADOS:** tela de erro Desktop, Electron/Windows e `safeStorage`, leitor de tela/axe, outros navegadores, dispositivos reais, volume (10k+), build de produção servido. Zoom 200% emulado. Ciclo/pagamento de cartão apenas com cartão injetado |

O encerramento da Fase 0 **não** declara o produto pronto, não resolve nenhum risco e não converte limitações em aprovações.

### Gate da Fase 0 (Plano §68)

| Critério | Estado | Evidência / pendência |
|---|---|---|
| Versão/hash confirmados | ✅ | relatório §2.3 |
| Riscos P0 conhecidos | ✅ | `docs/risks/RISK_REGISTER.md` — D-002 (FIN-05, FIN-08, DATA-02 → P0) e D-009 (DATA-05 → P0, com ficha e critérios para a Alpha 1) |
| Integridade de dados durante a Fase 0 | ✅ quanto aos dados reais e ao ambiente principal · ❌ o produto **não** está livre de DATA-05 | **(a) Dados reais e ambiente principal:** nenhum dado financeiro real foi aberto, usado ou alterado; a auditoria foi somente leitura sobre o código; `npm test` grava apenas em diretórios temporários do SO; a validação usou perfis de navegador temporários; nenhum arquivo rastreado de código/configuração foi alterado; `package.json`/`package-lock.json` com hash idêntico antes e depois.<br>**(b) Sobrescrita comprovada no perfil sintético do T2:** no perfil de navegador temporário e isolado, com dados fictícios, o arquivo principal e a última cópia válida **foram sobrescritos** com estado vazio pelo salvamento automático após "Tentar recuperação local". Essa sobrescrita é o defeito observado, não um efeito sobre dados reais.<br>**(c) Perda de acesso:** os 2 lançamentos fictícios **permaneceram preservados** na cópia interna `…pre-restore-backup`, mas ficaram **inacessíveis pela aplicação**; perda física definitiva dessa cópia **não comprovada**.<br>**(d) Risco do produto:** DATA-05 é **P0** (D-009), conhecido, reproduzido (T2 = **FAIL**), classificado e encaminhado para **correção obrigatória na Alpha 1**. A Fase 0 documenta o defeito; não o corrige nem o considera resolvido. |
| Testes reproduzíveis | ✅ | 2 ambientes, exit 0; roteiros da validação arquivados em `docs/audit/fase0/evidencias/visual/_roteiros/` |
| Documentação alinhada | ✅ (Incremento 0.1 + atualização de 02/11) | README alinhado à beta.20; documentos §92.8 criados; divergência menor V-19 (endereço do servidor no README) registrada |
| Evidências visuais/manuais aprovadas | ✅ **aprovadas como evidência técnica (D-001, 02/11/2026)** | `CHECKLIST_VALIDACAO_VISUAL_BETA.20.md` preenchido; `docs/audit/fase0/RELATORIO_VALIDACAO_VISUAL_BETA20.md`; `evidencias/visual/INDICE.md` (159 capturas + `SHA256SUMS`) |
| Itens BLOCKED da validação | ✅ **executados** (D-006) — execução concluída, **não** aprovação | **T1** dispensar alerta: **PASS** (dispensa não persiste, V-21). **T2** recuperação local do `ErrorBoundary` Web: **FAIL** (DATA-05, P0). Tela de erro Desktop: **NÃO VERIFICADA** (limitação, não aprovação) |
| Aprovação formal do fechamento | ✅ **aprovada pelo proprietário em 02/11/2026** | D-012 em `docs/PRODUCT/DECISIONS.md` |

### Situação inicial da Alpha 1

| Item | Situação |
|---|---|
| Estado | **EM ANDAMENTO.** beta.21 aprovada (D-013); subincremento **21.1 em execução**; 21.2 e 21.3 aguardam autorização entre subincrementos |
| Primeiro passo obrigatório | Plano técnico do primeiro incremento (Plano C.2.8, Definition of Ready §81) apresentado ao proprietário antes de qualquer implementação |
| Sequência de incrementos (D-017, planejamento inicial; cada um com plano e aprovação próprios) | **beta.21** higiene, CI e importação correta (FIN-01/02/03/04, SEC-01, EST-05/06) · **beta.22** datas civis e saldo (FIN-05, FIN-08, AI-01, V-02/V-17) · **beta.23** persistência e recuperação seguras (P0-5, **DATA-05 — 6 critérios**, DATA-02, FIN-09) · **beta.24** contratos e modelo (ADR-001/002/003 para decisão do proprietário, modelo com workspace e moeda, FIN-06, repositórios/casos de uso, matriz de papéis) · **beta.25** protótipo de armazenamento (IndexedDB/Desktop, medições 2k/10k/50k) · **beta.26** workspaces e migração (User/Workspace/Membership, migração com dry-run/backup/rollback, isolamento §64.12, FUN-07, SEC-05) · **beta.27** candidata da Alpha 1 (gate §69 + S1–S6/D-011); beta.28 de correções se a avaliação exigir. Recuperação segura (beta.23) **antes** da migração (beta.26) |
| Cartões (D-018) | Funcionalidades operacionais de cartões e faturas **ocultas durante a Alpha 1**, indisponíveis até a Alpha 3; nenhum cartão fictício apresentado como real. Tarefa de interface ainda **não programada** — será incluída no plano de um incremento da Alpha 1 |
| FUN-01, FUN-02 (P0) | Fora do escopo da Alpha 1 pelo Plano (Alpha 2/3); permanecem abertos na saída da Alpha 1 |
| Entregáveis da Alpha 1 (Plano §69) | ADR de identidade, workspace PF/PJ e modo local/online; modelo de dados com workspace; migração beta.20 → novo modelo com dry-run, backup, relatório e rollback; contratos de repository/use cases; matriz de papéis; README/versionamento/lockfile/CI; POC de storage (IndexedDB/SQLite) |
| Correção obrigatória e prioritária | **DATA-05 (P0, D-009)** — 6 critérios da ficha em `RISK_REGISTER.md` são condição do gate |
| ADRs | ADR-001, ADR-002, ADR-003 em `PROPOSED` — aceite do proprietário necessário no gate |
| Saída | Gate técnico §69 + DATA-05 + S1–S6 de §4.1 (avaliação externa multidisciplinar e aprovação formal, D-011) |

## 3. Capacidades (resumo)

Classificação completa em `docs/audit/fase0/RELATORIO_AUDITORIA_FASE0.md` §4 (atualizada com a validação de 02/11). Nada é `PRODUTIVA E VALIDADA`.

| Situação | Capacidades |
|---|---|
| Defeituosa / não confiável | Importação CSV/OFX (FIN-01..04), contas (sem UI), cartões/faturas (inalcançáveis pela UI), **saldo do painel** (FIN-05/FIN-08, P0), **recuperação de dados** (DATA-02 P0, DATA-05 P0) |
| Implementada sem E2E, validada visualmente em 02/11 | Lançamentos (receita/despesa), busca e exportação CSV (fórmulas neutralizadas), orçamentos (sem "restante"), recorrências, relatórios, perfil, preferências, histórico, integridade, restauração de backup, responsividade 375–1440 |
| Demonstrativa / mock | Open Finance, OCR, sincronização, backend |
| Inexistente (fail-closed) | Cadastro/autenticação, Workspace/Membership |
| Protótipo | Assistente (regras locais, sem LLM; mensagem enganosa com saldo negativo — AI-01), previsões (multiplicadores fixos) |

**Avisos operacionais:** não usar a importação CSV/OFX com extratos reais até a correção prevista (beta.21). Lançamentos feitos após 21h (horário de Brasília) recebem a data do dia seguinte e não entram no "Saldo disponível" até a meia-noite (FIN-05). Diante da tela "O Razão encontrou um problema", usar **"Recarregar aplicação"**; **não** usar "Tentar recuperação local" sem exportar backup antes (DATA-05, P0). Se já tiver sido usada, não executar nova restauração nem limpar dados do site: os dados podem estar preservados na cópia interna, recuperável apenas por intervenção técnica.

## 4. Próximos passos (sequência proposta, ver Plano §67–69)

1. ~~Proprietário: aprovação formal do fechamento da Fase 0~~ — **concluído em 02/11/2026 (D-012).** Próximo: plano técnico do primeiro incremento da Alpha 1.
2. beta.21 (1º incremento da Alpha 1, *PROPOSED*): 21.1 limpeza de residuais + runner completo + CI; 21.2 parser monetário/CSV; 21.3 `importedId` determinístico.
3. beta.22 (*PROPOSED*, a decompor): persistência confirmada antes de sucesso (P0-5), recuperação (DATA-02 **P0**), datas civis locais (FIN-05 **P0** — avaliar antecipar para a beta.21), conceito único de saldo (FIN-08 **P0**), mensagem do assistente (AI-01); sanitizador (P1-3) somente com backup/dry-run e regra aprovada; auditoria sem truncamento (P1-4) após ADR-003.
4. Alpha 1: ADR-001/002/003 aceitos, Workspace/Membership local, migração com dry-run/rollback e **correção obrigatória e prioritária de DATA-05** (D-009), com os 6 critérios de aceite da ficha DATA-05 em `docs/risks/RISK_REGISTER.md` como condição do gate da Alpha 1. Se a recuperação for tocada antes (beta.22), os mesmos critérios se aplicam.

### 4.1 Critérios de saída das Alphas (Plano §69–§73 + RC-001/D-011)

Uma Alpha só é **concluída** quando **todos** os itens abaixo estão cumpridos, nesta ordem. A conclusão da implementação não encerra a Alpha.

| # | Critério comum a todas as Alphas | Evidência exigida |
|---|---|---|
| S1 | Gate técnico próprio da Alpha (Plano, tabela abaixo) aprovado | relatório de testes, evidências de QA |
| S2 | Pacote de avaliação montado: versão e hash imutáveis, changelog, matriz de funcionalidades, limitações conhecidas, critérios de aceite, roteiro de testes, dados sintéticos, evidências de QA, formulário estruturado | pacote arquivado e referenciado aqui |
| S3 | Avaliação externa por grupo **multidisciplinar** compatível com o escopo (design, engenharia, análise de sistemas, QA, finanças, segurança, privacidade e outros pertinentes), cobrindo qualidade, consistência, usabilidade, segurança e completude | formulários preenchidos com problemas, evidências, sugestões e prioridade |
| S4 | Feedback triado; correções necessárias implementadas e **retestadas** | registro de triagem; resultados de reteste |
| S5 | **Aprovação formal do proprietário** sobre o resultado da avaliação | decisão registrada em `docs/PRODUCT/DECISIONS.md` |
| S6 | Congelamento da versão (tag/hash) somente após S5; só então a Alpha seguinte pode começar | tag e hash registrados |

| Alpha | Gate técnico (S1, conforme Plano) | Itens obrigatórios adicionais já decididos | Saída |
|---|---|---|---|
| Alpha 1 — Fundação e workspace (§69) | workspace isolation provado; migração reproduzível; regressão financeira verde; nenhum acesso cruzado; ADR aprovado | **DATA-05 corrigido** com os 6 critérios da ficha DATA-05 (D-009, `RISK_REGISTER.md`) | S1–S6 |
| Alpha 2 — Cadastro, contas e lançamentos (§70) | E2E PF e PJ; isolamento completo; saldos e transferências invariantes; UX validada; nenhuma sessão fake | — | S1–S6 |
| Alpha 3 — Cartões, faturas, orçamento, recorrências (§71) | fechamento/vencimento/parcelamento e duplicidade aprovados; orçamento sem dupla contagem; geração idempotente; teste de usabilidade | REQ-INV-PAY-001 (D-005) | S1–S6 |
| Alpha 4 — Importação, conciliação, relatórios, PJ, recovery (§72) | importação segura; reconciliação explicável; backups restaurados em ambiente real; dados PJ essenciais e exportação validados | — | S1–S6 |
| Alpha 5 — Hardening e candidata interna (§73) | G1–G9 pré-beta aprovados; 0 S0/S1; riscos residuais aceitos; recuperação e rollback ensaiados | — | S1–S6 |

Incrementos intermediários (ex.: beta.21, beta.22) não encerram Alphas; a avaliação externa ocorre ao final de cada Alpha.

## 5. Decisões

| ID | Assunto | Status |
|---|---|---|
| ADR-001 | Local-first e modos local/online | PROPOSED |
| ADR-002 | User / Workspace / Membership e PF/PJ | PROPOSED |
| ADR-003 | Storage canônico Web e Desktop | PROPOSED |
| Plano §91 itens 1–10 | Decisões de produto abertas | ABERTAS — dependem do proprietário |
| D-001 a D-012 | Decisões do proprietário de 02/11/2026 (validação, prioridades, pagamento de fatura, testes dedicados, evidências, governança) | DECIDIDAS — `docs/PRODUCT/DECISIONS.md` |
| REQ-INV-PAY-001 | Pagamento de fatura com saldo insuficiente | APROVADO, não implementado — `docs/PRODUCT/REQUIREMENTS.md` |
| D-009 | DATA-05 elevado a P0; correção obrigatória e prioritária na Alpha 1 com critérios de aceite definidos | DECIDIDA (02/11/2026) — `docs/PRODUCT/DECISIONS.md`, `RISK_REGISTER.md` |
| D-010 | Evidências visuais (159 PNG, ~17 MB) mantidas no Git normal, **sem Git LFS**, com `INDICE.md` e `SHA256SUMS` preservados | DECIDIDA (02/11/2026) — `docs/PRODUCT/DECISIONS.md`, `RISK_REGISTER.md` |
| D-011 | Avaliação externa multidisciplinar obrigatória ao final de cada Alpha, com aprovação formal do proprietário antes do congelamento e da progressão (regra complementar RC-001) | DECIDIDA (02/11/2026) — `docs/PRODUCT/DECISIONS.md`; `CLAUDE.md`; §4.1 acima |
| D-012 | Encerramento formal da Fase 0; Alpha 1 autorizada | DECIDIDA (02/11/2026) — `docs/PRODUCT/DECISIONS.md` |

## 6. Histórico de incrementos

| Data | Incremento | Resultado |
|---|---|---|
| 03/11/2026 (UTC) | Auditoria Fase 0 (nuvem) — commit `f59a67e` | Relatório + evidências; somente documentação |
| 02/11/2026 | Incremento 0.1 — fechamento documental da Fase 0 (notebook) — commit `778fca0` | Verificação do notebook e ZIP; documentos §92.8; README alinhado |
| 02/11/2026 | Validação visual/funcional da beta.20 + testes dedicados (não commitado) | Checklist completo; 159 capturas; D-001…D-008 registradas |
| 02/11/2026 | Atualização documental final da Fase 0 (não commitada) | DATA-05 → P0 e Alpha 1 (D-009); evidências no Git normal (D-010); governança das Alphas (D-011) |
| 02/11/2026 | **Encerramento da Fase 0** (não commitado) | Aprovação formal do proprietário (D-012); Alpha 1 autorizada, não iniciada |
