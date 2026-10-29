# O Razão — v1.19.0-beta.1

## Exportar backups históricos

- Adicionado botão **Exportar** para cada backup válido no gerenciador de cópias históricas.
- A exportação funciona no navegador (download JSON) e no Electron (janela nativa de salvamento).
- Criada `serializeHistoricalBackup`, que valida novamente o conteúdo histórico antes de produzir o envelope normal de backup, incluindo checksum e preservação da data quando válida.
- As exportações podem ser importadas pelo fluxo de restauração existente; isso permite tirar cópias antigas do armazenamento local e guardá-las em outro local.
- O botão de exportação fica desativado durante outra operação de exportação/restauração, para evitar ações sobrepostas.

## Testes e validação

- Teste funcional do ciclo exportar → analisar JSON → validar como backup importável, preservando conta, lançamento, valor e data.
- Testes para rejeitar referências inexistentes e identificadores duplicados na cópia histórica.
- Testes de integração verificam os fluxos de salvamento no desktop e download no navegador.
- `npm test`: aprovado (código de saída 0), com as suítes anteriores, 8 asserções funcionais de exportação e 10 verificações estáticas de integração.
- `node --check electron/main.cjs`, `node --check src/domain/backup.js` e `node --check src/services/backupHistory.js`: aprovados.
- A instalação das dependências falhou com `EAI_AGAIN` ao resolver `registry.npmjs.org`; `npm run build` continua bloqueado porque o Vite não está instalado. Não houve validação E2E real do navegador/Electron nem geração de instalador Windows.
