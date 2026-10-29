# O Razão v1.22.0-beta.9

**Data:** 28/10/2026  
**Base anterior:** v1.22.0-beta.8  
**Ciclo:** v1.22.0-beta.n — ciclo mantido conforme o Plano Mestre.  
**Foco:** integridade do saldo atual e prevenção de dupla contagem nas projeções.

## Correções funcionais

- Criado `financialPosition.js` para centralizar a posição financeira atual e a composição de compromissos pendentes.
- O saldo de partida do simulador agora deriva das contas e do livro-razão, incluindo os saldos iniciais e os movimentos pagos até a data de referência.
- Transferências entre contas incluídas no consolidado são calculadas pelo livro-razão, em vez de tratadas como receita ou despesa.
- A projeção não soma novamente receitas/despesas já pagas no mês atual: esses movimentos já integram o saldo de partida.
- O simulador considera compromissos pendentes vencidos ainda não liquidados e compromissos pendentes do mês atual. Meses futuros recebem somente os itens pendentes daquele mês.
- Movimentos pagos com data futura não são incluídos no saldo atual da data de referência; datas explícitas inválidas também são excluídas do cálculo.
- O assistente determinístico passa a usar o saldo atual calculado pelo livro-razão e desconta compromissos pendentes vencidos/atuais ao estimar o saldo disponível.
- O simulador agora respeita a data de referência e o horizonte informados no objeto de opções.
- Mantido fallback de compatibilidade por receita menos despesa para consumidores antigos que não fornecem a propriedade `accounts`; a aplicação deve fornecer contas para usar o livro-razão como fonte de verdade.

## Testes executados

- `npm test` — concluído com código de saída 0.
- Suíte específica de posição/projeção: 12 assertions aprovadas, cobrindo saldo inicial, movimentos pagos, transferências, data futura, data inválida, compromissos vencidos, projeção mensal e saldo disponível do assistente.
- Suíte do motor preditivo: 11 verificações aprovadas, incluindo confirmação de que movimentos pagos não são somados novamente.
- A suíte inclui verificações de domínio e scripts de integração estática/mocada. Isso não equivale a uma jornada E2E real pela interface.

## Migração e compatibilidade

- Não foi alterado o schema nem o formato persistido; não é necessária migração de dados nesta entrega.
- Chamadas legadas sem `accounts` preservam o cálculo histórico simplificado. O painel da aplicação deve fornecer as contas filtradas do perfil ativo, como já faz.
- Não há alteração automática dos lançamentos históricos. A correção afeta o cálculo derivado de saldo, disponível e projeção.

## Limitações e itens ainda abertos

- Não foram executados testes E2E em navegador/Electron, revisão visual manual, build ou instalador `.exe`.
- A suíte atual não certifica autenticação, autorização server-side, criptografia em repouso, sincronização real ou integração bancária real.
- A auditoria completa PF/PJ, testes de recuperação/rollback sob falha real e validação de fluxos financeiros ponta a ponta continuam abertos conforme os gates do Plano Mestre.

## Artefatos

- Projeto ZIP: `razao-v1.22.0-beta.9-saldo-preditivo-livro-razao.zip`
- Hash SHA-256: fornecido no arquivo `razao-v1.22.0-beta.9-SHA256.txt` ao lado do ZIP.
- Build/instalador: não executado, seguindo a sequência do Plano Mestre e a instrução do proprietário do produto.
