# O Razão v1.16.0-beta.1 — Recuperação transacional de dados

## Alterações

- Adicionada uma fila única de gravação para serializar salvamentos automáticos e restaurações.
- Criada a operação `saveStateWithRecovery`, que exige snapshot prévio e confirma a gravação antes de trocar o estado em memória.
- No navegador, o estado persistido anterior é preservado em `localStorage` antes da restauração; na inicialização, um snapshot anterior válido pode recuperar o estado ativo se estiver corrompido. Se o snapshot não puder ser criado, a operação é abortada; se a escrita falhar, a aplicação tenta restaurar o valor anterior e confirma a recuperação.
- No Electron, um máximo de cinco snapshots pré-restauração são retidos para controlar o crescimento de disco. No Electron, foi adicionado o canal IPC específico `desktop:restoreStateWithRecovery`, que cria uma cópia criptografada do estado anterior com `safeStorage`, usa escrita atômica e tenta rollback em caso de erro.
- O Electron e o navegador agora tentam recuperar uma cópia prévia válida se o arquivo/estado ativo não puder ser lido. Sem recuperação disponível, o carregamento falha explicitamente para que a persistência não sobrescreva silenciosamente os dados com estado vazio.
- `saveState` no desktop exige retorno nativo `success: true`; a ausência das APIs desktop não resulta em fallback silencioso para `localStorage`.
- A mensagem da interface distingue falha ao aplicar o backup de arquivo de backup inválido.
- Incluídos testes de falha de gravação, snapshot impossível, recuperação de estado corrompido e integração da API nativa.

## Validação

- `npm test`: todas as suítes locais passaram (incluindo 10 cenários específicos de recuperação e 13 verificações estáticas de integração).
- `node --check electron/main.cjs` e `node --check electron/preload.cjs`: passaram.
- Compilação Vite/Electron: ainda não validada nesta etapa; depende de instalar as dependências do projeto.

## Limitações

A cópia local não protege contra adulteração deliberada por alguém com acesso ao dispositivo. A cópia de recuperação é criada durante a restauração, não é um sistema de backup contínuo, e os testes desktop não substituem execução E2E do Electron.
