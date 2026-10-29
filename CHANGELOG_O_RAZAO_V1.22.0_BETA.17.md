# O Razão v1.22.0-beta.17

**Data:** 28/10/2026  
**Base anterior:** `1.22.0-beta.16`  
**Ciclo:** `1.22.0-beta.n`, conforme Plano Mestre.  
**Foco:** hardening da persistência, recuperação e confiança da fronteira desktop; consolidação de evidências da Fase 0.

## Correções e mudanças de comportamento

- Validação estrutural e semântica do estado atual acontece antes de `sanitizeState`, reduzindo o risco de remover/normalizar silenciosamente lançamentos inválidos em um payload JSON sintaticamente correto.
- A validação cobre IDs duplicados, centavos inteiros, tipo/status/data e referências de conta/cartão/destino de transferência no schema atual.
- O boot bloqueia autosave quando a leitura falha e apresenta `StartupRecoveryScreen`, com retry e restauração a partir de cópia local/JSON externo validado.
- O handler de restauração chamado pelo diagnóstico revalida o backup independentemente da validação na UI antes de sanitizar/persistir.
- A confiança de IPC no Electron exige o URL exato do renderer empacotado (ou origem de desenvolvimento estritamente permitida), em vez de confiar em sufixos de caminho semelhantes.
- Persistência nativa valida payloads e mantém armazenamento sem fallback silencioso para texto puro.
- O catálogo de backups, as regras de aprendizagem de categorias e a fila outbox falham fechado em erros de leitura/corrupção e confirmam gravações por leitura.
- Recorrências e orçamentos ganham eventos de auditoria específicos de criação/pausa/exclusão e definição/remoção.
- Novo `parseMoneyInputToCents` para limites de orçamento aceita formatos monetários não ambíguos e recusa mais de duas casas decimais/agrupamentos ambíguos, sem arredondamento silencioso.
- README revisado para separar funções implementadas, mocks e serviços bloqueados.
- Incluídos inventário de telas/persistência/mutações, matriz J01–J20 e backlog de risco na documentação do projeto.

## Migração e compatibilidade

- Não foi alterada a versão do schema persistido nesta entrega.
- A validação semântica estrita é aplicada ao schema atual; existe uma divergência documentada entre `migrations.js` (schemaVersion 3) e o estado corrente (`version: 4`), e o helper de migração não está conectado ao boot/restauração. Esse é um bloqueador S1/G3 registrado em `BACKLOG_RISCO_FASE0_BETA.17.md`; compatibilidade histórica não está comprovada.
- A entrada de limite de orçamento agora recusa formatos ambíguos e casas extras. Ao digitar milhar sem vírgula decimal (ex.: `1.234`), o usuário deve esclarecer como `1.234,00`; isso evita inferência financeira silenciosa.
- A validação de restauração é mais estrita e pode recusar arquivos de backup inconsistentes; mantenha uma cópia externa do backup original.

## Testes executados

- `npm test` — **exit code 0** nesta sessão; o script contém 47 invocações de testes (`.mjs`).
- Novo teste monetário: 28 assertions aceitas/recusadas conforme formatos, ambiguidade e limites centesimais.
- Suite inclui domínio financeiro, ledger, fatura, reconciliação, auditoria, backup/restauração, snapshots Web e desktop simulados, outbox, validação de estado, isolamento PF/PJ, recorrência e fluxo de recuperação.
- `node --check` passou em todos os `.js`/`.mjs` sob `src`, `api` e `scripts`, e em `electron/main.cjs`; parser TypeScript fez parse/transpile estático de 23 arquivos JSX sem erro. O ZIP é validado após a criação.

### Limitações dos testes

Os testes de interface são majoritariamente estáticos e os testes de persistência desktop usam APIs simuladas; isso **não** equivale a E2E real de navegador/Electron. Não foi executado build Vite, instalador, execução no Windows, teste real de quota, concorrência multiaba, teste de desempenho com dataset de 5.000+ registros, revisão visual de acessibilidade ou auditoria de segurança independente. A instalação de dependências excedeu o limite de tempo da sessão e não produziu `node_modules` nem `package-lock.json`; por isso não foi possível produzir evidência reprodutível de SCA/`npm audit` nesta rodada.

## Serviços e riscos conhecidos

- Web: `localStorage`, sem criptografia em repouso e sem transações atômicas.
- Electron: processo main usa `safeStorage`, mas ainda precisa de teste no ambiente Windows/Electron alvo.
- Autenticação remota: desativada/fail-closed.
- Open Finance: demonstração/mock, sem conexão bancária real.
- OCR: extração de texto/regex demonstrativa, sem OCR de imagem real.
- Sincronização: mapa em memória e LWW simplificado, não produção.
- Auditoria local não é imutável nem assinada.

## Build, instalador e distribuição

Nenhum build ou instalador foi gerado nesta rodada, respeitando o escopo atual da Fase 0 e as instruções do proprietário. Nenhuma publicação foi realizada.

## Critério de conclusão da Fase 0

**Fase 0 permanece ABERTA / NÃO APROVADA.** Os seis critérios da seção 3.1 do Plano Mestre foram mapeados na auditoria; os itens manuais/visuais, as provas em ambiente real, a revisão independente e as aprovações formais G1–G9 ainda não estão completos. O pacote não deve ser tratado como versão de produção.

## Artefatos

O SHA-256 do ZIP está no arquivo de hash companheiro gerado após o empacotamento; não se registra o hash do ZIP dentro do próprio ZIP para evitar uma referência circular.


## Verificação final de encerramento (28/10/2026)

- `npm test`: exit code 0; o script agregador executa 47 scripts Node consecutivos.
- `node --check` em todos os arquivos `.js`/`.mjs` de `src`, `api` e `scripts`: aprovado.
- `node --check electron/main.cjs`: aprovado.
- Parse/transpile estático de 23 arquivos JSX via TypeScript parser: 0 erros.
- Testes específicos atuais: parser monetário 28 assertions; trust boundary Electron 7 checks; validação do estado 17 assertions; validação histórica de backup 10 assertions; auditoria 17 assertions + integração de auditoria 21 checks; testes de recuperação desktop 5 cenários; Web 5 checks; consistência de restauração 4 cenários; fluxo de recuperação 13 checks estáticos.
- O empacotamento ZIP e o SHA-256 são registrados no manifesto complementar após gerar esta entrega.

## Achado de migração ainda aberto

A revisão de chamadas confirmou que `src/domain/migrations.js` usa `schemaVersion=3`, enquanto o modelo corrente é marcado `version=4`, e `migrateData()` não está conectado ao fluxo produtivo de boot/restauração. Isso foi documentado como F0-S1-11 e impede aprovação de G3 até ser criado e testado um pipeline canônico com fixtures e rollback.
