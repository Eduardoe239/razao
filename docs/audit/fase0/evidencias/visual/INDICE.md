# Índice das evidências visuais — validação beta.20

**Gerado em:** 02/11/2026 · **Arquivos:** 159 PNG · **Total:** 15.8 MiB · **Integridade:** `SHA256SUMS` (mesma pasta)

As capturas são os **originais** da validação, sem redimensionamento ou substituição posterior. Durante a própria validação, alguns arquivos foram regravados por reexecuções do roteiro antes da ordem de preservação (ver "Reexecuções" abaixo). ★ = evidência selecionada (citada nos relatórios). `PASS*` = obtido com cartão fictício injetado no perfil temporário (não existe cadastro de cartão na UI).

Relatórios: [`../../RELATORIO_VALIDACAO_VISUAL_BETA20.md`](../../RELATORIO_VALIDACAO_VISUAL_BETA20.md). Roteiros: `_roteiros/`. Saídas brutas: `_resultados/`. Dados: 100% fictícios.

## Reexecuções durante a validação
- `responsivo/375x812/modal-lancamento.png` e `responsivo/1440x900/modal-lancamento.png`: recapturados após 1,2 s (a primeira captura pegou a animação de abertura).
- `responsivo/{375x812,390x844}/*-fim-da-pagina.png`: recapturados com rolagem real (a primeira medição não rolava o documento).
- `responsivo/{375x812,390x844}/modal-diagnostico.png`: capturados pelo menu móvel (o botão da barra superior não existe nessas larguras).
- Módulos `01`–`14`: segunda execução do roteiro funcional (a primeira falhou a partir de Perfil por um modal deixado aberto pelo próprio roteiro).

