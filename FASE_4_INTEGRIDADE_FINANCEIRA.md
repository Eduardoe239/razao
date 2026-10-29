# Fase 4 — Integridade do domínio financeiro (v17.4-beta.1)

## Escopo desta entrega

Esta etapa corrige uma falha material na formação das faturas de cartão: o cálculo anterior acumulava todas as compras até a data de fechamento de cada mês, o que podia incluir compras de ciclos anteriores novamente. Isso inflava as faturas e podia apresentar valores incorretos ao usuário.

### Alterações

- `src/domain/invoices.js`
  - Cada compra é alocada a um único ciclo: após o fechamento anterior e até o fechamento atual, inclusive.
  - A formação da fatura considera apenas despesas do cartão, excluindo registros cancelados.
  - Pagamentos vinculados à fatura são reconhecidos como transferências liquidadas, e não como despesas adicionais.
  - Datas de fechamento e vencimento são limitadas aos dias válidos de cada mês, inclusive fevereiro e anos bissextos.
  - A função `calculateInvoiceCycle` valida o formato básico da data e considera o próximo ciclo quando a data de referência já passou do fechamento.
- `scripts/test-full-system.mjs`
  - Corrigida a expectativa antiga que implicitamente aceitava a soma acumulada incorreta.
  - Adicionados testes para ciclos consecutivos, pagamento parcial, fechamento após o dia de corte e meses curtos.
  - Total: 101 verificações da suíte principal aprovadas nesta execução.

## Validação executada

- `node scripts/test-full-system.mjs`: 101 aprovados, 0 falhas.
- `node scripts/test-desktop-security.mjs`: 15 verificações estáticas aprovadas.
- `node scripts/test-persistence.mjs`: 9 verificações estáticas aprovadas.
- `node --check electron/main.cjs` e `node --check electron/preload.cjs`: sintaxe aprovada.
- `npm run build`: **não executado com sucesso**; o ambiente não tem `vite` instalado (`sh: vite: not found`). A instalação das dependências/build e o instalador Windows permanecem pendentes.

## Limites conhecidos — não confundir com produção

1. O modelo de faturas ainda é simplificado. Não há um livro-razão completo de passivos de cartão, estornos, parcelamentos complexos, juros, tarifas ou múltiplos cartões plenamente validados de ponta a ponta.
2. O pagamento da fatura continua sendo criado pela interface com a primeira conta disponível como origem; o fluxo precisa exigir seleção explícita da conta, validar saldo disponível e registrar a liquidação com vínculo inequívoco.
3. Não foram executados testes E2E em navegador ou Electron real nesta etapa.
4. Não foram validados Open Finance real, OCR de imagem real, autenticação remota ou sincronização com servidor.
5. Não usar esta versão para dados financeiros sensíveis de usuários externos até completar testes de integração, revisão de segurança, backup/restauração e build reproduzível.

## Próximos passos recomendados

1. Criar modelo explícito de transações com conta de origem/destino e ciclo de vida (pendente, liquidada, cancelada, estornada).
2. Implementar livro-razão para transferências e passivos de cartão, garantindo invariantes de saldo e trilha de auditoria.
3. Exigir seleção de conta para pagar fatura e prevenir saldo insuficiente, pagamentos repetidos e concorrência.
4. Adicionar testes baseados em propriedades e cenários de reconciliação de conta/fatura.
5. Instalar dependências de forma reproduzível, executar build e testes E2E, e só então trabalhar em instalador candidato a beta.
