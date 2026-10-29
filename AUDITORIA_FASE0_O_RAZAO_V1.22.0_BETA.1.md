# O Razão — Auditoria da Fase 0

**Base examinada:** `1.22.0-beta.1`  
**Data:** 28 de outubro de 2026  
**Referência obrigatória:** *Plano Mestre de Desenvolvimento do O Razão*, versão 1.0, 28/10/2026.  
**Tipo de auditoria desta entrega:** inspeção estática da base + execução da suíte automatizada presente no ZIP. Não é auditoria de segurança independente, revisão jurídica ou teste E2E.

## 1. Parecer executivo

A base apresenta uma quantidade relevante de módulos financeiros locais e testes de domínio. A suíte `npm test` foi executada e terminou com código de saída 0. Foram verificados os módulos de dinheiro, contas, faturas, compromissos, sanitização, identificadores, orçamento, metas, migrações, previsão, aprendizado de categoria, importadores/OCR textual/reconciliação, IA local, persistência, livro-razão, pagamentos, auditoria, backups, busca/CSV e recorrência.

**A Fase 0 ainda não pode ser declarada concluída.** Os testes não incluem execução E2E do aplicativo em navegador/Electron, e a inspeção encontrou discrepâncias entre nomes/intenções de alguns serviços e o comportamento realmente implementado. A regra do Plano Mestre é classificar explicitamente funcionalidades e não anunciar mocks como integrações reais. Os itens abaixo precisam ser tratados antes de liberar um beta público.

A decisão recomendada é: **manter a versão-base `1.22.0-beta.1`, não aumentar a versão por causa apenas do diagnóstico e não iniciar grandes novos módulos antes de resolver os bloqueadores de integridade e clareza de escopo identificados.**

## 2. Escopo e evidências

- ZIP de origem: `razao-v1.22.0-beta.1-geracao-lancamentos-recorrentes.zip`.
- SHA-256 do ZIP de origem: `82f158a95b9f38ecc616425295d317e5f3f69cfe3cb8ab88afa045e803970fe5`.
- `package.json` declara `1.22.0-beta.1`, React 18, Vite 5 e Electron 29.
- Inventário estático: 75 arquivos em `src`, 30 scripts `.mjs`, 16 arquivos `*.test.js` no domínio. Existem 7 arquivos sob `api/` e 4 sob `electron/`.
- `npm test`: **passou com código de saída 0**. A suíte principal registra 101 testes de domínio aprovados; as demais suítes incluídas no script também terminaram sem falhas, conforme a saída do comando.
- `unzip -t` no ZIP de origem: **sem erros de integridade**.
- Não foi executado `npm install`, Vite build, instalador nem E2E real, conforme orientação do proprietário para adiar build/DNS até a fase de empacotamento.

**Limite de evidência:** vários testes de “integração” inspecionam estaticamente o código ou usam serviços simulados. Eles não provam que fluxos completos funcionam quando o aplicativo é executado.

## 3. Inventário por capacidade

Estados usados: **Implementada com testes de domínio**, **Implementada sem E2E**, **Parcial**, **Mock/demonstração**, **Não localizada na base examinada**, **Pendente de verificação**.

