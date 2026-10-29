# O Razão — v1.20.0-beta.1

## Busca avançada e exportação de lançamentos

### Novidades funcionais
- Busca por descrição, conta, destino de transferência e categoria; a busca textual ignora diferenças de acentuação.
- Filtros combináveis por tipo, status (incluindo cancelados), conta/cartão, categoria, período e faixa de valor.
- Ordenação por data mais recente/antiga, maior/menor valor e descrição A–Z, com desempate determinístico.
- Botão para limpar todos os filtros e contagem de resultados sobre o conjunto de lançamentos recebido pela aba.
- Exportação CSV apenas dos resultados filtrados, no navegador ou por janela nativa do Electron.
- CSV em UTF-8 com BOM, delimitador `;`, valores com vírgula decimal e nomes legíveis de contas/cartões e categorias.
- Mitigação de CSV formula injection em textos importados/registrados.
- Se o modo de privacidade visual estiver ativo, a exportação exige confirmação explícita de que o arquivo contém os valores reais.
- Lançamentos cancelados não podem ser transformados em pendentes através do atalho de status.

### Validação
- Suíte completa `npm test`: aprovada.
- Testes novos de domínio para filtros, ordenação, conversão de valores brasileiros, exportação CSV e mitigação de fórmulas: 17 asserções.
- Testes estáticos de integração da UI: 10 asserções.
- Não foi tentada a build, conforme preferência de priorizar funcionalidades e adiar a preparação do ambiente até a geração real do instalador.

### Limites conhecidos
- Testes de integração da UI verificam ligações no código, mas não substituem teste E2E no navegador/Electron.
- A exportação inclui todos os campos de dados selecionados e valores reais; o aviso adicional aparece se o modo de privacidade visual estiver ativo.
- A aplicação e o instalador continuam em beta e não devem ser descritos como certificados para produção.
