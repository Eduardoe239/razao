# O Razão — v1.11.0-beta.1

## Conferência do saldo de uma conta contra o extrato

- Adicionado o módulo puro `balanceReconciliation.js` para calcular o saldo esperado de uma conta até uma data de referência.
- O cálculo parte de `initialBalanceCents` e inclui apenas movimentações válidas com status `pago`, data válida e data menor ou igual à data do extrato.
- Receitas e despesas afetam a conta de origem; transferências refletem corretamente débito na origem e crédito no destino.
- Pendências, cancelamentos, transações futuras, datas inválidas e movimentos com tipos/valores inválidos são contabilizados separadamente como exclusões, para que a diferença seja auditável.
- Adicionada entrada monetária estrita em formato brasileiro; não converte campo vazio ou texto inválido em saldo zero e aceita saldo negativo.
- Criado o modal `AccountBalanceReconciliationModal` e a ação **Conferir saldo do extrato** no painel. A ferramenta é somente de leitura: mostra composição, saldo calculado, saldo do extrato e diferença, sem alterar lançamentos.
- Adicionados 24 testes de domínio e 4 verificações de integração estática.

## Validação

- `npm test`: aprovado. Grupos locais informados: 101 testes de domínio principais, 15 verificações estáticas de segurança desktop, 9 de persistência, 13 de livro-razão, 6 de diagnóstico, 20 de resumo do painel, 20 de pagamento de fatura, 23 de reconciliação de lançamentos e 24 de conferência de saldos, além de 4 verificações estáticas de integração da nova funcionalidade.
- O teste cobre datas de corte, saldo coincidente e divergente, valores inválidos, transferências, pendências, cancelamentos, movimentos futuros, saldo negativo e formatação brasileira.
- Não foram executados build Vite, teste E2E de interface ou empacotamento do Electron nesta etapa. A conexão bancária permanece inexistente; o usuário informa manualmente o saldo do extrato.