| Área | Estado inicial | Evidência e observação |
|---|---|---|
| Splash/inicialização | Parcial | `SplashScreen.jsx` é usado e existe componente de logo; estados de recuperação e tela de erro precisam de verificação visual/E2E. |
| Login, cadastro e recuperação de conta | Não localizada na UI; serviço demonstrativo | `App.jsx` não implementa jornada de login/cadastro. `src/services/apiClient.js` instancia `UserAuthService` no próprio renderer. Esse serviço mantém usuários em `Map`, usa hash determinístico fraco e devolve token com formato `jwt_session_*`; não é autenticação de produção. |
| Persistência Web | Implementada sem E2E | `src/services/storage.js` usa `localStorage` sem criptografia em repouso. Adequado apenas se a modalidade local e seus limites forem informados claramente; a UI não pode prometer armazenamento criptografado no navegador. |
| Persistência Electron | Implementada com controles, sem E2E | `electron/main.cjs` usa `safeStorage`, escrita atômica e validação de origem IPC. A instalação/execução real e recuperação sob falhas reais continuam sem E2E. |
| Dinheiro e contas | Implementada com testes de domínio | `money.js`, `accounts.js`, `ledger.js`; exige testes cruzados com dados independentes e cobertura de UI antes do gate. |
| Transações e histórico | Implementada sem E2E | Formulários, filtros, CSV e eventos de auditoria existem; ainda falta validar jornadas completas e alterações/estornos em todas as métricas derivadas. |
| PF/PJ | Parcial, risco financeiro | `App.jsx` filtra transações por `profileType` e recorrências por perfil, mas passa `accounts` e `cards` compartilhados para cálculos e usa `cards[0]` como cartão primário. O isolamento por perfil não está demonstrado para todo o modelo financeiro. |
| Transferências | Parcial/pendente de prova integral | Há suporte no domínio e nos testes; falta E2E e confirmação de consistência ponta a ponta em saldo, relatórios, edição/estorno e conciliação. |
| Cartões e faturas | Implementada com testes de domínio | Há ciclos e pagamento de fatura; falta E2E de compras, parcelamentos, crédito/estorno, pagamento parcial e não duplicação entre compra e pagamento. |
| Orçamento e projeção | Implementada com testes de domínio | Regras presentes; demonstrar em E2E que saldos realizados não incorporam itens pendentes e que a previsão explica suas premissas. |
| Recorrências | Parcial | Cadastro atual expõe recorrência mensal; edição do alcance “esta ocorrência/esta e futuras/toda regra” não está presente no `RecurringManager.jsx`. Geração controlada tem identificadores determinísticos e testes, mas a idempotência ainda depende do estado local e não foi testada com concorrência multi-janela/armazenamento real. |
| Busca e exportação CSV | Implementada com testes de domínio | Filtros/ordenação/CSV existem; faltam E2E, testes visuais e validação em planilhas-alvo. |
| Importação OFX/CSV | Parcial | Parsers existem; exigir prévia clara, erros por linha, deduplicação revisável e E2E para arquivo real malformado/grande. |
| “Open Finance” | **Mock/demonstração** | `ImportReconciliationModal.jsx` cria três transações sintéticas e as passa a `BankingService`, importado diretamente no renderer. `openFinanceApi.js` apenas mantém sessões em `Map`; não há conexão com banco/provedor autorizado. Não anunciar como conexão bancária real. |
| OCR | **Mock/parcial** | `ocrService.js` usa texto padrão de exemplo quando não há `textContent` e retorna score fixo; o parser local é textual/regex, não um pipeline OCR de imagem real. Não anunciar OCR real sem provedor/modelo e validação explícitos. |
| IA financeira | Implementada como regras locais; integração real não localizada | Há `aiContextEngine`, anomalias e simulador. Os testes do “conselheiro” não provam uso de um modelo de IA externo; descrever como assistente determinístico/local enquanto for o caso. |
| Sincronização/outbox | **Mock/demonstração** | `outboxSync.js` mantém `Map` em memória e adota Last-Write-Wins. Não é backend durável e a política LWW não deve ser aplicada a dados financeiros de produção; o Plano Mestre pede resolução explícita de conflitos sensíveis. |
| Backend e banco | Parcial/arquitetura incompleta | Há `api/prisma/schema.prisma` e classes de serviço em `api/src/routes`, mas o `package.json` da raiz não declara pacote backend/Prisma nem script de servidor. `apiClient.js` importa classes diretamente para o renderer em vez de chamar uma API com autenticação/autorização server-side. |
| Auditoria/livro-razão | Implementada localmente, proteção limitada | Eventos e verificações existem, mas log local mutável/checksum não prova autenticidade. O README reconhece limites. Confirmar cobertura de todas as mutações e eventos compensatórios. |
| Backup/restauração | Implementada com testes de domínio, sem E2E | Envelope, validação, histórico e recuperação existem; falta exercitar em aplicativo real exportar → importar → validar → restaurar, interrupção de escrita e retorno a backup anterior. |
| Metas/ reservas | Parcial | O módulo `savings.js` está testado, mas a presença e completude da jornada UI precisam ser verificadas. |
| Dívidas/investimentos/patrimônio completo | Pendente de verificação/planejado | Existem cálculos parciais como patrimônio de contas, mas não foi demonstrada uma jornada completa de dívidas, amortização, investimentos, preços atualizados e valuation com data de referência. |
| Tema/acessibilidade/design system | Parcial | `theme.css` e vários componentes existem; ainda não há evidência documentada de WCAG 2.2 AA, navegação integral por teclado/leitor, testes de contraste, zoom/reflow ou revisão visual nos breakpoints. |
| Logo e identidade | Parcial | O ativo enviado está representado por um SVG redesenhado em `RazaoLogo.jsx`, não pelo arquivo de logo completo como asset. O branding está presente, mas é necessário verificar fidelidade da marca e presença da composição completa na splash/onboarding/login/telas vazias conforme o plano. |
| Dependências/release | Pendente | Não há lockfile (`package-lock.json`, `pnpm-lock.yaml` ou `yarn.lock`) no pacote analisado. Build/installer ficam corretamente adiados; supply-chain lock, SBOM, hashes de artefatos e assinatura são itens para o estágio de release. |

