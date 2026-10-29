# Histórico — O Razão v1.5-beta.1 (numeração anterior: v17.5-beta.1)

## Fase 5 — Livro-razão e auditoria de consistência

- Adicionado `src/domain/ledger.js` como camada de domínio para validação de lançamentos, impacto por conta e auditoria de consistência.
- `accountBalance` agora delega o cálculo à camada de livro-razão.
- Transferências com `type: transferencia` debitam a conta de origem e creditam a conta de destino como um único evento.
- Lançamentos pendentes e cancelados não alteram o saldo realizado.
- Adicionados 13 testes dedicados e incluídos no `npm test`.
- Versão do pacote atualizada para `1.5.0-beta.1`.

## Validação local
- `npm test`: passou — 101 verificações da suíte principal, 15 verificações estáticas desktop, 9 verificações de persistência e 13 verificações do livro-razão.
- `npm run build`: não validado nesta etapa; depende de instalar as dependências de desenvolvimento (Vite).

## Importante
Esta versão continua sendo beta de desenvolvimento. O novo módulo de livro-razão é uma camada de domínio; as telas e todos os fluxos ainda precisam de testes E2E e integração completa antes de ser considerado pronto para uso financeiro em produção.
