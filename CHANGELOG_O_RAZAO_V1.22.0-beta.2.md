# O Razão — v1.22.0-beta.2

## Escopo
Correção de segurança e clareza no fluxo demonstrativo de Open Finance, derivada da auditoria da Fase 0. Esta entrega não adiciona integração bancária real.

## Alterações
- Aviso explícito de que o fluxo não é uma conexão bancária e usa dados fictícios.
- Lançamentos sintéticos não vêm mais pré-selecionados para importação; a pessoa precisa selecioná-los manualmente após revisar.
- Metadado de origem `open_finance_demo` é preservado para distinguir os dados demonstrativos.
- Novo teste estático automatizado para o rótulo, seleção segura e marcação da origem.

## Validação
Executar `npm test`. O teste novo verifica a presença dos controles de segurança no código; não equivale a teste E2E da interface. Build/instalador foram deliberadamente adiados conforme o plano.

## Limitação conhecida
O fluxo continua simulando operações bancárias. Não deve ser anunciado como Open Finance conectado nem utilizado como importação automática de dados reais.
