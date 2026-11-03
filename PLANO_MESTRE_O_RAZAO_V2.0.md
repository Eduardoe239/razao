---
title: "PLANO MESTRE DE PRODUTO, ARQUITETURA E DESENVOLVIMENTO — O RAZÃO"
subtitle: "Da base v1.22.0-beta.20 ao produto financeiro multiplataforma e ao lançamento oficial 1.00.0"
author: "Documento de Produto e Engenharia — O Razão"
date: "02 de novembro de 2026"
lang: pt-BR
---

# PLANO MESTRE DE PRODUTO, ARQUITETURA E DESENVOLVIMENTO

**O RAZÃO — SUAS FINANÇAS. COM LÓGICA.**  
**Versão deste plano:** 2.0  
**Data de referência:** 02/11/2026  
**Base técnica de referência:** `v1.22.0-beta.20`  
**Situação:** documento normativo de produto e engenharia; execução incremental condicionada a evidências e gates de qualidade.

> **Missão do documento:** servir como referência central para o proprietário do produto, Claude Code e qualquer integrante técnico que trabalhe no O Razão. Define visão, decisões, capacidades pretendidas, arquitetura, modelo de dados, regras financeiras, experiência, segurança, IA, plano de execução, qualidade, operação e lançamento. Não autoriza reescrita indiscriminada nem transforma recursos planejados em recursos já disponíveis.

---

# LEIA ANTES DE DESENVOLVER — CONTRATO DE EXECUÇÃO PARA CLAUDE CODE

Esta seção é uma instrução operacional obrigatória. Ela existe para impedir que um agente de programação faça alterações grandes, superficiais, contraditórias ou sem validação.

## C.1 Papel esperado

Atue como uma equipe técnica sênior multidisciplinar, reunindo responsabilidades de Product Architect, Staff/Principal Software Engineer, engenheiro de domínio financeiro, arquiteto de dados, especialista de segurança, engenheiro de IA, UX Engineer, QA Lead, SRE/DevOps e responsável por acessibilidade. A postura deve ser crítica, verificável, econômica e profissional. Não tente parecer competente por produzir muitas linhas de código: produza mudanças corretas, rastreáveis e sustentáveis.

## C.2 Ordem obrigatória de leitura e descoberta

Antes de editar qualquer arquivo:

1. Leia este documento integralmente, incluindo anexos, decisões, riscos e critérios de aceite.
2. Leia `CLAUDE.md`, caso exista, e todos os documentos de projeto referenciados pelo repositório.
3. Confirme que está no repositório correto e na versão/branch esperada. Execute `git status --short`, `git branch --show-current`, `git log -5 --oneline`, leia `package.json`, README, configuração de build e árvore de diretórios.
4. **Não suponha que a cópia do notebook é idêntica ao ZIP de referência.** Compare versão declarada, hash/commit, arquivos e alterações locais. Preserve todo trabalho não commitado do proprietário.
5. Gere o inventário *as-built*: tela por tela, módulo por módulo, fluxo de dados por fluxo de dados. Para cada capacidade, classifique como `PRODUTIVA E VALIDADA`, `IMPLEMENTADA SEM E2E`, `PARCIAL`, `DEMONSTRATIVA/MOCK`, `PROTÓTIPO`, `PLANEJADA`, `BLOQUEADA` ou `NÃO VERIFICADA`.
6. Leia os relatórios antigos e reconcilie suas afirmações com o código atual. Código e evidência têm precedência sobre documentação desatualizada; divergências devem ser registradas e corrigidas.
7. Execute os testes existentes sem alterar sua finalidade. Registre comandos, versões de runtime, saída e código de encerramento. Não transforme uma falha em sucesso editando ou removendo o teste.
8. Apresente um plano técnico pequeno, com arquivos afetados, risco de dados, dependências, critério de aceite e testes. Só então implemente o próximo incremento.

## C.3 Regras de trabalho inegociáveis

- **Não reescreva o aplicativo inteiro.** Preserve a base funcional e evolua por refatorações incrementais. Uma reescrita só pode ser proposta com evidência de que o custo/risco de manter a base é maior, comparação de alternativas, plano de migração e aprovação do proprietário.
- Não substitua tecnologia, framework, banco, arquitetura ou biblioteca apenas por preferência pessoal. Faça spike mensurável e ADR antes de uma mudança estrutural.
- Não implemente várias fases simultaneamente. Trabalhe em um escopo pequeno, vertical e verificável por vez.
- Não use dados financeiros reais do proprietário durante testes. Use fixtures fictícias, isoladas e reproduzíveis. Nunca envie extratos ou backups reais para provedores externos.
- Antes de qualquer migração destrutiva, alteração de schema ou operação de restauração, crie e valide backup, execute migração em cópia, prove rollback e registre contagens/somas antes e depois.
- Nunca reporte sucesso de persistência, sync, IA, OCR, Open Finance, autenticação ou pagamento se o serviço real não confirmou a operação.
- Não use `localStorage` como substituto de uma base multiusuário ou de uma API. Não confunda fila Outbox local com sincronização remota.
- Não aplique `Last Write Wins` automaticamente em lançamentos, saldos, faturas, pagamentos ou conciliação.
- Não permita que IA, texto livre, importação ou arquivo externo execute transferência, pagamento, exclusão, exportação completa, mudança de workspace ou alteração sensível sem confirmação e autorização explícitas.
- Não altere nem substitua a logo oficial. Use os assets de marca existentes e só solicite nova identidade se o proprietário pedir.
- Não introduza neon, efeitos luminosos, vidro, gradientes multicoloridos ou estética de cassino. Mantenha a identidade sóbria azul/branco/cinza aprovada.
- Mantenha a interface em português do Brasil, com linguagem clara, datas e dinheiro localizados.
- Não adicione telemetria que exponha descrição de compra, valor, saldo, nome de cliente/fornecedor, CPF/CNPJ ou documento sem desenho de privacidade, finalidade e opt-in adequados.
- Não coloque segredos, tokens, chaves, credenciais bancárias ou dados financeiros em Git, logs, screenshots, issues ou prompts externos.
- Não atualize dezenas de dependências em conjunto sem necessidade e sem matriz de compatibilidade; mantenha lockfile coerente e auditoria de supply chain.
- Não empacote/entregue instalador Windows durante as fases de domínio e UX. O trabalho de `electron-builder`, assinatura e distribuição fica para a fase de release. Um build Vite pode ser executado quando necessário para validar uma jornada, mas não deve se tornar distração anterior às prioridades funcionais.

## C.4 Como deve ser executado cada item

Para cada issue/entrega, produzir:

1. Contexto e problema observado.
2. Estado atual comprovado e evidência (arquivo, função, teste, screenshot, log).
3. Resultado esperado e escopo explicitamente incluído/excluído.
4. Impacto sobre dados, dinheiro, perfis PF/PJ, segurança, acessibilidade e compatibilidade.
5. Plano de implementação com arquivos/módulos previstos.
6. Testes unitários, propriedade/invariantes, integração e E2E adequados ao risco.
7. Resultado de execução; falhas e limitações sem omissão.
8. Atualização de changelog, documentação, matriz de recursos e dívida técnica.
9. Decisão de pronto: `DONE`, `BLOCKED` ou `PARTIAL`, nunca um “quase pronto” sem definição.

## C.5 Quando faltar informação

Se uma decisão for técnica e reversível, faça uma proposta baseada em evidências, compare alternativas e registre ADR. Se a decisão afetar posicionamento, preço, coleta de dados, política de privacidade, comportamento irreversível, escopo legal/regulatório ou experiência que altere o produto, não invente preferência do proprietário: apresente alternativas e recomendação, mantenha o item bloqueado até existir decisão. Não implemente placeholders como se fossem solução final.

## C.6 Regra de verdade

A versão do software, o estado dos módulos e os testes devem ser descritos com exatidão. **Ter uma tela não significa ter uma funcionalidade; ter um teste não significa ter validação de produção; ter um schema Prisma não significa ter backend; ter uma Outbox não significa sincronizar; ter um assistente de regras não significa dispor de um LLM; ter um arquivo de backup não significa ter recuperação comprovada em ambiente real.**

---

# PARTE I — IDENTIDADE, VISÃO E DECISÕES DE PRODUTO

## 1. Resumo executivo

O Razão será um gestor financeiro brasileiro para pessoas físicas e pequenos negócios, com uma experiência coerente e especializada para cada contexto. O sistema deve ajudar o usuário a registrar, entender, planejar, conciliar e proteger sua vida financeira. Seu valor não estará na quantidade de gráficos, no uso superficial de inteligência artificial ou em prometer conexão bancária universal. O valor deverá ser demonstrado por cinco capacidades:

1. **Integridade financeira:** nenhum número importante aparece sem regra definida, origem, período e trilha de cálculo.
2. **Separação real PF/PJ:** os espaços pessoais e empresariais são escolhidos no cadastro/criação e permanecem isolados por arquitetura e autorização.
3. **Previsibilidade explicável:** o usuário sabe o que é realizado, pendente, recorrente, estimado ou hipotético e pode inspecionar os eventos que compõem a previsão.
4. **Controle e recuperação:** o usuário pode exportar seus dados, validar backup, restaurar com segurança, corrigir sem apagar o histórico e compreender as limitações do armazenamento.
5. **Assistência inteligente responsável:** a IA organiza, explica e propõe; o motor financeiro determinístico calcula; o usuário confirma qualquer ação sensível.

O Razão deve aprender com padrões úteis de aplicações maduras de finanças, sem copiar interface, marca ou propriedade intelectual. A meta é ser percebido como confiável, rápido, simples e tecnicamente sério. Nenhum documento pode afirmar que o produto já é “superior a todos os concorrentes”: isso é uma hipótese de posicionamento que deverá ser comprovada por pesquisas, testes e métricas comparativas.

## 2. Visão, missão e promessa

### 2.1 Visão

Ser o centro de clareza financeira de pessoas e pequenos negócios: uma ferramenta que transforma registros dispersos em uma visão fiel do presente, uma leitura compreensível do futuro e decisões melhores, mantendo o usuário no controle dos dados e das ações.

### 2.2 Missão

Organizar as finanças com lógica verificável, linguagem acessível, automação segura, privacidade por padrão e experiência de alta qualidade.

### 2.3 Promessa ao usuário

- Você consegue entender quanto tem, quanto deve, quanto já comprometeu e o que pode acontecer.
- Você consegue descobrir de onde veio qualquer indicador ou projeção relevante.
- Seus registros não são alterados silenciosamente por IA, importações, automações ou sincronização.
- Você escolhe se está organizando finanças pessoais ou empresariais; os dados não se misturam por acidente.
- Você pode trabalhar manualmente, inclusive sem integração bancária, e continuar sendo dono dos seus dados.

### 2.4 Slogan e marca

A marca de referência é a logo aprovada pelo proprietário: símbolo “R” integrado a barras ascendentes, base azul-marinho, branco e azul elétrico, nome **O RAZÃO** e slogan **“SUAS FINANÇAS. COM LÓGICA.”** Os arquivos PNG/ICO existentes são os assets de referência; não redesenhar, substituir ou improvisar uma marca semelhante. A paleta de interface segue azul institucional, branco e cinzas frios. Verde/vermelho representam estados financeiros; âmbar representa atenção; cores nunca devem ser o único meio de comunicar estado.

## 3. Público-alvo e segmentos

### 3.1 PF — Pessoa Física

Pessoas que precisam organizar renda, gastos, contas, cartões, dívidas, compromissos, metas e patrimônio. O produto deve atender desde um usuário iniciante, que precisa registrar despesas sem complexidade, até quem controla várias contas, cartões, parcelas e investimentos manualmente.

Necessidades centrais: simplicidade de registro, saldo correto, orçamento que ajude sem punir, calendário de vencimentos, projeção de caixa, metas, relatórios e proteção de dados.

### 3.2 PJ — Pessoa Jurídica / pequenos negócios

MEIs, profissionais autônomos com operação empresarial, microempresas e pequenos negócios que precisam separar dinheiro do negócio, controlar recebíveis/pagáveis, fluxo de caixa, despesas, custos, cartões, fornecedores, clientes e resultado gerencial.

Necessidades centrais: separação entre caixa pessoal e empresarial, contas e cartões por empresa, contas a pagar/receber, visão de atraso, conciliação, categorias empresariais, centros de custo, resultado gerencial e colaboração controlada.

### 3.3 Limites de público da primeira versão

Não posicionar o produto inicial como ERP completo, contabilidade fiscal oficial, emissor fiscal universal, folha de pagamento, consultoria de investimento, iniciador de pagamentos ou banco digital. Esses domínios demandam parceiros, contratos, controles e análises jurídicas específicas.

## 4. Diferenciais que precisam existir de verdade

| Diferencial | Comportamento obrigatório | Como comprovar |
|---|---|---|
| Número explicável | Todo saldo, total, orçamento e projeção relevante abre a origem, período, filtros, inclusões e exclusões. | Testes de reconciliação e tela de detalhamento. |
| PF/PJ sem vazamento | Workspace, consultas, storage, API, relatórios, IA e backup respeitam escopo. | Testes negativos cruzados em todas as camadas. |
| Previsão honesta | Separar saldo real, pendência confirmada, regra recorrente, estimativa estatística e cenário. | Teste contra fixtures e avaliação de compreensão com usuários. |
| Histórico preservado | Corrigir por reversão/ajuste auditável, não por exclusão silenciosa de evento efetivado. | Trilha de auditoria e reconciliação antes/depois. |
| Recuperação demonstrada | Backup validado, restauração, rollback, migração e recuperação em falhas simuladas e reais. | Exercícios registrados com RPO/RTO. |
| Offline útil | Operações locais essenciais funcionam sem rede e não fingem ter sincronizado. | Testes de desconexão, reinício e fila pendente. |
| IA responsável | Resposta ancorada em cálculos e dados permitidos, com fonte e incerteza. | Dataset de avaliação, testes adversariais e confirmação humana. |
| UX sem fricção desnecessária | Tarefas essenciais podem ser concluídas sem tutorial e sem confusão de estados. | Testes moderados de usabilidade e métricas. |

## 5. Decisões executivas e princípios fixos

As decisões abaixo são a linha de base de produto. Se uma alteração futura exigir exceção, ela deve ser registrada em ADR com motivo, benefício, risco, impacto em dados, custo e estratégia de reversão.

