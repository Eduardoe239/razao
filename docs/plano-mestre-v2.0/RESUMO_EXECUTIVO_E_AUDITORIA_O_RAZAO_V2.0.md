# O Razão — Resumo executivo e auditoria do Plano Mestre V2.0

**Data de referência:** 02/11/2026  
**Documento principal:** `PLANO_MESTRE_O_RAZAO_V2.0.md`  
**Instruções do agente:** `CLAUDE.md`

## 1. O que este plano define

O Plano Mestre V2.0 é a especificação normativa de produto, arquitetura e execução para conduzir O Razão da base técnica v1.22.0-beta.20 até um lançamento oficial 1.00.0. Ele substitui o uso fragmentado do plano anterior como guia operacional: a visão, as decisões, o estado real da beta.20, os módulos, as regras financeiras, IA, arquitetura, segurança, experiência, QA, roadmap e governança passam a estar consolidados em uma fonte principal.

O plano tem 15 partes, 99 seções numeradas e aproximadamente 16,4 mil palavras. Não é uma autorização para implementar tudo de uma vez. É um contrato de qualidade e uma ordem de dependências: primeiro provar o estado do notebook, depois corrigir fundações, construir módulos verticais e avançar somente com evidências.

## 2. Visão e diferenciais do produto

O Razão deve ser um gestor financeiro brasileiro para Pessoas Físicas e pequenos negócios, com espaços e experiências próprios para cada contexto. Seu diferencial não é simplesmente “ter mais telas” ou “ter IA”; é entregar:

- Integridade financeira: saldos, faturas e indicadores com origem e regras verificáveis.
- Separação PF/PJ real: espaços independentes em todos os níveis, não apenas um seletor de interface.
- Previsões honestas: realizado, confirmado, recorrente, estimado e hipotético apresentados separadamente.
- Controle e recuperação: histórico, auditoria, exportação, backup, restore e rollback demonstráveis.
- Assistência inteligente responsável: IA interpreta e propõe; o motor determinístico calcula; o usuário confirma ações sensíveis.
- Utilidade offline: o modo local não simula sincronização que não aconteceu.

A marca aprovada e o slogan “SUAS FINANÇAS. COM LÓGICA.” devem ser preservados. A direção visual continua azul institucional, azul elétrico moderado, branco e cinza frio, sem neon, glow ou glassmorphism.

## 3. A decisão mais importante: PF/PJ no cadastro e em workspaces

O fluxo de cadastro/criação deve perguntar qual espaço será criado: PF ou PJ. O modelo deve distinguir identidade do usuário, workspace financeiro e membership/permissão. Um usuário poderá ter mais de um espaço, inclusive PF e PJ, sem misturar dados.

O isolamento deve existir em interface, casos de uso, domínio, storage local, API, banco de dados, relatórios, exportações, IA, backups e suporte. Toda entidade financeira deve pertencer a um `workspaceId`; a API nunca deve confiar em um workspace informado livremente pelo cliente. A migração dos dados antigos da beta.20 precisa ser dry-run, idempotente, transacional, validada e reversível.

## 4. Escopo funcional consolidado

### PF

Dashboard; contas e carteiras; lançamentos, divisões e transferências; categorias e regras; cartões, ciclos, faturas e parcelas; orçamentos; recorrências; compromissos e calendário; metas e reservas; dívidas e financiamentos; patrimônio e investimentos informativos; relatórios; busca; importação; conciliação; auditoria; backup/restore; notificações; preferências; conquistas discretas.

### PJ

Tudo o que for aplicável de contas, movimentos, cartões, orçamento e planejamento, mas em workspace empresarial independente; contas a pagar e receber; clientes e fornecedores; títulos, liquidações, vencimentos e atrasos; centros de custo; projetos; fluxo de caixa; resultado/DRE gerencial; despesas e retiradas do proprietário; papéis e colaboração controlada. O escopo inicial não deve se anunciar como ERP, contabilidade fiscal oficial, folha de pagamento, emissor fiscal universal ou consultoria contábil.

## 5. Motor financeiro e dados

O documento define valores em centavos inteiros com moeda explícita, datas civis separadas de timestamps, uma fonte de verdade, idempotência, concorrência, estados financeiros distintos e trilha de auditoria. A evolução para journal interno balanceado/partidas dobradas é obrigatória como direção arquitetural, porém depende de ADR, prova de equivalência histórica e migração controlada. Compra de cartão não pode ser duplicada quando a fatura é paga; transferências internas não viram receita/despesa consolidada; projeção nunca altera saldo realizado.

