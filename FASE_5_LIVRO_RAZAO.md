# Fase 5 — Livro-razão e auditoria de consistência (v1.5-beta.1 (numeração anterior: 17.5-beta.1))

## Objetivo
Introduzir uma camada de domínio explícita para validar eventos financeiros, calcular impacto por conta e detectar inconsistências estruturais antes de confiar nos saldos apresentados.

## Implementado
- `src/domain/ledger.js`: validação de transações, impacto de cada evento em conta, extrato determinístico e auditoria de identificadores/contas referenciadas.
- Transferências modeladas como um único evento com débito na origem e crédito no destino.
- Estados `pendente` e `cancelado` não alteram saldo realizado.
- Valores precisam ser centavos inteiros positivos e seguros para JavaScript.
- `src/domain/ledger.test.js` e `scripts/test-ledger.mjs`: testes dedicados adicionados ao comando `npm test`.

## Limites e decisões ainda pendentes
- O módulo é uma camada de domínio nova; não substitui automaticamente todos os cálculos já existentes na interface. A integração ponta a ponta precisa ser feita com testes de regressão antes de trocar todas as fontes de saldo.
- Cartões de crédito exigem um subledger próprio para compras, estornos, parcelamentos, faturas e liquidações; não se deve representar uma compra no cartão como débito imediato de conta bancária.
- Ajustes de saldo, conciliação bancária e lançamentos importados precisam de política de idempotência e trilha de auditoria.
- Não declarar beta público nem segurança de produção até testes de integração/E2E, build real, recuperação de backup e revisão de segurança.

## Execução
`npm test` executa a suíte anterior e a suíte nova do livro-razão. A suíte nova pode ser executada isoladamente com `node scripts/test-ledger.mjs`.
