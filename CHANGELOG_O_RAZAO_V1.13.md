# O Razão — v1.13.0-beta.1

## Histórico de auditoria local
- Criado o domínio `src/domain/auditLog.js` para registrar eventos financeiros, limitar a trilha aos 500 eventos mais recentes e guardar snapshots financeiros minimizados.
- Integrado o histórico às ações de criação, edição e exclusão de lançamentos, mudança de situação, pagamento local de fatura, aplicação de ajuste de conciliação e resumo da importação conciliada.
- Adicionada a aba **Histórico de Auditoria**, com pesquisa, filtro por ação e visualização de snapshots anteriores/posteriores quando disponíveis.
- A sanitização preserva o histórico durante o ciclo salvar/recarregar e mantém eventos suspeitos/duplicados visíveis para o diagnóstico em vez de descartá-los silenciosamente.

## Limites
- O histórico não é retroativo e não recupera eventos anteriores à instalação desta versão.
- O log é local e mutável por quem tenha acesso aos dados persistidos. Não é imutável, criptograficamente assinado ou enviado a um servidor.
