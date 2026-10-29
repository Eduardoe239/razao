# Checklist de validação visual — beta.20

Use uma cópia separada da beta.18/19. Não use dados financeiros importantes nos testes iniciais.

## Inicialização
- [ ] `npm.cmd install` conclui sem erro.
- [ ] `npm.cmd test` conclui com código 0.
- [ ] `npm.cmd run build` conclui sem erro.
- [ ] `npm.cmd run dev` abre a aplicação e a leitura inicial não gera tela branca.

## Larguras para validar no navegador
- [ ] 375 × 812 — celular compacto.
- [ ] 390 × 844 — celular comum.
- [ ] 768 × 1024 — tablet retrato.
- [ ] 1024 × 768 — tablet paisagem / notebook compacto.
- [ ] 1366 × 768 — notebook.
- [ ] 1440 × 900 — monitor comum.

## Jornadas por tela
- [ ] Dashboard: navegação de período, esconder/exibir valores, abrir lançamento, abrir diagnóstico.
- [ ] Lançamentos: buscar, alterar status, editar, excluir após confirmação, abrir e limpar filtros, exportar CSV.
- [ ] Cartões: estado sem cartão, ciclo da fatura, pagamento e atualização da lista.
- [ ] Orçamentos: salvar limite, mostrar utilizado/restante e remover limite.
- [ ] Relatórios: mudar período e ler tabelas/gráficos sem cortar valores.
- [ ] Planejamento: pergunta sugerida, pergunta digitada no painel e pergunta enviada pela barra superior; trocar cenários; dispensar alerta.
- [ ] Importação: abrir modal, validar arquivo/linhas, revisar possíveis duplicatas e cancelar sem aplicar.
- [ ] Perfil: abrir edição e salvar dados.
- [ ] Preferências: trocar paleta e densidade, navegar para fora e voltar para verificar persistência.
- [ ] Histórico e integridade: tabelas rolam sem cortar controles; mensagens são legíveis.
- [ ] Recuperação/erro: textos não cortam e a ação destrutiva exige confirmação/backup.

## Verificações transversais
- [ ] Nenhum texto importante fica truncado, sobreposto ou ilegível.
- [ ] Nenhum botão fica fora da viewport, sob a navegação inferior ou atrás do menu.
- [ ] A navegação móvel não cobre o último item da página.
- [ ] Foco visível pelo teclado, Escape fecha o menu móvel e controles podem ser alcançados sem mouse.
- [ ] Zoom do navegador não quebra layout ou impede o uso dos controles.
- [ ] Valores grandes, negativos e nomes compridos quebram linha de forma segura.
- [ ] A cor, sozinha, não é a única indicação de receita, despesa, alerta ou falha.

**Critério:** registrar qualquer falha com nome da tela, largura do viewport, passos para reproduzir e captura de tela. Não aprovar a Fase 0 apenas com base no teste automatizado.
