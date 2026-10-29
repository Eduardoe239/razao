# Backlog priorizado de riscos — O Razão — Fase 0 beta.17

**Data:** 28/10/2026. **Status:** registro técnico, não aprovação de lançamento. Prioridade usa S0 (bloqueador de integridade/segurança imediata), S1 (bloqueador de beta pública), S2 (alto/antes de expandir beta), S3 (melhoria controlada). A classificação deve ser confirmada pelo responsável técnico e product owner.

## S0 — investigar antes de usar em dados financeiros reais ou lançar

| ID | Risco | Mitigação/estado atual | Critério de aceite | Responsável / evidência pendente |
|---|---|---|---|---|
| F0-S0-01 | Perda/sobrescrita em corrupção ou falha de leitura | Storage principal Web/desktop tem snapshots, validação estrutural e fluxo de recuperação. | Testar corrupção JSON e semântica, quota, encerramento abrupto, todas cópias inválidas, rollback; provar saldo/contagens preservados. | Responsável técnico + QA; E2E real pendente. |
| F0-S0-02 | Contaminação PF/PJ em qualquer entidade/ação | Filtros/escopos e testes focados foram adicionados. | J10 passa em todas as abas e operações, inclui transferência, cartão, importação, recorrência e auditoria sem vazamento/alteração cruzada. | Responsável técnico + QA; manual pendente. |
| F0-S0-03 | Divergência financeira por status, transferência, fatura/dupla contagem ou recorrência | Ledger, parser de dinheiro, pagamento idempotente, recorrência e projeção têm testes. | J03–J09 aprovados com fixtures independentes, antes/depois e reload; zero divergência não explicada. | Responsável técnico + owner. |
| F0-S0-04 | Restauração de backup financeiramente inválido | Validação estrutural/semântica antes de sanitizar e gravação confirmada. | J11/J12 em Web e Electron reais, rollback/estado anterior preservados, mensagem de erro clara. | QA; Electron real não disponível nesta sessão. |

## S1 — bloqueadores para beta pública / gates G1–G9

| ID | Risco/decisão | Situação | Critério de aceite |
|---|---|---|---|
| F0-S1-01 | Jornadas manuais e inspeção visual não executadas | Matriz J01–J20 entregue, estados explicitamente NÃO EXECUTADOS. | Execução por QA em browser/Electron real com evidence bundle; nenhum caso obrigatório sem resultado. |
| F0-S1-02 | Scope real/mock/bloqueado ainda precisa de decisão formal | README e inventário agora rotulam auth, Open Finance, OCR e sync como bloqueados/mock. | Product owner aprova modo local-first do beta, público, proposição de valor, funcionalidades fora do escopo e linguagem pública (G1). |
| F0-S1-03 | Segurança da cadeia de dependências | `npm install` não completou; sem lockfile gerado nesta sessão, auditoria SCA não executada. | Instalação reproduzível com lockfile revisado, `npm audit`/SCA em ambiente de build, segredos e permissões revisados; não adicionar lockfile parcial. |
| F0-S1-04 | Web sem criptografia em repouso; dados auxiliares renderer localStorage | Aviso explícito da limitação Web; estado principal desktop via `safeStorage` por código. | Política de dados aprovada e testes em dispositivo compartilhado; decisão de criptografia/escopo e aviso desktop cobrindo outbox/regras locais. |
| F0-S1-05 | Electron/Windows não testado em ambiente real | IPC restringe sender e salva por safeStorage no código; testes simulam API. | Executar sob Electron alvo em Windows, validar chaveiro/safeStorage, permissões, arquivos, restore, paths, upgrade e rollback. |
| F0-S1-06 | Auditoria é local/mutável | Eventos cobrem mutações chave; sem imutabilidade, retroatividade ou assinatura. | Confirmar escopo/limite e frase pública; testar cada mutação e erros de gravação; aprovar explicitamente se suficiente para beta local-first. |
| F0-S1-07 | Importação/exportação sem E2E abrangente | Testes de domínio/mock existem, CSV/OFX fixtures completos não executados. | J06/J07/J11/J12 aprovados com arquivos variados, deduplicação, formula injection e rollback. |
| F0-S1-08 | Acessibilidade/UX estados vazios/erro não revisados | Inventário estático entregue. | J17 e checklist visual por tela, viewport, tema, teclado, foco, contraste/labels aprovados por QA. |
| F0-S1-09 | Sem medição de desempenho de dados volumosos | Testes atuais não medem browser/Electron com 5k+ registros. | J18 estabelece baseline e limites de tempo/memória, sem cálculos ou filtros incorretos. |
| F0-S1-10 | Aprovações formais dos gates ausentes | Relatório enumera G1–G9 sem aprovar gates pendentes. | Donos designados assinam critérios G1–G9; G9 zero S0/S1 abertos, regressão verde e release candidate testado. |
| F0-S1-11 | Pipeline de migração de schema não é único nem está conectado | `migrations.js` usa `schemaVersion=3`; estado corrente usa `version=4`; busca não encontrou chamadas de `migrateData()` no carregamento de produção. | Definir um único `CURRENT_SCHEMA_VERSION`, pipeline chamado pelo carregamento/restauração, fixture por schema oficialmente suportado, comparação de saldo/contagens e rollback demonstrado; incluir no `npm test`. |

## S2 — alto, antes de ampliar integrações/recursos

| ID | Item | Critério de aceite |
|---|---|---|
| F0-S2-01 | Migrações legadas e reversão | Promoção para S1: existe divergência concreta de versão e o runner `migrateData()` não está conectado ao boot. Critério: resolver F0-S1-11, fixture por schema suportado, backup prévio, contagem/saldo comparado e rollback comprovado. |
| F0-S2-02 | Concorrência entre abas e quota real `localStorage` | Testes multiaba/quotas reais; conflitos detectados e mensagem que não prometa gravação. |
| F0-S2-03 | Retenção do histórico de backups e capacidade | Limites/evicção documentados, backup externo recomendado e teste de catálogos no limite. |
| F0-S2-04 | Semântica de recorrência avançada (esta ocorrência/esta e futuras/regra toda) | Decisão de produto, casos em calendário 28–31, idempotência e preservação de ocorrências pagas. |
| F0-S2-05 | Integridade de referências em todas entidades | Garantir remoção/edição de conta, cartão e categoria não cria órfãos, ou fluxo oferece migração/recusa. |
| F0-S2-06 | `localDb` mantém um histórico de nome que pode induzir a IndexedDB | Atualizar docs/nomes e garantir que consumidores não suponham IndexedDB/SQLite. Parcialmente documentado na beta.17. |

## S3 — melhorias controladas

- Revisão estética da marca e polimento visual depois de acessibilidade e estabilidade.
- Otimizações guiadas pelos resultados J18, não por impressão.
- Provedor de IA, OCR, Open Finance e sincronização reais somente após decisão de produto, consentimentos, threat model, backend durável e critérios próprios de integração.
- Recursos premium/expansões não bloqueantes ficam fora da Fase 0.

## Regras de fechamento

- Nenhum item S0 pode permanecer aberto para encerrar a fase de integridade.
- Para beta pública, atender G9 do Plano Mestre: zero S0/S1 abertos, regressão verde, release candidate testado e checklist assinado.
- Esta sessão não dispõe de ambiente capaz de comprovar J01–J20 visualmente, instalação/revisão SCA ou execução real de Electron/Windows; portanto, tais itens permanecem abertos. Não atribuir “PASSOU” por inferência.
