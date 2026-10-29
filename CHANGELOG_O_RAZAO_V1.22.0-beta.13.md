# O Razão v1.22.0-beta.13

**Foco:** Fase 0 — recuperação do último estado confirmado no desktop.

## Alterações

- O processo desktop passa a manter `razao_app_db.last-known-good.enc`, uma cópia criptografada do último estado confirmado, atualizada após a gravação principal.
- Uma restauração de backup atualiza a cópia do último estado confirmado após o commit e preserva separadamente a cópia anterior à restauração.
- Se o arquivo de dados principal estiver corrompido, a inicialização tenta primeiro recuperar o último estado confirmado; as cópias anteriores à restauração continuam como fallback legado.
- Se o arquivo principal desaparecer, o desktop tenta recuperar o último estado confirmado antes de tratar o perfil como novo.
- O gerenciador de backups lista a cópia do último estado confirmado e a identifica separadamente das cópias anteriores à restauração.
- Se a gravação principal tiver sucesso, mas a atualização da cópia de recuperação falhar, o resultado informa essa condição sem alegar que os dados principais não foram salvos. A camada de persistência registra o aviso; a interface de restauração também o apresenta quando recebe esse resultado.
- Adicionado teste de integração isolado que carrega os handlers reais de `electron/main.cjs`, usa um diretório temporário e simula APIs do Electron e `safeStorage` para exercitar persistência, corrupção, remoção do arquivo principal, restauração e listagem de backups.
- Versão atualizada para `1.22.0-beta.13`.

## Validação executada

- `npm test`: terminou com código de saída `0`.
- Suíte de domínio: 100 verificações aprovadas, 0 falhas.
- Recuperação desktop de último estado confirmado: 4 cenários aprovados, 0 falhas, incluindo falha de atualização do snapshot secundário.
- Integração do gerenciador de backups: 20 verificações estáticas aprovadas, 0 falhas.
- `node --check electron/main.cjs` e `node --check scripts/test-desktop-last-known-good.mjs`: concluídos sem erro.

## Limitações conhecidas

- O teste desktop usa `safeStorage` simulado para testar a lógica de arquivo e recuperação; não comprova o comportamento real da criptografia do sistema operacional.
- Não foram executados build, instalador, teste E2E visual, teste em Windows real, teste de disco cheio ou interrupção abrupta do processo.
- A recuperação Web (`localStorage`) ainda não possui equivalente ao snapshot dedicado atualizado a cada gravação do desktop. Continua pendente a revisão desse fluxo, inclusive limites de quota e a possibilidade de snapshots antigos.
- Os testes automatizados não substituem a revisão manual de cada tela e jornada financeira.

## Decisão

**A Fase 0 permanece aberta.** Esta versão reduz um risco de recuperação no desktop, mas não fecha os gates de persistência Web, ensaios reais de falha, isolamento PF/PJ ponta a ponta, inventário/revisão visual e E2E das jornadas críticas.
