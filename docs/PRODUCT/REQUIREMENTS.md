# O Razão — Requisitos de produto

Requisitos com ID e critérios de aceite (Plano Mestre §81, §93). Estado: `APROVADO` (decidido pelo proprietário, ainda não implementado) · `EM IMPLEMENTAÇÃO` · `IMPLEMENTADO` (com evidência).

---

## REQ-INV-PAY-001 — Registrar pagamento de fatura com saldo insuficiente

- **Estado:** APROVADO — **não implementado** (decisão D-005, 02/11/2026)
- **Fase alvo:** Alpha 3 (cartões e faturas, Plano §71), sujeito às dependências abaixo
- **Prioridade:** P1
- **Domínio:** cartões, ledger, auditoria

### Contexto
Na beta.20, `prepareInvoicePayment` bloqueia o registro quando a conta de origem não tem saldo ("Saldo insuficiente na conta selecionada para quitar esta fatura. Nenhuma movimentação foi criada." — evidência `docs/audit/fase0/evidencias/visual/13-cartoes/apos-pagamento.png`). O Razão registra fatos financeiros já ocorridos; um pagamento feito no banco com cheque especial ou limite precisa poder ser registrado.

### Comportamento esperado
1. O usuário pode registrar um pagamento **já realizado** mesmo que o saldo resultante da conta de origem fique negativo.
2. Antes de confirmar, a interface:
   - informa a insuficiência de saldo;
   - apresenta o saldo atual e o **saldo resultante** da conta de origem;
   - solicita **confirmação explícita** (diálogo acessível, não `window.confirm`/`prompt`).
3. Confirmado, o pagamento é registrado como transferência conta → cartão, uma única vez, auditado, sem criar despesa nova (Plano §64.4).
4. Pagamento **planejado/agendado** nunca é exibido como concluído; status e rótulos distinguem "planejado" de "pago".
5. Em integrações bancárias futuras, a execução segue a **resposta efetiva do provedor**; o Razão não marca como pago sem confirmação do provedor (Plano C.3, §55).

### Critérios de aceite
- [ ] Conta com saldo R$ 100,00 e fatura R$ 320,50: a UI mostra aviso, saldo resultante −R$ 220,50 e exige confirmação.
- [ ] Recusar a confirmação não cria movimentação nem evento de auditoria de pagamento.
- [ ] Confirmar cria exatamente 1 transferência; a fatura fica paga; despesas do período não mudam; saldo da conta = −R$ 220,50.
- [ ] Duplo clique/reenvio não cria segundo pagamento (idempotência persistida).
- [ ] Pagamento planejado aparece como "planejado", não "pago", em fatura, painel e lista.
- [ ] Falha de gravação não exibe sucesso (Plano §64.11).
- [ ] Operação restrita ao workspace ativo; nenhum dado de outro workspace afetado.
- [ ] Navegável por teclado e leitor de tela.

### Testes previstos
Unitários de domínio (`invoicePayment`), invariantes (sem dupla contagem, idempotência), integração com persistência, E2E Chromium nas larguras 375 e 1440, acessibilidade do diálogo.

### Dependências
P0-5 (sucesso só após persistência), FUN-02 (cadastro de cartão), FUN-09 (pagamento parcial / refazer pagamento cancelado), FIN-08 (conceito único de saldo), substituição de `window.prompt` (FUN-08).

### Fora do escopo
Execução de pagamentos reais; Open Finance; agendamento automático.
