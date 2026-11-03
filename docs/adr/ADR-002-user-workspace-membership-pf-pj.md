# ADR-002 — Modelo User / Workspace / Membership e separação PF/PJ

- **Status:** PROPOSED
- **Data:** 02/11/2026
- **Decisor:** proprietário + engenharia
- **Referências:** Plano §11 (11.1–11.8), §34, §64.12, §89; `CLAUDE.md`; `docs/audit/BASELINE_AS_BUILT.md` §7

> Proposta técnica. **Não é decisão aprovada.**

## Contexto
Na beta.20, PF e PJ coexistem num único documento de estado; a separação é o atributo `profileType` e filtros em memória (`entitiesForProfile`). O perfil ativo não é persistido. Não existem entidades User, Workspace ou Membership. O `CLAUDE.md` determina que PF/PJ precisa de `Workspace` independente com isolamento em domínio, storage, API, banco, IA, exportação e suporte, e que um seletor visual não é controle de segurança.

## Alternativas
| Alternativa | Avaliação |
|---|---|
| A. Manter `profileType` + filtros, reforçando testes | não atende o Plano/CLAUDE.md: vazamento por qualquer filtro esquecido; backup/export misturam perfis |
| B. **Workspace como unidade de persistência**: um repositório por workspace (`workspaceId` em todo registro + armazenamento separado), `WorkspaceContext` obrigatório em todo caso de uso, Membership local (papel `owner`) | atende o boundary; habilita backup/export por workspace e futura autorização server-side; requer migração |
| C. Bancos/arquivos totalmente separados sem identidade comum | isola, mas impede troca segura de workspace e evolução para Membership |

## Recomendação (proposta)
**B.** Entidades mínimas: `User` (local), `Workspace { id, kind: PF|PJ, name, currency, timezone, schemaVersion }`, `Membership { userId, workspaceId, role }`. Toda leitura/escrita recebe `WorkspaceContext`; repositórios não expõem consulta sem `workspaceId`; workspace ativo persistido.

## Migração (Plano §11.7) — a detalhar antes de aceitar
1. Backup integral validado antes de migrar.
2. Dry-run: particionar o documento beta.20 em 1 workspace PF + 1 PJ (se houver dados PJ), relatório de contagens e somas por entidade/conta antes e depois.
3. Referências cruzadas PF↔PJ → quarentena com relatório, nunca correção silenciosa.
4. Rollback provado restaurando o documento original.
5. Idempotência: reexecutar a migração não altera o resultado.

## Consequências se aceito
- Testes negativos obrigatórios: nenhuma consulta/exportação/contexto de IA retorna dados de outro workspace (§64.12).
- Backup/exportação por workspace; restauração não pode sobrescrever outro workspace.
- Depende do ADR-003 para o formato de armazenamento por workspace.

## Segurança
Boundary aplicado na camada Application/Repository, não na UI. Em modo online futuro, autorização server-side por Membership (ADR-005).

## Pendências para decisão
Compartilhamento de workspace PF familiar (§91 item 7); campos de cadastro PF/PJ (§11.3/11.4) e finalidade dos dados pessoais (LGPD) — **decisão do proprietário**.
