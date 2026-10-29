# Matriz de jornadas críticas — Fase 0 — beta.18

**Status inicial de todas as jornadas manuais:** NÃO EXECUTADAS no ambiente real. Os testes automatizados não contam como execução destas jornadas. Preencha `Resultado`, `Evidência` e `Data/ambiente` depois de realizar cada roteiro no notebook.

## Convenções e segurança

- Usar somente perfis/dados fictícios novos, sem credenciais ou informações financeiras reais.
- Antes de qualquer restauração, exportar o backup e manter outra cópia fora da pasta do projeto.
- Fazer testes destrutivos somente no perfil Web descartável e no perfil Electron isolado criado pelo `desktop:dev`.
- Para cada jornada, registrar: versão `1.22.0-beta.18`, commit (se houver), OS/browser/Node, passos, resultado esperado/obtido, screenshot sem dado sensível e logs.
- Resultado permitido: `PASS`, `FAIL`, `BLOCKED` ou `NOT RUN`. Não usar `PASS` quando apenas o teste unitário correspondente passou.

| ID | Perfil/dataset | Passos de execução | Resultado esperado | Evidência para fechar |
|---|---|---|---|---|
| J01 | Web limpo, PF e PJ | Abrir em perfil/browser de teste limpo; verificar primeiro uso e cada tela | Contas PF/PJ com saldo zero; categorias por perfil; zero lançamentos/cartões fictícios; sem tela presa | Screenshots painel e faturas vazias; log da versão |
| J02 | PF limpo | Criar despesa válida de `R$ 12,34`, pagar, salvar e recarregar | 1.234 centavos, conta e categoria corretas; saldo cai uma vez; evento de auditoria existe e sobrevive reload | Captura antes/depois e contagem/saldo |
| J03 | PF limpo | Tentar valor `1,999`, entrada ambígua `1.234`, vazio, negativo, zero quando aplicável; depois `12,34` | Inválidos rejeitados com mensagem; nenhum evento/saldo alterado; valor correto aceito | Screenshot erro + histórico e valores |
| J04 | PF limpo | Editar descrição/valor/categoria e excluir um lançamento fictício | Valores/referências atualizados; exclusão afeta saldo e fica auditada; cancelamento não altera nada | Antes/depois + auditoria |
| J05 | PF limpo | Alternar lançamento entre pendente e pago duas vezes; recalcular painel | Saldo realizado e compromissos mudam de forma coerente; sem duplicação; trilha presente | Captura de status/saldo/compromissos |
| J06 | PF com duas contas zeradas | Criar transferência de uma conta para outra; tentar conta destino igual, inexistente ou de PJ | Saldo consolidado não registra renda/despesa artificial; referência errada/cross-profile bloqueada | Extrato das duas contas, painel e mensagem |
| J07 | PF, cartão e fatura de teste | Registrar compras; pagar parcial; repetir clique/operação; quitar restante; tentar saldo insuficiente | Parcial reduz dívida, restante correto, sem despesa duplicada; idempotência impede repetição; destino aponta para cartão e perfil certo | Valores antes/depois e eventos |
| J08 | PF com saldo teste | Conferir/corrigir saldo de conta; tentar cancelar; aplicar ajuste uma vez e abrir Integridade | Ajuste explícito, auditado e uma única vez; cancelar preserva estado | Saldos e auditoria antes/depois |
| J09 | PF e PJ | Definir limite normal, `R$ 0,00`, editar e remover; trocar perfil e voltar | Orçamentos isolados por perfil/categoria/mês; zero não vira “sem limite”; cada alteração auditada | Capturas PF/PJ e eventos |
| J10 | PF + PJ | Criar recorrência PF e PJ; pausar/reativar; gerar várias ocorrências; gerar novamente | Referências não cruzam perfis; ocorrências idempotentes; valor/data corretos; mudanças de regra registradas | Lista e auditoria; contagem de lançamentos |
| J11 | Backups fictícios de schema 1–4 | Executar script automatizado da migração e importar backup compatível pela interface, quando disponível | Schema antigo passa pelo pipeline se migrável; IDs e valores preservados; versões conflitantes/inválidas recusadas | Log de `npm test`, resumo do backup e valores conferidos |
| J12 | Web de teste | Exportar backup JSON; copiar fora; abrir/validar, limpar apenas o perfil descartável; restaurar arquivo íntegro | Contas, lançamentos, cartões, faturas/orçamentos e referências retornam equivalentes; evento de restauração | Hash externo do arquivo, contagens e total antes/depois |
| J13 | Cópia de backup, nunca o original | Duplicar backup; alterar valor sem atualizar checksum ou quebrar JSON; tentar restaurar cópia adulterada | Restauração recusada antes de substituir dados ativos; backup original continua válido | Mensagem de erro e comparação do estado ativo |
| J14 | Web de teste; PF/PJ | Criar valores distintos em PF e PJ; conferir painel, busca, análise, orçamento, recorrência, auditoria e histórico ao trocar perfis | Nenhuma entidade, total ou sugestão do outro perfil aparece; restauração/migração não cria compartilhamento | Capturas de cada área e IDs fictícios |
| J15 | CSV de controle | Importar `fixtures/fase0-importacao-controle.csv`; revisar duplicata intencional; cancelar e depois confirmar numa segunda tentativa | Preview reconhece linhas válidas; itens não são aplicados antes de confirmar; duplicatas são sinalizadas/contidas sem apagar transação legítima | Contagem bruta, selecionada, aplicada e auditoria |
| J16 | CSV/OFX de teste | Importar valores negativos/positivos, data inválida, linha malformada e duplicata; validar categoria/conta/perfil | Linhas inválidas explicadas, referências corretas, nenhuma escrita silenciosa; revisão humana antes de conciliar | Arquivo usado, resultado e logs |
| J17 | CSV volumoso de 2.000 linhas | Importar `fixtures/fase0-dados-volumosos-2000.csv` em perfil descartável, revisar, testar filtro/pesquisa/scroll/exportar | Sem travamento permanente, contagem e valores verificáveis; nenhuma conta real ou perfil errado; registrar tempo percebido | Tempo total, contagens, export e screenshot |
| J18 | Base de teste | Buscar descrição, conta e categoria; filtrar tipo/status/mês/perfil; exportar CSV | Contagem dos resultados corresponde aos filtros; CSV escapado contra fórmula conforme teste; sem dados de outro perfil | Captura da tabela e arquivo CSV de saída |
| J19 | Visual / acessibilidade | Em largura aproximada 375, 768 e 1280 px; zoom 100%, 125%, 200%; temas disponíveis; somente teclado; labels/foco/contraste | Nenhum conteúdo ou modal inacessível; foco visível, teclado coerente, leitura e erros compreensíveis | Screenshots por viewport/tema; checklist teclado e leitor de tela disponível |
| J20 | Electron de desenvolvimento isolado (Windows) | `npm run desktop:dev`; criar conta/lançamento fictício; fechar com X; reabrir; localizar pasta de teste; testar backups e indisponibilidade simulada com segurança | Estado persiste cifrado com `safeStorage` disponível; dados ficam somente em `.razao-desktop-test-profile/RazaoData`; app instalado não é tocado | OS/build do Electron, arquivos presentes, logs e comparação do perfil instalado |

## Registro de execução

Duplique a tabela em uma cópia de trabalho e acrescente as colunas `Resultado`, `Data/hora`, `Ambiente`, `Evidência/arquivo`, `Defeito/ID`, `Revisor`. Ao falhar, interrompa antes de repetir ações destrutivas, preserve log e backup e classifique o incidente. Uma falha com potencial de perda de dados vira S0/S1 até triagem.
