# Auditoria da Fase 0 — O Razão v1.22.0-beta.13

**Resultado:** Fase 0 **NÃO CONCLUÍDA**. A versão melhora a recuperação desktop, mas não atende integralmente aos critérios de saída do Plano Mestre e não autoriza declarar a aplicação pronta para publicação validada.

## Mudança desta versão

A versão beta.13 adiciona uma cópia `razao_app_db.last-known-good.enc` com o último estado financeiro confirmado no desktop. A recuperação tenta essa cópia antes das cópias históricas anteriores à restauração, e também tenta recuperar o estado quando o arquivo principal desapareceu. A restauração de um backup atualiza essa cópia sem apagar o snapshot pré-restauração.

## Evidências desta versão

| Verificação | Resultado | Limite |
|---|---|---|
| `npm test` | Código de saída 0; suíte de domínio registra 100 aprovados e 0 falhas | Combina testes de domínio, verificações estáticas e integrações simuladas; não equivale a E2E completo |
| Handler desktop real com filesystem temporário | 4 cenários aprovados | API Electron e `safeStorage` são simuladas; não valida criptografia do SO nem comportamento de ambiente de usuário real |
| Falha ao atualizar snapshot secundário | O estado principal segue reportado como salvo; resultado identifica que a cópia não foi atualizada | Falta observação visual manual do aviso em aplicativo desktop real |
| Arquivo principal corrompido | Recupera o último estado confirmado | Ainda faltam ensaios com corrupção física, corte de energia e disco cheio reais |
| Arquivo principal ausente | Recupera o último estado confirmado se a cópia existe | Não equivale a validação de cenários de reinstalação, migração ou remoção intencional de perfil |
| Restauração de backup | Atualiza snapshot recente e preserva cópia anterior | Não houve E2E manual completa com arquivos financeiros anonimizados de produção |

## Matriz de riscos e bloqueadores

| Área | Estado | Pendência para encerrar |
|---|---|---|
| Persistência e recuperação no desktop | **Parcialmente mitigada** | Testar em ambiente real: disco cheio, interrupção durante commit, corrupção do arquivo principal e de snapshots, restauração/rollback e falha de permissões |
| Persistência e recuperação Web | **Aberta** | `localStorage` não possui cópia de último estado confirmado equivalente; rever quota, snapshot antigo e comportamento de leitura corrompida sem causar sobrescrita de dados |
| Isolamento PF/PJ | **Parcial** | Auditar ponta a ponta contas, cartões, faturas, transferências, recorrências, orçamentos, previsões, relatórios, diagnóstico, importação e exportação; comprovar com fixtures e E2E |
| Autenticação | **Desativada/fail-closed** | Produto deve permanecer explicitamente local-first enquanto não houver autenticação real; serviços demonstrativos não podem ser anunciados como login de produção |
| Open Finance | **Demonstrativo/mock** | Não há integração bancária real; manter explícito e não solicitar credenciais bancárias reais |
| Outbox/sincronização remota | **Sem sincronização de produção** | Fila não pode anunciar sincronização concluída quando não há handler; servidor real, contrato de conflito e persistência durável ainda são necessários |
| Importação/exportação | **Parcialmente coberta** | Validar arquivos anonimizados, codificações, linhas inválidas, deduplicação, desfazer, prévia e proteção contra fórmulas CSV |
| Auditoria financeira | **Parcialmente coberta** | Confirmar cobertura de cada mutação, restauração e reversão; log local não deve ser descrito como imutável ou prova de autenticidade |
| Interface e acessibilidade | **Aberta** | Inventariar e revisar visualmente cada rota, modal, estado vazio, carregamento, erro e sucesso; testar teclado, zoom, contraste e telas pequenas |
| Jornadas críticas | **Aberta** | Executar manualmente cadastro inicial local, criação/edição/exclusão de transação, transferência, pagamento de fatura, recorrência, importação, exportação, backup/restauração e separação PF/PJ com dados limpos e grandes |
| Build e empacotamento | **Adiado** | Não executado nesta rodada conforme instrução; deve ser tratado na etapa de empacotamento, não confundido com validação de código-fonte |

## Critérios de saída ainda pendentes

- [ ] Inventário integral de telas, rotas, modais, estados de carregamento/vazio/erro/sucesso e revisão visual manual.
- [ ] Mapeamento ponta a ponta das fontes de persistência e das mutações financeiras.
- [ ] Matriz manual das jornadas essenciais executada com dados limpos e volume elevado.
- [ ] Riscos P0/P1 com responsáveis, critérios de aceite e evidências de resolução.
- [ ] Recuperação após falha e erro de leitura comprovados sem perda de dados em desktop e Web.
- [ ] Isolamento PF/PJ demonstrado em todos os módulos e formatos de exportação relevantes.
- [ ] Revisão de privacidade e segurança proporcional ao escopo, separando controles demonstrados de alegações ainda não verificadas.

