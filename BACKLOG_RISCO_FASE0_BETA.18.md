# Backlog de riscos — Fase 0 — O Razão beta.18

O status a seguir é baseado em código e testes da beta.18. “Parcial” significa que a correção automatizada está presente mas ainda falta uma evidência/aceite exigido pelo Plano Mestre.

| ID | Prioridade | Área / risco | Estado | Critério objetivo de aceite |
|---|---|---|---|---|
| F0-S1-01 | S1 | Recuperação e corrupção em ambiente real | Parcial | Web e Electron/Windows reais recuperam última cópia válida; contagens e totais antes/depois são idênticos; leitura falha sem sobrescrever. |
| F0-S1-02 | S1 | Schema/migração em dados históricos reais | Parcial | Fixtures de schema 1, 2, 3 e 4 passam; export/import mantém IDs, saldos, valores, recorrências e faturas; rollback demonstra origem preservada. |
| F0-S1-03 | S1 | Isolamento PF/PJ na UI e na migração | Parcial | Criar e editar em PF/PJ, transferências, orçamento, cartão, recorrência, busca, análise, auditoria e conciliação não compartilham referências; testes visuais com prova de dataset. |
| F0-S1-04 | S1 | Dependências e cadeia de suprimento | Aberto | `package-lock.json` gerado em ambiente online, `npm ci` reproduzível, `npm audit` revisado, CVEs/justificativas documentados, nenhum segredo no pacote. |
| F0-S1-05 | S1 | Acessibilidade e estados de interface | Aberto | Matriz desktop/tablet/celular, tema claro/escuro, zoom 200%, Tab/Shift+Tab/Enter/Escape/foco, labels/contraste, erros/vazios/loading, verificação screen reader. |
| F0-S1-06 | S1 | Integridade de todas as mutações financeiras | Parcial | A matriz J02–J10 e J16 passa no notebook; resultados independentes reconciliam com conta, fatura, orçamento e auditoria; nenhuma alteração duplicada. |
| F0-S1-07 | S1 aceite de risco | Web `localStorage` não criptografado | Conhecido / requer aceite explícito | Aviso de produto aprovado, não coletar segredo/dados de terceiros, fluxo de exportação/limpeza testado e política de retenção definida. |
| F0-S1-08 | S1 operação | Suporte, incidente e política beta ainda não aprovados | Aberto | Owner aprova política e canal válidos, procedimento de incidente, rollback e nota de versão antes de beta pública. |
| F0-S1-09 | S1 escopo | Sincronização remota não durável; outbox local não prova entrega | Fora do escopo de produção, divulgado | Product owner aprova local-first/offline sem sincronização real; UI/README nunca mostram estado como sincronizado sem ack real. |
| F0-S1-10 | S1 | Importação e exportação/CSV com dados reais anonimizados | Parcial | CSV/OFX de teste, encoding, linhas inválidas/duplicadas, preview, reversão, fórmulas de CSV exportado e totais conferidos; nenhuma credencial bancária. |
| F0-S1-11 | S1 | Migração de schema desligada/versões inconsistentes | **Implementação corrigida; verificação real pendente** | Migração v1–v4 integrada e testada; comparar backup antigo real anonimizando dados; validar conta/cartão/transferência/fatura e rollback. |
| F0-S1-12 | S1 | Perfil de desenvolvimento contaminar dados instalados | Implementado e testado estaticamente | Iniciar `desktop:dev`, gravar um lançamento e comprovar que só aparece em `.razao-desktop-test-profile/RazaoData`; conferir app instalado intacto. |
| F0-S1-13 | S1 | Consistência do destino de transferência vs pagamento de fatura | Implementação/testes automatizados aprovados | Transferência usa conta; pagamento usa cartão ligado à fatura; tentativa cruzada é rejeitada antes de gravar no Web/Electron real. |
| F0-S2-01 | S2 | Desempenho com milhares de transações | Aberto | Importar fixture de 2.000 linhas; tempo, travamentos, filtro, pesquisa, edição/exportação e consumo percebido registrados em máquina real. |
| F0-S2-02 | S2 | Integridade do histórico de auditoria | Parcial | Revisão manual confirma eventos para mutações críticas; explicar em produto que log local é mutável e não é prova criptográfica. |
| F0-S2-03 | S2 | Quota, multiaba e encerramento abrupto | Aberto | Testes controlados em perfil descartável provam falha explícita e preservação; sem alterar perfil de dados real. |
| F0-S2-04 | S2 | Coerência de documentação e versão | Parcial | README, package, changelog, relatórios e arquivo no ZIP correspondem a beta.18; hash é recalculado após última mudança. |

## Política de encerramento

Não mover item a “Fechado” só porque existe código. Para riscos que dependem de ambiente real, anexar data/hora, OS/browser/runtime, passos exatos, dados/backup utilizados, resultados e evidência. G9 exige zero S0/S1 em aberto e checklist assinado; beta.18 ainda não atende G9.
