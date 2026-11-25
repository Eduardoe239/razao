# O Razão — instruções para o Claude Code

## 1. Estado atual (atualizado em 25/11/2026)

- **Fase:** Alpha 1 em andamento (D-040), no branch `alpha1`. A `main` só recebe o app novo no fim da Alpha 1, pelo merge do proprietário.
- **Baseline documental aprovada** (D-039). O plano da Alpha 1 está em `../razao-docs/planos/alpha1-plano-tecnico.md`.
- **A base histórica** (`1.22.0-beta.20` + 21.1 + 21.2) saiu da árvore de trabalho e continua inteira nas tags `v1.22.0-beta.20` e `base-historica-21.2`. Para reaproveitar um módulo antigo, leia-o com `git show base-historica-21.2:<caminho>`; não restaure a base.

## 2. Onde está a documentação

- Toda a documentação fica no repositório **privado** `razao-docs` (D-021), na pasta irmã `../razao-docs`. Leia primeiro `../razao-docs/README.md` e `../razao-docs/PROJECT_STATUS.md`. Se a pasta não estiver acessível, **pare e peça ao proprietário**.
- Ordem de precedência: (1) instrução explícita do proprietário na tarefa atual; (2) `../razao-docs/PRODUCT/DECISIONS.md`; (3) volumes do Plano Mestre V3.0 em `../razao-docs/plano-v3/` (os Markdown são a versão oficial, D-039); (4) ADRs aceitos; (5) estado real do código e dos testes.

## 3. Git (D-021, D-022)

- **Somente o proprietário faz commit, push, merge e tag.** Prepare as alterações na árvore de trabalho e entregue a lista de arquivos, o resumo e a mensagem de commit sugerida.
- Nunca execute `reset`, `clean`, `checkout`/`switch` destrutivo, `rebase`, `pull` ou `stash` sem pedido explícito. Preserve alterações locais.
- Este repositório guarda **somente** código, configuração, `README.md`, `CLAUDE.md` e `LICENSE`. Nenhum documento de projeto, relatório, dado real, `.env`, chave ou credencial. Relatórios gerados (como o rastreio) vão para o `razao-docs`.

## 4. Aprovações (D-019)

Um "aprovado" do proprietário na conversa vale como aprovação. Registre a decisão em `../razao-docs/PRODUCT/DECISIONS.md` com data e ID. Proposta não é decisão.

## 5. Arquitetura (Volume 06)

- Camadas em `src/`: `domain` (puro, sem pacotes externos, sem relógio nem sorteio), `application` (casos de uso), `infra` (IndexedDB, cripto, arquivos), `ai` (Razão IA) e `ui` (React). A raiz `src/main.tsx` monta o app.
- As fronteiras são verificadas pela regra local `eslint/camadas.mjs`: a interface só fala com `application`; o domínio não importa ninguém.
- Arquivos com no máximo 400 linhas. TypeScript estrito, sem `any`.
- Proibidos `eval`, `new Function`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` e `dangerouslySetInnerHTML` (SEC-04).
- Nenhum recurso de terceiros em tempo de execução (SEC-03): fontes, ícones e bibliotecas vão empacotados.

## 6. Testes e rastreio

- Todo teste começa o título com o ID do requisito que cobre: `it('[CON-004] transferência não muda o patrimônio', …)`. O `npm run rastreio` monta o rastreio da fase e falha com ID inexistente; `npm run rastreio -- --portao` também falha com requisito "Deve" sem teste.
- Depois de mudar o Volume 03, rode `npm run rastreio:sync`.
- Antes de entregar: `npm run verify` (tipos, lint, formato, testes com cobertura, build e verificações). Os testes ponta a ponta rodam com `npm run e2e` e na CI nos três motores.
- Cobertura mínima de 95% de linhas em `src/domain`. Invariantes com testes de propriedade (pelo menos 1.000 casos cada).

## 7. Regras de produto e engenharia (inegociáveis)

- Dinheiro em centavos inteiros com moeda explícita; nunca `float` em soma financeira.
- Saldo é derivado de lançamentos; projeção nunca altera saldo realizado.
- PF e PJ são espaços isolados em todas as camadas; um seletor visual não é controle de segurança.
- Transferência e pagamento de fatura nunca contam em dobro; toda mutação crítica é atômica, idempotente e auditável.
- Falha de leitura, gravação ou recuperação nunca vira estado vazio nem mensagem de sucesso.
- A Razão IA explica e propõe; o motor determinístico calcula; a IA nunca move dinheiro.
- Nenhum dado financeiro real em testes, logs, prompts, fixtures ou capturas de tela.
- Não marque como pronto o que é mock, demonstração ou teste isolado.
- Interface em português do Brasil, com o design system aprovado (D-035) e a logo oficial.

## 8. Skills

As skills `razao-*` (v1.1, D-038) estão instaladas na conta Claude do proprietário; fonte em `../razao-docs/skills/`. Use uma principal e no máximo duas complementares.

## 9. Formato de toda entrega

Objetivo e escopo (com IDs) · estado atual com evidência · arquivos afetados · riscos sobre dinheiro, PF/PJ, segurança e dados · testes executados com resultado real · pendências · classificação `DONE`, `PARTIAL` ou `BLOCKED`.