## Próxima prioridade sugerida

Continuar pelo fluxo Web de persistência/recuperação, porque a cópia recente no desktop não resolve snapshots potencialmente antigos em `localStorage`. Em seguida, executar a matriz PF/PJ ponta a ponta e preparar um roteiro E2E/manual com evidências. Builds e instaladores permanecem adiados até a etapa prevista no Plano Mestre.

## Decisão

Não declarar a Fase 0 concluída. Manter a versão no ciclo `1.22.0-beta.*` até que os critérios de saída estejam acompanhados de evidências verificáveis.

---

## Atualização beta.14 — persistência Web e recuperação

**Versão examinada:** `1.22.0-beta.14`  
**Escopo desta rodada:** `src/services/storage.js`, aviso de saúde de persistência em `src/App.jsx`/`src/styles/theme.css`, testes `scripts/test-web-last-known-good.mjs`, contrato `scripts/test-error-boundary-recovery.mjs` e `package.json`.

### Resultado técnico
- `npm test`: **código de saída 0**.
- Testes de domínio: **100 aprovados, 0 falhas**.
- Desktop last-known-good: **4 cenários aprovados**.
- Web last-known-good: **5 cenários aprovados**.
- O novo teste usa o módulo real `src/services/storage.js` com um `localStorage` simulado. Confirma recuperação de JSON corrompido, manutenção do snapshot anterior quando falha a atualização secundária, fallback para cópia pré-restauração, erro explícito quando todas as cópias falham e limpeza explícita sem ressuscitar dados.
- O ZIP da entrega foi testado com `unzip -t`.

### Risco reduzido
Na Web, uma gravação confirmada atualiza agora uma cópia `last-known-good`. Quando a chave principal fica inválida, o carregador tenta essa cópia antes da cópia pré-restauração. A interface recebe um aviso quando o estado principal foi salvo, mas a cópia secundária não foi atualizada; o aviso é removido após uma gravação que consiga atualizar a cópia.

### Limitações / riscos ainda abertos
1. O teste não usa Chromium real e não constitui E2E. É necessário validar quota real, encerramento durante gravação, perfil do navegador danificado, armazenamento privado e múltiplas abas.
2. `localStorage` não é transacional; snapshot e estado principal são duas chaves separadas. A estratégia reduz o risco e torna falhas visíveis, mas não substitui IndexedDB com protocolo transacional ou banco local dedicado.
3. Estado e snapshot continuam sem criptografia em repouso na Web; o snapshot na mesma origem não é backup externo.
4. A remoção da cópia ao executar `saveState(null)` preserva o contrato legado de limpeza explícita. Se o navegador bloquear a remoção por falha do storage, a interface registra o aviso no console; este cenário precisa de uma jornada E2E dedicada.
5. Ainda não foram executados build, revisão visual em breakpoints/temas, teste de acessibilidade com leitor de tela/axe, ensaio em Electron/Windows, nem testes de resiliência física (disco cheio/interrupção abrupta).
6. O isolamento PF/PJ ainda precisa de validação de ponta a ponta em todos os módulos, exportações e fluxos de migração.
7. Open Finance, OCR visual, autenticação de produção e sincronização remota continuam sem poder ser anunciados como integrações reais sem a implementação e validação correspondentes.

### Gate da Fase 0
**Decisão: NÃO CONCLUÍDA.** Esta versão melhora uma parte da persistência Web, mas não satisfaz integralmente os gates do Plano Mestre: inventário visual completo; matriz manual de jornadas com dados limpos e volumosos; validação de todas as mutações financeiras e fontes de persistência; recuperação demonstrada em ambiente real; e riscos P0 encerrados com evidências reproduzíveis.

### Próximos gates obrigatórios
- [ ] Exercitar persistência/recuperação Web em Chromium real com quota limitada, JSON corrompido, chave ausente, snapshot inválido e interrupção entre operações.
- [ ] Demonstrar exportação → validação → restauração com igualdade dos campos financeiros e rollback confirmado.
- [ ] Executar jornada de lançamento, transferência, cartão/fatura/pagamento, orçamento, recorrência, conciliação, busca/exportação e PF/PJ pela interface.
- [ ] Fazer inventário visual de todas as telas, modais, estados vazios/carregando/erro/sucesso, breakpoints e teclado.
- [ ] Revisar invariantes monetárias, migrações, idempotência, auditoria e cobertura de exportação sem dados pessoais reais.
- [ ] Classificar e encerrar cada P0 com critério de aceite e evidência; nenhuma falha crítica/alta desconhecida pode ser mascarada por teste estático.