| ★ | Arquivo | Resolução | Tela | Fluxo | Resultado | Bytes |
|---|---|---|---|---|---|---|
|  | [`01-inicializacao/primeira-leitura-vazia-1440.png`](./01-inicializacao/primeira-leitura-vazia-1440.png) | 1440×900 | Visão geral (vazia) | Primeira leitura sem tela branca | PASS | 148433 |
| ★ | [`01-inicializacao/splash-1440.png`](./01-inicializacao/splash-1440.png) | 1440×900 | Splash | Inicialização | PASS | 19245 |
|  | [`02-dashboard/conferir-saldo-extrato.png`](./02-dashboard/conferir-saldo-extrato.png) | 1440×900 | Conferência de saldo | Abrir modal (somente leitura) | PASS (Escape não fecha — V-10) | 190482 |
| ★ | [`02-dashboard/dashboard-com-dados-1440.png`](./02-dashboard/dashboard-com-dados-1440.png) | 1440×900 | Visão geral | Dados fictícios; saldo disponível R$ 0,00 × realizado negativo; datas UTC/ISO; receita "Alimentação" | FAIL (V-01, V-03, V-04, V-17) | 171303 |
|  | [`02-dashboard/diagnostico-aberto.png`](./02-dashboard/diagnostico-aberto.png) | 1440×900 | Diagnóstico | Abrir diagnóstico | PASS (Escape não fecha — V-10) | 204461 |
|  | [`02-dashboard/periodo-3-meses.png`](./02-dashboard/periodo-3-meses.png) | 1440×900 | Visão geral | Navegação de período | PASS | 171512 |
| ★ | [`02-dashboard/valores-ocultos.png`](./02-dashboard/valores-ocultos.png) | 1440×900 | Visão geral | Ocultar valores | PASS | 160567 |
|  | [`03-lancamentos/busca-mercado.png`](./03-lancamentos/busca-mercado.png) | 1440×900 | Lançamentos | Busca | PASS | 82455 |
|  | [`03-lancamentos/filtro-valor-minimo.png`](./03-lancamentos/filtro-valor-minimo.png) | 1440×900 | Lançamentos | Filtro avançado | PASS | 90416 |
|  | [`03-lancamentos/lista-1440.png`](./03-lancamentos/lista-1440.png) | 1440×900 | Lançamentos | Lista com nomes longos e valores grandes | PASS | 119167 |
| ★ | [`03-lancamentos/modal-novo-lancamento.png`](./03-lancamentos/modal-novo-lancamento.png) | 1440×900 | Modal de lançamento | Data padrão 03/11 às 23h de 02/11 (UTC) | FAIL (V-01/FIN-05) | 213882 |
|  | [`04-recorrencias-compromissos/recorrencia-adicionada.png`](./04-recorrencias-compromissos/recorrencia-adicionada.png) | 1440×900 | Visão geral | Recorrência e próximos compromissos | PASS | 181613 |
| ★ | [`05-orcamentos/limite-salvo.png`](./05-orcamentos/limite-salvo.png) | 1440×900 | Orçamentos | Salvar limite; sem valor restante | FAIL (V-09) | 81119 |
|  | [`05-orcamentos/orcamento-inicial.png`](./05-orcamentos/orcamento-inicial.png) | 1440×900 | Orçamentos | Estado inicial | PASS | 77496 |
|  | [`06-relatorios/relatorios-padrao.png`](./06-relatorios/relatorios-padrao.png) | 1440×900 | Relatórios | Período padrão | PASS | 134181 |
| ★ | [`06-relatorios/relatorios-periodo-alterado.png`](./06-relatorios/relatorios-periodo-alterado.png) | 1440×900 | Relatórios | Mudança de período; valor vaza da rosca; "-12.0 meses" | FAIL (V-08) | 130414 |
|  | [`07-planejamento/cenario.png`](./07-planejamento/cenario.png) | 1440×900 | Planejamento | Troca de cenários | PASS | 136935 |
| ★ | [`07-planejamento/pergunta-barra-superior.png`](./07-planejamento/pergunta-barra-superior.png) | 1440×900 | Planejamento | Pergunta pela barra; resposta "sob controle" com saldo negativo | FAIL (AI-01) | 136935 |
|  | [`07-planejamento/pergunta-sugerida.png`](./07-planejamento/pergunta-sugerida.png) | 1440×900 | Planejamento | Pergunta sugerida | PASS | 139546 |
|  | [`07-planejamento/planejamento-inicial.png`](./07-planejamento/planejamento-inicial.png) | 1440×900 | Planejamento | Estado inicial | PASS | 124593 |
|  | [`08-importacao/modal-importacao.png`](./08-importacao/modal-importacao.png) | 1440×900 | Importador | Abrir modal (rótulo de demonstração) | PASS | 152031 |
| ★ | [`08-importacao/revisao-duplicatas.png`](./08-importacao/revisao-duplicatas.png) | 1440×900 | Importador | Revisão: R$ 450,00 para -4.50; linha D'Avila ausente; estorno como saída; tipo só por cor | FAIL (FIN-01, FIN-03, FIN-04, V-14) | 146805 |
|  | [`08-importacao/tela-importar.png`](./08-importacao/tela-importar.png) | 1440×900 | Importar dados | Tela | PASS | 67939 |
|  | [`09-perfil/perfil-edicao.png`](./09-perfil/perfil-edicao.png) | 1440×900 | Perfil | Edição e salvamento | PASS | 80555 |
|  | [`09-perfil/perfil-resumo.png`](./09-perfil/perfil-resumo.png) | 1440×900 | Perfil | Resumo | PASS | 129506 |
|  | [`10-preferencias/apos-recarregar.png`](./10-preferencias/apos-recarregar.png) | 1440×900 | Preferências | Persistência após recarregar | PASS | 95680 |
|  | [`10-preferencias/ardosia-compacto.png`](./10-preferencias/ardosia-compacto.png) | 1440×900 | Preferências | Trocar paleta e densidade | PASS | 95680 |
|  | [`10-preferencias/preferencias-padrao.png`](./10-preferencias/preferencias-padrao.png) | 1440×900 | Preferências | Padrão | PASS | 95647 |
|  | [`11-historico-integridade/historico.png`](./11-historico-integridade/historico.png) | 1440×900 | Histórico de Auditoria | Tabela/lista | PASS | 249367 |
|  | [`11-historico-integridade/integridade-executada.png`](./11-historico-integridade/integridade-executada.png) | 1440×900 | Integridade | Verificação | PASS | 78098 |
|  | [`11-historico-integridade/integridade.png`](./11-historico-integridade/integridade.png) | 1440×900 | Integridade | Tela | PASS | 78098 |
|  | [`12-pf-pj/lancamentos-pj.png`](./12-pf-pj/lancamentos-pj.png) | 1440×900 | Lançamentos (PJ) | PJ não exibe dados PF (filtro de exibição) | PASS | 84282 |
|  | [`13-cartoes/apos-pagamento.png`](./13-cartoes/apos-pagamento.png) | 1440×900 | Cartões | Pagamento bloqueado por saldo insuficiente (cartão injetado) | Observação → requisito REQ-INV-PAY-001 | 74081 |
|  | [`13-cartoes/ciclo-fatura-cartao-ficticio.png`](./13-cartoes/ciclo-fatura-cartao-ficticio.png) | 1440×900 | Cartões | Ciclo com cartão INJETADO | PASS* | 74081 |
|  | [`13-cartoes/dashboard-apos-pagamento.png`](./13-cartoes/dashboard-apos-pagamento.png) | 1440×900 | Visão geral | Despesas inalteradas após pagamento (sem dupla contagem) | PASS* | 158878 |
| ★ | [`13-cartoes/estado-sem-cartao.png`](./13-cartoes/estado-sem-cartao.png) | 1440×900 | Cartões | Estado sem cartão; sem cadastro de cartão | PASS (estado) / FAIL (FUN-02) | 64260 |
| ★ | [`13-cartoes/pagamento-saldo-suficiente.png`](./13-cartoes/pagamento-saldo-suficiente.png) | 1440×900 | Cartões | Pagamento: 1 transferência, fatura PAGA (cartão injetado) | PASS* | 72821 |
|  | [`14-recuperacao/apos-exportar-backup.png`](./14-recuperacao/apos-exportar-backup.png) | 1440×900 | Diagnóstico | Exportar backup (JSON legível, sem aviso) | FAIL (SEC-03) | 207810 |
| ★ | [`14-recuperacao/principal-corrompido-com-copia.png`](./14-recuperacao/principal-corrompido-com-copia.png) | 1440×900 | Visão geral | Recuperação silenciosa (principal corrompido, cópia válida) | FAIL (DATA-02) | 146310 |
|  | [`14-recuperacao/restaurar-confirmacao.png`](./14-recuperacao/restaurar-confirmacao.png) | 1440×900 | Diagnóstico | Restaurar backup com confirmação | PASS | 209244 |
|  | [`14-recuperacao/sem-copia-valida-375.png`](./14-recuperacao/sem-copia-valida-375.png) | 375×812 | Recuperação segura | Textos sem corte | PASS | 42224 |
|  | [`14-recuperacao/sem-copia-valida.png`](./14-recuperacao/sem-copia-valida.png) | 1440×900 | Recuperação segura | Sem cópia válida: fail-closed | PASS | 51780 |
| ★ | [`acessibilidade/foco-modal-lancamento.png`](./acessibilidade/foco-modal-lancamento.png) | 1440×900 | Modal de lançamento | Foco não contido no modal | FAIL (V-10) | 168507 |
|  | [`acessibilidade/foco-teclado-1440.png`](./acessibilidade/foco-teclado-1440.png) | 1440×900 | Visão geral | Ordem de foco por Tab | PASS parcial (busca sem indicador — V-13) | 108041 |
| ★ | [`dedicados/alerta/01-alerta-gerado.png`](./dedicados/alerta/01-alerta-gerado.png) | 1440×900 | Planejamento | T1: alerta gerado com duplicidade sintética | PASS | 125947 |
| ★ | [`dedicados/alerta/02-alerta-dispensado.png`](./dedicados/alerta/02-alerta-dispensado.png) | 1440×900 | Planejamento | T1: alerta dispensado pelo teclado | PASS | 124351 |
| ★ | [`dedicados/alerta/03-apos-recarregar.png`](./dedicados/alerta/03-apos-recarregar.png) | 1440×900 | Planejamento | T1: alerta reaparece após recarregar | FAIL (V-21) | 125947 |
| ★ | [`dedicados/recuperacao-local/01-tela-erro-interface.png`](./dedicados/recuperacao-local/01-tela-erro-interface.png) | 1440×900 | Erro de interface (ErrorBoundary) | T2: falha injetada no harness | PASS (tela) | 33056 |
|  | [`dedicados/recuperacao-local/01b-tela-erro-interface-375.png`](./dedicados/recuperacao-local/01b-tela-erro-interface-375.png) | 375×812 | Erro de interface (ErrorBoundary) | T2: textos em 375 | PASS | 25910 |
| ★ | [`dedicados/recuperacao-local/02-apos-recuperacao-local.png`](./dedicados/recuperacao-local/02-apos-recuperacao-local.png) | 1440×900 | Visão geral | T2: app reabre vazio sem aviso; LKG sobrescrito | FAIL (DATA-05) | 148433 |
| ★ | [`dedicados/recuperacao-local/03-diagnostico-apos-recuperacao.png`](./dedicados/recuperacao-local/03-diagnostico-apos-recuperacao.png) | 1440×900 | Diagnóstico | T2: nenhuma cópia acessível pela UI | FAIL (DATA-05) | 191004 |
|  | [`responsivo/1024x768/cartoes.png`](./responsivo/1024x768/cartoes.png) | 1024×768 | Cartões | Varredura responsiva | PASS (estrutura) | 61866 |
| ★ | [`responsivo/1024x768/dashboard.png`](./responsivo/1024x768/dashboard.png) | 1024×768 | Visão geral | Varredura responsiva | PASS (estrutura) / conteúdo: V-01, V-04 | 176657 |
|  | [`responsivo/1024x768/historico.png`](./responsivo/1024x768/historico.png) | 1024×768 | Histórico de Auditoria | Varredura responsiva | PASS (estrutura) | 238093 |
|  | [`responsivo/1024x768/importar.png`](./responsivo/1024x768/importar.png) | 1024×768 | Importar dados | Varredura responsiva | PASS (estrutura) | 57606 |
|  | [`responsivo/1024x768/integridade.png`](./responsivo/1024x768/integridade.png) | 1024×768 | Integridade | Varredura responsiva | PASS (estrutura) | 71025 |
|  | [`responsivo/1024x768/lancamentos.png`](./responsivo/1024x768/lancamentos.png) | 1024×768 | Lançamentos | Varredura responsiva | PASS (estrutura) | 111190 |
|  | [`responsivo/1024x768/modal-diagnostico.png`](./responsivo/1024x768/modal-diagnostico.png) | 1024×768 | Diagnóstico | Varredura responsiva | PASS (estrutura) | 109169 |
|  | [`responsivo/1024x768/modal-importacao.png`](./responsivo/1024x768/modal-importacao.png) | 1024×768 | Modal de importação | Varredura responsiva | PASS (estrutura) | 115035 |
|  | [`responsivo/1024x768/modal-lancamento.png`](./responsivo/1024x768/modal-lancamento.png) | 1024×768 | Modal de lançamento | Varredura responsiva | PASS (layout) / campos sem rótulo (V-11) | 168360 |
|  | [`responsivo/1024x768/orcamentos.png`](./responsivo/1024x768/orcamentos.png) | 1024×768 | Orçamentos | Varredura responsiva | PASS (estrutura) | 65738 |
|  | [`responsivo/1024x768/perfil.png`](./responsivo/1024x768/perfil.png) | 1024×768 | Perfil | Varredura responsiva | PASS (estrutura) | 120627 |
|  | [`responsivo/1024x768/planejamento.png`](./responsivo/1024x768/planejamento.png) | 1024×768 | Planejamento | Varredura responsiva | PASS (estrutura) | 115268 |
|  | [`responsivo/1024x768/preferencias.png`](./responsivo/1024x768/preferencias.png) | 1024×768 | Preferências | Varredura responsiva | PASS (estrutura) | 86030 |
|  | [`responsivo/1024x768/relatorios.png`](./responsivo/1024x768/relatorios.png) | 1024×768 | Relatórios | Varredura responsiva | PASS (estrutura) | 126460 |
|  | [`responsivo/1366x768/cartoes.png`](./responsivo/1366x768/cartoes.png) | 1366×768 | Cartões | Varredura responsiva | PASS (estrutura) | 66053 |
| ★ | [`responsivo/1366x768/dashboard.png`](./responsivo/1366x768/dashboard.png) | 1366×768 | Visão geral | Varredura responsiva | PASS (estrutura) / conteúdo: V-01, V-04 | 181753 |
|  | [`responsivo/1366x768/historico.png`](./responsivo/1366x768/historico.png) | 1366×768 | Histórico de Auditoria | Varredura responsiva | PASS (estrutura) | 243732 |
|  | [`responsivo/1366x768/importar.png`](./responsivo/1366x768/importar.png) | 1366×768 | Importar dados | Varredura responsiva | PASS (estrutura) | 60803 |
|  | [`responsivo/1366x768/integridade.png`](./responsivo/1366x768/integridade.png) | 1366×768 | Integridade | Varredura responsiva | PASS (estrutura) | 72474 |
|  | [`responsivo/1366x768/lancamentos.png`](./responsivo/1366x768/lancamentos.png) | 1366×768 | Lançamentos | Varredura responsiva | PASS (estrutura) | 115663 |
|  | [`responsivo/1366x768/modal-diagnostico.png`](./responsivo/1366x768/modal-diagnostico.png) | 1366×768 | Diagnóstico | Varredura responsiva | PASS (estrutura) | 127077 |
|  | [`responsivo/1366x768/modal-importacao.png`](./responsivo/1366x768/modal-importacao.png) | 1366×768 | Modal de importação | Varredura responsiva | PASS (estrutura) | 134746 |
|  | [`responsivo/1366x768/modal-lancamento.png`](./responsivo/1366x768/modal-lancamento.png) | 1366×768 | Modal de lançamento | Varredura responsiva | PASS (layout) / campos sem rótulo (V-11) | 192000 |
|  | [`responsivo/1366x768/orcamentos.png`](./responsivo/1366x768/orcamentos.png) | 1366×768 | Orçamentos | Varredura responsiva | PASS (estrutura) | 69363 |
|  | [`responsivo/1366x768/perfil.png`](./responsivo/1366x768/perfil.png) | 1366×768 | Perfil | Varredura responsiva | PASS (estrutura) | 119439 |
|  | [`responsivo/1366x768/planejamento.png`](./responsivo/1366x768/planejamento.png) | 1366×768 | Planejamento | Varredura responsiva | PASS (estrutura) | 121351 |
|  | [`responsivo/1366x768/preferencias.png`](./responsivo/1366x768/preferencias.png) | 1366×768 | Preferências | Varredura responsiva | PASS (estrutura) | 89556 |
|  | [`responsivo/1366x768/relatorios.png`](./responsivo/1366x768/relatorios.png) | 1366×768 | Relatórios | Varredura responsiva | PASS (estrutura) | 131387 |
|  | [`responsivo/1440x900/cartoes.png`](./responsivo/1440x900/cartoes.png) | 1440×900 | Cartões | Varredura responsiva | PASS (estrutura) | 74081 |
|  | [`responsivo/1440x900/dashboard.png`](./responsivo/1440x900/dashboard.png) | 1440×900 | Visão geral | Varredura responsiva | PASS (estrutura) / conteúdo: V-01, V-04 | 189391 |
|  | [`responsivo/1440x900/historico.png`](./responsivo/1440x900/historico.png) | 1440×900 | Histórico de Auditoria | Varredura responsiva | PASS (estrutura) | 249367 |
|  | [`responsivo/1440x900/importar.png`](./responsivo/1440x900/importar.png) | 1440×900 | Importar dados | Varredura responsiva | PASS (estrutura) | 67929 |
|  | [`responsivo/1440x900/integridade.png`](./responsivo/1440x900/integridade.png) | 1440×900 | Integridade | Varredura responsiva | PASS (estrutura) | 77772 |
|  | [`responsivo/1440x900/lancamentos.png`](./responsivo/1440x900/lancamentos.png) | 1440×900 | Lançamentos | Varredura responsiva | PASS (estrutura) | 122445 |
|  | [`responsivo/1440x900/modal-diagnostico.png`](./responsivo/1440x900/modal-diagnostico.png) | 1440×900 | Diagnóstico | Varredura responsiva | PASS (estrutura) | 142150 |
|  | [`responsivo/1440x900/modal-importacao.png`](./responsivo/1440x900/modal-importacao.png) | 1440×900 | Modal de importação | Varredura responsiva | PASS (estrutura) | 152022 |
|  | [`responsivo/1440x900/modal-lancamento.png`](./responsivo/1440x900/modal-lancamento.png) | 1440×900 | Modal de lançamento | Varredura responsiva | PASS (layout) / campos sem rótulo (V-11) | 192278 |
|  | [`responsivo/1440x900/orcamentos.png`](./responsivo/1440x900/orcamentos.png) | 1440×900 | Orçamentos | Varredura responsiva | PASS (estrutura) | 77498 |
|  | [`responsivo/1440x900/perfil.png`](./responsivo/1440x900/perfil.png) | 1440×900 | Perfil | Varredura responsiva | PASS (estrutura) | 129043 |
|  | [`responsivo/1440x900/planejamento.png`](./responsivo/1440x900/planejamento.png) | 1440×900 | Planejamento | Varredura responsiva | PASS (estrutura) | 128280 |
|  | [`responsivo/1440x900/preferencias.png`](./responsivo/1440x900/preferencias.png) | 1440×900 | Preferências | Varredura responsiva | PASS (estrutura) | 95647 |
|  | [`responsivo/1440x900/relatorios.png`](./responsivo/1440x900/relatorios.png) | 1440×900 | Relatórios | Varredura responsiva | FAIL (V-08) | 138784 |
|  | [`responsivo/375x812/cartoes.png`](./responsivo/375x812/cartoes.png) | 375×812 | Cartões | Varredura responsiva | PASS (estrutura) | 36883 |
| ★ | [`responsivo/375x812/dashboard-fim-da-pagina.png`](./responsivo/375x812/dashboard-fim-da-pagina.png) | 375×812 | Visão geral | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 30861 |
|  | [`responsivo/375x812/dashboard.png`](./responsivo/375x812/dashboard.png) | 375×812 | Visão geral | Varredura responsiva | PASS (estrutura) / conteúdo: V-01, V-04 | 143153 |
|  | [`responsivo/375x812/historico.png`](./responsivo/375x812/historico.png) | 375×812 | Histórico de Auditoria | Varredura responsiva | PASS (estrutura) | 198107 |
|  | [`responsivo/375x812/importar.png`](./responsivo/375x812/importar.png) | 375×812 | Importar dados | Varredura responsiva | PASS (estrutura) | 32020 |
|  | [`responsivo/375x812/integridade-fim-da-pagina.png`](./responsivo/375x812/integridade-fim-da-pagina.png) | 375×812 | Integridade | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 36776 |
|  | [`responsivo/375x812/integridade.png`](./responsivo/375x812/integridade.png) | 375×812 | Integridade | Varredura responsiva | PASS (estrutura) | 41720 |
|  | [`responsivo/375x812/lancamentos-fim-da-pagina.png`](./responsivo/375x812/lancamentos-fim-da-pagina.png) | 375×812 | Lançamentos | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 41026 |
| ★ | [`responsivo/375x812/lancamentos.png`](./responsivo/375x812/lancamentos.png) | 375×812 | Lançamentos | Varredura responsiva | PASS (estrutura) | 86404 |
| ★ | [`responsivo/375x812/menu-movel-aberto.png`](./responsivo/375x812/menu-movel-aberto.png) | 375×812 | Menu móvel | Varredura responsiva | PASS (Escape fecha; foco não entra no menu — V-13) | 38055 |
|  | [`responsivo/375x812/modal-diagnostico.png`](./responsivo/375x812/modal-diagnostico.png) | 375×812 | Diagnóstico | Varredura responsiva | PASS (estrutura) | 49734 |
|  | [`responsivo/375x812/modal-importacao.png`](./responsivo/375x812/modal-importacao.png) | 375×812 | Modal de importação | Varredura responsiva | PASS (estrutura) | 45859 |
| ★ | [`responsivo/375x812/modal-lancamento.png`](./responsivo/375x812/modal-lancamento.png) | 375×812 | Modal de lançamento | Varredura responsiva | PASS (layout) / campos sem rótulo (V-11) | 43246 |
|  | [`responsivo/375x812/orcamentos-fim-da-pagina.png`](./responsivo/375x812/orcamentos-fim-da-pagina.png) | 375×812 | Orçamentos | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 34242 |
|  | [`responsivo/375x812/orcamentos.png`](./responsivo/375x812/orcamentos.png) | 375×812 | Orçamentos | Varredura responsiva | PASS (estrutura) | 39593 |
|  | [`responsivo/375x812/perfil-fim-da-pagina.png`](./responsivo/375x812/perfil-fim-da-pagina.png) | 375×812 | Perfil | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 34424 |
|  | [`responsivo/375x812/perfil.png`](./responsivo/375x812/perfil.png) | 375×812 | Perfil | Varredura responsiva | PASS (estrutura) | 94661 |
|  | [`responsivo/375x812/planejamento-fim-da-pagina.png`](./responsivo/375x812/planejamento-fim-da-pagina.png) | 375×812 | Planejamento | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 38579 |
|  | [`responsivo/375x812/planejamento.png`](./responsivo/375x812/planejamento.png) | 375×812 | Planejamento | Varredura responsiva | PASS (estrutura) | 81825 |
|  | [`responsivo/375x812/preferencias-fim-da-pagina.png`](./responsivo/375x812/preferencias-fim-da-pagina.png) | 375×812 | Preferências | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 40522 |
|  | [`responsivo/375x812/preferencias.png`](./responsivo/375x812/preferencias.png) | 375×812 | Preferências | Varredura responsiva | PASS (estrutura) | 59347 |
|  | [`responsivo/375x812/relatorios-fim-da-pagina.png`](./responsivo/375x812/relatorios-fim-da-pagina.png) | 375×812 | Relatórios | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 33589 |
|  | [`responsivo/375x812/relatorios.png`](./responsivo/375x812/relatorios.png) | 375×812 | Relatórios | Varredura responsiva | PASS (estrutura) | 102945 |
|  | [`responsivo/375x812/titulo-barra-superior.png`](./responsivo/375x812/titulo-barra-superior.png) | 375×812 | Barra superior | Varredura responsiva | PASS (título abreviado; H1 completo) | 38600 |
|  | [`responsivo/390x844/cartoes.png`](./responsivo/390x844/cartoes.png) | 390×844 | Cartões | Varredura responsiva | PASS (estrutura) | 37209 |
|  | [`responsivo/390x844/dashboard-fim-da-pagina.png`](./responsivo/390x844/dashboard-fim-da-pagina.png) | 390×844 | Visão geral | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 31817 |
|  | [`responsivo/390x844/dashboard.png`](./responsivo/390x844/dashboard.png) | 390×844 | Visão geral | Varredura responsiva | PASS (estrutura) / conteúdo: V-01, V-04 | 144675 |
|  | [`responsivo/390x844/historico.png`](./responsivo/390x844/historico.png) | 390×844 | Histórico de Auditoria | Varredura responsiva | PASS (estrutura) | 196498 |
|  | [`responsivo/390x844/importar.png`](./responsivo/390x844/importar.png) | 390×844 | Importar dados | Varredura responsiva | PASS (estrutura) | 32326 |
|  | [`responsivo/390x844/integridade-fim-da-pagina.png`](./responsivo/390x844/integridade-fim-da-pagina.png) | 390×844 | Integridade | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 37098 |
|  | [`responsivo/390x844/integridade.png`](./responsivo/390x844/integridade.png) | 390×844 | Integridade | Varredura responsiva | PASS (estrutura) | 42505 |
|  | [`responsivo/390x844/lancamentos-fim-da-pagina.png`](./responsivo/390x844/lancamentos-fim-da-pagina.png) | 390×844 | Lançamentos | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 43041 |
|  | [`responsivo/390x844/lancamentos.png`](./responsivo/390x844/lancamentos.png) | 390×844 | Lançamentos | Varredura responsiva | PASS (estrutura) | 86011 |
|  | [`responsivo/390x844/menu-movel-aberto.png`](./responsivo/390x844/menu-movel-aberto.png) | 390×844 | Menu móvel | Varredura responsiva | PASS (Escape fecha; foco não entra no menu — V-13) | 39317 |
|  | [`responsivo/390x844/modal-diagnostico.png`](./responsivo/390x844/modal-diagnostico.png) | 390×844 | Diagnóstico | Varredura responsiva | PASS (estrutura) | 57422 |
|  | [`responsivo/390x844/modal-importacao.png`](./responsivo/390x844/modal-importacao.png) | 390×844 | Modal de importação | Varredura responsiva | PASS (estrutura) | 46844 |
|  | [`responsivo/390x844/modal-lancamento.png`](./responsivo/390x844/modal-lancamento.png) | 390×844 | Modal de lançamento | Varredura responsiva | PASS (layout) / campos sem rótulo (V-11) | 96674 |
|  | [`responsivo/390x844/orcamentos-fim-da-pagina.png`](./responsivo/390x844/orcamentos-fim-da-pagina.png) | 390×844 | Orçamentos | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 35941 |
|  | [`responsivo/390x844/orcamentos.png`](./responsivo/390x844/orcamentos.png) | 390×844 | Orçamentos | Varredura responsiva | PASS (estrutura) | 39510 |
|  | [`responsivo/390x844/perfil-fim-da-pagina.png`](./responsivo/390x844/perfil-fim-da-pagina.png) | 390×844 | Perfil | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 35823 |
|  | [`responsivo/390x844/perfil.png`](./responsivo/390x844/perfil.png) | 390×844 | Perfil | Varredura responsiva | PASS (estrutura) | 93590 |
|  | [`responsivo/390x844/planejamento-fim-da-pagina.png`](./responsivo/390x844/planejamento-fim-da-pagina.png) | 390×844 | Planejamento | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 41245 |
|  | [`responsivo/390x844/planejamento.png`](./responsivo/390x844/planejamento.png) | 390×844 | Planejamento | Varredura responsiva | PASS (estrutura) | 82198 |
|  | [`responsivo/390x844/preferencias-fim-da-pagina.png`](./responsivo/390x844/preferencias-fim-da-pagina.png) | 390×844 | Preferências | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 42513 |
|  | [`responsivo/390x844/preferencias.png`](./responsivo/390x844/preferencias.png) | 390×844 | Preferências | Varredura responsiva | PASS (estrutura) | 59221 |
|  | [`responsivo/390x844/relatorios-fim-da-pagina.png`](./responsivo/390x844/relatorios-fim-da-pagina.png) | 390×844 | Relatórios | Rolagem até o fim: barra inferior não cobre conteúdo | PASS (estrutura) | 34980 |
|  | [`responsivo/390x844/relatorios.png`](./responsivo/390x844/relatorios.png) | 390×844 | Relatórios | Varredura responsiva | PASS (estrutura) | 102481 |
| ★ | [`responsivo/390x844/titulo-barra-superior.png`](./responsivo/390x844/titulo-barra-superior.png) | 390×844 | Barra superior | Varredura responsiva | PASS (título abreviado; H1 completo) | 39384 |
|  | [`responsivo/768x1024/cartoes.png`](./responsivo/768x1024/cartoes.png) | 768×1024 | Cartões | Varredura responsiva | PASS (estrutura) | 46776 |
| ★ | [`responsivo/768x1024/dashboard.png`](./responsivo/768x1024/dashboard.png) | 768×1024 | Visão geral | Varredura responsiva | PASS (estrutura) / conteúdo: V-01, V-04 | 160432 |
|  | [`responsivo/768x1024/historico.png`](./responsivo/768x1024/historico.png) | 768×1024 | Histórico de Auditoria | Varredura responsiva | PASS (estrutura) | 210304 |
|  | [`responsivo/768x1024/importar.png`](./responsivo/768x1024/importar.png) | 768×1024 | Importar dados | Varredura responsiva | PASS (estrutura) | 43427 |
|  | [`responsivo/768x1024/integridade.png`](./responsivo/768x1024/integridade.png) | 768×1024 | Integridade | Varredura responsiva | PASS (estrutura) | 53505 |
|  | [`responsivo/768x1024/lancamentos.png`](./responsivo/768x1024/lancamentos.png) | 768×1024 | Lançamentos | Varredura responsiva | PASS (estrutura) | 94044 |
|  | [`responsivo/768x1024/modal-diagnostico.png`](./responsivo/768x1024/modal-diagnostico.png) | 768×1024 | Diagnóstico | Varredura responsiva | PASS (estrutura) | 96531 |
|  | [`responsivo/768x1024/modal-importacao.png`](./responsivo/768x1024/modal-importacao.png) | 768×1024 | Modal de importação | Varredura responsiva | PASS (estrutura) | 99356 |
|  | [`responsivo/768x1024/modal-lancamento.png`](./responsivo/768x1024/modal-lancamento.png) | 768×1024 | Modal de lançamento | Varredura responsiva | PASS (layout) / campos sem rótulo (V-11) | 167732 |
|  | [`responsivo/768x1024/orcamentos.png`](./responsivo/768x1024/orcamentos.png) | 768×1024 | Orçamentos | Varredura responsiva | PASS (estrutura) | 50748 |
|  | [`responsivo/768x1024/perfil.png`](./responsivo/768x1024/perfil.png) | 768×1024 | Perfil | Varredura responsiva | PASS (estrutura) | 98890 |
|  | [`responsivo/768x1024/planejamento.png`](./responsivo/768x1024/planejamento.png) | 768×1024 | Planejamento | Varredura responsiva | PASS (estrutura) | 94365 |
|  | [`responsivo/768x1024/preferencias.png`](./responsivo/768x1024/preferencias.png) | 768×1024 | Preferências | Varredura responsiva | PASS (estrutura) | 68525 |
|  | [`responsivo/768x1024/relatorios.png`](./responsivo/768x1024/relatorios.png) | 768×1024 | Relatórios | Varredura responsiva | PASS (estrutura) | 107649 |
|  | [`zoom-200/dashboard.png`](./zoom-200/dashboard.png) | 720×450 @2x (zoom 200%) | Visão geral | Zoom | PASS | 398195 |
|  | [`zoom-200/lancamentos.png`](./zoom-200/lancamentos.png) | 720×450 @2x (zoom 200%) | Lançamentos | Zoom | PASS | 221065 |
| ★ | [`zoom-200/modal-lancamento.png`](./zoom-200/modal-lancamento.png) | 720×450 @2x (zoom 200%) | Modal de lançamento | Rolagem interna; Salvar alcançável | PASS | 65580 |
|  | [`zoom-200/orcamentos.png`](./zoom-200/orcamentos.png) | 720×450 @2x (zoom 200%) | Orçamentos | Zoom | PASS | 111337 |