## 4. Achados prioritários

### P0 — Bloqueadores a resolver antes do primeiro beta público

**P0-01 — Não apresentar autenticação demonstrativa como conta real.**  
O `UserAuthService` fica no renderer, guarda contas apenas em memória, usa hash não criptográfico e token de texto sem assinatura JWT real. Há outra classe `AuthService` cujo hash de senha também é um hash determinístico trivial e cuja assinatura é construída por concatenação, não HMAC/assinatura JWT válida. Não existe jornada de login/cadastro conectada a um backend real. **Ação:** decidir explicitamente beta local-first sem conta remota (onboarding/bloqueio local honestamente rotulados) ou implementar identidade de produção com provedor/backend seguro; remover/desligar os serviços demonstrativos da jornada pública.

**P0-02 — Rótulo/fluxo de Open Finance não corresponde a uma conexão bancária real.**  
O modal fabrica registros sintéticos de exemplo. **Ação:** manter como “Demonstração” inequivocamente marcada e isolada, sem importar automaticamente como transações reais; adiar conexão real para fornecedor participante/contratado, consentimento, revogação e validação jurídica/compliance.

**P0-03 — Isolamento PF/PJ incompleto na camada de domínio/estado.**  
O filtro de lançamentos não prova isolamento de contas, cartões, faturas, categorias, orçamentos e saldos derivados. `cards[0]` também é tratado como cartão principal global. **Ação:** definir a entidade/workspace de perfil e os invariantes de referência; separar ou filtrar todos os recursos por perfil e provar testes cruzados que nenhum saldo, fatura, orçamento, exportação ou previsão de um perfil vaze para o outro.

**P0-04 — Recuperação após “Restaurar Padrões” não fecha o ciclo.**  
`ErrorBoundary.jsx` copia o estado para a chave `razao_app_state_v3_backup_emergency` e remove a chave ativa. O fluxo de recuperação normal em `storage.js` procura `razao_app_state_v3.pre-restore-backup`, não a chave `*_backup_emergency`; não foi localizada uma UI de restauração da cópia emergencial. Além disso, a tela afirma que os dados permanecem “100% seguros”, promessa absoluta não sustentada. **Ação:** não excluir o estado ativo sem validar uma cópia recuperável; unificar o mecanismo de snapshot, oferecer recuperação explícita e trocar a promessa por uma descrição honesta dos controles/limites.

**P0-05 — Falta prova E2E das jornadas críticas e da inicialização com erro de dados.**  
A suíte `npm test` passa, mas boa parte das chamadas “integração” é estática ou simulada. Ainda não há evidência de execução dos fluxos completos com UI e armazenamento real. **Ação:** durante a Fase 0/Alpha 1, construir uma matriz de jornadas reproduzíveis e habilitar testes E2E quando o ambiente estiver disponível; não é necessário resolver DNS/build do instalador neste momento, mas é necessário provar os comportamentos críticos antes do beta.

**P0-06 — Conflitos da outbox não estão prontos para sincronização financeira.**  
A implementação `OutboxSyncService` usa `Map` em memória e Last-Write-Wins. Isso perde durabilidade e pode sobrescrever alterações sem revisão. **Ação:** manter serviço fora de qualquer promessa de sync real; antes de produção, usar persistência server-side, autorização por usuário/workspace, idempotência no storage e resolução explícita de conflitos financeiros.

### P1 — Necessário antes ou durante o ciclo Alpha

1. **Contrato de modelo/perfil e referências:** adicionar invariantes para account/card/category/budget/recurring/transaction e validar vínculos em criação, edição, importação, backup e migrações.
2. **Recorrência:** implementar “só esta ocorrência”, “esta e futuras” e “toda a regra”; preservar ocorrências já pagas/conciliadas; provar idempotência após reinício, clique duplo e operações concorrentes.
3. **Importação:** teste com arquivos reais de amostra anonimizados, encoding, linhas inválidas, limites, preview, deduplicação explicável, undo e CSV formula injection.
4. **Backup/restore:** testes de E2E e resiliência (espaço insuficiente, arquivo truncado, interrupção, snapshot ilegível, rollback), incluindo igualdade dos campos críticos após ciclo completo.
5. **Auditoria:** mapear todas as mutações financeiras e verificar create/edit/delete/status/payment/reversal/reconciliation/import/recurring/restore; explicitar que log local não é imutável nem prova de autenticidade.
6. **Persistência Web:** informar claramente que `localStorage` não fornece criptografia em repouso; implementar exportação e recuperação acessível; evitar garantir segurança absoluta.
7. **Confiabilidade da UI:** revisar estados loading/empty/offline/error/success em todos os módulos P0, teclado/foco/contraste/zoom e comportamento em viewport pequeno/grande.
8. **Dependências:** gerar e revisar lockfile quando for oportuno; fixar processo de atualização e auditoria de supply chain na fase de release.
9. **Marca:** armazenar o ativo final da logo como asset oficial e validar proporção, contraste e composição completa; não depender exclusivamente de SVG redesenhado quando o plano manda preservar o ativo.

