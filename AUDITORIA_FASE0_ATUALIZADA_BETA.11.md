# Auditoria da Fase 0 — O Razão v1.22.0-beta.11

**Resultado:** Fase 0 **NÃO CONCLUÍDA**. Esta versão fecha parcialmente um risco conhecido, não autoriza introdução como release validada no GitHub.

## Alteração desta versão
A auditoria beta.1 identificou duas implementações de autenticação não seguras: `api/src/routes/userAuth.js` guardava usuários em memória, usava hash determinístico e gerava tokens `jwt_session_*`; `api/src/routes/auth.js` produzia um hash trivial rotulado como Argon2id e uma assinatura não compatível com JWT seguro. Na beta.11, os dois serviços foram desativados e agora falham fechado. O teste dedicado verifica que eles não geram hashes/tokens fictícios.

## Estado conhecido e gates restantes

| Área | Estado atual | Evidência/limitação | Gate |
|---|---|---|---|
| Autenticação remota | Desativada de forma explícita | Serviços falham fechado; não há login/cadastro de produção nem jornada de UI conectada | Aberto: definir e documentar local-first; autenticação remota só após implementação segura |
| Open Finance | Demonstrativo/mock | Não há integração real com instituição/provedor; não coletar credenciais bancárias | Aberto, pode ficar fora do escopo beta se explicitamente rotulado |
| Isolamento PF/PJ | Parcialmente corrigido | Há migração, orçamento e contexto preditivo testados, mas não há evidência E2E de todos os módulos e exportações | Bloqueador até revisão completa |
| Persistência e recuperação | Testes automatizados existentes | Falhas simuladas em código não substituem ensaios E2E de disco cheio, interrupção e recuperação completa | Aberto |
| Outbox/sincronização | Falha fechada em ausência de configuração, ainda sem sync remoto de produção | Não anunciar como sincronização remota funcional | Aberto; pode ser explicitamente fora do escopo |
| Fluxos financeiros | Cobertura automatizada de domínio disponível | Ainda faltam E2E de UI para todas as jornadas P0 e conferência independente com fixtures | Aberto |
| Segurança/privacidade | Não auditadas integralmente | Não há evidência de SAST/DAST, threat model concluído, revisão independente ou verificação formal de privacidade | Bloqueador de release público |
| UI/Acessibilidade | Não validada integralmente | Sem revisão visual manual completa e testes de teclado/leitor de tela documentados | Aberto |
| Build/empacotamento | Não executado | Adiado conforme instrução do proprietário; será necessário no gate de distribuição, não nesta etapa | Adiado até fase de packaging |

## Validação beta.11
- `npm test`: código de saída 0.
- 10 verificações dedicadas de autenticação desativada passaram.
- Os testes existentes são uma mistura de domínio, verificações estáticas e integrações simuladas; não equivalem a E2E real nem auditoria independente.

## Decisão
Não marcar a Fase 0 como concluída. Continuar por risco e dependência, preservando as limitações visíveis e sem habilitar login remoto, Open Finance real ou sync remoto sem infraestrutura, segurança e testes apropriados.

## Atualização beta.12 — comunicação de armazenamento

A splash screen foi corrigida para não afirmar que inicializa criptografia AES-GCM-256 nem descrever o banco local como “seguro” sem comprovação no fluxo de inicialização. Na modalidade Web, agora informa que os dados ficam no navegador e que `localStorage` não oferece criptografia em repouso. Um teste estático dedicado verifica essas mensagens.

**Limite:** isto corrige a comunicação, não implementa criptografia. A Fase 0 permanece **NÃO CONCLUÍDA**. Continuam pendentes os gates de validação E2E/manual, revisão PF/PJ completa e ensaios reais de recuperação e falha.
