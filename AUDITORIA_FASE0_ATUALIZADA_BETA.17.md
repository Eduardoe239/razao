# Auditoria da Fase 0 — O Razão v1.22.0-beta.17

**Data:** 28/10/2026  
**Parecer:** **Fase 0 NÃO CONCLUÍDA — gate não aprovado.**  
**Base:** `1.22.0-beta.17`, incremento da `1.22.0-beta.16`.  
**Documento que prevalece:** *Plano Mestre de Desenvolvimento do O Razão até Beta 1.0*, versão 1.0, documento vivo de 28/10/2026.

## 1. Escopo da auditoria

Este relatório cruza a implementação da beta.17 com:

- seção **3.1 — Auditoria inicial obrigatória** (cinco frentes de auditoria, cobrindo os seis critérios solicitados na matriz operacional);
- princípios de engenharia da seção 4: fonte única de verdade, dinheiro exato, domínio independente da UI, idempotência, falhar com clareza, rastreabilidade, migração reversível, privacidade por padrão e medição antes de otimizar;
- seções de persistência, migração e sincronização futura;
- gates **G1–G9** (seção 26 do Plano Mestre) e critérios de release/checklist.

A revisão compreendeu leitura de código, busca de caminhos de persistência e mutação, testes automatizados Node e testes de recuperação em ambiente simulado. Não foi conduzido um teste externo independente, não foi executado o renderer em navegador real e não foi iniciado Electron/Windows real.

## 2. Resultado desta rodada

### Correções incorporadas

1. **Validação antes de sanitização:** estado atual é validado antes que a sanitização possa eliminar/normalizar registros estrutural ou semanticamente corrompidos.
2. **Recuperação ao iniciar:** leitura que falha não é confundida com primeiro uso; autosave permanece bloqueado e a UI apresenta retry/backup externo/cópias locais validadas.
3. **Restauração com defesa em profundidade:** o handler de restauração utilizado pelo diagnóstico valida novamente a semântica do backup, independentemente de a UI também validar.
4. **Confiança IPC:** o processo principal Electron usa a URL exata de renderer empacotado (ou origem de dev autorizada) para limitar handlers e navegação; não confia apenas em sufixo de caminho.
5. **Validação desktop:** payloads do schema atual são verificados antes da gravação/restauração e não há fallback silencioso para armazenamento em texto puro.
6. **Catálogos auxiliares fail-closed:** histórico de backups, regras de categorização e outbox não são convertidos em estruturas vazias se estiverem corrompidos; gravações têm confirmação por leitura quando aplicável.
7. **Rastreabilidade:** eventos dedicados adicionados para criar/pausar/excluir regra recorrente e definir/remover orçamento.
8. **Entrada monetária:** limites de orçamento recusam valores ambíguos/mais de duas casas decimais em vez de arredondamento silencioso.
9. **Comunicação pública e inventário:** README atualizado para diferenciar funcionalidade local, mock e integração bloqueada; matriz de telas, persistência, mutações, jornadas e riscos criada.

## 3. Evidência automatizada beta.17

| Verificação | Resultado | Classe de teste | Limite |
|---|---|---|---|
| `npm test` | **Exit code 0** nesta sessão | Suíte agregada | Comando contém 47 invocações de scripts `.mjs`; inclui testes de domínio, integrações mockadas e verificações estáticas. Não equivale a E2E visual. |
| Parser monetário específico | **28 assertions aprovadas** | Unitário | Cobre formatos aceitos/recusados e precisão centesimal; uso aplicado ao formulário de orçamento e fluxos partilhados de reconciliação/recorrência. |
| Suite de domínio financeira | **100 aprovados, 0 falhas** registrados nas execuções das versões anteriores; o `npm test` atual voltou a passar | Domínio | Não provar todos os fluxos finais da UI nem todos os edge cases do schema. |
| Validação estrutural do estado | **17 assertions aprovadas** | Unitário | Estados semanticamente inválidos são recusados antes da sanitização; fixtures não abrangem todos os schemas históricos. |
| Validação de backup histórico | **10 assertions aprovadas** | Unitário | Teste da estrutura e referências; ainda falta cobertura real por cada schema legado. |
| Recuperação desktop | **5 cenários aprovados** | Integração simulada | Electron/safeStorage substituídos por stubs; não usa keychain/DPAPI real nem app Windows real. |
| Recuperação Web | **5 checks aprovados** | Integração simulada | localStorage simulado; sem teste real de quota/multiaba. |
| Consistência snapshot/restauração Web | **4 cenários aprovados** | Integração simulada | Não há renderer real. |
| Integridade outbox | **4 cenários aprovados** | Integração simulada | Sem entrega de sincronização remota produtiva. |
| Fluxo de recuperação inicial | **13 verificações estáticas aprovadas** | Análise estática | Não substitui testar clique/teclado/UX real. |
| Testes de confiança IPC Electron | **7 verificações** cobertas no script de boundary | Teste com APIs simuladas | Falta execução em Electron real. |
| `node --check` nos módulos alterados | Aprovado nesta sessão | Sintaxe JS | Não é build, bundling ou type-check completo. |
| Parse JSX por TypeScript parser global | Aprovado nos componentes revistos | Parse estático | Não detecta todos erros de build/runtime. |
| Integridade do ZIP | Verificada após empacotamento final | Arquivo | ZIP será testado com `unzip -t` e SHA-256 registrado no manifesto. |

