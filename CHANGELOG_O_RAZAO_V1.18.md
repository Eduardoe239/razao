# O Razão — v1.18.0-beta.1

## Validação robusta de cópias históricas

- Criada `validateHistoricalBackupState` para submeter estados recuperados à mesma validação financeira dos backups JSON exportáveis.
- Antes da confirmação de restauração, o gerenciador valida IDs de contas e lançamentos, centavos inteiros, tipos e status suportados, datas reais e referências a contas/cartões existentes.
- O fluxo interrompe a restauração quando uma cópia histórica não passa na validação semântica, mesmo que a estrutura básica tenha sido aceita pelo IPC desktop.
- O catálogo local é tratado como dado não confiável: JSON inválido é ignorado, catálogo acima de 3 MB é recusado antes de analisar os registros e a interface limita a listagem a cinco itens mesmo se o armazenamento estiver adulterado.
- Foram adicionados testes de estado histórico inválido, limite do catálogo, JSON corrompido e ordem entre validação, confirmação e restauração.

## Verificações realizadas

- `npm test`: passou; 101 testes principais de domínio e todas as suítes complementares de segurança, persistência, livro-razão, faturas, conciliação, auditoria, backup, recuperação e histórico.
- `node --check electron/main.cjs`, `node --check src/domain/backup.js` e `node --check src/services/backupHistory.js`: aprovados.
- Instalação das dependências: bloqueada por falha de DNS para `registry.npmjs.org` (`EAI_AGAIN`).
- `npm run build`: não concluído porque o Vite não está instalado neste ambiente. Não houve validação E2E real da interface nem geração do instalador Windows.

## Limitações conhecidas

- A validação histórica reforça a integridade dos dados antes da restauração, mas o checksum continua sendo um checksum não criptográfico, adequado para detectar corrupção acidental e não para provar autenticidade contra adulteração deliberada.
- Testes automatizados de domínio e integração estática não substituem ensaios reais no Electron e em navegadores.
