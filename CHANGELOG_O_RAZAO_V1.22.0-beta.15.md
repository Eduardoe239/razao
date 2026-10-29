# O Razão — v1.22.0-beta.15

## Foco
Consistência entre restauração de backup, snapshot `last-known-good` e adaptador local de persistência.

## Alterações
- Após restauração Web confirmada, atualiza `razao_app_state_v3.last-known-good` para o estado restaurado. Isso impede que uma corrupção posterior recupere silenciosamente o estado anterior à restauração.
- Se a gravação principal da restauração for confirmada, mas a atualização do snapshot falhar, o resultado mantém `success: true` para a restauração principal e expõe `recoverySnapshotUpdated: false` e `recoveryWarning`; o evento `razao:storage-health` comunica a degradação.
- `saveStateWithRecovery` rejeita valores nulos, arrays e valores que não sejam objetos antes de tocar no estado persistido.
- `RazaoLocalDatabase.getState()` passa a utilizar a camada canônica de leitura/recuperação. Erros de leitura deixam de ser convertidos em `null`, o que confundia corrupção com primeiro uso.
- `RazaoLocalDatabase.saveState()` passa a usar a camada canônica de gravação e rejeita explicitamente uma gravação não confirmada, mantendo o snapshot de recuperação alinhado.
- Adicionado `scripts/test-web-restore-snapshot-consistency.mjs` com cenários de restauração seguida de corrupção, adaptador local, falha de leitura e falha na atualização do snapshot.

## Testes executados
- `npm test`: código de saída 0.
- Suíte principal de domínio: 100 aprovados, 0 falhas (conforme os relatórios existentes da suíte).
- Testes de recuperação Web específicos: 4 cenários aprovados.
- Testes Web de último estado confirmado: 5 cenários aprovados.
- Testes desktop de último estado confirmado: 4 cenários aprovados.
- `node --check` nos módulos alterados e no novo teste: aprovado.
- `unzip -t` no pacote beta.15: sem erros estruturais.

## Limitações conhecidas
- Os testes de armazenamento Web usam `localStorage` simulado; não equivalem a E2E no Chromium nem reproduzem fielmente quotas, encerramento abrupto, múltiplas abas ou falhas físicas.
- `localStorage` não oferece transação atômica entre o estado principal e o snapshot. O aviso de falha secundária é explícito, mas isso não equivale a banco transacional.
- O armazenamento Web não é criptografado em repouso. As cópias no mesmo perfil não protegem contra perda total do perfil/dispositivo ou malware com acesso à sessão.
- Não foram executados build, instalador, teste visual/E2E real ou ensaios de falha no Windows nesta rodada.
- A Fase 0 permanece aberta; esta versão não declara excelência ou prontidão pública.