### P2 — Depois dos P0, conforme o roadmap

- IA conectada a modelo/provedor real, OCR de imagem e detecção avançada, somente após avaliação de privacidade, minimização e confirmação humana.
- Open Finance e multi-dispositivo: somente com fornecedor/provedor habilitado, backend de produção, consentimento revogável, operação e suporte.
- Investimentos, dívida/amortização, patrimônio completo e recursos comerciais ampliados após validar necessidades de usuários e custo de manutenção.
- Recursos premium, gamificação e refinamentos que não bloqueiam integridade, clareza nem recuperação.

## 5. Critérios de saída da Fase 0

A Fase 0 será considerada concluída somente quando:

- [x] A base técnica e o ZIP de referência estão identificados, com versão e SHA-256 registrados.
- [x] O mapa inicial das áreas e a classificação preliminar estão documentados.
- [x] O comando `npm test` foi executado e seu resultado foi registrado.
- [x] Os riscos P0 conhecidos estão documentados com ações recomendadas.
- [ ] Cada rota/tela/modal/estado vazio/loading/erro/sucesso foi inventariado e revisado visualmente.
- [ ] As fontes de persistência e todas as mutações financeiras foram mapeadas de ponta a ponta.
- [ ] A matriz manual de jornadas essenciais foi executada com dados limpos e dados volumosos.
- [ ] Os riscos P0 foram priorizados e cada um tem issue/critério de aceite.
- [ ] A recuperação após falha e o comportamento de erro de leitura foram demonstrados sem perder dados.

**Status do gate: PARCIAL.** Não avançar para um novo pacote funcional abrangente enquanto os itens restantes de inventário e a decisão de escopo sobre autenticação/Open Finance/PF-PJ não estiverem definidos. A instalação/build do `.exe` continua fora desta etapa, conforme decisão do proprietário.

## 6. Próxima execução recomendada

1. Corrigir no relatório de produto/README a classificação pública dos serviços locais, mockados e ainda não conectados; não expor “login real”, “Open Finance real”, “OCR real” ou “sincronização real” onde isso não existe.
2. Preparar uma matriz de jornada manual e casos de teste com fixtures (perfil pessoal e empresarial, cartão, transferência, fatura parcial, recorrência, importação, restauração e falhas de persistência).
3. Tratar P0-04 e P0-03 primeiro, porque envolvem recuperação e potencial contaminação entre contextos financeiros.
4. Depois de os P0 serem resolvidos ou explicitamente eliminados por decisão de escopo local-first, avançar para os pacotes de fundação da Alpha 1 no roadmap, sem saltar dependências.

## 7. Limites desta auditoria

Esta é uma auditoria inicial, estática e reproduzível com o pacote disponível. Não inclui revisão independente, threat modeling aprofundado, execução de browser/Electron, testes de concorrência real, teste de penetração, validação jurídica, auditoria de dependências baseada em instalação, nem garantia de ausência de falhas. Os achados refletem os arquivos presentes no ZIP identificado acima; mudanças posteriores devem gerar nova evidência e atualização deste relatório.

---

## Atualização incremental — v1.22.0-beta.10 (28/10/2026)

**Status geral da Fase 0: ABERTA / GATE NÃO APROVADO.** Esta atualização registra apenas o tratamento parcial de um achado de sincronização; não substitui os itens de saída pendentes descritos acima.

### Achado trabalhado: outbox não configurada

- Antes, `OutboxSyncEngine.processQueue()` criava uma resposta de sucesso sintética quando nenhum handler/servidor era fornecido. Isso podia esvaziar a fila e apresentar uma operação local como sincronizada sem comunicação remota.
- A beta.10 passa a retornar `unconfigured` e manter a fila intacta quando não há handler explícito; falhas persistentes são sinalizadas, e a falha ao gravar uma mutação na fila é propagada ao chamador.
- A suíte automatizada `npm test` passou (código 0), incluindo 10 verificações da outbox e as verificações anteriores.

### Limite do tratamento

O achado **não está resolvido para produção**: não há backend durável/autorizado e nem E2E de sincronização real. A mudança remove o falso positivo local, mas não implementa sincronização remota. Permanecem abertos os P0 de autenticação/escopo local-first, isolamento PF/PJ completo e demonstração E2E de jornadas críticas, recuperação e persistência. Não autoriza marcar a Fase 0 como concluída.
