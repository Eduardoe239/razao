# O Razão — Changelog v1.9.0-beta.1

## Pagamentos de faturas e integridade

- Criado `src/domain/invoicePayment.js` com validação de fatura, valor inteiro em centavos, conta de origem existente, saldo disponível, data real, ID único e chave de idempotência por fatura/saldo.
- O pagamento de fatura não escolhe silenciosamente a primeira conta quando há várias; a pessoa seleciona a conta de origem.
- A validação é repetida contra o estado financeiro mais recente antes de incluir o lançamento.
- A chave de idempotência impede reenvio idêntico no estado local; não é uma garantia transacional de backend.
- `cardInvoices` agora conta pagamentos apenas no cartão identificado pela fatura, usando `linkedCardId` ou o `toAccountId` legado.
- `sanitizeTransaction` preserva `linkedInvoiceKey`, `linkedCardId`, `idempotencyKey`, `profileType`, `importedId` e status `cancelado` ao importar/hidratar estado. Isso corrige a perda dos vínculos após recarregar o app.
- `auditLedger` pode aceitar IDs de cartões como destinos virtuais de transferências, sem considerá-los contas para cálculo de saldo.
- Adicionado `scripts/test-invoice-payment.mjs` para validar saldo insuficiente, conta inexistente, fatura quitada/desatualizada, data inválida, repetição da operação, isolamento entre cartões e persistência dos metadados.

## Verificação

- `npm test`: aprovado; 101 verificações de domínio na suíte principal, 15 verificações estáticas de segurança desktop, 9 de persistência, 13 do livro-razão, 6 do diagnóstico, 20 do resumo do painel e 20 verificações específicas de pagamentos, isolamento entre cartões e preservação de metadados. Os grupos incluem verificações estáticas e lógica simulada; não são testes E2E da interface.
- Build Vite e instalador Windows continuam sem validação nesta etapa, pois as dependências necessárias não estão disponíveis no ambiente de execução.
- Não existe integração bancária real nesta etapa: a função cria um lançamento local e não envia dinheiro para banco/cartão.
