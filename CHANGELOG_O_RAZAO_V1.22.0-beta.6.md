# O Razão v1.22.0-beta.6

## Escopo

Correção pontual da migração PF/PJ para evitar que uma referência de transferência bancária seja confundida com uma referência a cartão.

## Alterações

- A migração de cartões agora trata `linkedCardId` como referência explícita.
- Para compatibilidade com pagamentos de fatura antigos, `toAccountId` só é tratado como referência a cartão quando o lançamento é uma transferência com `linkedInvoiceKey` e não possui `linkedCardId`.
- Transferências comuns preservam a referência à conta de destino, mesmo que exista um cartão com o mesmo identificador em uma coleção distinta.
- A migração continua repetível e preserva referências conhecidas de pagamentos legados.
- Versão do pacote atualizada para `1.22.0-beta.6`.

## Validação

- Teste direcionado da migração PF/PJ: 18 assertions passaram.
- A suíte completa `npm test` é executada separadamente antes da entrega.
- ZIP de distribuição validado por `unzip -t`.

## Limitações conhecidas

Esta é uma correção de referência de dados, não comprova isolamento contábil/fiscal completo. Permanecem necessárias validações manuais e automatizadas de faturas, transferências, orçamentos, backups históricos, autenticação e sincronização. Não foi executado build nem empacotamento `.exe`, conforme o plano do projeto.