1. **Uma fonte de verdade financeira:** saldos são derivados de lançamentos e regras canônicas; projeções não escrevem no saldo realizado.
2. **Dinheiro exato:** valores em centavos inteiros e moeda explícita. Float não pode ser usado em soma financeira.
3. **Domínio independente da UI:** componentes React não contêm regras de saldo, fatura, conciliação ou previsão.
4. **PF/PJ por workspace:** não basta mudar um filtro visual; o cadastro cria um espaço do tipo escolhido e toda entidade financeira pertence a um `workspaceId`.
5. **Local-first com sincronização opt-in e verificável:** modo local é legítimo; cloud e multi-dispositivo só são anunciados depois de backend, identidade, sync e recovery reais.
6. **Sem Open Finance de fachada:** nenhuma integração bancária real sem provedor/parceiro apto, consentimento, fluxo seguro e revisão jurídica/compliance.
7. **Sem pagamento autônomo na primeira versão:** o Razão registra e planeja; não executa pagamento bancário ou Pix por texto livre.
8. **IA não calcula o saldo:** motor determinístico fornece números; IA interpreta, explica, classifica e propõe.
9. **Toda automação deve ser idempotente:** repetição, timeout ou clique duplo não duplica dinheiro.
10. **Falha nunca vira estado vazio:** leitura, gravação, migração e recuperação falham explicitamente e preservam a última cópia confirmada.
11. **Segurança e privacidade desde o desenho:** segredos fora do frontend, acesso mínimo, consentimento compreensível e logs redigidos.
12. **A data não vence o gate:** cronograma é previsão. Não remover testes nem lançar risco crítico para cumprir prazo.
13. **Construir sobre a base atual:** refatorar progressivamente; não jogar fora módulos aprovados sem prova.
14. **Marca preservada:** logo oficial, linguagem visual calma e ausência de neon.
15. **Transparência comercial:** recurso em desenvolvimento, demonstrativo ou bloqueado não pode ser anunciado como disponível.

## 6. Escopo e posicionamento competitivo

O produto deve incorporar padrões que os usuários já esperam de gestores financeiros: centralização de contas, cartão e fatura, orçamento, metas, alertas, recorrências, relatórios, busca, exportação e importação. Para pequenos negócios, acrescentar contas a pagar/receber, fluxo de caixa, clientes/fornecedores, centros de custo e resultado gerencial. A diferenciação deverá estar em consistência, clareza e controle — não em replicar concorrentes.

### 6.1 O que não fazer para parecer “mais completo”

- Não adicionar gráficos sem uma decisão que ajudem o usuário a tomar.
- Não apresentar score financeiro inventado, previsão com precisão falsa ou recomendação de investimento personalizada sem base adequada.
- Não adicionar gamificação que estimule acesso compulsivo, consumo ou exposição de valores.
- Não apresentar integração de demonstração como conectividade real.
- Não criar dezenas de configurações que o usuário não entende.
- Não misturar recursos PF na navegação PJ ou vice-versa sem contexto explícito.

### 6.2 Métricas de valor

- Tempo para concluir primeiro cadastro, primeira conta e primeiro lançamento.
- Percentual de usuários que entendem diferença entre saldo atual, disponível e projetado.
- Taxa de sucesso em conciliar uma conta e entender uma divergência.
- Erros de duplicidade por importação/recorrência.
- Incidentes de perda, corrupção ou vazamento de dados (meta zero não resolvido).
- Adoção de orçamento, revisão de recorrência e metas sem pressionar abertura compulsiva.
- Taxa de sucesso de tarefas essenciais, abandono de formulário e tickets de suporte por 100 usuários.
- Precisão das sugestões de IA medida separadamente por PF/PJ e por classe de tarefa.

---

# PARTE II — BASE REAL DA BETA.20 E PONTO DE PARTIDA

## 7. Identificação da base examinada

A base de referência foi recuperada do pacote `razao-v1.22.0-beta.20-redesign-ui-ux.zip` e comparada com o material do Plano Mestre anterior.

| Item | Evidência observada |
|---|---|
| Versão em `package.json` | `1.22.0-beta.20` |
| Pacote de referência | `razao-v1.22.0-beta.20-redesign-ui-ux.zip` |
| SHA-256 do pacote | `b3f897efe047ccd6986c9b9599284de6eef4fc7ad30f4242aa82c0dcecb29b41` |
| Runtime usado para a auditoria desta cópia | Node.js `v22.16.0`; npm `10.9.2` |
| Dependências diretas declaradas | React `19.3.1`, React DOM `19.3.1`; Vite `8.3.5`, `@vitejs/plugin-react` `6.1.2`; Electron `45.1.0`, electron-builder `26.18.1` |
| Requisito `engines` | Node `>=22.12.0` |
| Tamanho da árvore `src` | 80 arquivos na cópia examinada |
| `src/App.jsx` | 1.026 linhas na cópia examinada |
| `electron/main.cjs` | 520 linhas na cópia examinada |
| `api/prisma/schema.prisma` | Schema demonstrativo simples, sem workspaces/memberships |
| Lockfile | Não encontrado no ZIP (`package-lock.json`, `pnpm-lock.yaml` ou `yarn.lock`) |

**Importante:** o proprietário informou que a versão mais atual está no notebook e será usada com Claude Code. O agente deve confirmar o estado real do repositório local, hash, branch e alterações antes de trabalhar. Este inventário não substitui essa verificação.

## 8. Validação automatizada executada na cópia recuperada

Foi executado `npm test` na cópia isolada, sem instalar dependências de UI porque os scripts de teste são Node. Resultado: **código de saída 0**. O comando declara uma cadeia de 55 scripts e a suíte principal reporta 101 testes de domínio aprovados, além de verificações de integração/contratos, persistência, recuperação, isolamento, Electron e segurança estática. Entre as verificações aprovadas apareceram:

- Parser monetário e validação de mutação.
- Estado inicial seguro e migração de schema.
- Domínio de contas, livro-razão, cartões, faturas, compromissos, orçamento, metas e projeções.
- Importadores CSV/OFX, deduplicação e conciliação.
- Auditoria e integridade local.
- Backup, histórico, recuperação, rollback e last-known-good.
- Isolamento PF/PJ coberto por testes específicos de migração, orçamento e contexto de IA.
- Fronteira de confiança do Electron e validação estática de contratos.
- Proteção contra falso sucesso em autenticação, Open Finance, OCR e sync demonstrativos.

**Limites da execução:** `npm test` não comprova build de produção, execução real no navegador, uso real em Windows, qualidade visual, leitor de tela, backend de produção, teste de penetração ou sincronização com servidor real. `npm run build` e `desktop:build` não foram executados nesta auditoria. A ausência de lockfile impede reprodutibilidade completa da árvore transitiva.

## 9. Inventário técnico as-built

### 9.1 Camada de interface existente

Há componentes de splash, shell responsivo, painel, resumo de saldo, feed e modal de transação, cartão/fatura, orçamento, relatórios/gráficos, importação/conciliação, planejamento/assistente determinístico, recorrências, perfil, preferências, diagnóstico, recuperação, histórico de auditoria e painel de integridade. O seletor PF/PJ existe no shell; isso não equivale a um cadastro independente ou a um boundary de autorização.

### 9.2 Domínio existente

A árvore contém módulos para dinheiro, contas, ledger simples, faturas, pagamento de fatura, orçamento, metas/poupança, previsão, simulação, compromissos, recorrências, importação, reconciliação, busca, migrações, sanitização, validação de estado, isolamento PF/PJ, auditoria, backup, OCR textual demonstrativo, aprendizado de categoria e detecção de anomalias.

### 9.3 Persistência atual

- Web: estado financeiro em `localStorage`, com cópias auxiliares de recuperação. O armazenamento Web não é criptografado em repouso.
- Electron: o processo principal utiliza `safeStorage` do sistema operacional para proteger o arquivo de estado e expõe funções selecionadas via preload/IPC. A validação no Windows real continua obrigatória.
- Outbox local: usa armazenamento auxiliar no navegador. É uma fila local; não comprova entrega remota.
- Não há evidência de SQLite desktop nem IndexedDB como fonte canônica atual.
- O snapshot/checksum atual detecta problemas definidos, mas não deve ser descrito como assinatura ou proteção criptográfica contra adulteração.

### 9.4 Autenticação, backend, sync e integrações

- `api/src/routes/userAuth.js` e `auth.js` falham fechado: cadastro/login remotos não estão configurados.
- `api/src/routes/openFinanceApi.js` contém simulador em memória, sem conexão real com instituição financeira.
- `api/src/routes/ocrService.js` extrai dados de texto fornecido; não executa OCR visual real de imagem.
- `api/src/routes/outboxSync.js` usa `Map` em memória e lógica LWW demonstrativa; não é backend durável.
- `src/services/apiClient.js` chama essas implementações demonstrativas.
- Existe `api/prisma/schema.prisma`, mas seu modelo não inclui workspace, membership, isolamento tenant, política de autorização completa ou prova de backend de produção.

### 9.5 Pontos de atenção encontrados

1. `README.md` ainda declara `1.22.0-beta.18` e aponta documentos beta.18 embora `package.json` seja beta.20.
2. Não foi encontrado lockfile; builds e instalações não são completamente reproduzíveis.
3. `src/App.jsx` concentra tela, estado e handlers de domínio; deve ser modularizado gradualmente em rotas, view models e casos de uso.
4. PF/PJ está parcialmente modelado por `profileType` no estado local, com seleção em tela e migração de dados legados; não há ciclo completo de cadastro, workspaces, membership e autorização server-side.
5. `src/domain/ledger.js` implementa cálculo de saldo por lançamentos e duas pernas para transferência, mas não um diário contábil de partidas dobradas completo com linhas balanceadas.
6. A previsão deve ser reavaliada: existem heurísticas fixas para cenários e não uma calibração estatística validada. Não expor percentuais heurísticos como probabilidade científica.
7. O detector atual de duplicidade precisa ser avaliado quanto à escala, merchant/account scope, falsos positivos e indexação.
8. O histórico de auditoria da base é local e mutável; painel/checksum não significa trilha imutável protegida contra administrador ou invasor.
9. Responsividade e acessibilidade estão parcialmente tratadas no CSS/estrutura; ausência de inspeção E2E visual significa pendência.
10. Ícones PNG/ICO existem, mas a correspondência visual com a logo aprovada deve ser verificada visualmente antes da distribuição.

### 9.6 Matriz resumida de status

| Capacidade | Estado na beta.20 | Diretriz |
|---|---|---|
| Painel, lançamentos, cartões, orçamento, relatórios | Implementados em nível local; E2E visual pendente | Validar e fechar jornadas antes de expandir. |
| Dinheiro em centavos, contas e ledger de saldos | Base implementada e testada | Preservar invariantes; evoluir para journal canônico de forma incremental. |
| Transferências e pagamentos de fatura | Regras locais testadas | Consolidar atomicidade, reversão e casos de corrida. |
| Recorrências e compromissos | Base local implementada/testada | Completar exceções, calendário, duplicidade e UX. |
| Backup/restore e recuperação | Implementação local com vários testes | Testar Windows/browser reais, quota, crash, backup externo e restore. |
| PF/PJ | Isolamento local parcial/testado | Redesenhar para workspace e autorização efetiva. |
| Autenticação/cadastro remoto | Desativado/fail-closed | Construir backend real antes de divulgar conta online. |
| IA | Motor determinístico local; sem LLM real | Preservar cálculos e criar camada de IA com evidências. |
| OCR | Extração textual demonstrativa | OCR visual só após provedor/privacidade e confirmação humana. |
| Open Finance | Mock/dados sintéticos | Bloqueado até parceiro, consentimento e compliance. |
| Sincronização multi-dispositivo | Não produtiva | Projetar protocolo seguro; nunca chamar outbox local de sync. |
| Telemetria/monitoramento de produção | Não comprovados | Implementar apenas com privacidade e opt-in quando necessário. |
| Instalador Windows assinado | Não validado na beta.20 | Deixar para fase final de distribuição. |

## 10. Auditoria inicial obrigatória da base do notebook

Na primeira sessão de Claude Code, produzir `docs/audit/BASELINE_BETA20_AS_BUILT.md` e anexos contendo:

- Hash e commit; versão; Node/npm; sistema operacional; estado do Git.
- Mapa de rotas/telas/modais/estados vazios/loading/erro/ações destrutivas.
- Mapa de estados e fontes de persistência, incluindo ordem de leitura, escrita, snapshot e recuperação.
- Inventário de entidades e referências; chaves; schemaVersion e migrations.
- Matriz de mutações financeiras ponta a ponta e seus efeitos em saldo, fatura, orçamento, previsão, ledger e auditoria.
- Matriz PF/PJ de registros e testes de vazamento cruzado.
- Lista de dependências diretas/transitivas, lockfile, licenças e vulnerabilidades.
- Backlog P0/P1/P2/P3 com severidade, risco de dados, critério, dono e dependência.
- Resultado de `npm test` no notebook e todas as limitações.
- Evidências visuais e manuais da beta.20, sem usar dados reais.

A Fase 0 permanece aberta até que os critérios do Plano Mestre anterior sejam comprovados e os critérios atualizados deste documento sejam aceitos.

---

# PARTE III — EXPERIÊNCIA DE CADASTRO, IDENTIDADE E SEPARAÇÃO PF/PJ

## 11. Decisão estrutural: cadastro e workspaces separados

**Requisito obrigatório de produto:** durante o cadastro/criação do primeiro espaço financeiro, o usuário deve escolher se está configurando **Pessoa Física (PF)** ou **Pessoa Jurídica (PJ)**. Essa escolha não pode ser apenas um toggle de dashboard. Ela determina o tipo do workspace, onboarding, navegação, módulos, campos, permissões e escopo dos dados.

### 11.1 Separação de conceitos

- **User (identidade):** pessoa que autentica no serviço. Pode possuir nome, e-mail, credenciais, MFA, dispositivos e preferências globais.
- **Workspace (espaço financeiro):** contêiner isolado de dados. Tem `type = PF | PJ`, nome, moeda, timezone, preferências e ciclo de vida.
- **Membership:** associa um usuário a um workspace com papel/permissões.
- **Profile:** dados específicos do workspace, não deve ser confundido com a identidade global.

Uma mesma identidade poderá, futuramente, participar de mais de um workspace (por exemplo, seu PF e uma empresa PJ), mas cada workspace é independente. A tela de troca de workspace deve deixar claro qual espaço está ativo. Não há dashboard consolidado PF+PJ por padrão. Caso um painel consolidado seja criado em fase futura, deverá ser somente leitura por padrão, pedir habilitação explícita e indicar origem e escopo de cada valor.

### 11.2 Fluxo inicial de cadastro

1. Tela de boas-vindas com a logo oficial, slogan e explicação curta do produto.
2. Escolha do modo disponível: `Criar espaço neste dispositivo` (local-first) ou `Criar conta Razão` (online, somente quando backend de produção estiver ativo). Nunca mostrar caminho online indisponível como se funcionasse.
3. Escolha obrigatória do tipo de espaço: `Pessoal (PF)` ou `Empresa/Negócio (PJ)`, com explicação clara da diferença.
4. Dados básicos mínimos para a identidade e/ou workspace conforme modo. Não pedir CPF/CNPJ por conveniência; coletar apenas quando a finalidade e o fundamento aplicável forem definidos e documentados.
5. Preferências iniciais: moeda BRL, localidade pt-BR, timezone, primeiro dia do mês/período de orçamento e notificações opt-in.
6. Criação atômica do workspace e membership `OWNER` (no backend); no modo local, geração do workspace local e proteção local apropriada.
7. Onboarding específico de PF ou PJ; no máximo 3–5 passos obrigatórios. O restante pode ser concluído depois.
8. Tela final apresenta workspace ativo, modo de armazenamento, status de backup/sync e próximo passo para criar primeira conta.

