# O Razão v1.22.0-beta.8

**Base anterior:** v1.22.0-beta.7  
**Ciclo:** v1.22.0-beta.n — ciclo de desenvolvimento mantido conforme o Plano Mestre.

## Correções funcionais

- O painel preditivo agora recebe as entidades do perfil ativo (contas, cartões, categorias, recorrências e transações filtradas), em vez de receber coleções PF/PJ misturadas.
- A mudança de PF para PJ e vice-versa remonta o painel preditivo, evitando que uma resposta gerada no perfil anterior permaneça visível.
- O detector de anomalias consulta limites pela função central `budgetForMonth`, reconhecendo chaves escopadas `PF:`/`PJ:` e mantendo chaves antigas sem prefixo apenas como fallback PF.
- O detector filtra transações e categorias pelo perfil selecionado, mesmo que receba estado com coleções misturadas.
- O detector trata descrições ausentes e datas ausentes de forma defensiva para não quebrar a análise de anomalias.

## Testes executados

- `npm test` — suíte automatizada completa aprovada após incluir os testes específicos do motor preditivo e isolamento de perfil.
- Motor preditivo/detector de anomalias: 9 testes de domínio aprovados.
- Integração estática do painel preditivo: 3 verificações aprovadas.
- Orçamento/perfil: 13 verificações estáticas aprovadas.
- A suíte também executa os testes anteriores de domínio, persistência, conciliação, faturas, auditoria, backup/restauração, recorrências, segurança desktop e migração PF/PJ.

## Migração e compatibilidade

- Não foi alterado o formato persistido dos dados nem o schema.
- Orçamentos antigos sem prefixo continuam sendo interpretados como PF.
- Não é necessária migração de dados para esta mudança.

## Limitações conhecidas

- Testes de integração estática não são testes E2E de interface.
- Não foi feita revisão visual/manual em claro/escuro, teclado ou diferentes tamanhos de tela.
- Autenticação/backend, sincronização e Open Finance não devem ser considerados produção apenas porque existem testes locais/mockados.
- Build, DNS e empacotamento `.exe` não foram executados, seguindo a decisão do proprietário do produto e a fase definida no Plano Mestre.
