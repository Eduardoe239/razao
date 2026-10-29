# Fase 6 — Integração do livro-razão (v1.6.0-beta.1)

## Objetivo

Garantir que a quitação de uma fatura seja registrada como liquidação entre a conta bancária de origem e a conta do cartão, e não como uma nova despesa.

## Alterações

- Exige conta de origem real cadastrada.
- Registra `accountId` e `toAccountId` na transferência.
- Associa o evento ao `linkedInvoiceKey` para que o cálculo da fatura reconheça a liquidação.
- Bloqueia o caso já quitado e revalida a soma paga no estado mais recente antes de inserir o evento.
- Reinicia a numeração de versão beta para `1.6.0-beta.1`.

## Riscos ainda abertos

O frontend não oferece atomicidade real entre dispositivos ou múltiplas janelas. Para garantir idempotência forte, o pagamento precisa de identificador de operação único e persistência transacional. O livro-razão ainda precisa governar todas as telas e ser validado por testes E2E.
