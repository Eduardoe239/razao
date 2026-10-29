# O Razão — controle financeiro pessoal

**Versão:** `1.22.0-beta.18`  
**Estado:** desenvolvimento e auditoria da Fase 0. Não é uma versão certificada para produção.

O Razão é um aplicativo local-first para organizar contas, lançamentos, cartões e faturas, limites de orçamento, recorrências, importações e conciliação. Esta distribuição prioriza consistência dos dados e recuperação; as jornadas reais e a revisão visual no ambiente do usuário ainda fazem parte da validação da Fase 0.

## O que está disponível nesta base

- Painel financeiro e histórico de lançamentos com filtros e exportação CSV.
- Contas, categorias, perfis PF/PJ e isolamento por perfil em fluxos cobertos pelos testes.
- Cartões, ciclos de fatura e registro local de pagamentos.
- Limites de orçamento, cenários/projeções locais e compromissos recorrentes.
- Importação de arquivos compatíveis, revisão manual de correspondências e conciliação.
- Backup JSON com checksum para detectar corrupção acidental, validação antes da restauração, histórico local de cópias e fluxos de recuperação.
- Histórico de auditoria local e diagnóstico de integridade.

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

- Node.js compatível com os scripts ES modules do projeto.
- Dependências listadas em `package.json`.

Depois de extrair o ZIP em uma pasta local:

```bash
npm install
npm test
npm run dev
```

Abra o endereço local informado pelo Vite: `http://127.0.0.1:3000`. No modo Electron de desenvolvimento, o renderer usa `http://127.0.0.1:5173` e o processo principal armazena seus dados em `.razao-desktop-test-profile/RazaoData`, um perfil isolado que não utiliza os dados do aplicativo instalado. Mantenha o terminal aberto enquanto testa. Use somente dados fictícios durante a validação. A instalação de dependências pode criar arquivos locais que não fazem parte do ZIP original. O histórico da execução automatizada está em `evidence/npm-test-beta18.log`; o registro estático está em `evidence/VALIDACAO_ESTATICA_BETA.18.txt`.

O comando de testes atual é automatizado e combina testes de domínio, validação de payload, persistência simulada, migração, backup/restore e verificações estáticas. Os resultados precisam ser conferidos no relatório da versão.

**Não execute `npm run build`, `desktop:build` nem o instalador nesta fase.** O Plano Mestre reserva build/instalador para a etapa de empacotamento, após a aprovação dos gates anteriores.

## Plano Mestre e evidências da Fase 0

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

A Fase 0 **permanece aberta até que todos os critérios de saída do Plano Mestre estejam demonstrados**. Testes automatizados aprovados não substituem revisão visual de telas, jornadas reais Web/Electron, testes de falha/quota, verificação independente de segurança, fechamento de riscos S0/S1 e aprovações dos gates G1–G9.
