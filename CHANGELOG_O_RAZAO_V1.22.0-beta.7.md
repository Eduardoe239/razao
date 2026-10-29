# O Razão v1.22.0-beta.7

## Isolamento de orçamentos PF/PJ

- As chaves de orçamento passam a incluir o perfil (`PF:` ou `PJ:`), impedindo colisões quando categorias de perfis diferentes compartilham um mesmo identificador.
- A tela de orçamento consulta, grava e remove limites usando o perfil ativo.
- Orçamentos antigos sem prefixo continuam sendo lidos como PF, evitando perder limites existentes após a atualização.
- Ao salvar ou remover um limite PF, a chave legada correspondente é removida para impedir que um limite apagado reapareça pela compatibilidade.
- Remover um limite PJ não altera o limite PF e vice-versa.

## Validação

- Testes unitários de compatibilidade com orçamento legado, isolamento PF/PJ, limites iguais a zero e remoção independente.
- Teste de integração estático confirma que a interface envia `profileMode` às operações de leitura, gravação e remoção.
- Não foi executado build nem empacotamento `.exe`, seguindo o Plano Mestre.

## Limitações conhecidas

Esta versão isola as chaves de orçamento, mas não declara concluída a auditoria PF/PJ. Permanecem necessárias verificações de fluxos financeiros completos, referências de dados históricos e validação manual da interface.
