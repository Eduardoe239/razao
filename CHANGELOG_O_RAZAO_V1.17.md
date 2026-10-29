# O Razão — v1.17.0-beta.1

## Gerenciador de backups

- Painel de histórico no Diagnóstico para consultar cópias locais, suas datas, tamanho e resumo de contas e lançamentos.
- Validação de cada cópia antes de habilitar a restauração; a restauração pede confirmação e passa pelo mecanismo transacional já introduzido na v1.16.
- No navegador, o histórico mantém até cinco cópias e tenta respeitar um limite agregado de 3 MB para reduzir o risco de esgotar a cota de `localStorage`. O registro do histórico é auxiliar; o snapshot obrigatório de segurança da restauração permanece separado.
- No Electron, são listadas e validadas cópias pré-restauração criptografadas no diretório local de dados do app. O identificador aceito é restringido a nomes de arquivo esperados para impedir traversal de caminho.
- A interface permite atualizar a lista e restaurar uma cópia selecionada.

## Validação

- Novos testes unitários de retenção, leitura e validação do histórico local.
- Novos testes estáticos de integração para UI, storage, IPC e preload.
- Limitação: as verificações estáticas do Electron não substituem um teste E2E com Electron em execução. O build de produção depende da instalação bem-sucedida das dependências.
