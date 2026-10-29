# O Razão — v1.12.0-beta.1

## Objetivo
Evoluir a conferência de saldo para uma revisão explícita de divergências, evitando correções silenciosas e preservando contexto para auditoria.

## Alterações
- Adicionado `src/domain/balanceCorrection.js` com análise de causas prováveis, preparação de rascunhos e aplicação validada de ajustes.
- A conferência lista hipóteses distintas para saldo do extrato maior ou menor que o calculado, sem afirmar que uma hipótese é comprovadamente a causa.
- O usuário pode preparar um lançamento de entrada, despesa/tarifa ou transferência; os valores vêm da diferença calculada em centavos inteiros.
- O fluxo exige descrição, data válida não posterior à data de referência, conta contraparte válida para transferências e confirmação explícita após a prévia.
- A aplicação revalida conta, diferença, estado atual, valor, direção da transferência e duplicidade da chave de conciliação.
- Ajustes são novos lançamentos pagos com `source: balance_reconciliation_adjustment`, `reconciliationKey` e contexto `reconciliationAdjustment`; não alteram ou apagam lançamentos anteriores.
- Sanitização agora preserva a origem e os metadados de ajuste, limitando valores e tamanho da nota.
- Incluídos testes de domínio e integração ao comando `npm test`, incluindo reconciliação por transferência de entrada e saída.

## Limitações
- O ajuste é registrado localmente; não altera o banco, não importa dados bancários por si só e não substitui revisão do extrato.
- Não foi validado o build completo se as dependências não estiverem instaladas. Testes de domínio/estáticos não equivalem a E2E de interface nem a certificação financeira.
