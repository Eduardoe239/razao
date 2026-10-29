# O Razão v1.22.0-beta.5 — Migração inicial de isolamento PF/PJ

## Alterações
- Adicionado `src/domain/profileIsolation.js` para migrar entidades legadas de contas, categorias e cartões para escopo PF/PJ.
- Entidades antigas sem perfil passam a pertencer a PF, alinhadas ao comportamento histórico dos lançamentos legados.
- Quando uma entidade legada é referenciada por lançamentos ou recorrências PJ, a migração cria uma cópia PJ e reescreve as referências PJ para preservar o histórico sem compartilhar o mesmo registro.
- A migração é aplicada na hidratação inicial e na restauração de backups validados.
- A interface passa a exibir contas, categorias e cartões de acordo com o perfil ativo; a integridade de auditoria recebe as entidades do perfil selecionado.
- Incluído teste de migração, reescrita de referências e idempotência.

## Limitações conhecidas
- Esta é uma primeira migração local, não uma segregação contábil/fiscal completa nem um controle de acesso entre usuários.
- Orçamentos antigos permanecem vinculados às categorias PF; não são copiados automaticamente para PJ, evitando duplicar limites pessoais como se fossem empresariais.
- É necessária validação manual de faturas, transferências, conciliação, backups antigos e referências que não estejam presentes nos campos conhecidos.
- Autenticação, sincronização e integração bancária real continuam sendo itens pendentes da auditoria da Fase 0.
- Build e empacotamento `.exe` não foram executados, conforme a orientação do projeto.

## Verificações executadas
- `node scripts/test-profile-isolation-migration.mjs`
- `npm test`
- `node --check` nos arquivos de migração e teste
- Verificação de integridade do ZIP final
