# Relatório de testes automatizados — O Razão beta.18

**Execução:** 28/10/2026, ambiente de trabalho isolado (Node `v22.16.0`).  
**Comando principal:** `npm test`  
**Resultado:** exit code `0`.

## Escopo da regressão

A cadeia npm contém **55 scripts** (o script adicional `test-artifact.mjs` está agora encadeado; seus dez grupos terminaram em 10 aprovados e zero falhas). A suíte `test-full-system.mjs` declara **101 testes de domínio aprovados, 0 falhas**. Resultado da execução armazenado em `/tmp/razao_beta18-regression-release.log` durante esta sessão; o relatório abaixo registra os resultados relevantes e os limites.

| Conjunto | Resultado |
|---|---|
| Fixtures de importação, 20 linhas + 2.000 linhas | 11 assertions, 0 falhas |
| Guardas de mutação de lançamento | 12 assertions, 0 falhas |
| Parser monetário/UI | 31 assertions, 0 falhas |
| Estado inicial e sanitização | 23 assertions, 0 falhas |
| Isolamento de eventos de auditoria por perfil | 10 assertions, 0 falhas |
| Pipeline migração de schema v1–v4/backups | 20 assertions, 0 falhas |
| Testes de domínio (`test-full-system`) | 101 aprovados, 0 falhas |
| Electron security | 19 checks, 0 falhas |
| Fronteira IPC + migração legacy simulada + destino de transferência/fatura | 19 checks, 0 falhas |
| Persistência | 13 checks, 0 falhas |
| Validação estrutural do estado | 24 assertions, 0 falhas |
| Livro-razão | passou dentro da cadeia |
| Diagnóstico | passou dentro da cadeia |
| Dashboard | passou dentro da cadeia |
| Pagamento de fatura | passou dentro da cadeia |
| Reconciliação de importação e escopo de perfil | 29 verificações, 0 falhas |
| Conciliação/correção de saldo | passou; UI também possui teste estático |
| Eventos e integridade de auditoria | 17 + 15 + 21 verificações, 0 falhas |
| Backup/restore/histórico/validação/export | 13; 10; 10; 13; 15; 20; 10; 8; 10 checks, todos 0 falhas por suíte |
| Categoria aprendida + privacidade do storage | 9 + 10 assertions, 0 falhas |
| Busca/export e integração UI | 17 + 10 assertions, 0 falhas |
| Recorrência / geração idempotente | 12 + 10 + 15 + 10 checks, 0 falhas |
| Open Finance demo e teclado | 4 checks + 1 assertion |
| ErrorBoundary e aviso PF/PJ | 8 + 7 checks |
| Migração de isolamento PF/PJ | 40 assertions, 0 falhas |
| Orçamento PF/PJ e previsão financeira | 13 + 3 + 12 verificações/assertions, 0 falhas |
| Autenticação desativada e splash/privacidade | 10 + 7 verificações, 0 falhas |
| Desktop last-known-good | 5 cenários, 0 falhas |
| Web last-known-good / restauração | 5 + 4 cenários, 0 falhas |
| Outbox | 4 grupos de cenário, todos aprovados |
| Recuperação no início | 13 verificações estáticas |
| Contratos estáticos de segurança/runtime | 23 verificações, 0 falhas |
| `test-artifact.mjs` — domínio legado | 10 grupos, 0 falhas |

## Verificações de sintaxe e embalagem

- `node --check` nos arquivos `.js`, `.mjs` e `.cjs` sob `src`, `api`, `electron` e `scripts`: saída limpa, código 0.
- Parser/transpile TypeScript aplicado como verificação sintática em 23 arquivos `.jsx`: zero falhas. Isso não é build de produção.
- `unzip -t` é executado no pacote final; SHA-256 calculado depois da última alteração e fornecido em arquivo separado.
- `npm run build`, `desktop:build`, instalador e executável **não foram executados**, por exigência do escopo Fase 0.

## Bloqueio de dependências

A tentativa de gerar `package-lock.json` com `npm install --package-lock-only --ignore-scripts --no-fund --no-audit --offline` terminou com `ENOTCACHED`, pois o registry/dependências não estavam disponíveis em cache. A tentativa online anterior também falhou por indisponibilidade de rede. Não fabricamos lockfile. As dependências diretas estão pinadas em versões exatas no `package.json`; a árvore transitiva precisa ser travada, verificada por `npm ci` e revisada com `npm audit` no notebook com acesso ao registry.

## Limite epistemológico

Estes resultados atestam testes automatizados, simulados e verificações estáticas executados nesta sessão. Não atestam execução visual no Chrome/Edge, execução real de safeStorage no Windows, manipulação de quota, crash-test, acessibilidade com leitor de tela ou revisão independente. Consulte a matriz J01–J20 para as evidências reais que ainda precisam ser geradas.