### Achado adicional de migração de schema (bloqueador de G3)

A revisão de chamadas constatou que `src/domain/migrations.js` declara `CURRENT_SCHEMA_VERSION = 3` e usa `schemaVersion`, enquanto `sanitizeState()` grava `version: 4`. A função `migrateData()` não possui consumidor em `src/` fora do seu próprio teste de unidade; o carregamento efetivo usa `loadStateAsync()` → validação do estado salvo → `migrateProfileScopedEntities()` → `sanitizeState()`. Portanto, não há atualmente um único orquestrador explícito de migrações para todos os formatos legados suportados. A compatibilidade parcial fornecida pela sanitização **não** é evidência suficiente de migração controlada/reversível. Esse achado foi adicionado ao backlog como bloqueador S1 para G3 e exige fixtures por schema, comparação de saldos/contagens e rollback antes de aprovar a persistência.

### Ambiente e limites da evidência

- `npm install` foi tentado e excedeu o limite da sessão; não houve instalação completa nem geração de `node_modules`/lockfile.
- Foi identificado Chromium no sistema, mas sem dependências da aplicação (`react`, `vite`, `playwright` e `puppeteer` não estão disponíveis); não é possível usar esse fato isoladamente como E2E do app.
- Não executei `npm run build`, `desktop:build`, instalador ou empacotador porque o plano e as instruções do proprietário deixam build/`.exe` para a fase de empacotamento.
- Não foi gerado `package-lock.json` incompleto artificialmente; por isso a revisão de dependências/SCA reprodutível permanece aberta.

## 4. Cruzamento com os seis critérios operacionais da Fase 0

| # | Critério | Resultado | Evidência e bloqueador para fechar |
|---|---|---|---|
| 1 | Cada rota/tela/modal/estado vazio/loading/erro/sucesso inventariado e revisado visualmente | **PARCIAL** | Inventário de código entregue em `FASE0_INVENTARIO_TELAS_PERSISTENCIA_BETA.17.md`; revisão visual em navegador real de cada estado não executada. |
| 2 | Fontes de persistência e mutações financeiras mapeadas de ponta a ponta | **PARCIAL** | Mapa de chaves, arquivos, precedência e mutações documentado. Faltam E2E de cada mutação, migrações legadas completas, quota, concorrência multiaba e Electron real. |
| 3 | Matriz manual de jornadas essenciais executada com dados limpos e volumosos | **NÃO ATENDIDO** | `MATRIZ_JORNADAS_CRITICAS_FASE0_BETA.17.md` contém J01–J20 e resultados esperados; nenhuma jornada foi marcada como executada em browser/Electron real. |
| 4 | Riscos P0 priorizados e cada um com issue/critério de aceite | **PARCIAL** | `BACKLOG_RISCO_FASE0_BETA.17.md` dá ID, prioridade, mitigação e critério; precisam validação formal pelo responsável técnico/owner e acompanhamento por evidências. |
| 5 | Recuperação após falha e erro de leitura demonstrados sem perda de dados | **PARCIAL** | Testes simulados demonstram recuperação/recusa em corrupção e semântica; falta confirmação no navegador e Electron/Windows reais, quota/disco e encerramento abrupto. |
| 6 | Decisão de escopo sobre autenticação/Open Finance/PF-PJ e prontidão operacional | **PARCIAL** | Auth bloqueada e serviços mock rotulados; isolamento PF/PJ testado de forma parcial. Falta decisão/assinatura de owner e conclusão dos gates G1–G9. |

> A classificação “PARCIAL” ou “NÃO ATENDIDO” não é atenuada por quantidade de testes unitários. O Plano Mestre exige execução e evidência nos ambientes e fluxos que descreve.

## 5. G1–G9 do Plano Mestre