### 11.3 Campos PF

- Nome de exibição (obrigatório), moeda, timezone e preferências.
- CPF, endereço, telefone, dependentes ou dados familiares não são obrigatórios para gestão financeira básica.
- Contas, cartões e categorias são criados no workspace PF.
- Compartilhamento doméstico/familiar é recurso posterior, opt-in e com papéis explícitos.

### 11.4 Campos PJ

- Nome de exibição da empresa/negócio (obrigatório), nome fantasia opcional, moeda/timezone.
- CNPJ, razão social, endereço e dados fiscais só quando o módulo ou serviço realmente precisar e após revisão de finalidade, segurança e orientação jurídica/contábil.
- Perfil operacional inicial opcional: MEI, microempresa, profissional/autônomo ou outro; não inferir regime tributário nem calcular imposto oficial sem validação especializada.
- Criação do workspace PJ com proprietário/administrador inicial.
- Checklist de início: caixa/conta empresarial, saldo de abertura, categorias empresariais, contas a receber/pagar.

### 11.5 Mais de um workspace

- Usuário pode solicitar criação de outro workspace em Configurações.
- Criar um workspace PF/PJ separado; não converter um workspace em outro por troca de rótulo.
- Para transferir dados entre espaços, oferecer ferramenta explícita de exportação/importação/migração com prévia, contagem, validação, confirmação e auditoria. Não copiar ou compartilhar dados automaticamente.
- Um workspace PJ poderá ter múltiplos membros e convite. A inclusão de colaborador exige convite expirável e aceite.
- A remoção de membro não apaga registros de autoria nem altera o histórico.

### 11.6 Boundary de isolamento obrigatório

O isolamento deve ser garantido em todas as camadas:

1. UI: workspace ativo exibido em header e contexto de cada tela; nenhuma lista mistura dados de outro workspace.
2. Application: cada caso de uso recebe contexto de workspace autenticado e valida membership/role.
3. Repositories: todas as consultas e mutações incluem `workspaceId`; ausência do escopo deve falhar, não retornar tudo.
4. API: workspace não confiável vindo do cliente é validado contra a sessão e membership do usuário.
5. Banco: chaves únicas e relações incluem o escopo; avaliar Row-Level Security no PostgreSQL como defesa adicional.
6. IA: o contexto da conversa contém apenas dados do workspace selecionado e autorizados.
7. Relatórios/exportações/backups: exportar só workspace autorizado, com nome e tipo claramente identificados.
8. Suporte/administrador: acesso excepcional exige motivo, autorização, duração limitada, auditoria e redaction.

### 11.7 Migração do estado PF/PJ da beta.20

A migração deve partir do backup e executar dry-run. O comportamento de compatibilidade atual (registros antigos sem `profileType` tratados como PF) não pode ser alterado silenciosamente. Regras:

- Registros legados com `profileType = PF` pertencem ao workspace PF; com `PJ` pertencem ao PJ correspondente.
- Registro sem `profileType` é mapeado para PF por compatibilidade, salvo evidência específica e decisão explícita do proprietário.
- Se houver referência de conta/cartão/categoria pertencente a outro perfil, detectar, explicar e propor reparo. Não clonar cegamente sem mapear referências e sem relatório de antes/depois.
- Preservar IDs históricos sempre que possível; quando colisão exigir novo ID, manter tabela de mapeamento de IDs e relações.
- Registros órfãos ou contraditórios devem ir para quarentena/relatório, não ser descartados.
- A migração precisa ser idempotente, transacional e testada com backup da beta.20, estados malformados, referências cruzadas e falha no meio.
- Proibir login/cadastro online até haver autorização backend real. Modo local não deve fingir que criou conta remota.

### 11.8 Critérios de aceite do cadastro PF/PJ

- Usuário novo escolhe PF ou PJ antes de criar seu primeiro workspace.
- O workspace e o papel OWNER são criados numa transação única; falha não deixa identidade sem workspace ou workspace órfão.
- Usuário PF não vê, pesquisa, exporta ou envia contexto de IA de PJ sem membership e troca explícita.
- Usuário PJ vê apenas empresa/negócio selecionado e permissões próprias.
- Usuários de duas empresas não conseguem acessar dados entre tenants alterando IDs no cliente/API.
- Migração da beta.20 preserva valores, datas, IDs, transações, cartões, orçamento, recorrências e backup.
- Modo local e modo online são rotulados sem ambiguidade; nenhum dos dois cria sessão falsa.

---

# PARTE IV — ESCOPO FUNCIONAL COMPLETO

## 12. Navegação e módulos do produto

A navegação deve ser contextual ao tipo de workspace. A experiência PF e PJ compartilha componentes e domínio comum quando isso fizer sentido, mas apresenta linguagem, campos e módulos adequados. Estrutura inicial sugerida:

**PF:** Visão geral; Lançamentos; Contas; Cartões e faturas; Orçamentos; Planejamento; Calendário/compromissos; Relatórios; Metas; Patrimônio; Assistente do Razão; Importar/conciliar; Histórico e integridade; Perfil e configurações.

**PJ:** Visão geral; Caixa/contas; Lançamentos; A receber; A pagar; Cartões; Orçamento/centros de custo; Clientes e fornecedores; Fluxo de caixa; DRE gerencial; Projetos/centros de custo; Relatórios; Planejamento; Assistente do Razão; Importar/conciliar; Equipe e permissões; Auditoria; Configurações.

Não é obrigatório exibir tudo na primeira tela. A navegação deve priorizar tarefas frequentes, evitar excesso de itens e permitir descoberta gradual.

## 13. Dashboard — Visão geral

### 13.1 Objetivo

Responder rapidamente: quanto existe, quanto já está comprometido, o que vence, o que mudou e qual ação exige atenção. Todo card deve indicar workspace, período, data/hora de atualização e link para a composição do número.

### 13.2 PF — indicadores

- Saldo confirmado por conta e saldo consolidado, com opção de expandir.
- Saldo disponível (somente se a definição for documentada e diferenciada do saldo atual).
- Despesas e receitas realizadas no período.
- Compromissos pendentes futuros.
- Saldo projetado e menor saldo projetado no horizonte.
- Faturas abertas, vencidas, fechadas e próxima data de vencimento.
- Orçamentos próximos do limite ou excedidos.
- Próximos compromissos e recorrências.
- Metas e evolução; patrimônio líquido apenas com atualização e data de referência.

### 13.3 PJ — indicadores

- Saldo por conta/caixa e posição consolidada do negócio.
- Entradas realizadas e previstas; saídas realizadas e previstas.
- Contas a receber vencidas/a vencer e contas a pagar vencidas/a vencer.
- Fluxo de caixa futuro, datas de pressão de caixa e menor saldo projetado.
- Receita, custos, despesas e resultado gerencial do período.
- Desempenho por centro de custo/projeto quando habilitado.
- Concentração de recebíveis por cliente e obrigações por fornecedor, com alertas explicáveis.
- Tributos/folha apenas como compromissos manuais ou campos informativos, nunca cálculo oficial sem módulo especializado.

### 13.4 Interações e qualidade

- Seleção de período: semana, mês, trimestre, intervalo customizado.
- Navegação por período e comparação com anterior equivalente.
- Drill-down em qualquer indicador.
- Ocultar valores é privacidade visual, não criptografia nem autorização.
- Estado vazio com ação de início; loading real; erro recuperável; aviso de dados desatualizados/offline.
- Não mostrar zero se a informação falhou ao carregar.

## 14. Contas e carteiras

### 14.1 Tipos PF

Conta corrente, conta de pagamento/digital, poupança, dinheiro em espécie, carteira, investimento manual, conta de reserva e outros tipos configuráveis. Instituição e agência/conta são opcionais e armazenadas somente quando necessárias; não guardar senha de banco.

### 14.2 Tipos PJ

Conta operacional, conta de recebimento, caixa pequeno, conta de reserva, aplicação de liquidez e outras contas do negócio. Cada conta é vinculada ao workspace PJ, com opcional centro de custo/projeto padrão.

### 14.3 Campos e regras

- ID estável, workspace, nome, tipo, instituição opcional, moeda, saldo inicial, data de abertura/corte, status, cor/ícone e observação.
- Saldo inicial deve ser uma posição de abertura com data e contrapartida interna; não pode ser um saldo mágico sem origem.
- Arquivar impede novos lançamentos padrão, mas mantém histórico.
- Encerrar exige saldo zero ou fluxo explícito de transferência/ajuste e registro de auditoria.
- Renomear não altera lançamentos anteriores.
- Conta de investimento e ativo patrimonial não devem ser confundidos com disponibilidade imediata.
- Mostrar saldo interno versus saldo de extrato quando houver conciliação e divergência.

### 14.4 Aceite

CRUD completo; validações; filtros; arquivar/restaurar; saldo calculado; tratamento de moedas; restrição por workspace; testes de saldo inicial, encerramento, conta inativa, transferências e conciliação.

## 15. Lançamentos e movimentações

### 15.1 Tipos

Receita, despesa, transferência, ajuste/reclassificação controlada, estorno/reversão e, em PJ, recebimento/pagamento vinculado a título a receber/a pagar. O usuário comum não deve precisar entender uma contabilidade complexa para registrar movimento.

### 15.2 Campos

- Descrição/estabelecimento/contraparte.
- Valor positivo em centavos e moeda.
- Data efetiva, competência e vencimento (campos separados quando aplicáveis).
- Conta de origem/destino ou cartão.
- Categoria e subcategoria.
- Workspace e, para PJ, centro de custo/projeto.
- Status: rascunho, pendente/agendado, efetivado/conciliado, cancelado/revertido conforme semântica formal.
- Método/origem: manual, arquivo importado, recorrência, Open Finance, OCR, ajuste ou integração.
- Tags, nota, anexo, referência externa e identificador de importação.
- Criado/atualizado por e timestamps.

### 15.3 Criar e editar

- Formulário rápido por tipo, com conta/categoria/contexto correto.
- Valor com parser único pt-BR, aceitando formatos definidos e rejeitando ambiguidades.
- Campos condicionais e validação antes de qualquer efeito lateral.
- Rascunho pode ser editado; evento efetivado/conciliado deve usar mecanismo de correção/reversão para não apagar história.
- Edição de transação deve recalcular impactos derivados de modo atômico.
- Excluir rascunho é permitido; excluir evento financeiro efetivado exige reversão ou cancelamento formal, com explicação.
- Duplicar lançamento deve criar novo ID, nova data e revisão explícita dos campos relevantes.
- Anexo deve respeitar tipo, tamanho, malware scanning se houver backend e retenção configurada.

### 15.4 Divisão (split)

Uma transação pode ser dividida em várias categorias/centros de custo. Soma das partes deve ser exatamente igual ao valor original na mesma moeda. Regras de arredondamento e centavos residuais devem ser determinísticas. O dashboard/relatórios não podem contar simultaneamente o total pai e as parcelas como dois gastos.

### 15.5 Aceite

Criar, editar, duplicar, cancelar, estornar, filtrar e pesquisar; validar valor/data/status; dividir; auditar; corrigir sem perder original; garantir uma única atualização de saldo, cartão, orçamento, forecast e relatórios.

## 16. Transferências entre contas

- Uma transferência é uma operação atômica com origem, destino, quantia, data, taxa opcional e referência comum.
- Origem e destino devem pertencer ao mesmo workspace e moeda, salvo operação cambial específica.
- Transferência interna não é receita nem despesa no consolidado.
- Deve impactar origem e destino uma única vez.
- Taxa é despesa separada, com categoria e origem, não parte silenciosa do valor transferido.
- Estornar exige desfazer as duas pernas de forma consistente; uma perna não pode permanecer aplicada isoladamente.
- Transferência conciliada exige desconciliação ou fluxo de ajuste explicitamente auditado.
- Testar cliques duplos, concorrência, rollback, timeout e reinício.

## 17. Categorias e regras de classificação

- Categorias padrão distintas para PF e PJ, com customização, subcategorias, ícones, cor e descrição.
- Tipos de receita, despesa, transferência, custo, imposto informativo, investimento e ajuste, conforme modelo de domínio.
- Categorias arquivadas continuam visíveis no histórico.
- Reclassificação de movimento em massa precisa de preview e auditoria.
- Regras automáticas com condições claras (descrição, merchant, conta, contraparte, padrão importado); ordem/prioridade definida; evitar regras sobrepostas não determinísticas.
- Aprendizado local de categoria por workspace; não treinar ou compartilhar entre PF/PJ sem base, consentimento e isolamento.
- IA sugere categoria com confiança e motivos; não muda transações existentes silenciosamente.

## 18. Cartões de crédito, ciclos e faturas

### 18.1 Cadastro do cartão

Nome, bandeira opcional, instituição opcional, limite, moeda, dia de fechamento, dia de vencimento, workspace, conta de pagamento padrão, status e apelido final do cartão. Não armazenar PAN completo, CVV ou credenciais de cartão.

### 18.2 Compras

- Compra à vista e parcelada, data da compra, descrição, merchant, categoria, valor, cartão e ciclo esperado.
- Compra deve entrar em um único ciclo conforme data de fechamento e política do cartão.
- Estorno, crédito, cashback, tarifa e chargeback precisam de tipos separados.
- Autorização pendente e compra efetivada devem ser distinguidas quando a fonte fornecer esse estado.

### 18.3 Faturas

- Aberta, fechada, vencida, paga parcialmente, paga e contestada quando aplicável.
- Composição por compra/ajuste, data de fechamento e vencimento.
- Pagamento parcial ou total com conta de origem e confirmação explícita.
- Pagamento quita passivo/fatura; não gera uma segunda despesa no relatório.
- Crédito/estorno afeta fatura e limite sem duplicar movimento.
- Histórico de limite utilizado e disponível.
- Ajuste de dia de fechamento/vencimento deve ser versionado e não reescrever ciclo passado sem explicação.

### 18.4 Parcelamentos

- Plano de parcelamento com número total, valor total, valor de parcela, taxa/juros se informados e vínculo da compra original.
- Cada parcela tem ciclo e vencimento determinados.
- Antecipação, quitação e estorno precisam preservar o histórico e não duplicar total.
- Edição de compra parcelada deve mostrar alcance: apenas parcela, futuras ou plano completo.

### 18.5 Aceite

Testes de ciclos em meses curtos/virada de ano, compra exatamente no fechamento, fechamento/vencimento no mesmo mês, pagamento parcial, pagamento total, estorno, parcelamento, taxa, limite, duplicidade e relatório sem dupla contagem.

## 19. Orçamentos e envelopes

