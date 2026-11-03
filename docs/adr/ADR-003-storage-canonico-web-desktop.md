# ADR-003 — Storage canônico Web e Desktop

- **Status:** PROPOSED
- **Data:** 02/11/2026
- **Decisor:** engenharia, com aceite do proprietário
- **Referências:** Plano §46.3, §66, §69, §89; Relatório DATA-01..05, SEC-02, EST-03; `docs/audit/BASELINE_AS_BUILT.md` §5

> Proposta técnica. **Não é decisão aprovada.** A Alpha 1 prevê apenas **POC**, sem migrar tudo.

## Contexto
- Web: estado completo PF+PJ em `localStorage` (`razao_app_state_v3`), sem cifragem, regravado inteiro a cada mudança e duplicado no LKG; quota ~5 MB; auditoria truncada em 500 eventos para caber.
- Desktop: `safeStorage` + arquivo `.enc` atômico com LKG e pré-restauração; Windows real não verificado.
- Não há contrato de repositório entre domínio e armazenamento.

## Alternativas
| Alternativa | Benefício | Custo / risco |
|---|---|---|
| A. Manter `localStorage` | nenhum custo | quota, sem cifragem, sem transações; bloqueia DATA-04 e escala §66 |
| B. **IndexedDB (Web) + manter arquivo cifrado (Desktop) atrás de um Port comum** | transações, quota maior, gravação por registro; Desktop preserva o que já funciona | cifragem Web exige chave derivada de senha/PIN (decisão de UX); migração |
| C. SQLite no Desktop (better-sqlite3/WASM) + IndexedDB na Web | consultas e índices fortes no Desktop | dependência nativa no Electron, empacotamento, superfície maior; só justificável com medição |

## Recomendação (proposta)
1. Definir Ports `WorkspaceRepository`/`AuditRepository` com operações transacionais e confirmação de gravação (resolve o padrão de "sucesso antes de persistir", P0-5).
2. Adapter legado `localStorage` atrás do Port (sem mudar comportamento).
3. **POC** IndexedDB com dados sintéticos de 2k/10k/50k lançamentos: medir gravação, leitura, quota e recuperação; comparar com SQLite no Desktop só se a medição indicar necessidade.
4. Decisão final (ACCEPTED) somente com resultados da POC.

## Consequências se aceito
- Habilita auditoria sem truncamento silencioso (DATA-04) e armazenamento por workspace (ADR-002).
- Recuperação deve preservar bytes corrompidos e avisar (DATA-02) em qualquer adapter.

## Segurança e privacidade
Web sem cifragem continua declarada na UI até haver chave do usuário; Desktop mantém fail-closed sem `safeStorage`. Cifragem Web depende de decisão de UX (senha/PIN) — **proprietário**.

## Migração
`localStorage` → IndexedDB com backup prévio, dry-run, contagens/somas antes e depois, rollback provado (Plano C.3). Não iniciar antes do ADR-002 aceito.
