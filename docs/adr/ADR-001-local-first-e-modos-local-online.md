# ADR-001 — Local-first e modos local/online

- **Status:** PROPOSED
- **Data:** 02/11/2026
- **Decisor:** proprietário (decisão de produto — Plano §91 itens 1 e 2)
- **Referências:** Plano §5, §44, §46, §48, §91; `docs/audit/BASELINE_AS_BUILT.md`

> Proposta técnica. **Não é decisão aprovada.** Nada deve ser implementado com base neste ADR até mudar para `ACCEPTED`.

## Contexto
A beta.20 funciona somente local (Web `localStorage`; Desktop arquivo cifrado com `safeStorage`). Não há backend, autenticação nem sincronização produtivos; o código de "API" são mocks no bundle cliente. O Plano exige decidir plataformas da 1.0 e se o modo local é a experiência primária.

## Alternativas
| Alternativa | Benefício | Custo / risco |
|---|---|---|
| A. Local-first, Desktop Windows primário; Web local como secundária; online posterior e opcional | aproveita a base existente e o storage cifrado do Desktop; sem custo recorrente de servidor; menor superfície LGPD | sem multi-dispositivo na 1.0; Web local sem cifragem até ADR-003 |
| B. Online-first (cadastro e dados no servidor desde a 1.0) | multi-dispositivo e suporte | exige backend, identidade, PostgreSQL, operação 24×7, LGPD de operador — nada disso existe |
| C. Híbrido desde a 1.0 (local + sync) | melhor experiência | maior risco: protocolo de sync sem LWW (ADR-006) antes de domínio estável |

## Recomendação (proposta)
**A**, com contratos (Ports, IDs estáveis, eventos idempotentes) que não impeçam o modo online futuro. Online e sync entram apenas com ADR-005/006 e gates próprios.

## Consequências se aceito
- Alpha 1 foca em Workspace local e storage local escalável (ADR-002, ADR-003).
- Nenhuma tela pode sugerir conta online, login ou sync enquanto não existirem.
- `api/` mock deve sair do bundle (EST-02).

## Segurança e privacidade
Dados permanecem no dispositivo; exigência de cifragem Web e backup cifrado tratada no ADR-003 e no Plano §29.

## Migração
Nenhuma imediata. Decisão define o alvo das migrações do ADR-002/003.

## Pendências para decisão
Plataformas oficiais da 1.0 (Desktop, Web local, Web online, PWA) e se o cadastro inicial é local — **decisão do proprietário**.