- Orçamento geral por período e limites por categoria/subcategoria.
- Períodos mensal, semanal ou customizado conforme necessidade.
- Orçamento fixo ou adaptável; qualquer adaptação explica fórmula e histórico.
- Rollover configurável, desligado por padrão, com regra explicitada.
- Valores planejados versus gastos realizados, pendentes e previstos.
- Limiares de alerta configuráveis (por exemplo 70%, 85%, 100%), sem notificação excessiva.
- Categoria transferida/estornada deve recalcular orçamento de origem e destino.
- Cartão deve considerar gasto na compra, não no pagamento da fatura.
- PJ pode ter orçamento por centro de custo/projeto e categoria.
- Permitir comparar orçado x realizado x projetado.

## 20. Recorrências, compromissos e calendário

### 20.1 Recorrência

Frequências diárias, semanais, quinzenais, mensais, bimestrais, trimestrais, semestrais e anuais, com início/fim, timezone, data do mês, política de fim de mês, valor fixo/variável, conta/cartão/categoria, lembrete e regra de vigência.

### 20.2 Instâncias e edição

- Instância gerada tem `ruleId`, data de ocorrência, chave determinística, status e vínculo da transação.
- Repetir geração não duplica ocorrência, mesmo após reinício, importação ou sync.
- Editar só esta ocorrência cria exceção.
- Editar esta e futuras atualiza regra a partir da data escolhida, sem reescrever instâncias já pagas/conciliadas.
- Pausar mantém histórico e impede novas ocorrências.
- Cancelar regra deixa explícito se cancela apenas futuras não geradas.
- Preview de lote mostra quantidade, datas, somas e conflitos antes da gravação atômica.
- Regras de 29/30/31, fim de semana e ano bissexto precisam ser documentadas e testadas.

### 20.3 Calendário

Visões mensal, semanal e agenda; filtros por conta, cartão, workspace e categoria; vencimentos, parcelas, recebíveis, contas a pagar, recorrências e metas; notificações locais opt-in. O calendário não pode gerar lançamento inesperado sem regra e preview.

## 21. Contas a pagar e a receber — especialmente PJ

### 21.1 Títulos

Entidade separada do pagamento/recebimento, com contraparte, referência, emissão, competência, vencimento, valor original, saldo aberto, status, conta, categoria, centro de custo, anexos e histórico.

### 21.2 Estados

Rascunho, aberto, parcialmente liquidado, liquidado, vencido, cancelado, renegociado e contestado quando aplicável. A liquidação vincula uma ou mais transações; não cria uma segunda receita/despesa.

### 21.3 Funções

- Cadastro de cliente/fornecedor com dados mínimos.
- Parcelamento e cronograma de títulos.
- Recebimento/pagamento parcial.
- Baixa/estorno e renegociação com trilha.
- Aging (a vencer, 1–30, 31–60, 61–90, acima de 90 dias) configurável.
- Previsão de caixa baseada em vencimento e probabilidade/fator histórico identificado como estimativa.
- Exportação e impressão de relatórios.

### 21.4 Limite fiscal

Não emitir nota fiscal, boleto bancário, cobrança Pix ou documento fiscal oficial na versão inicial. Não afirmar que o Razão substitui contador, ERP ou software fiscal.

## 22. Gestão empresarial complementar PJ

### 22.1 Centros de custo e projetos

- Hierarquia controlada (departamento, unidade, projeto ou centro de custo).
- Vínculo opcional/obrigatório conforme regra do workspace.
- Relatórios por centro/projeto; rateio de despesa por mais de um centro com soma exata.

### 22.2 Clientes e fornecedores

Cadastro simples de nome, tipo, contato operacional e identificador opcional, com consentimento e retenção adequada. Sem enriquecimento de dados por terceiros sem base.

### 22.3 DRE gerencial

Demonstrativo gerencial de receitas, deduções informadas, custos e despesas. Deve indicar premissas, classificação, competência, regime simplificado adotado pela aplicação e limitações. Não chamar de DRE contábil oficial nem produzir obrigações fiscais sem revisão de contador.

### 22.4 Gestão de equipe

Papéis propostos: `OWNER`, `ADMIN`, `FINANCE_MANAGER`, `OPERATOR`, `VIEWER`, `ACCOUNTANT_READ_ONLY`. Matriz de permissão específica para leitura, criação, edição, aprovação, exportação, convidar membro, alterar integração e excluir workspace. Aplicar menor privilégio.

### 22.5 Despesas do proprietário e pró-labore

Registrar retirada, aporte, reembolso e transferência entre pessoa e empresa com categoria e natureza claras. Nunca misturar caixa pessoal com caixa empresarial. Evitar nomear automaticamente como salário/pró-labore sem configuração/validação contábil.

## 23. Metas, reservas e poupança

- Meta com nome, valor-alvo, prazo, prioridade e workspace.
- Reserva de emergência com sugestão baseada em parâmetro configurável, não ordem prescritiva.
- Aportes e resgates como movimentos vinculados à conta de origem/destino.
- Progresso calculado por eventos; não editar saldo da meta diretamente sem registro.
- Cenários de aporte mensal e data estimada, com premissas.
- Alertar que projeções não garantem resultado.

## 24. Dívidas, empréstimos e financiamentos

- Cadastro manual do contrato, instituição, principal, saldo, taxa informada, CET se conhecido, número de parcelas, datas e sistema de amortização se comprovado.
- Cronograma, juros, amortizações, parcelas pagas, saldo devedor e custo total estimado.
- Simulação de antecipação e amortização extra com comparação de cenários.
- Fonte e precisão de taxas claramente identificadas; valores desconhecidos não são inventados.
- Não substituir contrato oficial nem oferecer aconselhamento jurídico/financeiro individualizado.

## 25. Patrimônio e investimentos informativos

- Ativos e passivos com valor, moeda, data de avaliação, fonte e confiança.
- Imóveis, veículos, aplicações, reservas, empréstimos e outras obrigações.
- Valor estimado manualmente ou importado, sempre com timestamp e fonte.
- Posição de investimentos manual primeiro; custo médio, aportes, resgates, proventos e rentabilidade com metodologia explícita.
- Não dar recomendação automática de compra/venda nem prometer cotação em tempo real sem fornecedor validado.
- Patrimônio líquido = ativos - passivos na mesma data de referência; mostrar itens antigos/sem avaliação.

## 26. Relatórios, busca e exportação

### 26.1 Relatórios PF

Fluxo de caixa, receitas e despesas, categorias, contas, cartões/faturas, orçamento, metas, patrimônio, dívidas, evolução mensal e comparação entre períodos.

### 26.2 Relatórios PJ

Fluxo de caixa realizado/projetado, contas a pagar/receber e aging, receitas/custos/despesas, resultado gerencial, centro de custo, projeto, cliente/fornecedor, cartão e conciliação.

### 26.3 Busca

Busca por descrição, contraparte, valor, data, conta, categoria, tag, origem, status e identificador externo. Debounce, paginação e índices. Garantir workspace scope e não indexar dados sensíveis em serviços externos sem base.

### 26.4 Exportação

CSV e JSON portável no núcleo; PDF de relatórios e OFX/QIF quando tecnicamente validado. Exportação total deve incluir versão de schema, metadados, moeda, datas, IDs, vínculos e relatório de validação. Proteger contra CSV formula injection; avisar que CSV não preserva todos os tipos/vínculos. Exportação de backup cifrado é opção futura/avançada conforme gestão de chave.

## 27. Importação e conciliação

### 27.1 Formatos

Começar por CSV e OFX com amostras sintéticas de bancos diferentes; evoluir para QIF/formatos adicionais somente com demanda. Definir limites de arquivo, encoding, colunas obrigatórias, timezone, decimal, separador e política de valor negativo.

### 27.2 Pipeline

1. Selecionar workspace e conta.
2. Selecionar arquivo e validar tamanho/tipo/encoding.
3. Interpretar em sandbox sem persistir.
4. Mapear colunas e exibir preview de linhas válidas/inválidas.
5. Normalizar datas/valores/descrições preservando valor bruto.
6. Identificar correspondência exata e provável com explicação do score.
7. Separar novas, duplicatas possíveis, ignoradas e linhas com erro.
8. Deixar o usuário escolher linha a linha ou em lote.
9. Confirmar lote atomicamente.
10. Registrar trilha, hash/identificador do arquivo e resultado.
11. Permitir desfazer por operação compensatória, quando seguro.

### 27.3 Deduplicação

Fingerprint pode considerar workspace, conta, valor, moeda, data, descrição normalizada, contraparte e ID bancário. Nunca descartar automaticamente movimento só porque valor/data são parecidos. Distinguir duplicidade exata de suspeita probabilística. Preservar as transações legítimas repetidas (por exemplo duas compras idênticas no mesmo dia).

### 27.4 Conciliação

- Selecionar período, saldo inicial e final do extrato.
- Sugerir matches 1:1, 1:N e N:1 apenas com regras claras.
- Vincular pagamentos de fatura, transferências, tarifas e estornos.
- Conciliar, desconciliar ou descartar linha com motivo.
- Exibir diferença remanescente e itens ainda não conciliados.
- Confirmar lote e registrar auditoria.
- Relatório de reconciliação reproduzível com totais e timestamps.

## 28. Livro-razão, integridade e auditoria

### 28.1 Duas trilhas distintas

- **Livro/lançamentos:** registra efeitos financeiros e movimentos.
- **Audit log:** registra quem fez o quê, em qual workspace/entidade, quando, de qual estado para qual estado, por qual motivo e com qual resultado.

Não confundir hash/checksum com verdade, autoria ou imutabilidade. A meta de produção é trilha append-only no servidor para operações críticas, com acesso restrito, integridade criptográfica quando apropriado e exportação controlada.

### 28.2 Correções

Eventos financeiros efetivados não devem desaparecer sem explicação. Preferir lançamento compensatório/reversão com referência ao original. Ajustes de saldo exigem motivo, evidência (se existente), diferença calculada e confirmação.

### 28.3 Auditoria PJ

Registrar alterações de membro, permissões, títulos, pagamentos, categorias, contas, exportações, integrações, restore e configurações sensíveis. Dados da trilha precisam ser minimizados e acessíveis somente a papéis permitidos.

## 29. Backup, restauração e portabilidade

- Backup manual e automático; histórico por data e versão.
- SchemaVersion, exportVersion, contagem de entidades, soma de valores por moeda/tipo quando aplicável, checksum e metadados de origem.
- Backup deve poder ser validado antes da restauração.
- Backup exportado pode incluir dados pessoais/financeiros; alertar e oferecer proteção adicional.
- Restore executa pré-backup, valida arquivo, mostra preview, solicita confirmação, grava atomicamente, revalida e mantém possibilidade de rollback.
- Não restaurar backup de outro workspace sem fluxo de importação explícito.
- Nunca considerar checksum simples como proteção contra arquivo adulterado deliberadamente.
- Definir retenção de snapshots, espaço e limpeza; não remover última cópia válida sem confirmação.
- Exercitar recuperação em arquivo truncado, corrupção semântica, disco cheio, app encerrado no commit, falha de migração, versão antiga e versão futura incompatível.

## 30. Notificações e lembretes

Notificações in-app e locais para vencimentos, contas atrasadas, orçamento próximo do limite, falha de backup, falha de sync, convite, alerta de risco e revisão de recorrência. Configurar canal, horário silencioso, antecedência e agrupamento. Opt-in para push/email; cancelar facilmente. Não mostrar valor financeiro em lockscreen por padrão. Não gerar notificações repetitivas/assustadoras.

## 31. Perfil, preferências e experiência

- Perfil de identidade e perfil de workspace separados.
- Tema claro como padrão; modos escuro e alto contraste podem ser adicionados com QA.
- Paletas permitidas: azul institucional, azul ardósia e verde sóbrio, com neutros consistentes.
- Densidade confortável como padrão; compacta para usuários avançados.
- Moeda, formato de data, timezone e primeiro dia do período.
- Privacidade visual para ocultar valores.
- Exportar dados, administrar dispositivos e sessões, revogar integrações e solicitar exclusão.
- Preferências persistem sem alterar dados financeiros.
- Feedback dentro do app com versão, contexto redigido e anexos opt-in.

## 32. Gamificação e conquistas

O domínio atual contém módulo de conquistas. Pode existir painel de progresso discreto para incentivar hábitos saudáveis: revisar orçamento, registrar movimentos, concluir conciliação, formar reserva. Não premiar gasto, investimento arriscado, endividamento ou uso compulsivo. O usuário pode desativar. Conquistas nunca desbloqueiam acesso a dados nem alteram saldo.

---

# PARTE V — MOTOR FINANCEIRO E MODELO DE DADOS

## 33. Regras financeiras canônicas

### 33.1 Dinheiro e moeda

- Representar valor por inteiro seguro de centavos (`amountMinor`/`amountCents`) e `currency` ISO 4217.
- Uma operação deve validar `Number.isSafeInteger` ou tipo inteiro equivalente; no backend usar `BIGINT`/`DECIMAL` apropriado, sem converter BigInt para float.
- Parser e formatter centralizados. Entrada pt-BR deve rejeitar strings ambíguas, caracteres inesperados e valores fora do limite; não converter falha para zero.
- Operações com moedas diferentes exigem exchange rate, data, fonte e valores original/convertido separados. Não somar moedas diferentes.
- Definir política de arredondamento por operação e documentar teste de borda.

### 33.2 Datas

- Separar `occurredOn`/data financeira, `dueOn`, `competenceOn`, `createdAt` e `updatedAt`.
- Data civil operacional em `YYYY-MM-DD` quando não representa instante; timestamps técnicos em UTC ISO 8601.
- Persistir timezone do workspace/usuário e usá-lo em recorrência e notificações.
- Testar virada de mês/ano, horário de verão de zonas aplicáveis, anos bissextos e mudança de timezone.

### 33.3 Fonte de verdade e livro contábil interno

Objetivo arquitetural: evoluir de agregação de transações para um journal financeiro consistente, com lançamentos e postings balanceados (partidas dobradas internas) quando o desenho e a migração forem comprovados. Não chamar esse journal de escrituração oficial. A transação amigável da UI pode produzir várias linhas internas.

Invariantes:

- Cada journal entry efetivada equilibra débitos e créditos por moeda.
- Contas de caixa/banco/cartão/passivo e categorias são mapeadas de forma explícita.
- O saldo de conta deriva de saldo de abertura + postings válidos até a data.
- Snapshot de saldo é cache; pode ser recalculado e reconciliado.
- Ajustes e reversões preservam vínculo ao evento original.
- Estado projetado nunca entra no saldo efetivado.
- Pagamento de fatura liquida passivo; compra de cartão é despesa uma única vez.
- Transferência interna altera contas, não receita/despesa consolidada.

A migração para journal não deve ser feita numa única reescrita. Criar um ADR e spike, definir mapeamento e provar equivalência dos saldos históricos em cópia da beta.20 antes de migrar produção.

### 33.4 Estados e origem

Definir estados de forma independente: estado de liquidação, conciliação, aprovação e sincronização. `synced` não significa `paid`; `reconciled` não significa que o banco confirmou; `pending` não deve ser confundido com `draft`. Toda tela e API devem respeitar essa semântica.

### 33.5 Idempotência e concorrência