## 6. IA, OCR e previsões

A IA do Razão é desenhada em camadas: motor financeiro determinístico, ferramentas de leitura autorizadas, modelo de linguagem opcional, política de segurança e avaliação contínua. Poderá explicar saldos, despesas, faturas, orçamento, tendências e cenários PF/PJ; sugerir classificação; preparar rascunhos de lançamentos, orçamento, recorrência, contas a pagar/receber e lembretes; explicar DRE gerencial; identificar sinais de anomalia.

A IA não pode efetuar pagamentos, transferências, Pix, investimentos, exclusões definitivas, mudanças de workspace/permissão ou revogar consentimentos por texto livre. OCR extrai dados para revisão humana e rascunho; nunca comprova quitação. Prompt injection, minimização de dados, isolamento por workspace, retenção e avaliação por datasets fazem parte da arquitetura.

## 7. Arquitetura, plataformas e integrações

A orientação é preservar e evoluir o projeto atual como monólito modular, com camadas de Presentation, Application, Domain, Ports, Adapters, Backend e Operations. React/Vite e Electron continuam como base, sujeitos a compatibilidade demonstrada. A persistência Web deve migrar de `localStorage` para IndexedDB com plano de migração; no desktop, avaliar SQLite transacional e proteção de chave pelo sistema operacional. Backend de referência: Node/TypeScript, API documentada e PostgreSQL, com framework escolhido por ADR.

Sync cloud exige autenticação, workspaces, autorização, outbox durável, cursores, idempotência e resolução de conflitos; LWW não pode sobrescrever operações financeiras. Open Finance, OCR em nuvem e provedores de IA dependem de fornecedor real, contratos, consentimento, compliance, segurança e gates próprios.

## 8. Segurança, privacidade, UX e qualidade

Inclui threat model, proteção de sessão/credenciais, autorização server-side, testes cross-tenant, proteção Electron/IPC, CSP, gerenciamento de segredos, supply chain, logs redigidos, criptografia, uploads seguros, pentest, LGPD, direitos do titular, retenção e resposta a incidentes. Adota OWASP ASVS 5.0.0 estável como baseline de verificação aplicável e WCAG 2.2 AA para jornadas críticas.

UX/UI cobre design system, responsividade, fluxos PF/PJ, acessibilidade por teclado/leitor de tela, microcopy, estados vazios, carregamento, falha, offline, conflito e dados desatualizados. QA cobre testes unitários, property-based, integração, contratos, E2E Chromium/Electron, visual, acessibilidade, segurança, resiliência e usabilidade.

## 9. Roadmap

- Fase 0: baseline do notebook, inventário, testes, dependências e riscos.
- Alpha 1: fundação e workspace PF/PJ.
- Alpha 2: cadastro, onboarding, contas e lançamentos.
- Alpha 3: cartões, faturas, orçamento, recorrências e calendário.
- Alpha 4: importação, conciliação, relatórios, títulos PJ e recovery.
- Alpha 5: hardening, UX, segurança e RC interna.
- Beta 1: grupo controlado.
- Beta 2: correções por evidência.
- Beta 3: candidato à liberação.
- 1.00.0: lançamento somente com todos os gates, aprovação do proprietário, evidências, distribuição e rollback.
- Pós-lançamento: estabilidade e expansão priorizada por dados de uso.

## 10. Auditoria independente deste plano

### Cobertura avaliada

| Área de desenvolvimento profissional | Avaliação | Onde está contemplada |
|---|---|---|
| Visão, posicionamento e produto | Coberta | Partes I e XI |
| Público PF/PJ e workspaces | Coberta em profundidade | Parte III |
| Catálogo funcional PF | Coberto | Parte IV |
| Catálogo funcional PJ | Coberto, com limites de escopo | Parte IV |
| Regras financeiras, ledger e previsões | Cobertas | Parte V |
| Modelo de dados e integridade | Cobertos em nível conceitual | Parte V |
| IA generativa, ferramentas, guardrails e avaliação | Coberta | Parte VI |
| OCR e anexos | Cobertos | Parte VI e modelo de dados |
| Arquitetura Web/Desktop/Backend | Coberta | Parte VII |
| Persistência local, migrações e sync | Cobertas | Partes V e VII |
| Segurança técnica e Electron | Coberta | Parte VIII |
| LGPD, privacidade e incidentes | Cobertas como requisitos | Parte VIII |
| Open Finance | Condicionado a parceiro e compliance | Parte VIII |
| UX/UI, design system e acessibilidade | Cobertos | Parte IX |
| QA, performance e confiabilidade | Cobertos com gates e metas | Parte X |
| Roadmap e critérios de saída | Cobertos | Parte XI |
| CI/CD, distribuição, operação, suporte e incidentes | Cobertos | Parte XII |
| Monetização | Deliberadamente não decidida | Seções 87 e 91 |
| Gestão de risco e decisões técnicas | Cobertas | Parte XIII |
| Execução orientada ao Claude Code | Coberta | Parte XIV |
| Autoauditoria e definição de sucesso | Incluídas | Parte XV |

