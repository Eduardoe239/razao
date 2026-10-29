# O Razão 1.8.0-beta.1

## Painel financeiro por período

- Centralizados os cálculos do painel em `src/domain/dashboardSummary.js`.
- Os controles Semanal, Mensal e 3 Meses agora aplicam intervalos reais de data aos fluxos financeiros.
- A navegação anterior/próximo altera o período considerado, inclusive em semanas que cruzam de mês e em viradas de ano.
- Entradas e saídas agora representam receitas e despesas pagas dentro do período selecionado, em vez de somas de todo o histórico.
- Transferências são excluídas dos indicadores de receita/despesa; lançamentos pendentes compõem separadamente o saldo previsto.
- O saldo disponível parte do saldo das contas calculado pelo livro-razão, considera movimentos até a data atual e desconta o compromisso da fatura do mês selecionado.
- Adicionada suíte específica para datas, intervalos, transferências, pendências, cancelamentos e saldo consolidado.
- Versão atualizada para `1.8.0-beta.1`.

## Validação e limites

- Testes locais de domínio/estáticos aprovados (incluindo a nova suíte de resumo do painel).
- Build Vite e pacote instalável Windows não foram validados neste ambiente; dependências de desenvolvimento não estão instaladas de forma funcional.
- Open Finance, OCR, autenticação de backend e sincronização real continuam sem validação de produção. Consulte os changelogs e documentos das fases anteriores.