Toda operação mutacional crítica recebe idempotency key estável. Persistir restrição de unicidade no banco, não apenas em `useRef` ou memória de UI. Duas requisições concorrentes devem resultar em um único efeito. Repetição retorna resultado existente ou estado “já processado”.

## 34. Entidades de domínio propostas

O modelo final deve ser normalizado o suficiente para integridade e evoluir com migrations versionadas. Os nomes podem ser adaptados, mas os conceitos e relações abaixo precisam existir ou receber uma justificativa documentada.

| Domínio | Entidades principais | Regras/relacionamentos |
|---|---|---|
| Identidade | User, Credential/Identity, Session, Device, RecoveryToken | Credenciais protegidas; sessão revogável; não misturar com dados financeiros. |
| Espaços | Workspace, WorkspaceProfile, Membership, Invitation, Role/Permission | `type PF/PJ`; todo dado financeiro tem workspace obrigatório. |
| Contas | Account, AccountOpeningBalance, AccountSnapshot | Moeda, status, data de abertura, saldo calculado. |
| Movimentos | Transaction, TransactionSplit, Transfer, JournalEntry, JournalLine, Reversal | Escopo, moeda, estado, origem e idempotência. |
| Classificação | Category, CategoryRule, Tag, CostCenter, Project | Separação PF/PJ; regras auditadas. |
| Cartões | CreditCard, CardCycle, Invoice, InvoiceItem, CardPayment, InstallmentPlan | Compra, crédito, pagamento e limite sem dupla contagem. |
| Planejamento | Budget, BudgetLine, BudgetAllocation, Goal, GoalContribution, Scenario | Período, regra, eventos incluídos e workspace. |
| Automação | RecurringRule, RecurringOccurrence, RecurringException, Commitment | Chave determinística e ciclo de vida. |
| A receber/pagar | Receivable, Payable, Settlement, Counterparty | Parcial, atraso, liquidação e vínculo aos movimentos. |
| Patrimônio | Asset, Liability, Loan, LoanInstallment, InvestmentPosition, Valuation | Data e fonte da avaliação; sem promessa de cotação. |
| Importação | ImportBatch, ImportRow, ImportMapping, ExternalTransactionRef | Hash, origem, preview, decisões e idempotência. |
| Conciliação | ReconciliationSession, StatementLine, Match, ReconciliationAdjustment | Evidência, saldo e diferença. |
| Documentos | Attachment, OCRJob, FileMetadata, RetentionPolicy | Scan, acesso restrito, retenção e exclusão. |
| IA | AIConversation, AIMessage, AIProposal, AIActionApproval, AIProviderConfig | Workspace, minimização, consentimento e auditoria. |
| Integração | Integration, Consent, ProviderConnection, SyncCursor, SyncEvent, Conflict | Provider, escopo, status, expiração, revogação. |
| Segurança | AuditEvent, SecurityEvent, AccessGrant, SupportAccess | Append-only para eventos críticos, minimização e retenção. |
| Operação | Notification, Feedback, SupportTicket, Release/FeatureFlag | Versão, canal e opt-in. |
| Comercial | Subscription, Plan, Entitlement, BillingEvent | Fase posterior; provedor de cobrança e estado idempotente. |

### 34.1 Regras de integridade do banco

- Foreign keys para relações essenciais; `workspace_id NOT NULL` em entidade financeira.
- Índices em workspace + data, workspace + conta, workspace + status, referência externa e chaves idempotentes.
- Unicidade composta por workspace onde necessário; nunca assumir que nome é único globalmente.
- Restrições para moeda, valor positivo quando regra exigir, estados permitidos e chaves externas.
- Exclusão lógica (`archivedAt`/tombstone) quando preservar histórico for necessário; exclusão física apenas quando permitido por política e obrigações.
- Evitar colunas JSON livres para dados financeiros críticos; JSON pode guardar payload auxiliar versionado, validado e não canônico.
- Migrar schema com backup, preflight, lock, transaction e validação pós-migração.

## 35. Previsões e cenários

### 35.1 Camadas de certeza

1. Realizado/efetivado.
2. Confirmado futuro (conta agendada, parcela, título com data confirmada).
3. Regra recorrente projetada.
4. Estimativa por histórico/padrão, claramente rotulada.
5. Cenário hipotético criado pelo usuário ou IA.

Não misturar as cinco camadas num único número sem legenda e opção de inspeção.

### 35.2 Motor de previsão

- Começar com regras determinísticas de compromissos e recorrências.
- Adicionar histórico por categoria e padrão de receita com janela, sazonalidade e amostra mínima.
- Expor premissas, intervalo, qualidade do histórico, nível de confiança calibrado e última atualização.
- Se houver poucos dados, declarar “dados insuficientes” e usar apenas os eventos já conhecidos.
- Não aplicar multiplicadores fixos arbitrários como se fossem probabilidades.
- Permitir cenários base, conservador e otimista com premissas que o usuário pode editar.
- Mostrar saldo mínimo projetado, datas de déficit, fluxo mensal e fatores que mais influenciam a curva.
- Simulações não alteram o estado financeiro.

### 35.3 Critérios

Backtest em histórico sintético e, quando autorizado, agregado/anônimo; erro por horizonte/categoria; intervalos de previsão; teste de vieses de dados ausentes; comparação de previsão versus realizado. Não prometer precisão universal.

---

# PARTE VI — O ASSISTENTE E A INTELIGÊNCIA ARTIFICIAL DO RAZÃO

## 36. Visão da IA

A IA deve funcionar como um assistente de gestão financeira contextual, não como um chatbot genérico que inventa respostas. O nome de interface pode permanecer **Assistente do Razão** até que o proprietário aprove outro nome.

A arquitetura obrigatória separa:

1. **Motor financeiro determinístico:** calcula saldo, compromissos, orçamento, fatura, previsão e indicadores.
2. **Camada de ferramentas:** funções explicitamente autorizadas que consultam o domínio por workspace.
3. **Modelo de linguagem (quando habilitado):** entende pergunta, escolhe ferramenta permitida, organiza explicação e apresenta resultado.
4. **Camada de política/segurança:** valida permissões, minimiza dados, classifica intenção, bloqueia ações proibidas e exige confirmação.
5. **Camada de avaliação:** mede factualidade, precisão, privacidade, resistência a prompt injection e custo.

Sem provedor de LLM real, a interface deve dizer que está usando cálculo local ou modo limitado. Não desenhar indicador “IA conectada” sem configuração e resposta do provedor.

## 37. Funcionalidades da IA — PF

- Perguntar “quanto gastei com alimentação?”, “quanto ainda posso gastar?” e “por que meu saldo mudou?”; resposta inclui período, conta/workspace, categorias e movimentos utilizados.
- Explicar faturas, parcelamentos, vencimentos e orçamento.
- Resumir o mês e comparar com período equivalente.
- Identificar possível duplicidade, cobrança recorrente nova, variação fora do padrão e risco de déficit.
- Sugerir categoria para novo lançamento/importação com confiança e motivo.
- Sugerir ajuste de orçamento com base no histórico, sem aplicar automaticamente.
- Simular compra, parcela, economia ou alteração de renda com parâmetros explícitos.
- Sugerir plano de ação genérico para melhorar organização financeira sem prometer resultado nem substituir profissional.
- Identificar lacunas nos dados que comprometem uma conclusão.

## 38. Funcionalidades da IA — PJ

- Resumo do caixa do negócio, entradas e saídas, títulos vencidos e pressão de caixa futura.
- Explicar variações de receita, custos e despesas por categoria/centro de custo.
- Listar recebíveis em atraso e fornecedores/obrigações próximas.
- Sugerir categorização e classificação por centro de custo, com revisão.
- Detectar concentração de receita em poucos clientes, dependência de fornecedor e mudanças incomuns.
- Explicar DRE gerencial, margens e fluxo de caixa, sempre com definições e dados usados.
- Simular atraso de recebimento, aumento de custo, redução de receita e contratação/compra como cenários hipotéticos.
- Preparar rascunho de ação, por exemplo criar um título a receber ou lembrar vencimento, mas exigir confirmação.

## 39. Ferramentas permitidas e proibidas

### 39.1 Ferramentas de leitura (após autorização)

`get_workspace_summary`, `get_account_balances`, `get_period_cash_flow`, `get_category_breakdown`, `get_invoice_status`, `get_budget_status`, `get_upcoming_commitments`, `get_receivables_aging`, `get_payables_aging`, `get_reconciliation_status`, `run_what_if_scenario`, `search_transactions` e `explain_metric`. Cada ferramenta valida membership e escopo do workspace no servidor/domínio, limita volume e retorna dados estruturados com `asOf`, período e currency.

### 39.2 Propostas de escrita (somente rascunho)

A IA pode sugerir `draft_transaction`, `draft_budget_change`, `draft_category_rule`, `draft_recurring_rule`, `draft_receivable`, `draft_payable` ou `draft_reminder`. A proposta exibe impacto, resumo e diferenças. Uma confirmação direta do usuário aciona um caso de uso que revalida dados, permissões, idempotência e limites. A IA não confirma por conta própria.

### 39.3 Ações proibidas por texto livre

- Transferir ou efetuar pagamento.
- Iniciar Pix ou ordem bancária.
- Investir, comprar/vender ativo, contrair crédito ou renegociar contrato.
- Excluir definitivamente dados/conta/workspace.
- Alterar tipo PF/PJ, convidar/remover usuário ou ampliar permissão.
- Revogar/ativar consentimento bancário.
- Exportar backup completo ou documentos sensíveis.
- Ler workspace não selecionado ou fora da autorização.

## 40. Contrato de resposta da IA

Toda resposta que apresente números deve fornecer, internamente e quando útil na UI:

- `workspaceId` validado e tipo PF/PJ;
- instante de referência (`asOf`), período, timezone e moeda;
- ferramentas/dados consultados;
- filtros e exclusões relevantes;
- distinção entre realizado, pendente, estimado e hipotético;
- limitações/ausência de dados;
- IDs/referências internas necessárias para abrir os movimentos de origem.

Se não houver dados suficientes, a resposta deve dizer isso. Não inventar transações, instituições, taxas, datas, faturas ou categorias.

## 41. Privacidade, segurança e prompt injection

- Enviar ao provedor somente o mínimo necessário para responder. Sempre que possível, enviar agregados e não descrições/identificadores individuais.
- Workspace e escopo de permissão validados antes da chamada; nunca confiar em argumento de workspace enviado pelo LLM.
- Descrições de transação, CSV, comprovantes, notas e anexos são dados não confiáveis, nunca instruções.
- Não permitir navegação irrestrita na rede, shell, SQL livre, leitura de arquivo local ou ferramentas arbitrárias.
- Guardrails no servidor/domínio, não apenas no prompt.
- Configuração de IA desligável; modo sem nuvem; aviso antes de enviar dados ao terceiro; política de retenção e exclusão clara.
- Contrato com fornecedor sobre processamento, retenção, uso para treinamento, localidade e suboperadores antes do lançamento.
- Limites de custo, taxa, contexto e uso por workspace; fallback sem mascarar falha.
- Logs de prompts redigidos; não registrar conteúdo financeiro completo por padrão.

## 42. Avaliação contínua da IA

Manter dataset versionado com casos PF/PJ, cálculos simples e complexos, dados contraditórios, períodos sem dados, transferências, faturas, cancelamentos, múltiplos workspaces, prompt injection, pedido de ação proibida, dados confidenciais e tentativa de descobrir outra empresa. Métricas: groundedness, precisão de ferramenta, taxa de resposta sem evidência, rejeição correta, vazamento cross-tenant, latência, custo e feedback humano. Toda troca de modelo/provedor deve passar por regressão e ADR.

## 43. OCR e visão computacional

OCR real será um recurso assistivo, não prova de pagamento. Etapas: captura/upload → validação de arquivo → processamento isolado → extração campo a campo → confiança por campo → preview → correção humana → verificação de duplicidade → criação de rascunho → confirmação → gravação auditada. Campos possíveis: valor, data, estabelecimento, CNPJ (somente se necessário), método, itens, parcelas e identificador do documento. Baixa confiança exige confirmação. Arquivos temporários devem ser excluídos conforme retenção. Não enviar imagem de documento para provedor sem aviso/base/contrato. OCR não pode confirmar quitação.

---

# PARTE VII — ARQUITETURA TÉCNICA E PLATAFORMAS

## 44. Princípio de evolução arquitetural

Preservar o núcleo existente e separar responsabilidades progressivamente. O destino é um **monólito modular com adaptadores por plataforma**, não uma coleção prematura de microserviços. A separação de módulos deve ser guiada por limites de domínio, necessidades de implantação e isolamento.

## 45. Camadas-alvo

| Camada | Responsabilidade | Não pode fazer |
|---|---|---|
| Presentation | React, rotas, formulários, design system, acessibilidade, estados de tela e view models. | Implementar cálculo financeiro ou acessar banco/storage diretamente. |
| Application | Casos de uso, autorização contextual, transações, idempotência, orquestração e eventos. | Depender de componentes React ou API específica de Electron. |
| Domain | Regras puras de dinheiro, movimento, cartão, fatura, orçamento, recorrência, título, previsão e workspace. | Acessar DOM, rede, filesystem, provedor de IA ou storage concreto. |
| Ports | Contratos de repositório, clock, ID, crypto, files, notification, AI provider, bank connector. | Conhecer detalhes de fornecedor. |
| Adapters | IndexedDB, SQLite, HTTP, Electron IPC, arquivos, provedor OCR/IA/Open Finance. | Ignorar validação ou retornar sucesso não confirmado. |
| Backend | Identidade, autorização, workspaces, APIs, Postgres, fila/worker e integrações. | Confiar em autorização apenas do cliente. |
| Operations | CI/CD, migrações, secrets, observabilidade, suporte, rollback e release. | Expor dados financeiros em logs ou pipeline. |

## 46. Stack de referência e critérios de escolha

### 46.1 Frontend

Manter React e Vite atuais, atualizando apenas com compatibilidade demonstrada. Evoluir JavaScript para TypeScript por módulos e novos contratos, não reescrever toda a aplicação numa migração única. Adotar validação runtime de payload (ex.: Zod ou alternativa avaliada) para bordas de rede, importação e storage.

### 46.2 Desktop

Manter Electron na base atual. Preservar `contextIsolation: true`, `nodeIntegration: false`, sandbox quando compatível, CSP restritiva, navegação/links controlados, APIs IPC enumeradas e validadas, autorização no processo principal e `safeStorage` sem fallback inseguro. O renderer nunca recebe acesso genérico a `fs`, `process`, `child_process` ou IPC irrestrito.

### 46.3 Persistência local

- Web: migrar estado financeiro do `localStorage` para IndexedDB após plano de migração, backup, quota e testes.
- Desktop: avaliar SQLite transacional para registros/índices e estratégia de cifragem com chave protegida pelo SO; manter compatibilidade de backup e migração.
- Não codificar criptografia própria. Validar comportamento por SO, perda de chave, perfil de usuário, backup e restauração.
- O adaptador local deve implementar contratos comuns de repositório e não expor detalhes ao domínio.

### 46.4 Backend online

