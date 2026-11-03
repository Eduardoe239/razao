# O Razão — controle financeiro pessoal

**Versão:** `1.22.0-beta.20`  
**Estado:** desenvolvimento; **Fase 0 (auditoria e baseline) encerrada em 02/11/2026**; Alpha 1 autorizada, não iniciada. Não é uma versão certificada para produção: há riscos P0 abertos (ver `docs/risks/RISK_REGISTER.md`).

O Razão é um aplicativo local-first para organizar contas, lançamentos, cartões e faturas, limites de orçamento, recorrências, importações e conciliação. Esta distribuição prioriza consistência dos dados e recuperação; as jornadas reais e a revisão visual no ambiente do usuário ainda fazem parte da validação da Fase 0.

**Norma do projeto:** [`PLANO_MESTRE_O_RAZAO_V2.0.md`](./PLANO_MESTRE_O_RAZAO_V2.0.md) e [`CLAUDE.md`](./CLAUDE.md). **Estado atual:** [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md).

## O que existe nesta base (estado verificado na auditoria da Fase 0)

Nenhuma capacidade está classificada como produtiva e validada. Detalhes e evidências em [`docs/audit/BASELINE_AS_BUILT.md`](./docs/audit/BASELINE_AS_BUILT.md).

- Painel financeiro e histórico de lançamentos (receita/despesa) com criar, editar, excluir, filtros e exportação CSV.
- Perfis PF/PJ por **filtro de exibição** sobre um único estado local; ainda **não há workspaces isolados**.
- Contas e saldo derivado no domínio; **não há tela para criar, editar ou arquivar contas** (o estado inicial traz uma conta PF e uma PJ).
- Ciclos de fatura e pagamento no domínio; **não há tela para cadastrar cartão nem lançar compra no cartão**.
- Transferências suportadas no domínio; **sem tela para criá-las**.
- Limites de orçamento mensais, recorrências mensais e lista de próximos compromissos.
- Importação CSV/OFX com revisão e conciliação — **com defeitos conhecidos de conversão de valores e de identificação de linhas; não use com extratos reais** (ver [`docs/risks/RISK_REGISTER.md`](./docs/risks/RISK_REGISTER.md), FIN-01 a FIN-04).
- Backup JSON com checksum para detectar corrupção acidental, validação antes da restauração, histórico local de cópias e fluxos de recuperação.
- Histórico de auditoria local (limitado a 500 eventos) e diagnóstico de integridade.
- Previsões e cenários por heurísticas fixas; não são probabilidades calibradas.

O cálculo local não realiza movimentações bancárias. Confira os dados e as propostas antes de aplicar alterações financeiras.

## Escopo funcional: real, parcial e demonstrativo

| Área | Estado nesta distribuição |
|---|---|
| Estado financeiro Web | `localStorage`; **sem criptografia em repouso**. Depende do perfil e das políticas do navegador. |
| Estado financeiro Desktop | Processo principal do Electron com `safeStorage` do sistema operacional. A gravação falha de forma explícita se a criptografia nativa não estiver disponível. O ambiente Windows real ainda precisa ser validado. |
| Autenticação remota | Desativada/falha fechada. Não há cadastro, login, recuperação de senha ou sessão de produção. |
| Open Finance | Demonstração com dados sintéticos. Não conecta a bancos, não solicita consentimento bancário produtivo e não deve receber credenciais bancárias. |
| OCR | Parcial/demonstrativo: extração baseada em texto; não é um motor real de reconhecimento visual de imagem. |
| Sincronização entre dispositivos | Não produtiva. Não há serviço remoto durável; fila local/outbox não comprova entrega a um servidor. |
| Assistente e previsões | Regras e cálculos determinísticos locais. Não implica provedor de IA remoto conectado. |
| Auditoria | Histórico local mutável; útil para rastreabilidade, mas não é imutável nem prova criptográfica. |

## Requisitos e execução de desenvolvimento

- Node.js `>=22.12.0` (`engines` em `package.json`); verificado com Node 22.23.4 e 24.19.0.
- Dependências fixadas em `package.json` e `package-lock.json`.

No diretório do repositório:

```bash
npm ci
npm test
npm run dev
```

Abra o endereço local informado pelo Vite: `http://127.0.0.1:3000`. No modo Electron de desenvolvimento, o renderer usa `http://127.0.0.1:5173` e o processo principal armazena seus dados em `.razao-desktop-test-profile/RazaoData`, um perfil isolado que não utiliza os dados do aplicativo instalado. Mantenha o terminal aberto enquanto testa. Use somente dados fictícios durante a validação. Os logs de `npm test` da beta.20 estão em [`docs/audit/fase0/evidencias/`](./docs/audit/fase0/evidencias/) (`npm-test-notebook-windows.log` e `npm-test.log`); `evidence/` guarda o histórico da beta.18.

O comando de testes atual é automatizado e combina testes de domínio, validação de payload, persistência simulada, migração, backup/restore e verificações estáticas. Parte dos scripts é apenas estática (verifica o código-fonte, não o comportamento) e três testes de domínio ainda não fazem parte do runner; ver o relatório da Fase 0, §10–§11.

