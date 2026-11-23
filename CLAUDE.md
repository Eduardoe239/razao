# O Razão — instruções para o Claude Code

## 1. Estado atual (atualizado em 23/11/2026)

- **Fase:** refundação documental. O Plano Mestre V3.0 está sendo escrito em volumes; o Volume 01 (conceito e decisões fundamentais) foi aprovado (D-028).
- **Nenhuma implementação de produto** começa antes de todos os volumes do V3 estarem aprovados pelo proprietário.
- **O código deste repositório é a base histórica** (`1.22.0-beta.20` + subincrementos 21.1 e 21.2). Ele está **congelado como referência**: a aplicação será recomeçada como PWA em TypeScript, reaproveitando domínio e testes (D-028). Não corrija bugs nem inicie a 21.3 nesta base.

## 2. Onde está a documentação

- Toda a documentação fica no repositório **privado** `razao-docs` (D-021). No notebook, ele é a pasta irmã `../razao-docs`.
- Leia primeiro `../razao-docs/README.md`. Se a pasta não estiver acessível, **pare e peça ao proprietário**; não trabalhe às cegas.
- Ordem de precedência: (1) instrução explícita do proprietário na tarefa atual; (2) `../razao-docs/PRODUCT/DECISIONS.md`; (3) volumes aprovados do Plano Mestre V3.0 em `../razao-docs/plano-v3/`; (4) ADRs aceitos; (5) estado real do código e dos testes.
- O Plano Mestre V2.0 está **superado** e arquivado. Use-o só como fonte histórica.
- Estado vivo: `../razao-docs/PROJECT_STATUS.md`. Riscos: `../razao-docs/risks/RISK_REGISTER.md`.

## 3. Git (D-021, D-022)

- **Somente o proprietário faz commit, push, merge e tag.** Você prepara as alterações na árvore de trabalho e entrega: lista de arquivos alterados, resumo e mensagem de commit sugerida.
- Nunca execute `reset`, `clean`, `checkout`/`switch` destrutivo, `rebase` ou `stash` sem pedido explícito. Preserve alterações locais.
- Este repositório guarda **somente** código, configuração, `README.md`, `CLAUDE.md` e `LICENSE`. Nenhum documento de projeto, relatório, evidência, dado real, `.env`, chave ou credencial.

## 4. Aprovações (D-019)

- Um "aprovado" do proprietário na conversa vale como aprovação. Registre a decisão em `../razao-docs/PRODUCT/DECISIONS.md` com data e ID.
- Proposta não é decisão: tudo que não foi aprovado fica marcado como `PROPOSTA`.

## 5. Regras de produto e engenharia (inegociáveis)

- Dinheiro em centavos inteiros com moeda explícita; nunca `float` em soma financeira.
- Saldo é derivado de lançamentos; projeção nunca altera saldo realizado.
- PF e PJ são workspaces isolados em todas as camadas; um seletor visual não é controle de segurança.
- Transferência e pagamento de fatura nunca contam em dobro; toda mutação crítica é atômica, idempotente e auditável.
- Falha de leitura, gravação ou recuperação nunca vira estado vazio nem mensagem de sucesso.
- A Razão IA explica e propõe; o motor determinístico calcula; ações sensíveis exigem confirmação do usuário. A IA nunca move dinheiro.
- Nenhum dado financeiro real em testes, logs, prompts, fixtures ou capturas de tela.
- Não marque como pronto o que é mock, demonstração ou teste isolado. Classifique com honestidade.
- Preserve a logo oficial e a direção visual sóbria azul/branco/cinza; nada de neon, glow ou gradientes chamativos.
- Interface em português do Brasil, com datas e valores localizados.

## 6. Skills

As skills `razao-*` estão instaladas na conta Claude do proprietário (fonte versionada em `../razao-docs/skills/`). Use uma skill principal e no máximo duas complementares. Skills complementam este arquivo e o Plano; nunca o substituem.

## 7. Formato de toda entrega

Objetivo e escopo · estado atual com evidência (arquivo, função, teste) · arquivos afetados · riscos sobre dinheiro, PF/PJ, segurança e dados · testes executados com resultado real · pendências e limitações · classificação final `DONE`, `PARTIAL` ou `BLOCKED`.
