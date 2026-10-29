# Auditoria da Fase 0 — O Razão v1.22.0-beta.16

**Parecer: Fase 0 NÃO CONCLUÍDA.** A beta.16 fecha um defeito localizado na leitura/gravação da outbox, mas os gates do Plano Mestre ainda não têm evidência suficiente para encerramento.

## Referência essencial

Comparação feita com `Plano_Mestre_O_Razao_Desenvolvimento_ate_Beta_1.0` (versão 1.0, referência de 28/10/2026), especialmente a seção **3.1 Auditoria inicial obrigatória** (itens 1–6), a seção **5.2 Modelo de dados e persistência**, a seção **5.3 Sincronização futura** e os gates G1–G9. Conforme o plano, prevalece a evidência técnica quando o documento e o comportamento real divergirem.

## Trabalho da beta.16

A leitura estática dos acessos diretos ao `localStorage` encontrou, além da camada canônica de estado financeiro, chaves auxiliares para outbox, histórico de backups, aprendizado de categorias e recuperação de exceção. O estado financeiro principal já passa por `src/services/storage.js`; a outbox, porém, convertia erro de leitura/JSON inválido em fila vazia. Isso poderia ocultar operações pendentes e permitir que o próximo enfileiramento sobrescrevesse os bytes danificados. Foi alterado para falhar explicitamente, validar o formato e confirmar gravações por leitura.

### Arquivos alterados

- `src/services/localDb.js`
- `scripts/test-outbox-storage-integrity.mjs` (novo)
- `package.json` (versão e inclusão do teste)

## Evidências desta versão

| Verificação | Resultado | Limite da evidência |
|---|---|---|
| `npm test` | Exit code 0 | Suíte automatizada; não é E2E completo. |
| Testes da outbox | 4 grupos passaram | `localStorage` simulado; sem teste multiaba/quota real. |
| Sintaxe dos arquivos alterados | `node --check` aprovado | Não substitui build nem teste de navegador. |
| Inventário estático de acessos | Executado | Não prova que todos os fluxos de UI foram visualmente inspecionados. |

## Cruzamento obrigatório com os 6 itens da seção 3.1

| # | Requisito do Plano Mestre | Estado atual | Evidência que falta para fechar |
|---|---|---|---|
| 1 | Mapear rotas, telas, modais, estados vazios, carregamento, erros e ações destrutivas | **Aberto** | Inventário completo por tela/modal e revisão visual real de estados, temas, breakpoints, teclado e foco. |
| 2 | Mapear fontes de persistência, precedência e migração | **Parcial** | Este ciclo mapeou acessos diretos e fortaleceu a outbox. Falta matriz completa de cada fonte/chave, migrações, comportamento de quota, concorrência entre abas e ensaios reais desktop/Web. |
| 3 | Auditar autenticação, autorização, isolamento PF/PJ, sessão e dados pessoais | **Parcial / bloqueador** | Autenticação de produção não existe e permanece desativada/fail-closed. Falta auditoria ponta a ponta PF/PJ e threat model com revisão independente. |
| 4 | Rastrear criação/edição/exclusão/pagamento/estorno/conciliação e validar saldo, auditoria e projeções | **Parcial / bloqueador** | Matriz de invariantes com evidência reproduzível para cartões, faturas, transferências, estornos, split, recorrência, importação e todas as mutações sensíveis. |
| 5 | Executar jornadas manualmente com perfis limpos e dados volumosos; registrar bugs reproduzíveis | **Aberto** | Evidência de execução real por jornada, volume, ambiente, passos e resultado; testes Node não substituem essa etapa. |
| 6 | Criar mapa de dívida técnica priorizado por risco | **Parcial** | Prioridades constam nas auditorias, mas falta backlog único com identificador, severidade, responsável, critério de aceite e evidência de resolução por item. |

## Inventário dos acessos diretos ao armazenamento Web

| Arquivo / chave | Finalidade | Avaliação atual |
|---|---|---|
| `src/services/storage.js` — `razao_app_state_v3` | Estado financeiro canônico | Camada principal; possui confirmação de gravação e recuperação Web. `localStorage` não é transacional nem criptografado em repouso. |
| `src/services/storage.js` — `razao_app_state_v3.last-known-good` | Último estado confirmado | Snapshot de recuperação; falha secundária é comunicada, mas precisa de ensaios reais de quota/corrupção. |
| `src/services/storage.js` — `razao_app_state_v3.pre-restore-backup` | Bytes anteriores à restauração | Proteção/rollback de restauração; fluxo ainda precisa de testes E2E e falhas injetadas. |
| `src/services/localDb.js` — `razao_outbox_queue_v1` | Eventos locais pendentes de sincronização | **Corrigido na beta.16** para não mascarar corrupção nem sobrescrever fila ilegível; ainda não é sync de produção. |
| `src/services/backupHistory.js` — `razao_backup_history_v1` | Catálogo local de backups | Limita tamanho e valida backups ao carregar; falhas/corrupção e interação com restore precisam de E2E. |
| `src/domain/categoryLearning.js` — `razao_category_rules_v14` | Regras auxiliares de categorização | Não é o livro-razão; leitura retorna fallback vazio em erro. Rever transparência e testes, mas não deve ser confundida com estado financeiro. |
| `src/components/ErrorBoundary.jsx` — chave principal e pré-restauração | Redefinição emergencial Web | Escrita direta é deliberada no fluxo de recuperação, após confirmação e verificação dos bytes copiados; manter sob revisão por ser ação destrutiva. |

## Dívida técnica priorizada — estado consolidado

- **S0/S1 — persistência/finanças:** faltam ensaios reais de falha e prova E2E de recuperação/rollback; invariantes financeiras e idempotência ainda incompletas.
- **S1 — isolamento e segurança:** PF/PJ incompleto; autenticação de produção não implementada; modo local-first precisa de limites claros e threat model.
- **S1 — sincronização:** outbox local existe, mas backend remoto não é produção e não satisfaz ainda conflito explícito, idempotência durável e versionamento otimista exigidos pelo plano.
- **S1/S2 — jornadas e dados:** falta matriz manual com perfis limpos e grandes volumes; importação/exportação carece de amostras representativas, deduplicação, desfazer e teste de injeção CSV.
- **S2 — UX/A11y:** inventário visual, teclado/foco, zoom, leitor de tela, contraste WCAG AA e teste com usuários pendentes.
- **S2 — operação/lançamento:** gates G1–G9 não aprovados; canal de suporte, política beta, release candidate, assinatura e rollback de distribuição são etapas posteriores e não devem ser antecipadas.

## Decisão de gate

- G1 Produto: **parcial** — escopo real/mock precisa permanecer explícito.
- G2 Finanças: **não aprovado** — invariantes e jornadas críticas não estão integralmente demonstradas.
- G3 Persistência: **parcial** — há testes automatizados de recuperação, mas faltam falhas reais e E2E.
- G4 Segurança: **não aprovado** — threat model/revisão independente pendentes.
- G5 Privacidade: **parcial** — localStorage Web não criptografado em repouso e política completa ainda não validada.
- G6 UX/A11y: **não aprovado** — inspeção visual e testes de acessibilidade pendentes.
- G7 Operação, G8 Distribuição e G9 Final: **não aprovados / ainda não aplicáveis para fechamento**.

**Conclusão:** a beta.16 melhora um caminho concreto de integridade, mas não satisfaz os seis itens obrigatórios de auditoria inicial. Não marcar Fase 0 como concluída, não publicar no GitHub e não iniciar build/instalador nesta etapa.