**Não execute `npm run build`, `desktop:build` nem o instalador nesta fase.** O Plano Mestre reserva build/instalador para a etapa de empacotamento, após a aprovação dos gates anteriores.

## Plano Mestre e evidências da Fase 0

Documentos vigentes (beta.20, Plano Mestre V2.0):

- [`docs/audit/fase0/RELATORIO_AUDITORIA_FASE0.md`](./docs/audit/fase0/RELATORIO_AUDITORIA_FASE0.md) — auditoria as-built, achados e evidências.
- [`docs/audit/BASELINE_AS_BUILT.md`](./docs/audit/BASELINE_AS_BUILT.md) — telas, persistência, matriz PF/PJ.
- [`docs/architecture/CONTEXT_MAP.md`](./docs/architecture/CONTEXT_MAP.md) — mapa de contexto e módulos.
- [`docs/risks/RISK_REGISTER.md`](./docs/risks/RISK_REGISTER.md) — riscos P0–P3.
- [`docs/adr/`](./docs/adr/) — decisões arquiteturais (ADR-001 a 003, todas `PROPOSED`).
- [`CHANGELOG_O_RAZAO_V1.22.0_BETA.20_UI_UX.md`](./CHANGELOG_O_RAZAO_V1.22.0_BETA.20_UI_UX.md) e [`CHECKLIST_VALIDACAO_VISUAL_BETA.20.md`](./CHECKLIST_VALIDACAO_VISUAL_BETA.20.md) — alterações da beta.20 e roteiro de validação visual.

Registros históricos da beta.18 (superados nos pontos em que divergem dos documentos acima):

- [`AUDITORIA_FASE0_ATUALIZADA_BETA.18.md`](./AUDITORIA_FASE0_ATUALIZADA_BETA.18.md) — estado de cada critério, riscos e comparação com o Plano Mestre.
- [`FASE0_INVENTARIO_TELAS_PERSISTENCIA_BETA.18.md`](./FASE0_INVENTARIO_TELAS_PERSISTENCIA_BETA.18.md) — inventário estático de telas, estados e fontes de persistência.
- [`MATRIZ_JORNADAS_CRITICAS_FASE0_BETA.18.md`](./MATRIZ_JORNADAS_CRITICAS_FASE0_BETA.18.md) — roteiros manuais, dados de teste e resultado esperado.
- [`BACKLOG_RISCO_FASE0_BETA.18.md`](./BACKLOG_RISCO_FASE0_BETA.18.md) — riscos priorizados e critérios de aceite.
- [`RELATORIO_TESTES_AUTOMATIZADOS_BETA.18.md`](./RELATORIO_TESTES_AUTOMATIZADOS_BETA.18.md) — comandos, resultados e limites dos testes.
- [`DEPENDENCIAS_E_LIMITES_BETA.18.md`](./DEPENDENCIAS_E_LIMITES_BETA.18.md) — versões diretas, lockfile e limites de segurança.
- [`GUIA_VALIDACAO_NOTEBOOK_FASE0_BETA.18.md`](./GUIA_VALIDACAO_NOTEBOOK_FASE0_BETA.18.md) — instruções para validar Web/Windows no notebook.
- [`CHANGELOG_O_RAZAO_V1.22.0_BETA.18.md`](./CHANGELOG_O_RAZAO_V1.22.0_BETA.18.md) — alterações, migração e compatibilidade.

## Dados, backup e segurança

- Faça exportação de backup JSON e guarde a cópia fora do dispositivo antes de testar restauração, migração ou operações destrutivas.
- O checksum do backup detecta corrupção acidental; não comprova autenticidade e não impede adulteração deliberada.
- Na Web, o estado financeiro, a cópia de recuperação e parte do histórico auxiliar usam armazenamento do navegador; `localStorage` não é criptografado em repouso. Limpar dados do site pode apagar estado e cópias locais.
- Os arquivos de backup/exportação JSON são legíveis por quem tiver acesso à cópia. Guarde-os em local protegido; o checksum é apenas para corrupção acidental, não autenticidade.
- A outbox local não é evidência de sincronização remota; não introduza dados bancários ou dados de terceiros durante os testes.
- No Desktop, a proteção criptográfica depende da disponibilidade e do comportamento de `safeStorage` no sistema operacional. Isso precisa ser verificado no ambiente real.
- Não use a versão de desenvolvimento para armazenar dados financeiros de terceiros ou segredos bancários.

## Status da Fase 0

A Fase 0 foi **encerrada em 02/11/2026** por aprovação formal do proprietário (decisão D-012), com a baseline `1.22.0-beta.20`, evidências e limitações registradas em [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md). O encerramento não resolve os riscos P0 conhecidos nem declara o produto pronto. Testes automatizados aprovados não substituem revisão visual de telas, jornadas reais Web/Electron, testes de falha/quota, verificação independente de segurança, fechamento de riscos S0/S1 e aprovações dos gates G1–G9.
