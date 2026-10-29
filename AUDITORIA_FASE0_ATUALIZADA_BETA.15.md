# Auditoria da Fase 0 — O Razão v1.22.0-beta.15

**Parecer: Fase 0 NÃO CONCLUÍDA.** Esta entrega corrige defeitos específicos, mas não cumpre todos os gates do Plano Mestre e não autoriza publicação como versão validada para o público.

## Escopo desta rodada

1. Revisado o fluxo de persistência Web em `src/services/storage.js`.
2. Revisado o adaptador `src/services/localDb.js`, que anteriormente lia/escrevia diretamente a chave principal e convertia erro de leitura em `null`.
3. Corrigido o fluxo de restauração Web para atualizar o snapshot `last-known-good` após confirmar o estado restaurado.
4. Adicionados testes de regressão em `scripts/test-web-restore-snapshot-consistency.mjs`.

## Evidências

| Verificação | Resultado | Limitação |
|---|---|---|
| `npm test` | Código de saída 0 | A suíte combina domínio, verificações estáticas e integrações simuladas; não é E2E completo. |
| Recuperação após restauração e corrupção | Passou em teste comportamental com módulo real | `localStorage` é simulado. |
| Adaptador `RazaoLocalDatabase` | Usa camada canônica; falha de leitura propaga erro | Busca estática não prova ausência de outros acessos diretos em todo o produto. |
| Falha de snapshot após restauração | Estado principal reportado separadamente da falha secundária | Não foi observado visualmente no navegador real. |
| Sintaxe dos arquivos alterados | `node --check` aprovado | Não substitui build ou análise estática completa. |
| Integridade do ZIP | `unzip -t` sem erros | Não atesta funcionamento do aplicativo empacotado. |

## Bloqueadores restantes para a Fase 0

| Área | Estado | Evidência ainda necessária |
|---|---|---|
| Inventário de telas, rotas, modais e estados | Aberto | Inventário completo e revisão visual de loading, vazio, erro e sucesso em breakpoints e temas. |
| Persistência Web | Parcial | Testes E2E em Chromium, quota real, múltiplas abas, encerramento abrupto, corrupção e comportamento de perfil. `localStorage` não é transacional nem criptografado em repouso. |
| Persistência desktop | Parcial | Ensaios no Windows/Electron real com disco cheio, permissões, interrupção e `safeStorage` real. |
| Isolamento PF/PJ | Parcial | Auditoria ponta a ponta de contas, cartões, faturas, transferências, recorrências, orçamentos, previsões, relatórios, importação e exportação, com fixtures e E2E. |
| Invariantes financeiras | Parcial | Matriz de invariantes reproduzíveis para saldo, transferência, pagamento de fatura, estorno, split, recorrência e importação. |
| Idempotência e auditoria | Parcial | Demonstrar que repetição não duplica efeitos e que todas as mutações sensíveis têm trilha adequada. |
| Importação/exportação | Parcial | Arquivos anonimizados representativos, codificações, linhas inválidas, deduplicação, desfazer e injeção de fórmulas CSV. |
| Backup/restore | Parcial | Ciclo exportar → validar → restaurar → comparar campos financeiros e rollback com falhas injetadas e ensaios reais. |
| Segurança e privacidade | Aberto | Threat model, dependências/segredos, avaliação de segurança e revisão dos limites do modo local-first. |
| Acessibilidade e usabilidade | Aberto | Teclado, foco, zoom, leitor de tela, contraste WCAG AA e teste moderado com usuários. |
| Performance e resiliência | Aberto | Medições com volumes grandes e orçamento definido; testes de falha e evidência armazenada. |
| Produto e escopo de integrações | Parcial | Auth real permanece desativada; Open Finance e sincronização remota não são produção e não podem ser anunciados como tais. |

## Critério de decisão

A Fase 0 só poderá ser fechada quando cada requisito aplicável do Plano Mestre tiver evidência registrada, os bloqueadores críticos/altos estiverem resolvidos ou formalmente tratados dentro do escopo, as jornadas financeiras críticas tiverem testes reproduzíveis, e os limites remanescentes forem explícitos. Passar `npm test` sozinho não satisfaz esse critério.
