# O Razão — Decisões de produto do proprietário

Registro das decisões tomadas pelo proprietário (Plano Mestre §91, §93). Decisões aqui prevalecem sobre propostas técnicas; ADRs `PROPOSED` não são decisões.

| ID | Data | Decisão | Origem | Efeito |
|---|---|---|---|---|
| D-001 | 02/11/2026 | Validação visual e funcional da beta.20 **aprovada como evidência técnica da baseline**, com limitações e itens BLOCKED registrados | Revisão de `docs/audit/fase0/RELATORIO_VALIDACAO_VISUAL_BETA20.md` | Critério "evidências visuais/manuais" do gate da Fase 0 atendido. **Não** fecha a Fase 0 |
| D-002 | 02/11/2026 | Elevar a **P0**: FIN-05 (datas civis em UTC), FIN-08 (divergência saldo ledger × painel), DATA-02 (recuperação silenciosa sem preservação/aviso) | Achados V-01, V-04, V-07 | `docs/risks/RISK_REGISTER.md` |
| D-003 | 02/11/2026 | Registrar como **P1** o assistente que comunica situação positiva diante de dados negativos/inconsistentes (AI-01) | Achado V-05 | `docs/risks/RISK_REGISTER.md` |
| D-004 | 02/11/2026 | Manter categorias, acessibilidade e apresentação visual nas prioridades propostas no relatório, sem descartá-los | Relatório §3–§4 | `docs/risks/RISK_REGISTER.md` |
| D-005 | 02/11/2026 | **Pagamento de fatura com saldo insuficiente:** permitir registrar pagamento já realizado mesmo com saldo resultante negativo, com aviso, saldo resultante, confirmação explícita e registro correto; pagamento planejado nunca aparece como concluído; integrações bancárias futuras obedecem à resposta efetiva do provedor | Observação da validação (pagamento hoje bloqueado) | Requisito `REQ-INV-PAY-001` em `docs/PRODUCT/REQUIREMENTS.md`. **Não implementado** |
| D-006 | 02/11/2026 | Executar testes dedicados aos itens BLOCKED (alerta; recuperação local) em perfil temporário, sem alterar código | Relatório §6 | Resultados em `RELATORIO_VALIDACAO_VISUAL_BETA20.md` §9 |
| D-007 | 02/11/2026 | Preservar integralmente as capturas originais (~17 MB) em `docs/audit/fase0/evidencias/visual/`, com índice; sem redimensionar ou substituir | — | `evidencias/visual/INDICE.md`, `SHA256SUMS` |
| D-008 | 02/11/2026 | Esta etapa autoriza somente documentação, testes isolados e evidências. **Não** autoriza correções, mudança de arquitetura ou versão, beta.21, commit ou push | — | Governança |
| D-009 | 02/11/2026 | Elevar **DATA-05** a **P0** (recuperação local do `ErrorBoundary` Web leva à perda de acesso aos dados: app vazio sem aviso, principal e última cópia válida sobrescritos com estado vazio, dados preservados só na cópia interna sem caminho na UI). Correção **obrigatória e prioritária na Alpha 1**; nenhuma recuperação pode descartar ou sobrescrever dados sem ação segura, explícita e informada do usuário | Teste dedicado T2 (FAIL), `RELATORIO_VALIDACAO_VISUAL_BETA20.md` §9 | Ficha DATA-05 com contenção e 6 critérios de aceite em `docs/risks/RISK_REGISTER.md`; item P0-9 no backlog; condição do gate da Alpha 1 |
| D-010 | 02/11/2026 | Manter as evidências visuais (159 PNG originais, ~17 MB, `INDICE.md`, `SHA256SUMS`) no **Git normal, sem Git LFS** | Risco de processo PROC-04 | PROC-04 decidido e aceito em `docs/risks/RISK_REGISTER.md` |
| D-011 | 02/11/2026 | **Avaliação externa multidisciplinar obrigatória ao final de cada Alpha**, com aprovação formal do proprietário antes do congelamento da versão e da progressão para a próxima Alpha. Regra complementar obrigatória ao Plano Mestre V2.0 (texto integral em RC-001, abaixo) | Decisão expressamente aprovada pelo proprietário em conversa anterior; formalizada por instrução do proprietário em 02/11/2026 | Critério de saída de **todas** as Alphas (`docs/PROJECT_STATUS.md` §4.1); `CLAUDE.md` |
| D-012 | 02/11/2026 | **Encerramento formal da Fase 0** (Plano §68) aprovado pelo proprietário. Baseline auditada: `1.22.0-beta.20` (`main@f011bcf`; documentação até `778fca0` + atualizações não commitadas de 02/11/2026), com evidências e limitações documentadas. **Alpha 1** passa a ser a próxima etapa autorizada, seguindo o Plano Mestre V2.0 e a governança complementar D-011. Permanecem: DATA-05 como **P0** e correção obrigatória da Alpha 1 (D-009); T1 = PASS; T2 = FAIL; tela de erro Desktop e Electron/Windows **NÃO VERIFICADOS** | Revisão do proprietário do gate da Fase 0 (`docs/PROJECT_STATUS.md` §2) | Fase 0 **ENCERRADA**; Alpha 1 autorizada. Não autoriza por si só a implementação de incrementos: cada incremento segue Plano C.2.8 (plano técnico antes de implementar) |
| D-013 | 02/11/2026 | **Escopo da beta.21 aprovado** (higiene, CI e importação correta), em 21.1 → 21.2 → 21.3, sequenciais, com revisão e autorização entre subincrementos. 21.1 autorizada para execução; 21.2 e 21.3 aprovadas em escopo, condicionadas à autorização. Ajustes técnicos obrigatórios: detecção de delimitador CSV fora de aspas, sem escolha silenciosa se ambíguo; separação entre registros lógicos e linhas físicas; todo registro de dados não vazio classificado como válido ou rejeitado; valores ambíguos rejeitados, sinal preservado, centavos inteiros, limites seguros verificados; nenhum dado bancário real em logs, telemetria ou CI; compatibilidade integral dos contratos dos parsers existentes; E2E reproduzível em ambiente documentado; testes de importação idempotente, lançamentos idênticos legítimos, sobreposição parcial, reordenação e FITID. Versão `1.22.0-beta.21` só após todos os critérios de aceite e autorização formal de fechamento | Plano técnico da beta.21 | Execução da 21.1 |
| D-014 | 02/11/2026 | **`importedId` legível e versionado.** CSV e OFX sem FITID: namespace comum `statement:v1:<data civil>:<centavos com sinal>:<descrição normalizada>:<ocorrência>`. OFX com FITID: `ofx:v1:fitid:<FITID>`. Conciliação restrita ao contexto de conta e workspace. Não afirmar ausência absoluta de colisões. Testar idênticos legítimos, reordenação, sobreposição parcial e reimportação | Plano da beta.21 §3–§4 | Subincremento 21.3 |
| D-015 | 02/11/2026 | **Testes de propriedade com gerador próprio**, seed fixa, milhares de casos reproduzíveis, testes de limite e exibição da seed em caso de falha. **Não adicionar `fast-check`** | Plano da beta.21 §5 | Subincrementos 21.2 e 21.3 |
| D-016 | 02/11/2026 | **CI e Git:** commit e push autorizados **somente na branch de trabalho**, nunca diretamente na `main`; sem merge. CI em Ubuntu e Windows, com duas versões de Node compatíveis com o projeto, executando `npm ci`, `npm test` e `npm run build` | Plano da beta.21 §5 | Subincremento 21.1 e seguintes |
| D-017 | 02/11/2026 | **Sequência beta.22 → beta.27 aprovada como planejamento inicial** da Alpha 1, mantendo recuperação segura (beta.23) antes da migração para workspaces (beta.26). Cada incremento exige plano e aprovação próprios | Rastreabilidade da Alpha 1 | `docs/PROJECT_STATUS.md` §2 |
| D-018 | 02/11/2026 | **Cartões:** ocultar as funcionalidades operacionais de cartões e faturas durante a Alpha 1; documentar que não estarão disponíveis até a Alpha 3; nunca apresentar cartões fictícios como funcionalidade real | FUN-02 (P0) | Tarefa de interface a programar em incremento da Alpha 1 com plano próprio; matriz de capacidades e `RISK_REGISTER.md` |

