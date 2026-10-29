# O Razão — v1.22.0-beta.1

## Geração controlada de lançamentos recorrentes

- Compromissos provenientes de recorrências agora oferecem geração individual e em lote de lançamentos reais pendentes.
- Antes da geração em lote, a interface exibe quantidade, total de receitas e despesas e solicita confirmação explícita.
- A geração não efetua pagamentos nem marca transações como pagas; os lançamentos ficam pendentes para revisão.
- Revalida regra ativa, perfil PF/PJ, data, vigência, conta e categoria antes de materializar cada ocorrência.
- Usa chave determinística `recurring:<recurringId>:<YYYY-MM-DD>` para idempotência, além de `recurringId` e `recurringOccurrenceDate` persistidos.
- Sanitização e auditoria preservam os metadados recorrentes para que a prevenção de duplicidade continue após recarregar o aplicativo.
- Cria evento de auditoria `transaction_created` para cada lançamento gerado.

## Testes

- 14 testes novos de domínio para geração, duplicidade, regra pausada, referências inválidas, perfil, data e preservação de metadados.
- 10 verificações de integração estática para controles da interface, confirmação, auditoria e persistência dos metadados.
- `npm test` deve passar com as novas suítes. A build e o instalador seguem deliberadamente fora do escopo desta etapa.
