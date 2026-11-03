# O Razão — Estado do projeto

**Atualizado em:** 02/11/2026 · **Norma:** `PLANO_MESTRE_O_RAZAO_V2.0.md` (raiz; cópia arquivada em `docs/plano-mestre-v2.0/`)

> Este arquivo registra fatos verificados e pendências. Propostas não são decisões: tudo marcado `PROPOSED` aguarda aprovação do proprietário.

## 1. Versão e base

| Item | Valor | Evidência |
|---|---|---|
| Versão técnica | `1.22.0-beta.20` (`package.json`) | — |
| Base oficial (recomendada, aguardando aprovação) | `main@f011bcf` = beta.20 de referência + `package-lock.json` + 4 arquivos residuais do merge | `docs/audit/fase0/RELATORIO_AUDITORIA_FASE0.md` §2.3 |
| Hash do ZIP beta.20 | `b3f897ef…9b41` — confere com o Plano §7 | `docs/audit/fase0/evidencias/notebook-verificacao.txt` |
| Branch de trabalho | `claude/upbeat-feynman-4m2y0k` (somente documentação acima de `main`) | `git log` |
| Tags / releases | nenhuma | `git ls-remote` |
| Runtime verificado | Windows 11 + Node 24.19.0/npm 11.17.0 (notebook); Linux + Node 22.23.4/npm 10.9.9 (nuvem) | logs em `docs/audit/fase0/evidencias/` |
| `npm test` | exit 0 em ambos os ambientes | `npm-test-notebook-windows.log`, `npm-test.log` |

## 2. Fase atual

**Fase 0 — Auditoria e baseline: ABERTA.**

### Gate da Fase 0 (Plano §68)

| Critério | Estado | Evidência / pendência |
|---|---|---|
| Versão/hash confirmados | ✅ | relatório §2.3 |
| Riscos P0 conhecidos | ✅ | `docs/risks/RISK_REGISTER.md` |
| Nenhum dado sobrescrito | ✅ | auditoria somente leitura; testes usam diretórios temporários |
| Testes reproduzíveis | ✅ | 2 ambientes, exit 0 |
| Documentação alinhada | ✅ (Incremento 0.1) | README alinhado à beta.20; documentos §92.8 criados |
| Evidências visuais/manuais aprovadas | ⏳ **pendente do proprietário** | `CHECKLIST_VALIDACAO_VISUAL_BETA.20.md`, somente dados fictícios |
| Aprovação formal do fechamento | ⏳ **pendente do proprietário** | registrar aqui data e decisão |

Enquanto o gate estiver aberto, **nenhum incremento de código** (beta.21) é iniciado.

## 3. Capacidades (resumo)

Classificação completa em `docs/audit/BASELINE_AS_BUILT.md` §4. Nada é `PRODUTIVA E VALIDADA`.

| Situação | Capacidades |
|---|---|
| Defeituosa / não confiável | Importação CSV/OFX (FIN-01..04), contas (sem UI), cartões/faturas (inalcançáveis pela UI) |
| Demonstrativa / mock | Open Finance, OCR, sincronização, backend |
| Inexistente (fail-closed) | Cadastro/autenticação, Workspace/Membership |
| Protótipo | Assistente (regras locais, sem LLM), previsões (multiplicadores fixos) |

**Aviso operacional:** não usar a importação CSV/OFX com extratos reais até a correção prevista (beta.21).

## 4. Próximos passos (sequência proposta, ver Plano §67–69)

1. Proprietário: validação manual da beta.20 e aprovação do gate da Fase 0.
2. beta.21 (1º incremento da Alpha 1, *PROPOSED*): 21.1 limpeza de residuais + runner completo + CI; 21.2 parser monetário/CSV; 21.3 `importedId` determinístico.
3. beta.22 (*PROPOSED*, a decompor): persistência confirmada antes de sucesso (P0-5), recuperação (P1-5/P1-6), datas civis locais (P1-2); sanitizador (P1-3) somente com backup/dry-run e regra aprovada; auditoria sem truncamento (P1-4) após ADR-003.
4. Alpha 1: ADR-001/002/003 aceitos, Workspace/Membership local, migração com dry-run/rollback.

## 5. Decisões

| ID | Assunto | Status |
|---|---|---|
| ADR-001 | Local-first e modos local/online | PROPOSED |
| ADR-002 | User / Workspace / Membership e PF/PJ | PROPOSED |
| ADR-003 | Storage canônico Web e Desktop | PROPOSED |
| Plano §91 itens 1–10 | Decisões de produto abertas | ABERTAS — dependem do proprietário |

## 6. Histórico de incrementos

| Data | Incremento | Resultado |
|---|---|---|
| 03/11/2026 (UTC) | Auditoria Fase 0 (nuvem) — commit `f59a67e` | Relatório + evidências; somente documentação |
| 02/11/2026 | Incremento 0.1 — fechamento documental da Fase 0 (notebook) | Verificação do notebook e ZIP; documentos §92.8; README alinhado. Gate aguardando proprietário |