| Gate | Requisito do Plano Mestre | Status beta.17 | Evidência necessária para aprovar |
|---|---|---|---|
| **G1 — Produto** | Escopo beta fechado e matriz real/parcial/mock, proposta de valor e público descritos | **PARCIAL** | README/inventário fornecem rotulagem; falta aprovação explícita do product owner sobre escopo local-first, público e exclusões. |
| **G2 — Finanças** | Invariantes, cartões, transferências, recorrências e estornos testados; divergências resolvidas | **PARCIAL** | Suítes de domínio verdes; falta J03–J10 manual, fixtures independentes, reversões e multi-entidade E2E. |
| **G3 — Persistência** | Migração, corrupção, falha de escrita, backup/restore e rollback simulados de forma reproduzível | **PARCIAL** | Simulações de snapshots e restauração passam; quota real, multiaba, interrupção, Windows/Electron e matriz de migração ainda faltam. |
| **G4 — Segurança** | Threat model, ASVS aplicável, dependências/segredos, permissões e teste de isolamento, com revisor independente | **NÃO APROVADO** | Nenhuma revisão independente/ASVS completa, sem SCA/lockfile, sem teste real Electron; isolamento PF/PJ parcial. |
| **G5 — Privacidade** | Avisos, retenção, exportação/exclusão, fornecedores e consentimentos avaliados | **PARCIAL** | Limitações Web/serviços estão comunicadas; falta política aprovada de retenção/exclusão e avaliação formal dos dados auxiliares/supostos fornecedores. |
| **G6 — UX/A11y** | Tarefas, mensagens de erro, teclado/contraste/labels e estados vazios/erro | **NÃO APROVADO** | Inventário estático existe; teste visual/teclado/contraste não executado. |
| **G7 — Operação** | Suporte, política beta, incidentes e release notes | **PARCIAL** | Changelog e backlog existem; canal/processo operacional de suporte e incidente precisa ser definido pelo owner. |
| **G8 — Distribuição** | Artefato assinado/verificado, hash, instalação/atualização/rollback quando aplicável | **ADIADO POR ESCOPO** | Build/instalador propositadamente não executado; precisa ser validado na fase de empacotamento antes de distribuição. |
| **G9 — Final** | Zero S0/S1, regressão verde, release candidate testado e checklist assinado por aprovadores | **NÃO APROVADO** | S0/S1 permanecem; falta release candidate real e assinaturas formais. |

## 6. Princípios de engenharia: verificação na beta.17

- **Uma fonte de verdade:** saldos/faturas/projeções derivam de entidades e regras; testes de ledger/posição cobrem casos importantes. Falta verificação cruzada manual abrangente.
- **Dinheiro exato:** o novo parser de orçamento produz centavos inteiros e recusa valores ambíguos; outros formulários continuam sujeitos à revisão de formato/validação geral.
- **Domínio independente da UI:** regras financeiras principais têm módulos de domínio; algumas ligações e testes da UI ainda são verificações estáticas.
- **Idempotência:** pagamento de fatura/import/geração recorrente têm proteções e testes; faltam multiaba e condições de concorrência real.
- **Falhar com clareza:** estado principal e catálogos auxiliares não devem converter corrupção em vazio; UI real de notificações ainda precisa ser testada.
- **Rastreabilidade:** trilha local ampliada; não é imutável, não é criptograficamente assinada nem retroativa.
- **Migração reversível:** fluxo tem snapshots e testes, mas faltam fixtures para todos os schemas legados e teste real de rollback.
- **Privacidade por padrão:** Web sem criptografia em repouso; outbox/categorização também guardam localStorage; decisão formal de exposição/retention pendente.
- **Medição antes de otimizar:** baseline de dataset 5k+ não foi coletado; teste J18 em aberto.

## 7. Condição de encerramento

A Fase 0 **não pode ser encerrada nesta entrega** conforme o próprio Plano Mestre. Há melhoria técnica relevante e testes automatizados aprovados, mas os requisitos ainda incluem execução manual, revisão visual, segurança/privacidade formal, verificação em ambiente real e aprovações de responsáveis. Não seria correto marcar a fase como concluída ou afirmar garantias absolutas.

A conclusão exige: (1) executar e anexar evidências dos J01–J20 aplicáveis; (2) corrigir todo defeito S0/S1 encontrado; (3) revisar tela por tela e testar Web e Electron/Windows; (4) realizar revisão independente de segurança/dependências; (5) fechar decisões de produto e operação; (6) aprovar G1–G9 conforme seus responsáveis. G8/build/installer só será executado na fase autorizada de empacotamento.

## Arquivos correlatos

- `FASE0_INVENTARIO_TELAS_PERSISTENCIA_BETA.17.md`
- `MATRIZ_JORNADAS_CRITICAS_FASE0_BETA.17.md`
- `BACKLOG_RISCO_FASE0_BETA.17.md`
- `CHANGELOG_O_RAZAO_V1.22.0_BETA.17.md`