Preferência arquitetural: Node.js/TypeScript, API modular, PostgreSQL e Prisma (schema existente é apenas ponto de partida). Framework HTTP (Fastify ou outro) deve ser escolhido após spike de validação, segurança, esquema, logs, rate limit e OpenAPI. Evitar framework novo sem benefício objetivo. PostgreSQL é fonte canônica multiusuário; todo objeto de negócio é escopado por workspace.

### 46.5 Jobs e arquivos

Fila durável só quando houver necessidade real (OCR, importação grande, sync, notificações). Considerar worker/queue dedicada e storage de objetos compatível S3 para anexos, com criptografia, URLs temporárias, antivírus e retenção. Não introduzir Redis/serviços adicionais sem justificar escala e operação.

### 46.6 Contratos

API documentada com OpenAPI, versionamento, validação request/response, erros padronizados, paginação, rate limit, idempotency keys e teste de contrato. Data Transfer Objects distintos das entidades internas.

## 47. Mapa de módulos de software

- `identity-access`: contas, sessão, MFA, dispositivo e recuperação.
- `workspace`: tipo PF/PJ, membership, roles e preferências do espaço.
- `ledger`: dinheiro, contas, transações, transferências, postings, estornos.
- `cards`: cartões, ciclos, compras, parcelamento e faturas.
- `planning`: orçamentos, metas, recorrências, compromissos, cenários.
- `receivables-payables`: títulos, contraparte, liquidações e aging.
- `business-management`: centros de custo, projetos e DRE gerencial.
- `reporting`: métricas, queries, exports e drill-down.
- `imports-reconciliation`: parser, batches, matches e sessões.
- `audit-recovery`: audit events, backups, migrations e restore.
- `assistant-ai`: contexto, tools, proposals, provider adapter e evals.
- `integrations`: Open Finance, OCR, notificações e calendário.
- `platform-adapters`: browser storage, desktop storage, API e filesystem controlado.

Organizar pastas com fronteiras reconhecíveis e imports direcionais. Não é obrigatório criar monorepo/pacotes independentes na primeira refatoração; separar apenas quando boundaries e testes sustentarem.

## 48. Sincronização local/cloud

### 48.1 Requisitos

Outbox persistente; cursor de servidor; idempotency key por mutação; versionamento otimista; tombstones; retry exponencial limitado com jitter; limites por lote; observabilidade de sync; status `pending`, `syncing`, `synced`, `conflict`, `failed` com significado claro.

### 48.2 Conflitos

- Dados cadastrais não financeiros podem permitir merge de campos com regra explícita.
- Lançamento financeiro concorrente não pode ser sobrescrito automaticamente por LWW.
- Conflito de valor/data/conta exige apresentar versões e permitir resolução ou criação de ajuste.
- Eventos já conciliados/efetivados requerem regra mais rígida.
- Delete usa tombstone e política de retenção.
- O estado local permanece recuperável mesmo que a sync falhe.

### 48.3 Estados para UI

Mostrar `Neste dispositivo`, `Aguardando sincronização`, `Sincronizado em...`, `Conflito para revisar`, `Falha de sincronização` e motivo. Nunca usar ícone verde de sucesso sem confirmação server-side.

## 49. APIs e modelo de autorização

Cada endpoint verifica identidade, workspace membership, permissão por ação e ownership/escopo do objeto. IDOR deve ser testado. Não confiar em `userId`, `workspaceId`, `role` ou `tenantId` enviados pelo cliente. Operações multi-entidade usam transação de banco. Paginação e filtros não retornam dados de outro tenant.

## 50. Integrações externas

- Open Finance: futuro e condicionado a parceiro/provedor adequado, contrato, jornada de consentimento, controles e revisão jurídica/compliance.
- OCR: provedor avaliado por precisão, retenção, localização de processamento, segurança e contrato.
- IA: provider adapter substituível; dados mínimos; desligável.
- E-mail: serviço transacional para verificação/recuperação/invites quando backend existir.
- Push: opt-in, sem conteúdo financeiro sensível por padrão.
- Pagamento/assinatura do próprio produto: fase comercial posterior, provedor de billing, webhook idempotente e cancelamento claro.

---

# PARTE VIII — SEGURANÇA, PRIVACIDADE E CONFORMIDADE

## 51. Modelo de ameaças

Proteger: identidade, sessão, workspaces, dados financeiros, exportações/backups, documentos, tokens de integração, prompt/conversas de IA, trilha de auditoria, infraestrutura e cadeia de dependências.

Ameaças a modelar: roubo de sessão, credential stuffing, phishing, IDOR, vazamento cross-tenant, XSS, CSRF, SQL injection, SSRF, path traversal, upload malicioso, arquivo gigante/zip bomb, CSV formula injection, adulteração de backup, perda de chave, comprometimento Electron, prompt injection, exfiltração por fornecedor, log leakage, dependência comprometida e abuso de suporte interno.

## 52. Controles mínimos

- HTTPS/TLS para rede e HSTS na Web quando aplicável.
- Senhas com algoritmo de hash atual e parametrização forte (Argon2id ou opção aprovada após análise), salt individual; não criar hash caseiro. Não armazenar senha reversível.
- Verificação de e-mail e recuperação com token aleatório, único, curto prazo, uso único e resposta que não revela existência de conta.
- Rate limit e proteção contra brute force; MFA recomendada/obrigatória para admin e ações sensíveis conforme risco.
- Sessões seguras, expiração, rotação, logout de todos os dispositivos e revogação.
- Cookies `HttpOnly`, `Secure`, `SameSite` quando arquitetura web baseada em cookie; proteção CSRF adequada.
- Autorização server-side em todas as rotas/objetos; testes negativos cross-tenant.
- CSP restritiva, escaping, validação e sanitização contextual; evitar HTML arbitrário.
- IPC allowlist, validação de sender e payload, proteção de navegação e links externos.
- Segredos em secret manager/ambiente seguro; rotação e documentação de acesso.
- Dependências com lockfile, SCA, SBOM, revisão de licença e atualização de segurança.
- Logs estruturados sem senhas, tokens, chaves, conteúdo integral de extrato/IA ou CPF/CNPJ desnecessário.
- Criptografia em trânsito e repouso com gestão de chaves adequada; rotação e plano de recuperação.
- Upload com allowlist de MIME/tamanho, análise de malware, armazenamento fora do webroot, URL temporária e autorização.
- Pentest/revisão independente antes de lançamento público.

## 53. Segurança Electron

- `contextIsolation=true`, `nodeIntegration=false`, sandbox habilitado quando compatível.
- Preload mínimo e API de métodos explícitos; validar argumentos e resultado.
- IPC só com canais enumerados; validar sender, janela, payload e autorização.
- Bloquear popups e navegação externa não aprovada; links externos via shell seguro com allowlist.
- CSP; não habilitar `webSecurity=false`.
- Atualização segura, assinatura do binário, verificação de integridade e rollback.
- Testar Windows 10/11 suportados, caminhos com acentos/espaços, usuário sem privilégio admin, disco cheio, antivírus e remoção.

## 54. LGPD e governança de dados

O produto deve ser desenhado para cumprir a legislação aplicável de proteção de dados, especialmente LGPD, mas este documento não substitui parecer jurídico. Antes do lançamento, definir controlador/operadores, bases legais por finalidade, aviso de privacidade, política de retenção, fluxo de direitos do titular, contratos com fornecedores e processo de incidente.

- Inventário de dados e finalidades (data map/RoPA conforme orientação profissional).
- Minimização e privacidade por padrão.
- Consentimentos separados e revogáveis quando essa for a base adequada; não usar um checkbox genérico para tudo.
- Exportação, correção e exclusão com limites legais/operacionais explicados.
- Retenção por categoria: transações, audit log, attachments, OCR, telemetria, tickets, backups e dados de conta.
- Acesso de suporte temporário e auditável; acesso de emergência deve ser excepcional.
- Avaliação de impacto/risco antes de Open Finance, IA em nuvem e sincronização de dados financeiros.
- Plano de incidente que identifique, contenha, avalie, documente e comunique quando legalmente exigido. Para incidentes com dados pessoais que possam acarretar risco ou dano relevante, observar a Resolução CD/ANPD nº 15/2024: o prazo geral de comunicação à ANPD e aos titulares é de três dias úteis, ressalvados prazos específicos em legislação aplicável. A resolução também exige registro dos incidentes pelo período mínimo nela definido (cinco anos). O responsável por privacidade/jurídico deve validar o enquadramento, o termo inicial, as exceções e as obrigações setoriais em cada caso; o produto deve manter um playbook e evidências de execução.
- Política de backup externo e exclusão de cópias sob controle do usuário.

## 55. Open Finance — condição de entrada

O Razão não deve pedir nem armazenar a senha bancária do usuário. O consentimento deve ocorrer nos canais e fluxos oficiais apropriados. Antes de habilitar o recurso, comprovar:

1. Parceiro/provedor contratado e elegível para o arranjo aplicável.
2. Papel do Razão e limites regulatórios revisados por profissional jurídico/compliance.
3. Instituição transmissora, instituição receptora, dados, finalidade, prazo e status mostrados claramente.
4. Consentimento, autenticação e confirmação no fluxo apropriado; opção de revogação visível.
5. Token seguro no backend, nunca bundle/frontend, com rotação e política de retenção.
6. Logs, monitoramento, retry, reconciliação, rate limit e tratamento de expiração.
7. Importação idempotente, duplicidade, correção e desconexão testadas.
8. Transparência de última sincronização e falhas.

Open Finance é P2/P3, não bloqueio de valor do primeiro lançamento local, salvo decisão comercial futura. Não declarar que o Razão é instituição participante ou iniciador de pagamento sem base factual e regulatória.

## 56. Referenciais de segurança e acessibilidade

- Usar OWASP ASVS **5.0.0 estável** como baseline de verificação Web/API e mapear requisitos aplicáveis por risco.
- Para app móvel nativo futuro, avaliar OWASP MASVS/MASTG no momento da decisão.
- Usar WCAG **2.2 nível AA** como objetivo para jornadas críticas Web; combinar automação com inspeção humana.
- Manter inventário atualizado, pois padrões, guias, legislação e requisitos dos fornecedores podem mudar. Ver referências ao final.

---

# PARTE IX — UX/UI, ACESSIBILIDADE E QUALIDADE DE EXPERIÊNCIA

## 57. Direção visual

- Marca e logo oficiais sem alterações não aprovadas.
- Azul institucional/navy, azul elétrico com moderação, branco, cinza frio; verde/vermelho/âmbar reservados a estados semânticos.
- Nada de neon, glow, glassmorphism, gradientes multicoloridos ou gamificação visual exagerada.
- Tipografia legível, números tabulares em valores e alinhamento decimal.
- Cards com bordas neutras, sombras discretas, radius consistente e espaçamento coerente.
- Ícones consistentes de traço; emoji não deve substituir ícone semântico.
- Gráficos com eixos, unidade, período, legenda, tooltip acessível e alternativa tabular.

## 58. Sistema de design

Criar tokens centralizados para cor, tipografia, espaçamento, radius, sombra, foco, breakpoint, densidade, estados e z-index. Criar componentes compartilhados: Button, Input, Select, DatePicker, MoneyInput, CurrencyDisplay, Modal/Drawer, Toast, Alert, Table, DataGrid, EmptyState, LoadingState, ErrorState, Tabs, FilterBar, ChartFrame, ConfirmDialog, WorkspaceBadge, StatusBadge e AuditTimeline.

Componentes devem ter contrato de props consistente, labels, estados disabled/loading/error, foco e documentação. Não criar variantes visuais ad hoc em cada tela.

## 59. Jornadas responsivas

Validar ao menos: 375×812, 390×844, 768×1024, 1024×768, 1366×768 e 1440×900, além de zoom 200%. O layout deve ser mobile-first para Web, com menu lateral/drawer e navegação inferior apenas quando ajudar; tabela grande deve permitir rolagem ou transformação em cards sem ocultar informação.

- Nenhum botão sob navegação inferior/área segura.
- Modais no celular viram bottom sheet ou tela completa quando necessário.
- Campos monetários sem corte e valores longos com quebra/overflow seguro.
- Gráficos legíveis em mobile; evitar 5 gráficos pequenos sem utilidade.
- Tablet usa grid adaptativo e pode manter navegação lateral compacta.
- Desktop prioriza produtividade, teclado e densidade equilibrada.

## 60. Acessibilidade

- WCAG 2.2 AA como objetivo.
- Navegação integral por teclado; foco visível e ordem lógica.
- Labels vinculados; erros associados ao campo; instruções não dependem de placeholder.
- Contraste suficiente e sem depender apenas de cor.
- Leitor de tela com landmarks, heading hierarchy, nome acessível e anúncios de mudança importantes.
- Modais com foco contido, retorno de foco e Escape quando apropriado.
- Respeitar `prefers-reduced-motion`.
- Zoom 200–400% sem perda de conteúdo/funcionalidade nas jornadas críticas.
- Tamanho de alvo adequado, espaçamento e prevenção de erro em ações financeiras.
- Testar NVDA no Windows e leitores móveis quando plataforma mobile entrar no escopo.

## 61. Conteúdo e microcopy

Escrever em pt-BR natural, direto e sem jargão contábil desnecessário. Termos como saldo atual, disponível, projetado, comprometido, realizado, pendente, pago e conciliado precisam de definição consistente. Sempre informar consequência de ação destrutiva/irreversível. Mensagem de erro deve informar o que ocorreu, o que foi preservado e próximo passo seguro. Evitar “sucesso” quando houve apenas gravação local ou fila pendente.

## 62. Estados de interface

Toda tela precisa considerar: inicial/vazia, carregando, carregada, filtrada sem resultado, validação, salvando, sucesso confirmado, falha recuperável, falha não recuperável, offline, dados desatualizados, conflito, permissão insuficiente e estado degradado. Uma falha de storage nunca é representada por saldo zero.

---

# PARTE X — TESTES, PERFORMANCE E CONFIABILIDADE

## 63. Estratégia de testes

### 63.1 Unitários de domínio

Money, datas, regras de conta, transferências, journal, cartão, fatura, parcela, orçamento, recorrência, forecast, reconciliação, importação, workspace, permissão, backup e sanitização. Sem rede e com tempo/dados controlados.

### 63.2 Property-based e fuzzing

- Soma de splits = valor original.
- Débitos = créditos por journal/currency.
- Idempotência: mesma chave nunca cria duas mutações.
- Transferência preserva patrimônio consolidado antes/depois, exceto taxa/câmbio.
- Fatura não duplica compra no pagamento.
- Parser monetário não produz centavos não inteiros nem valores inesperados.
- Datas válidas e recorrências não geram dia impossível.
- Parser CSV/OFX resiste a arquivo malformado, enorme e caracteres de controle.
- Migrations preservam IDs, referências, contagens e totais.
- Workspace isolation é invariante para cada query/mutation.

### 63.3 Integração

Casos de uso + repositório + banco + transação + audit log + migração. Testar rollback, concorrência, repetição, timeout depois do commit e falhas de snapshot.

