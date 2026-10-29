# O Razão — v1.22.0-beta.4

## Transparência sobre a separação PF/PJ

- Adicionado aviso persistente na área principal explicando que a alternância PF/PJ ainda não fornece isolamento completo.
- O aviso identifica explicitamente contas, cartões, categorias e orçamentos como dados ainda compartilhados.
- A interface não deve ser interpretada como garantia de segregação contábil, fiscal ou de acesso.
- Mantida a filtragem já existente para lançamentos e recorrências.
- Adicionado teste automatizado estático para garantir que a limitação permaneça explícita na interface.

## Por que esta versão não declara a separação corrigida

A implementação atual não possui um modelo de propriedade por perfil consistente para contas, cartões, categorias e orçamentos. Alterar apenas os filtros poderia ocultar contas necessárias, quebrar pagamentos de fatura ou misturar saldos. A correção real exige uma migração de dados e fluxos de criação/seleção de entidades por perfil, com testes de regressão financeira. Esta versão reduz o risco de interpretação equivocada enquanto essa refatoração é preparada; **não** resolve o isolamento PF/PJ.

## Validação e limites

- Incluído teste estático para o aviso de limitação.
- Build e empacotamento desktop não foram executados, conforme o Plano Mestre.