---

## Regras complementares obrigatórias ao Plano Mestre V2.0

Estas regras **complementam** o `PLANO_MESTRE_O_RAZAO_V2.0.md` sem reescrevê-lo. Em caso de conflito aparente, prevalece a exigência mais restritiva, e a divergência deve ser registrada para decisão do proprietário.

### RC-001 — Avaliação externa multidisciplinar ao final de cada Alpha (D-011)

**Aplicação:** Alpha 1, Alpha 2, Alpha 3, Alpha 4 e Alpha 5 (Plano §69–§73) e quaisquer Alphas futuras. Soma-se aos gates próprios de cada Alpha definidos no Plano; não os substitui.

**Regra obrigatória:**
1. Toda Alpha concluída deve ser disponibilizada como uma **versão de avaliação** para profissionais externos.
2. O grupo de avaliadores deve ser **multidisciplinar** e compatível com o escopo da Alpha: designers, engenheiros de software, analistas de sistemas, QA, especialistas financeiros, segurança, privacidade e outros profissionais pertinentes.
3. Os avaliadores devem testar as funcionalidades prometidas para aquela Alpha, avaliar **qualidade, consistência, usabilidade, segurança e completude**, e apresentar sugestões para a próxima etapa.
4. Cada avaliação deve gerar **feedback estruturado**, com problemas, evidências, sugestões e classificação de prioridade.
5. Os resultados devem ser **triados**. Correções necessárias devem ser implementadas e **retestadas antes do encerramento da Alpha**.
6. O proprietário do produto deve **aprovar formalmente o resultado da avaliação** antes do congelamento da versão e da progressão para a próxima Alpha.
7. **Uma Alpha não está concluída simplesmente porque sua implementação terminou.**

**Conteúdo mínimo do pacote de avaliação:**
- versão e hash imutáveis;
- changelog;
- matriz de funcionalidades;
- limitações conhecidas;
- critérios de aceite;
- roteiro de testes;
- dados sintéticos;
- evidências de QA;
- formulário estruturado de avaliação.

**Restrições herdadas do Plano e do `CLAUDE.md`:** o pacote usa somente dados sintéticos (nunca dados financeiros reais do proprietário); recursos demonstrativos/mock são rotulados como tais; limitações e falhas conhecidas não são omitidas; a distribuição de instaladores segue as regras de release do Plano (C.3, §86) — o meio de disponibilização da versão de avaliação deve ser definido no planejamento de cada Alpha.

**Sequência de saída de uma Alpha:** implementação → gate técnico da Alpha (Plano) → pacote de avaliação → avaliação externa multidisciplinar → triagem → correções e retestes → aprovação formal do proprietário → congelamento da versão (tag/hash) → início da Alpha seguinte.
