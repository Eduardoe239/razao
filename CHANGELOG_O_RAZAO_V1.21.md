# O Razão — v1.21.0-beta.1

## Gestão funcional de recorrências e compromissos

- Adicionado gerenciador no painel para cadastrar receitas e despesas recorrentes mensais.
- Campos: descrição, valor em centavos, tipo, dia do mês, conta, categoria opcional, data inicial e data final opcional.
- Recorrências podem ser pausadas, reativadas ou excluídas com confirmação.
- Criado gerador determinístico de ocorrências mensais, com ajuste do dia 29–31 ao último dia do mês quando necessário.
- Respeita datas inicial/final, estado ativo/inativo e horizonte máximo de 36 meses.
- Compromissos futuros agora exibem pendências e recorrências previstas, com data e valor.
- Ocorrências existentes identificadas por `recurringId` + `recurringOccurrenceDate` não são geradas novamente.
- Regras legadas sem `type` continuam compatíveis como despesa.
- Recorrências são persistidas no estado principal e filtradas por perfil PF/PJ.

## Testes

- 11 testes de domínio para validação de regras, datas de calendário, fim de mês, limite de horizonte e prevenção de duplicidade.
- 10 verificações de integração para o painel, operações de cadastro/pausa/exclusão e geração de compromissos.
- A suíte completa `npm test` passou após a correção de compatibilidade com recorrências legadas.

## Limitações conhecidas

- As recorrências geram previsões de compromissos; não criam automaticamente lançamentos reais nem efetuam pagamentos.
- Build e instalador não foram executados, conforme a decisão de priorizar funcionalidades nesta etapa.
