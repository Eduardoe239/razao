# O Razão — v1.10.0-beta.1

## Conciliação de extratos e integridade de importação

- Reconciliação agora valida data real de calendário, descrição, valor inteiro positivo em centavos e tipo aceito.
- FITIDs repetidos no próprio arquivo e IDs já presentes na conta são detectados antes de inserir novos lançamentos.
- Matching usa conta (quando disponível), valor, tipo, proximidade de data e similaridade de descrição. Correspondências por valor/data/descrição vão para revisão manual em vez de serem bloqueadas automaticamente; somente ID exato do extrato é classificado como duplicata certa.
- Ao confirmar um match contra uma transação pendente, a aplicação marca o registro existente como pago e vincula o ID importado; não cria uma transação adicional. O estado é revalidado no momento da aplicação.
- Duplicatas confirmadas e dados inválidos não podem ser selecionados na revisão. Propostas de baixa pendente que ficaram obsoletas são ignoradas.
- Origem `ofx`, `csv`, `ocr` e `open_finance_demo` passa a ser preservada pela sanitização.
- A UI descreve explicitamente o fluxo bancário como demonstração local usando dados sintéticos, sem conexão bancária real.
- Nova suíte `scripts/test-reconciliation.mjs`: 23 verificações específicas para os cenários descritos.

## Validação

- `npm test`: suites locais de domínio, persistência/segurança estática, painel, pagamento de fatura e reconciliação aprovadas.
- A suíte não substitui testes E2E. A compilação Vite e o instalador Electron/Windows não foram validados nesta etapa.
