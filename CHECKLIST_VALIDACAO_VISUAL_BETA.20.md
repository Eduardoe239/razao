# Checklist de validação visual — beta.20

Use uma cópia separada da beta.18/19. Não use dados financeiros importantes nos testes iniciais.

> **Execução registrada — 02/11/2026** (notebook do proprietário, Windows 11, Chrome com perfil temporário, dados 100% fictícios, automação Playwright).
> Relatório completo: [`docs/audit/fase0/RELATORIO_VALIDACAO_VISUAL_BETA20.md`](./docs/audit/fase0/RELATORIO_VALIDACAO_VISUAL_BETA20.md) · Evidências: [`docs/audit/fase0/evidencias/visual/INDICE.md`](./docs/audit/fase0/evidencias/visual/INDICE.md)
> Aprovada pelo proprietário como **evidência técnica da baseline** (decisão D-001, [`docs/PRODUCT/DECISIONS.md`](./docs/PRODUCT/DECISIONS.md)). Isso **não** fecha a Fase 0 nem aprova o produto.
> Legenda: `[x]` PASS · `[ ]` FAIL/não atendido (motivo ao lado). IDs `V-xx` no relatório; demais IDs em `docs/risks/RISK_REGISTER.md`.

## Inicialização
- [x] `npm.cmd install` conclui sem erro. — PASS via `npm ci` (fiel ao lockfile)
- [x] `npm.cmd test` conclui com código 0.
- [x] `npm.cmd run build` conclui sem erro.
- [x] `npm.cmd run dev` abre a aplicação e a leitura inicial não gera tela branca. — README aponta `127.0.0.1`, servidor responde em `localhost` (V-19)

## Larguras para validar no navegador
- [x] 375 × 812 — celular compacto. — PASS estrutural; alvos de toque de 22 px (V-12)
- [x] 390 × 844 — celular comum. — PASS estrutural
- [x] 768 × 1024 — tablet retrato. — PASS estrutural
- [x] 1024 × 768 — tablet paisagem / notebook compacto. — PASS estrutural
- [x] 1366 × 768 — notebook. — PASS estrutural
- [x] 1440 × 900 — monitor comum. — PASS estrutural; valor vaza da rosca em Relatórios (V-08)

## Jornadas por tela
- [ ] Dashboard: navegação de período, esconder/exibir valores, abrir lançamento, abrir diagnóstico. — ações PASS; **FAIL** de conteúdo: "Saldo disponível" diverge do saldo realizado e ignora lançamentos com data UTC (V-01, V-04 → FIN-05/FIN-08, P0)
- [x] Lançamentos: buscar, alterar status, editar, excluir após confirmação, abrir e limpar filtros, exportar CSV. — CSV neutraliza fórmulas
- [ ] Cartões: estado sem cartão, ciclo da fatura, pagamento e atualização da lista. — estado vazio PASS; **sem cadastro de cartão na UI (FUN-02)**; ciclo e pagamento PASS só com cartão fictício injetado
- [ ] Orçamentos: salvar limite, mostrar utilizado/restante e remover limite. — não mostra o restante (V-09)
- [ ] Relatórios: mudar período e ler tabelas/gráficos sem cortar valores. — valor grande vaza; "-12.0 meses" (V-08)
- [ ] Planejamento: pergunta sugerida, pergunta digitada no painel e pergunta enviada pela barra superior; trocar cenários; dispensar alerta. — ações PASS (dispensa testada no teste dedicado T1; não persiste, V-21); **resposta "sob controle" com saldo negativo (AI-01, P1)**
- [ ] Importação: abrir modal, validar arquivo/linhas, revisar possíveis duplicatas e cancelar sem aplicar. — valores errados, linha perdida sem aviso, estorno como saída (FIN-01, FIN-03, FIN-04)
- [x] Perfil: abrir edição e salvar dados.
- [x] Preferências: trocar paleta e densidade, navegar para fora e voltar para verificar persistência.
- [x] Histórico e integridade: tabelas rolam sem cortar controles; mensagens são legíveis.
- [ ] Recuperação/erro: textos não cortam e a ação destrutiva exige confirmação/backup. — textos e confirmações PASS; **recuperação silenciosa (DATA-02, P0)** e **recuperação local deixa o app vazio e sobrescreve a última cópia (DATA-05, teste dedicado T2)**

## Verificações transversais
- [ ] Nenhum texto importante fica truncado, sobreposto ou ilegível. — V-08
- [x] Nenhum botão fica fora da viewport, sob a navegação inferior ou atrás do menu.
- [x] A navegação móvel não cobre o último item da página.
- [ ] Foco visível pelo teclado, Escape fecha o menu móvel e controles podem ser alcançados sem mouse. — Escape fecha o menu (PASS); modais sem Escape/foco contido, campos sem rótulo, "Restaurar Backup" inacessível por teclado (V-10, V-11, V-13)
- [x] Zoom do navegador não quebra layout ou impede o uso dos controles. — 200% emulado
- [ ] Valores grandes, negativos e nomes compridos quebram linha de forma segura. — nomes OK; valor grande vaza (V-08)
- [ ] A cor, sozinha, não é a única indicação de receita, despesa, alerta ou falha. — revisão de importação usa só cor (V-14)

**Critério:** registrar qualquer falha com nome da tela, largura do viewport, passos para reproduzir e captura de tela. Não aprovar a Fase 0 apenas com base no teste automatizado.

**Não verificado nesta execução:** Electron/Windows desktop, leitor de tela, outros navegadores, dispositivos reais, `ErrorBoundary` Desktop.