### 63.4 Contrato/API

OpenAPI, autenticação, autorização, schema, idempotência, paginação, erro, rate limit, tenant isolation e compatibilidade de versões.

### 63.5 E2E

Playwright (ou solução avaliada) em Chromium real para cadastro PF/PJ, troca de workspace, criação de conta, lançamento, transferência, cartão/fatura, orçamento, recorrência, importação, conciliação, IA, exportação e restore. Electron E2E com fluxo de storage, falha e segurança em ambiente suportado.

### 63.6 Visual e acessibilidade

Screenshots por breakpoint/tema; revisão humana dos diffs; Axe ou similar; teclado; foco; NVDA; zoom; contraste; mobile real/simulador. Snapshot visual não substitui julgamento humano.

### 63.7 Segurança

SAST, SCA, secret scanning, DAST em ambiente de teste, pentest independente, threat model e mapeamento ASVS. Bloquear release com finding crítico/alto sem mitigação formal aprovada.

### 63.8 Resiliência

Offline, reconexão, disco cheio, quota Web, falha de I/O, app fechado durante commit, corrupção, restore, migração, expiração de sessão, provedor indisponível e fila de sync interrompida.

### 63.9 Usabilidade

Testes observados com PF e PJ, diferentes níveis de familiaridade, tarefas essenciais sem tutorial, medição de sucesso/tempo/erros/compreensão. Não usar somente opinião do desenvolvedor.

## 64. Invariantes financeiras de bloqueio

1. Valores registrados e agregados preservam centavos e moeda.
2. Transferência interna não altera receitas/despesas consolidadas.
3. Transferência tem origem e destino consistentes ou rollback integral.
4. Compra no cartão é reconhecida uma vez; pagamento da fatura não cria nova despesa.
5. Estorno reverte efeito sem apagar original e mantém auditoria.
6. Recorrência e importação repetidas são idempotentes.
7. Saldo atual não inclui projeção; projeção não altera saldo real.
8. Split fecha exatamente com o valor pai.
9. Migração mantém IDs, datas, valores, referências e totais esperados.
10. Restore validado mantém consistência do estado e snapshot.
11. Falha de gravação nunca retorna sucesso.
12. Nenhuma consulta retorna dados de outro workspace.
13. Nenhuma IA/tool contorna permissão ou realiza ação proibida.
14. Nenhum item conciliado perde vínculo sem ação auditada.
15. Nenhum arquivo de importação executa código ou fórmula no export sem neutralização.

## 65. Metas de qualidade para Beta/Release

Metas iniciais propostas, sujeitas a recalibração com hardware e amostra documentados:

| Métrica | Meta para liberar Beta público |
|---|---|
| S0/S1 abertos | 0 não resolvidos |
| Fluxos críticos E2E | 100% dos fluxos de liberação |
| Invariantes financeiras | 100% da suíte crítica aprovada |
| Isolamento PF/PJ/tenant | 100% dos testes positivos e negativos aprovados |
| Perda de dados conhecida | 0 casos não resolvidos |
| Backup/restore | 100% dos cenários de teste críticos com resultado verificável |
| Acessibilidade | WCAG 2.2 AA nas jornadas críticas, sem bloqueadores conhecidos |
| Cobertura do domínio de alto risco | Meta inicial ≥90% linhas e ≥85% branches, mais revisão da qualidade dos asserts |
| Performance local | p95 de interação comum abaixo de 200 ms em hardware de referência quando razoável |
| Crash-free sessions | Meta inicial ≥99,5% após amostra suficiente e telemetria opt-in |
| Usabilidade | ≥90% de sucesso sem ajuda em tarefas essenciais na amostra beta definida |

Cobertura não é prova de correção. Toda métrica deve indicar ambiente, método, tamanho de amostra e limitações.

## 66. Performance e escala

- Definir baseline com dados sintéticos de 2k, 10k, 50k e 100k lançamentos.
- Paginar listas; evitar carregar todos registros para telas pequenas.
- Índices por workspace/data/conta/status.
- Virtualização de listas quando medição indicar necessidade.
- Debounce de busca; worker para importação/relatórios grandes.
- Cache derivado com invalidation/versionamento, sem se tornar fonte de verdade.
- Medir cold start, render inicial, busca, importação, backup e restore.
- Limites explícitos de payload, anexos e histórico.
- Não otimizar por impressão antes de perfil de CPU/memória e medição.

---

# PARTE XI — ROADMAP, FASES E CRITÉRIOS DE SAÍDA

## 67. Regra do roadmap

O roadmap é sequencial e orientado a dependências. A versão técnica atual é beta.20. Incrementos seguintes podem seguir `1.22.0-beta.21`, `.22` etc. Datas são planejamento, não promessa. A qualidade prevalece sobre o calendário. Não declarar Alpha/Beta ou 1.0 pela existência de tela ou teste isolado.

## 68. Fase 0 — Auditoria e baseline (continuação imediata)

**Objetivo:** conhecer a base do notebook, fechar o inventário e identificar todos os bloqueadores.

Entregáveis: baseline as-built; mapa de telas e persistência; matriz de mutações; matriz PF/PJ; backlog de risco; mapa de dados; resultado de testes; relatório de dependências; plano de validação manual.

Gate: versão/hash confirmados, riscos P0 conhecidos, nenhum dado sobrescrito, testes reproduzíveis, documentação alinhada. Fase 0 só fecha quando evidências visuais/manuais e critérios antigos/novos forem aprovados.

## 69. Alpha 1 — Fundação e modelo de workspace

**Foco:** separar identidade/workspace, definir domínio canônico e corrigir inconsistências da beta.20.

Entregáveis:
- ADR de identidade, workspace PF/PJ e modo local/online.
- Modelo de dados alvo com workspace scope.
- Migração beta.20 → novo modelo, dry-run, backup, relatório e rollback.
- Contratos de repository/use cases e fronteiras do domínio.
- Matriz de papéis/permissões inicial.
- Corrigir README/versionamento/lockfile/CI e contratos de teste.
- POC de storage local escalável (IndexedDB/Web e SQLite/Desktop) sem migrar tudo ainda.

Gate: workspace isolation provado; migração reproduzível; regressão financeira verde; nenhum acesso cruzado; ADR aprovado.

## 70. Alpha 2 — Cadastro, onboarding, contas e lançamentos

**Foco:** jornada inicial completa PF/PJ e operações do dia a dia.

Entregáveis: cadastro local e/ou online real conforme arquitetura escolhida; criação de workspace; tela de troca segura; contas; categorias; lançamento/edição/estorno; transferência; busca; importação CSV/OFX básica; audit trail; estado vazio e recuperação.

Gate: E2E PF e PJ; isolamento completo; saldos e transferências invariantes; UX validada; nenhuma sessão fake.

## 71. Alpha 3 — Cartões, faturas, orçamento, recorrências e calendário

**Foco:** planejamento financeiro recorrente e dívidas de cartão.

Entregáveis: cartão, ciclos, compra, parcelamento, fatura, pagamento parcial/total, créditos/estornos, orçamento, metas básicas, recorrências, exceções e calendário.

Gate: casos de fechamento/vencimento/parcelamento e duplicidade aprovados; orçamento sem dupla contagem; geração idempotente; teste de usabilidade.

## 72. Alpha 4 — Importação, conciliação, relatórios, títulos PJ e recovery

**Foco:** confiança em histórico, extratos e fluxo de caixa.

Entregáveis: importação robusta; matching; conciliação; relatórios PF; contas a pagar/receber PJ; clientes/fornecedores básicos; backup/restore; portabilidade; política de retenção; histórico/auditoria mais forte.

Gate: importação segura, reconciliação explicável, backups restaurados em ambiente real, dados PJ essenciais e exportação validados.

## 73. Alpha 5 — Hardening, UX e versão candidata interna

**Foco:** qualidade transversal e preparo operacional.

Entregáveis: testes E2E Chromium/Electron, acessibilidade, performance, segurança, privacidade, observabilidade opt-in, suporte, central de ajuda, documentação e Release Candidate interno.

Gate: G1–G9 pré-beta aprovados, 0 S0/S1, riscos residuais aceitos pelo owner, recuperação e rollback ensaiados.

## 74. Beta 1 — Grupo controlado

Convites limitados, dados de teste/uso consciente, feedback, crash reporting opt-in e canal de suporte. Medir ativação, sucesso das tarefas, compreensão dos saldos, problemas de dados, UX e performance. Nenhum recurso demonstrativo pode aparecer como ativo sem rótulo.

Gate: incidentes classificados/resolvidos, taxa de sucesso aceitável, sem vazamento, sem perda conhecida.

## 75. Beta 2 — Correções baseadas em evidência

Ampliar o grupo de usuários somente depois da análise Beta 1. Corrigir atrito de cadastro, PF/PJ, lançamentos, cartões, importação, previsão e acessibilidade. Expandir recursos apenas se houver valor comprovado. Atualizar métricas.

## 76. Beta 3 — Candidato à liberação

Hardening final, revisão externa de segurança, compatibilidade, documentação, suporte, termos/políticas e testes de atualização/restore. Decidir se a versão inicial será local-first desktop, Web online ou combinação explicitamente suportada.

## 77. Release oficial 1.00.0

A versão 1.00.0 só é autorizada depois de todos os gates deste documento, aprovação formal do proprietário e evidências arquivadas. Instalação Windows, assinatura de código, atualização e rollback entram aqui. Open Finance/OCR/IA em nuvem só entram se seus próprios gates específicos estiverem concluídos.

## 78. Pós-lançamento

- 1.01.x: estabilidade, bugs, acessibilidade e pequenas melhorias.
- 1.02.x: relatórios e UX orientados por dados de uso.
- 1.03.x: recursos PJ e colaboração, se validados.
- 1.04.x+: IA responsável, integrações e automações de valor com gates próprios.
- 2.00.0: somente se arquitetura/contratos/experiência exigirem mudança incompatível, com migração multi-versão e rollback.

## 79. Critério de corte de escopo

Se recurso P0 não atingir aceite, adiar data ou reduzir escopo público. Nunca desativar teste, esconder falha, usar mock como substituto, reduzir segurança ou prometer integração indisponível para cumprir calendário. P1/P2 podem ser adiados se a comunicação comercial não os anunciar como disponíveis.

---

# PARTE XII — GOVERNANÇA, OPERAÇÃO E LANÇAMENTO

## 80. Processo de engenharia

- Issue por bug/recurso com problema, escopo, resultado, prioridade, risco, critérios e teste.
- Branch por tarefa; commits pequenos e rastreáveis; PR com checklist.
- Revisão de código para alterações de dinheiro, workspace, auth, persistência, sync e IA.
- Feature flags para recursos experimentais e desligamento seguro quando houver backend.
- Changelog em linguagem de usuário e changelog técnico.
- Tag imutável para release; hash do artefato; schema version; instrução de update/rollback.
- Nunca commitar segredo, backup de usuário, fixture real ou log financeiro.

## 81. Definition of Ready

Item só começa se tem problema explicado, público-alvo/contexto, comportamento esperado, estado atual, risco, dados afetados, dependências, protótipo/fluxo quando necessário e critérios de aceite testáveis. Financeiro deve listar impacto em saldo, fatura, orçamento, projeção, ledger, auditoria e workspace.

## 82. Definition of Done

- Critérios de aceite demonstrados.
- Testes proporcionais ao risco passam.
- Nenhum mock/limitação fica oculto.
- UI validada nos breakpoints relevantes, teclado e acessibilidade aplicável.
- Persistência/migração/backup/audit atualizados quando necessário.
- Segurança e privacidade avaliadas.
- Documentação, help, changelog, versão e matriz de capacidade atualizados.
- Evidências guardadas (logs redigidos, screenshots sem dados reais, relatório de teste).

## 83. Release management

- Lockfile atualizado e reprodutível.
- CI executa lint, typecheck, unit, integration, contract, E2E, SCA, secret scanning e build conforme estágio.
- SBOM e licença das dependências.
- Artefatos assinados e hash publicado.
- Migrações testadas com fixtures da versão suportada.
- Backup pré-update, rollback e plano de recuperação.
- Notas de versão, requisitos mínimos, limitações, política de privacidade e suporte.
- Canal de distribuição e atualização segura.

## 84. Suporte e operação

Central de ajuda para início, contas, lançamentos, faturas, orçamento, previsões, importação, conciliação, backup, restauração, privacidade, modo offline e workspace PF/PJ. Canal de suporte com classificação: dinheiro/saldo, perda de dados, conta/acesso, privacidade/segurança, importação, desempenho e sugestão.

Incidente:

- **S0 crítico:** vazamento, perda/corrupção generalizada, saldo sistematicamente errado, pagamento indevido. Suspender release/feature, conter, preservar evidências e acionar plano de incidente.
- **S1 alto:** erro de fatura/transferência comum, cross-tenant, restore não confiável. Bloquear release e corrigir antes de avançar.
- **S2 médio:** relatório errado em cenário limitado, importação confusa, bloqueio de UX. Corrigir com prazo e orientar usuários.
- **S3 baixo:** visual/microcopy sem efeito financeiro. Backlog de manutenção.

## 85. Observabilidade e métricas operacionais

- Logs estruturados sem dados financeiros sensíveis.
- Métricas de disponibilidade, erros, latência, fila, sync, backup, migration e crash.
- Correlação por request/operation ID, não por valores ou nomes pessoais.
- Alertas de falha real, não notificações em excesso.
- Retenção mínima e acesso limitado.
- Status page se houver serviço online relevante.
- Telemetria de produto opt-in/privacidade-first; coletar eventos de UX sem detalhes de transação.

## 86. Distribuição Windows e desktop

A etapa final deve validar: instalador NSIS, portable se mantido, assinatura de código, publisher, atualização, desinstalação, caminhos, atalhos, ícone e marca, execução sem privilégios excessivos, armazenamento do perfil, `safeStorage`, backup/restauração, antivírus/SmartScreen, compatibilidade, rollback e suporte. O executável não deve embutir credenciais, tokens de backend ou configurações secretas.

## 87. Comercialização e planos

A estratégia de preço não está aprovada neste documento. Antes de implementar monetização, entrevistar usuários, estimar custo de IA/infra/suporte, comparar valor percebido e testar disposição a pagar. Se houver planos:

- Definir claramente gratuito/pago, limites, recursos e exportação.
- Nunca bloquear acesso do usuário aos dados financeiros próprios por cancelamento.
- Cobrança recorrente via provedor seguro e webhook idempotente.
- Cancelamento, reembolso e mudança de plano claros.
- Não coletar cartão completo nos servidores do Razão.
- Política comercial e termos revisados.

---

# PARTE XIII — MATRIZES DE ACEITE, RISCOS E DECISÕES

## 88. Matriz de prioridade