### Achados positivos

1. O plano não confunde funcionalidades demonstrativas com recursos de produção.
2. PF/PJ está tratado como fronteira de dados e autorização, não como tema visual.
3. O risco financeiro é tratado por invariantes e testes, não só por cobertura de linhas.
4. A IA tem limites explícitos e não recebe autoridade para transações sensíveis.
5. O roadmap depende de gates, não de datas fixas.
6. A base beta.20 é preservada; reescrita integral exige justificativa e aprovação.
7. Existem decisões em aberto identificadas, evitando que o agente invente preço, provedor, plataforma ou escopo regulatório.

### Limites e riscos residuais

- O plano é uma especificação de produto/engenharia, não substitui pesquisa de usuários, teste de mercado, parecer jurídico/contábil, pentest externo, contratos com fornecedores ou validação regulatória.
- Nem todo campo de cada tela, endpoint, consulta SQL, evento, mensagem de erro e cenário E2E está especificado individualmente. Isso deve ser detalhado em `docs/PRODUCT/REQUIREMENTS.md`, contratos OpenAPI, ADRs e issues durante a Fase 0/Alpha, sem contrariar este plano.
- Provedor de identidade, framework backend, storage local definitivo, IA/OCR, Open Finance, preços, planos, canais de suporte e plataformas da 1.0 permanecem decisões do proprietário após recomendação técnica e comercial.
- A cópia do notebook não foi acessada nesta sessão. O Claude Code deve confirmar branch, commit, hash, alterações e testes nela; a beta.20 deste documento é baseline histórica de referência, não prova da versão atual do notebook.
- O teste automatizado executado na cópia isolada da beta.20 não comprovou build, E2E real, operação Windows, backend de produção nem integrações reais.
- Nenhum documento prevê literalmente todos os cenários futuros. O plano inclui processo obrigatório para transformar lacunas em ADRs, requisitos, testes e decisões controladas.

### Parecer

**Aprovado como guia mestre de desenvolvimento, condicionado à Fase 0 no repositório real do notebook.** Não é certificado de qualidade do software e não autoriza lançamento. A cobertura é ampla e adequada para orientar o trabalho por fases; o primeiro resultado do Claude Code deve ser o baseline as-built, e não uma implementação massiva.

## 11. Decisões que ainda precisam do proprietário

1. Plataformas oficiais da 1.0: Windows desktop, Web online, Web local, PWA/mobile.
2. Cadastro inicial online ou experiência local-first com vinculação posterior.
3. Política comercial, planos, preço e limites do uso de IA.
4. Provedor de identidade e framework backend final.
5. Provedor/parceiro Open Finance e eventual parceria.
6. Provedor de IA/OCR, regiões de processamento, retenção e custos.
7. Compartilhamento de workspace PF familiar.
8. Escopo PJ/DRE que entra na 1.0 e limites de orientação contábil.
9. Política de telemetria opt-in, crash reports e suporte remoto.
10. Escopo de patrimônio/investimentos e fontes de cotação.

O Claude Code deve recomendar alternativas com custo, benefício, risco, dependências e impacto de prazo. Não pode inventar preferências nem efetivar decisões irreversíveis sem aprovação.

## 12. Primeiro comando operacional para Claude Code

Depois de copiar `CLAUDE.md` e `PLANO_MESTRE_O_RAZAO_V2.0.md` para a raiz do repositório do notebook, iniciar pedindo uma auditoria somente de leitura: confirmar branch/commit/status/versão, verificar se a árvore do notebook é a mesma da beta.20, mapear telas/domínio/storage/backend/integrações, executar testes sem alterar sua finalidade, registrar limites reais e produzir backlog P0/P1/P2/P3. Não começar pela reescrita nem pela implementação simultânea das fases.
