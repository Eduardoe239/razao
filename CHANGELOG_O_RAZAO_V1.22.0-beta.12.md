# O Razão v1.22.0-beta.12

**Foco:** Fase 0 — comunicação honesta sobre inicialização e armazenamento Web.

## Alterações
- Removidas da splash screen as mensagens que afirmavam inicialização de banco de dados “seguro” e de criptografia AES-GCM-256, pois o fluxo exibido não comprova essas operações.
- Substituídas por mensagens genéricas de inicialização que não anunciam controles de segurança inexistentes.
- Na modalidade navegador, a splash agora informa que os dados ficam no navegador e que o armazenamento Web não oferece criptografia em repouso.
- Adicionado teste estático dedicado e incluído no comando `npm test`.
- Versão atualizada para `1.22.0-beta.12`.

## Validação
- `npm test`: executado nesta versão; resultado registrado na entrega.
- Teste dedicado da splash: 7 verificações.
- Nenhum build, instalador ou teste E2E visual foi executado; isso permanece fora desta rodada conforme o plano e as instruções do proprietário.

## Limites e decisão
- A divulgação não implementa criptografia nem substitui revisão visual/manual.
- A persistência Web continua usando `localStorage`, sem criptografia em repouso.
- **Fase 0 permanece aberta.** Ainda faltam inventário visual completo, validação E2E das jornadas críticas, revisão integral do isolamento PF/PJ e ensaios reais de falha/recuperação.
