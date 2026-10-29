# O Razão v1.6.0-beta.1

## Fase 6 — Integração do livro-razão e segurança no pagamento de faturas

- Reiniciada a numeração pública do beta conforme decisão do produto: a linha `17.5` passa a ser `1.5` e esta entrega é `1.6.0-beta.1`.
- O pagamento de fatura agora exige uma conta de origem cadastrada; foi removido o fallback fictício `acc-1`.
- O pagamento é modelado como transferência da conta bancária para a conta de cartão (`toAccountId`), evitando tratá-lo como uma nova despesa.
- Adicionada uma checagem de fatura já quitada e uma segunda verificação contra o estado mais recente para reduzir o risco de clique duplo.
- A suíte principal passa a identificar a versão pública `1.6`.

## Limitações conhecidas

- A validação de clique duplo no frontend é uma mitigação local, não uma garantia transacional multi-dispositivo. A garantia definitiva exige persistência transacional e chave de idempotência no serviço de domínio/backend.
- O modelo atual ainda requer testes end-to-end para comprovar a conciliação de saldos e o fluxo completo da fatura.
- `npm run build` e o instalador Windows precisam ser validados em ambiente com dependências instaladas.

## Testes executados

- `npm test`: suíte principal, segurança estrutural do desktop, persistência e livro-razão.
- Resultado registrado na entrega: 101 verificações principais, 15 verificações estáticas de desktop, 9 verificações de persistência e 13 verificações do livro-razão aprovadas.
