# O Razão v17.3 — Fase 3: persistência e proteção de dados

## Mudanças implementadas

- O boot da aplicação agora aguarda `loadStateAsync()` antes de habilitar gravações automáticas.
- A leitura desktop prioriza o arquivo nativo e falha de forma fechada; não cai silenciosamente para um `localStorage` possivelmente desatualizado se a leitura nativa falhar.
- O serviço de persistência do renderer deixa de escrever simultaneamente o mesmo estado em `localStorage` e no arquivo desktop.
- No Electron, os novos dados são protegidos com `safeStorage` do sistema operacional e gravados atomicamente em `razao_app_db.enc`.
- A migração do arquivo legado JSON é executada apenas depois de validar e proteger o conteúdo; o arquivo antigo só é removido após a escrita protegida bem-sucedida.
- Se a proteção nativa não estiver disponível, a gravação falha explicitamente; não há fallback desktop para texto puro.
- A antiga implementação WebCrypto com segredo fixo e fallback em texto puro foi desativada, pois não fornecia criptografia confiável.
- Foram acrescentados testes estáticos para boot/hidratação, proteção nativa e ausência de segredos fixos.

## Limitações conhecidas e importantes

- `safeStorage` depende do sistema operacional e do ambiente. O comportamento real precisa ser validado no Windows suportado e em uma máquina de teste limpa.
- Na versão Web, os dados continuam em `localStorage` e **não são criptografados em repouso**. Não apresentar isso como armazenamento seguro contra acesso local ao perfil do navegador.
- Dados antigos no arquivo desktop JSON são migrados no primeiro carregamento se a proteção do sistema estiver disponível. Não apagar manualmente o diretório de dados antes de fazer backup.
- O boot falha de forma fechada se o carregamento desktop lançar erro, para impedir sobrescrita automática com estado vazio. Uma próxima etapa deve adicionar uma tela de recuperação/exportação e fluxo de backup restaurável.
- A compilação e o instalador Windows não foram validados nesta execução: `npm install --ignore-scripts --no-audit --no-fund` excedeu o tempo disponível. Não considerar esta versão pronta para distribuição.
- Testes de origem IPC e persistência nesta etapa incluem verificações estáticas; não substituem testes E2E no Electron real.

## Validação executada

- Suíte principal de domínio/mock: 96 aprovados, 0 falhas.
- Verificações estáticas de segurança desktop: 15 aprovadas, 0 falhas.
- Verificações estáticas de persistência: 9 aprovadas, 0 falhas.

## Próximas etapas recomendadas

1. Criar um harness E2E para Electron e validar leitura/gravação, migração e falhas de `safeStorage`.
2. Adicionar backup versionado, restauração e recuperação de corrupção com confirmação explícita.
3. Tornar a instalação reproduzível com `package-lock.json` e executar build/empacotamento Windows em CI.
4. Rever o armazenamento Web e deixar clara a diferença entre privacidade local e criptografia em repouso.
5. Só depois avançar para auditoria de integridade do ledger financeiro e regras de contas, transferências e faturas.
