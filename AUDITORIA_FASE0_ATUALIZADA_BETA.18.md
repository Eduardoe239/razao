# Auditoria da Fase 0 — O Razão v1.22.0-beta.18

**Parecer:** Fase 0 **AINDA NÃO APROVADA**. O hardening estático e a regressão automatizada passaram; faltam evidências manuais e de ambiente real exigidas pelo Plano Mestre.

## Documento essencial seguido

`Plano_Mestre_O_Razao_Desenvolvimento_ate_Beta_1.0` (versão 1.0, referência de 28/10/2026). Cruzamento principal com a seção **3.1 Auditoria inicial obrigatória**, seções de modelo/persistência e sincronização futura, checklist de release e gates G1–G9. O comportamento real do código prevalece sobre texto antigo quando há divergência.

## Resumo da execução nesta beta

1. Pipeline de migração de schema v1–v4 conectado à inicialização e à validação de backups; versões conflitantes são recusadas.
2. Estado inicial seguro sem movimento, cartão ou saldo demonstrativo; sanitização não volta a introduzir a fixture de demonstração.
3. Isolamento PF/PJ repara referências de contas, categorias e cartões nos dois sentidos, com idempotência e validação estrita após a migração.
4. Pagamento de fatura é diferenciado de transferência entre contas na validação da referência de destino.
5. Guardas de mutação de lançamento e parser monetário estrito na interface; validação ocorre antes da alteração de estado/efeitos laterais.
6. Perfil Electron de desenvolvimento separado do perfil da aplicação instalada.
7. Adicionadas fixtures de importação de controle e volume e integrado o último conjunto de teste legado ao comando `npm test`.

## Comparação com os critérios de saída da Fase 0

| Critério de saída | Situação beta.18 | Evidência ou pendência para fechar |
|---|---|---|
| Base técnica, versão e hash identificados | **Atendido para esta entrega** | ZIP e SHA-256 na entrega; hash deve ser refeito após qualquer alteração. |
| Mapa inicial e classificação real/parcial/mock | **Atendido em documentação, sujeito à aprovação de produto** | README e inventário atualizados; owner deve confirmar escopo local-first. |
| `npm test` executado e resultado registrado | **Atendido no ambiente atual** | Exit code 0; 55 scripts, 101 testes de domínio e subtestes descritos no relatório. |
| Riscos P0 conhecidos registrados | **Atendido como inventário inicial** | Backlog traz critérios de aceite; classificação final e decisão de escopo precisam ser assinadas. |
| Todas as telas, modais e estados inventariados e revisados visualmente | **Parcial** | Inventário estático criado; revisão visual em navegador/Windows, breakpoint, tema, foco e teclado não ocorreu aqui. |
| Fontes de persistência e todas as mutações financeiras mapeadas ponta a ponta | **Parcial** | Mapa estático e guardas automatizadas criados; fluxos UI reais e todas as rotas precisam ser validados no notebook. |
| Jornadas manuais com base limpa e dados volumosos executadas | **Pendente** | Matriz J01–J20 e fixture de 2.000 linhas incluídas; precisam ser executadas e registradas em ambiente real. |
| Riscos P0 priorizados com issue e critério de aceite | **Parcial** | Backlog tem identificadores locais e critérios objetivos; confirmar owner, responsáveis, prazos/decisões. |
| Recuperação após falha e erro de leitura demonstrados sem perda de dados | **Parcial** | Simulações Web/Electron passaram; falta browser/Windows real, quota, concorrência e encerramento abrupto. |

## Seção 3.1 — seis atividades obrigatórias

1. **Telas/estados:** lista estática inclui painel, histórico, faturas, orçamento, análises, previsões, importador, auditoria, integridade, perfil, configurações, splash, ErrorBoundary, modais e tela de recuperação. A parte de “revisar visualmente” é pendente.
2. **Persistência:** Web usa `localStorage` para estado e cópias locais; Electron mantém arquivo principal e snapshot protegidos através do `safeStorage` do sistema operacional, com validação no processo principal. Catálogo de backups, outbox e legado de aprendizado de categoria têm chaves próprias; API de sync contém armazenamento em memória e não é durável. Não há evidência de IndexedDB/SQLite atuando como fonte canônica atual.
3. **Autenticação/privacidade/PF-PJ:** autenticação remota permanece desativada/fail-closed; não há cadastro/login/recuperação produtivos. Perfil PF/PJ passou em testes automatizados de escopo e migração, mas precisa de jornadas visuais/end-to-end. `localStorage` Web não é criptografado em repouso.
4. **Mutações financeiras:** a guarda de criação/edição, saldo/fatura, orçamento, recorrência, importação/conciliação e auditoria tem testes direcionados. Execução real e cobertura total de todos os gestos da interface ainda pendentes. O histórico local não é imutável.
5. **Jornadas principais:** roteiro e dados fictícios incluídos; não declarar concluído até ter log de resultado, evidência e versão do ambiente por J01–J20.
6. **Dívida técnica por risco:** backlog atualizado. Resolução de implementação não substitui aceite formal de critérios ou validação real.

## Gates G1–G9

| Gate | Estado | Motivo |
|---|---|---|
| G1 Produto | **Pendente de aprovação** | Escopo técnico real/parcial/mock foi documentado; product owner confirma público e promessa. |
| G2 Finanças | **Parcial** | Domínio automatizado passou; jornadas reais de transferência, fatura parcial/completa, recorrência, estorno/exclusão e reconciliação ainda requerem execução. |
| G3 Persistência | **Parcial** | Migração, restauração, corrupção e rollback foram exercitados por teste automatizado/simulado; faltam ambiente real, quota, concorrência e interrupção. |
| G4 Segurança | **Pendente** | Fronteiras estáticas/IPC e cenários mockados passaram; falta lockfile/SCA, threat model formal, análise ASVS aplicável e revisor independente. |
| G5 Privacidade | **Pendente de aceite** | Limites e armazenamento divulgados; avaliar retenção, exclusão, exportação, fornecedores e consentimento com o owner. |
| G6 UX/A11y | **Pendente** | Parse e inspeções estáticas não substituem tarefas, teclado, foco, contraste, zoom, labels e screen reader reais. |
| G7 Operação | **Pendente de decisão do owner** | Suporte, política beta, contato e processo de incidente precisam ser aprovados/fornecidos. |
| G8 Distribuição | **Diferido conforme plano** | Build/instalador propositalmente não executados nesta fase. |
| G9 Final | **BLOQUEADO** | Existem evidências reais pendentes e gates não aprovados; não é possível certificar zero S0/S1. |

## Limites da conclusão técnica

`npm test` e validações sintáticas foram executados no ambiente isolado de desenvolvimento. Ainda não executados: build, instalador, teste real de navegador/Electron, teste de penetração, análise completa de dependências (a geração do lockfile falhou por registry inacessível), crash-test físico, teste de armazenamento cheio/multiaba, revisão independente de segurança e assinatura de gates.

**Decisão:** liberar o ZIP beta.18 para um ciclo supervisionado de testes locais com dados fictícios, depois de instalação das dependências no notebook. Isso não é autorização de uso produtivo nem aprovação final da Fase 0.
