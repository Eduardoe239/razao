# O Razão 17.1 — primeira rodada de remediação

## Objetivo desta entrega
Corrigir defeitos locais evidenciados pela auditoria e deixar explícito o que ainda não pode ser considerado produção. Esta entrega não é uma certificação de segurança nem autoriza beta público com dados financeiros reais.

## Correções incluídas
- A tela de orçamento agora permite definir, acompanhar e remover limites mensais por categoria, preservando limite explícito de R$ 0,00.
- A aba de configurações agora recebe o contrato correto (`settings` e `onSaveSettings`) em vez de props incompatíveis.
- O mês exibido no navegador do painel é dinâmico e os botões anterior/próximo alteram o mês.
- O aplicativo deixa de inventar um cartão quando nenhum cartão foi cadastrado; a tela de faturas explica o estado vazio.
- Removidos nome, e-mail e telefone fictícios predefinidos do perfil inicial.
- O estado sanitizado preserva `budgets`, `settings` e outros campos de estado, em vez de descartá-los.
- A previsão passa a calcular saldo projetado acumulado entre meses e aceita saldo inicial por contas ou parâmetro explícito. Recorrências e cartões continuam sem projeção automática nesta etapa.
- A quitação da fatura não é mais lançada como uma segunda despesa. O registro como transferência é uma mitigação provisória; a quitação definitiva deve ser implementada com conta de origem, validação de saldo, vínculo à fatura e conciliação.
- O modo desktop de desenvolvimento aponta para a porta padrão 5173 do Vite; sandbox do renderer foi ativado e navegação/janelas externas bloqueadas por padrão.
- Versão do pacote atualizada para `17.1.0-beta.1` e rótulos de testes corrigidos para não chamar a suíte mockada de E2E/certificação.

## Validação realizada
- `npm test`: 96 verificações do script principal aprovadas e 5 verificações da fila de sincronização aprovadas.
- `npm install --ignore-scripts --no-audit --no-fund`: excedeu o limite de execução do ambiente. Por isso, `vite build`, testes de renderização React, empacotamento Electron e instalador Windows permanecem **não verificados** nesta sessão.

## Bloqueadores antes de beta público
1. **Segurança e armazenamento:** retirar chave/salt criptográficos embutidos; eliminar fallback em texto puro; escolher estratégia real de gestão de chaves; criptografar o arquivo desktop; reconciliar migração e recuperação; não anunciar “zero-knowledge” ou “criptografia segura” antes de validação independente.
2. **Persistência:** substituir o boot síncrono incompatível com IPC por inicialização assíncrona única; evitar duas fontes concorrentes (localStorage e arquivo desktop); adicionar backup, restauração, exportação e migrações transacionais.
3. **Faturas e saldos:** criar fluxo de quitação com conta de origem, conta de destino/entidade de cartão, pagamentos parciais, estornos e idempotência; auditar todas as métricas contra casos de referência.
4. **Autenticação e backend:** o serviço atual em memória e token simulado não são autenticação de produção. Exigir hash de senha robusto (Argon2id/scrypt), sessões/token reais, limites de tentativa, persistência, validação de entrada e testes de segurança.
5. **Open Finance:** só integrar por provedor autorizado, consentimento real, renovação/revogação e política de dados. Até lá, apresentar como planejamento ou conexão indisponível, nunca como conexão bancária real.
6. **OCR:** substituir resultado de exemplo por motor OCR real e indicar claramente confiança, revisão manual e origem do dado.
7. **Sincronização:** remover sucesso simulado por padrão; usar endpoint real, autenticação, idempotência, backoff, resolução explícita de conflito e estados observáveis.
8. **Qualidade:** configurar testes unitários separados de testes de integração e E2E (Playwright), lint, checagem de tipos, análise de dependências e CI. Cobrir importação, duplicidade, datas, centavos, parcelas, transferências, faturas e backup/restore.
9. **Interface e acessibilidade:** aplicar tema salvo de fato, conectar modo de privacidade à UI, implementar filtros por período de verdade, estados vazios, validação e mensagens consistentes, navegação por teclado e layouts mobile/desktop.
10. **Lançamento Windows:** verificar build reproduzível, sandbox, CSP, validação de IPC, assinatura do instalador, atualização e teste em Windows limpo.

## Comparativo funcional de referência
- **Organizze:** contas e cartões, faturas, limites, relatórios, alertas e importação/conexão bancária.
- **Minhas Economias:** Open Finance com consentimento, contas manuais, orçamento por categoria, metas, alertas, tags e extrato filtrável.
- **Wallet (BudgetBakers):** orçamento flexível, pagamentos planejados, regras/categorização, relatórios, importação/exportação e sincronização bancária.

O Razão deve competir com diferenciação em: privacidade local-first verificável, explicação auditável dos cálculos, orçamento com previsão de fluxo de caixa, conciliação transparente, importação robusta e uma IA assistiva que nunca invente saldos ou se passe por consultoria financeira profissional.

## Referências oficiais consultadas
- Electron Security: https://www.electronjs.org/docs/latest/tutorial/security/
- OWASP ASVS 5.0: https://asvs.owasp.org/
- Organizze: https://www.organizze.com.br/
- Organizze — funcionalidades: https://ajuda.organizze.com.br/hc/pt-br/sections/5662518219027-Funcionalidades
- Minhas Economias — funcionalidades: https://faq.minhaseconomias.com.br/hc/pt-br/articles/35593611981595-O-que-%C3%A9-o-Minhas-Economias
- Minhas Economias — Open Finance: https://faq.minhaseconomias.com.br/hc/pt-br/articles/35613748858651-Open-Finance-o-que-%C3%A9-e-como-funciona
- Wallet: https://budgetbakers.com/en/products/wallet/
- Wallet — funcionalidades: https://budgetbakers.com/en/products/wallet/features/
