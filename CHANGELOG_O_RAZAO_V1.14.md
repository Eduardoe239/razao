# O Razão — v1.14.0-beta.1

## Verificação de integridade entre trilha e livro-razão
- Criado `src/domain/auditIntegrity.js` para checar estrutura de eventos, IDs duplicados, ações desconhecidas, datas inválidas, perfil PF/PJ, snapshots, referências ausentes e incompatibilidades entre o último evento e o lançamento atual.
- O verificador cruza as transações com `auditLedger` e reconhece cartões como contas virtuais quando apropriado, sem confundir compras de cartão com contas bancárias ausentes.
- Incluída a aba **Integridade Financeira**, com contagens, problemas detectados e limitações explícitas.
- Lançamentos antigos sem trilha são contados separadamente, sem serem classificados como corrupção apenas pela ausência de histórico retroativo.
- Incluídos testes para o domínio de auditoria, correspondência de snapshots, eventos duplicados, datas/tipos inválidos, lançamentos ausentes, exclusões, resumos de importação e integração das abas.

## Validação local
- `npm test`: concluído com código de saída 0; suítes de domínio e verificações estáticas passaram.
- A análise de sintaxe JSX/JavaScript foi executada separadamente nos arquivos de interface modificados.
- Build completo Vite e instalador Electron não foram validados nesta execução, pois o ambiente não tem as dependências instaladas e não há confirmação de compilação.

## Limites
A verificação detecta inconsistências estruturais comuns e não constitui prova criptográfica de autenticidade. Alguém que modifique coerentemente os dados locais pode contornar verificações baseadas no próprio armazenamento.