| Prioridade | Definição | Exemplo | Regra de release |
|---|---|---|---|
| P0 / bloqueador | Integridade, segurança, acesso, dinheiro, recuperação ou jornada essencial. | Workspace leak, saldo errado, fatura duplicada, restore que perde dados. | Não liberar com P0 aberto. |
| P1 / essencial | Valor principal e confiabilidade importante, sem bloquear o núcleo mínimo quando ausente. | Relatório avançado, metas, títulos PJ completos. | Só anunciar se implementado e validado. |
| P2 / expansão | Integração/automação ou recurso com custo/risco maior. | Open Finance, LLM em nuvem, OCR visual, sync multi-dispositivo. | Requer gate específico e validação externa. |
| P3 / hipótese | Ideia sem evidência suficiente de valor. | Marketplace, consultoria, automações autônomas. | Não implementar sem pesquisa e ADR. |

## 89. Riscos conhecidos e mitigação

| Risco | Impacto | Mitigação obrigatória |
|---|---|---|
| PF/PJ apenas visual | Vazamento/contaminação de dados | Workspaces com boundary em cada camada e testes negativos. |
| Backend mockado | Falsa promessa e perda de dados | Bloquear rotas de produção até serviço real; status transparente. |
| Outbox e LWW | Sobrescrita de finanças | Protocolo de sync com conflitos explícitos/idempotência. |
| LocalStorage Web | Quota, falta de cifragem, perda por limpeza | IndexedDB e backup; explicar modo local. |
| Storage Electron | Dependência de SO/segredo | Testes no Windows, recovery e documentação. |
| Migração histórica | Dado perdido ou referência cruzada | Backup, dry-run, mapeamento, idempotência e rollback. |
| Fatura/transferência | Dupla contagem/erro de saldo | Ledger invariants, integração e testes de corrida. |
| Forecast heurístico | Confiança falsa | Premissas visíveis, calibração e baseline conservador. |
| IA | Alucinação/vazamento/ação indevida | Tools limitadas, contexto por workspace, confirmação e evals. |
| OCR | Valor/data errados | Preview por campo, confidence e revisão humana. |
| Open Finance | Risco regulatório/segurança | Provedor/parceiro, consentimento, contrato e compliance. |
| Sem lockfile | Build não reproduzível/supply chain | Gerar e commitar lockfile com revisão. |
| App monolítico | Regressão e manutenção difícil | Refatorar por módulos/casos de uso e testes. |
| UX não validada | Abandono/erro do usuário | Testes em dispositivos, usabilidade e WCAG. |
| Suporte/incident response ausente | Risco operacional | Runbooks, contato, classificação e comunicação. |

## 90. Registro de decisões arquiteturais (ADRs)

O agente deve criar/atualizar ADR numerado para decisões estruturais. Decisões iniciais:

- `ADR-001`: Local-first e modos local/online.
- `ADR-002`: Modelo User / Workspace / Membership e separação PF/PJ.
- `ADR-003`: Storage canônico Web e Desktop.
- `ADR-004`: Modelo financeiro/ledger e estratégia de migração.
- `ADR-005`: Backend modular monolith, PostgreSQL e API.
- `ADR-006`: Estratégia de sync e resolução de conflitos.
- `ADR-007`: IA provider adapter, ferramentas e limites.
- `ADR-008`: Open Finance e escolha de provedor.
- `ADR-009`: Upload/anexos/OCR e retenção.
- `ADR-010`: Telemetria, observabilidade e privacidade.
- `ADR-011`: Estratégia de versionamento e release.
- `ADR-012`: Monetização/planos quando houver dados de mercado.

Cada ADR inclui status (`PROPOSED`, `ACCEPTED`, `REJECTED`, `SUPERSEDED`), contexto, alternativas, decisão, consequências, segurança, migração e data.

## 91. Decisões de produto ainda abertas

Claude Code não deve inventar respostas para estas questões; pode pesquisar, simular e recomendar:

1. Quais plataformas terão suporte oficial 1.0: Windows desktop, Web online, Web local, PWA/mobile.
2. Se o primeiro cadastro será totalmente online ou se o modo local será a experiência primária com vinculação posterior.
3. Política comercial, planos, preço e limites do uso de IA.
4. Provedor de identidade e framework backend final.
5. Provedor de Open Finance e eventual parceria.
6. Provedor de IA/OCR, regiões, retenção e custos.
7. Necessidade e prioridade de compartilhar workspace PF familiar.
8. Quais indicadores PJ/DRE entram na 1.0 e quais exigem contador como consultor.
9. Política de telemetria opt-in, crash reports e suporte remoto.
10. Escopo de patrimônio/investimentos e fontes de cotação.

Para cada questão, produzir recomendação com custo, risco, benefício, dependências e efeito sobre prazo, aguardando aprovação quando a escolha alterar comportamento de produto, custos recorrentes ou risco regulatório.

---

# PARTE XIV — PLAYBOOK DE EXECUÇÃO PARA O CLAUDE CODE

## 92. Primeira sessão: entregáveis obrigatórios

Não iniciar por uma implementação grande. A primeira sessão deve:

1. Confirmar repo, branch, versão, commit, árvore suja e hash do package.
2. Verificar se o notebook já tem versão posterior à beta.20. Se sim, preservar e atualizar o baseline deste plano com evidências; nunca substituir por ZIP antigo.
3. Ler o `package.json`, atualizar mapa de scripts e reconhecer as versões de runtime.
4. Executar `npm test` no ambiente do proprietário; registrar logs redigidos.
5. Validar lockfile e dependências; não rodar atualização indiscriminada.
6. Inspecionar e registrar as 20 jornadas críticas existentes/planejadas.
7. Mapear PF/PJ atual e desenhar `User/Workspace/Membership` com migração.
8. Criar `docs/PROJECT_STATUS.md`, `docs/audit/BASELINE_AS_BUILT.md`, `docs/architecture/CONTEXT_MAP.md`, `docs/risks/RISK_REGISTER.md` e ADRs iniciais.
9. Apresentar backlog ordenado por P0/P1/P2/P3, com critérios e dependências.
10. Esperar o próximo escopo operacional; não tentar entregar o aplicativo inteiro na primeira sessão.

## 93. Plano de documentação que o repositório deve manter

- `CLAUDE.md` — instruções curtas e ligação a este plano.
- `docs/PLANO_MESTRE_O_RAZAO_V2.0.md` — cópia normativa integral do plano.
- `docs/PROJECT_STATUS.md` — versão, fase, releases, bloqueios e estado atualizado.
- `docs/PRODUCT/REQUIREMENTS.md` — requisitos com IDs e aceite.
- `docs/PRODUCT/DECISIONS.md` — decisões de produto.
- `docs/architecture/` — C4/context map, container, componentes, dados e sequência.
- `docs/adr/` — decisões técnicas numeradas.
- `docs/data/` — modelo lógico, dicionário, migrations e retenção.
- `docs/security/` — threat model, ASVS mapping, incident response, secrets.
- `docs/privacy/` — data map, finalidades, retenção, fornecedores e direitos.
- `docs/QA/` — estratégia de testes, fixtures, execução, evidências, E2E e acessibilidade.
- `docs/operations/` — deploy, suporte, runbooks, rollback e status.
- `docs/releases/` — release checklist, changelog e hashes.
- `docs/AI/` — tools, política, dataset de avaliação, prompts versionados e relatórios.

## 94. Padrão de issue para Claude Code

**Título:** `[DOMÍNIO] ação + resultado`  
**Estado atual:** arquivo/função/teste/evidência  
**Problema:** impacto para usuário  
**Resultado esperado:** comportamento observável  
**Escopo:** incluído/excluído  
**Risco:** dinheiro/dados/segurança/PF-PJ/IA/performance  
**Dados/migrations:** entidades e schema afetados  
**Critérios de aceite:** lista verificável  
**Testes:** unitário/integração/E2E/segurança/a11y  
**Rollback:** como reverter  
**Evidências:** logs/screenshot/relatório  
**Documentação:** arquivos a atualizar

## 95. Checklist antes de cada release

- [ ] Versão e changelog corretos.
- [ ] Git limpo ou alterações identificadas; commit/tag correspondente.
- [ ] Lockfile reproduzível e SCA sem vulnerabilidade crítica/alta não tratada.
- [ ] `npm test`, build, typecheck/lint (quando existentes) e E2E com resultado documentado.
- [ ] Migrar cópia de todas as versões ainda suportadas e restaurar backup.
- [ ] Invariantes financeiros e isolamento PF/PJ/tenant aprovados.
- [ ] UX revisada em breakpoints, teclado, leitor de tela e zoom.
- [ ] Threat model e segurança atualizados; segredos não presentes.
- [ ] Open Finance/IA/OCR/SYNC rotulados conforme estado real.
- [ ] Suporte, política de privacidade, termos e release notes atualizados.
- [ ] Hash e assinatura de artefatos, rollback testado.
- [ ] Aprovação formal dos gates e riscos residuais.

---

# PARTE XV — AUDITORIA DO PRÓPRIO DOCUMENTO E DEFINIÇÃO DE SUCESSO

## 96. Auditoria de abrangência do plano

Esta revisão verifica se o documento cobre as áreas que um produto financeiro profissional precisa planejar. A auditoria não é certificação de que o software já implementa os itens.

| Área auditada | Cobertura neste documento | Evidência/ seção |
|---|---|---|
| Visão, posicionamento e promessa | Completa em nível de plano | 1–6 |
| Público PF/PJ e jornadas | Completa em nível de produto | 3, 11–12 |
| Cadastro e identidade | Detalhada; implementação pendente | 11 |
| Isolamento multi-tenant | Detalhado em UI/domínio/API/banco/IA/export | 11.6 |
| Funcionalidades PF | Catálogo funcional e regras | 13–20, 23–30 |
| Funcionalidades PJ | Financeiro operacional, recebíveis, pagáveis, DRE gerencial e equipe | 13, 21–22 |
| IA e ferramentas | Arquitetura, casos, permissões, privacidade, evals | 36–43 |
| OCR | Pipeline, confiança, confirmação e retenção | 43 |
| Open Finance | Condições regulatórias/técnicas e consentimento | 55 |
| Modelo financeiro | Dinheiro, datas, ledger, idempotência, previsões | 33–35 |
| Modelo de dados | Entidades e integridade | 34 |
| Frontend/backend/desktop/storage | Camadas e stack | 44–50 |
| Sync e conflitos | Outbox, idempotência, conflitos | 48 |
| Segurança | Threat model, auth, Electron, API, supply chain | 51–53 |
| LGPD/privacidade | Finalidades, direitos, retenção e incidentes | 54 |
| UX/UI e marca | Tokens, jornadas, estados e microcopy | 57–62 |
| Acessibilidade | WCAG 2.2 AA, teclado, leitor e zoom | 60 |
| QA | Unit, property, integração, API, E2E, visual, segurança e resiliência | 63–66 |
| Performance/escala | Cenários e medição | 66 |
| DevOps/CI/CD/release | Lockfile, SCA, SBOM, assinatura, rollback | 80, 83, 86 |
| Operação e suporte | Runbooks, incidentes, observabilidade | 84–85 |
| Roadmap | Alpha 1–5, Beta 1–3, 1.0 e pós-lançamento | 67–79 |
| Governança | DoR, DoD, ADR, issues e release checklist | 80–95 |
| Monetização | Planejada sem decisão arbitrária | 87, 91 |
| Riscos e decisões em aberto | Matriz e decisões | 89–91 |

## 97. Limites desta auditoria

- “Abrangência” significa que o plano define escopo, diretrizes, dependências e/ou critérios; não prova implementação.
- A avaliação jurídica e regulatória precisa ser atualizada por profissional competente antes de cada integração/lançamento aplicável.
- Provedores, custos, regras bancárias, APIs, frameworks, versões e preços mudam. Claude Code deve verificar fontes oficiais e datas antes de escolher fornecedor ou versão.
- O plano não substitui pesquisa com usuários nem decisão comercial do proprietário.
- Sistemas de finanças possuem riscos residuais; o objetivo é reduzir, detectar, conter e recuperar, não prometer risco zero.

## 98. Parecer da auditoria do documento

**Parecer:** o plano cobre as principais regiões necessárias para conduzir o O Razão de uma base beta local para um produto profissional: estratégia, PF/PJ, funcionalidades, domínio financeiro, arquitetura, persistência, sincronização, IA, OCR, Open Finance, segurança, privacidade, UX, acessibilidade, QA, performance, release, suporte, comercialização e governança. Os maiores itens ainda dependentes de decisão do proprietário estão isolados em seção própria. A maior obrigação imediata do agente é provar o estado real do notebook e transformar o plano em backlog executável, sem tentar implementar tudo de uma vez.

## 99. Definição de sucesso do O Razão

O Razão terá sucesso quando uma pessoa ou pequeno negócio conseguir usar o produto para entender suas finanças sem depender de promessas vagas, quando dados PF e PJ estiverem realmente isolados, quando cada número puder ser explicado, quando as ações forem previsíveis e reversíveis, quando a IA agregar valor sem assumir o controle e quando o produto puder ser atualizado, suportado e recuperado com segurança. O lançamento oficial será consequência de evidências, não de pressa.

---

# REFERÊNCIAS OFICIAIS E FONTES PARA REVALIDAÇÃO

As referências abaixo orientam o trabalho técnico/jurídico. Devem ser revisitadas na data de implementação, pois podem mudar.

1. **OWASP Application Security Verification Standard (ASVS) 5.0.0** — versão estável; usar para mapear controles Web/API aplicáveis. [Portal oficial do ASVS](https://asvs.owasp.org/) e [página do projeto OWASP](https://owasp.org/www-project-application-security-verification-standard/).
2. **OWASP ASVS releases** — distinguir release estável de versão “bleeding edge”. [Histórico oficial de releases](https://github.com/OWASP/ASVS/releases).
3. **W3C Web Content Accessibility Guidelines (WCAG) 2.2** — Recommendation de 12/12/2024; usar nível AA como meta de produto. [Recomendação oficial WCAG 2.2](https://www.w3.org/TR/WCAG22/).
4. **Banco Central do Brasil — Open Finance FAQ** — compartilhamento exige autorização/consentimento e pode ser cancelado; revisar páginas atualizadas do BCB antes de integrar. [Perguntas frequentes oficiais](https://www.bcb.gov.br/meubc/faqs/s/open-finance).
5. **Banco Central do Brasil — como levar dados de um banco para outro** — passos de autorização, autenticação, confirmação e cancelamento. [Orientação oficial do BCB](https://www.bcb.gov.br/meubc/faqs/p/como-levar-seus-dados-de-um-banco-para-outro).
6. **Banco Central do Brasil — cliente Open Finance** — explicação do fluxo de compartilhamento e papéis. [Informações oficiais para clientes](https://www.bcb.gov.br/estabilidadefinanceira/cliente-open-finance).
7. **ANPD — Comunicação de Incidente de Segurança** — critérios e processo de comunicação devem ser validados conforme norma vigente. [Orientações oficiais da ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis).
8. **Lei nº 13.709/2018 (LGPD)** — consultar texto oficial consolidado e normativos ANPD vigentes antes de lançar serviços. [Texto oficial da LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).

**Data da revisão destas fontes:** 02/11/2026. A presença de uma referência não constitui parecer jurídico, certificação ou declaração de conformidade.
