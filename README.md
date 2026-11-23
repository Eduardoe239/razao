# O Razão

**Suas finanças. Com lógica.**

Gestor financeiro brasileiro para pessoas e pequenos negócios: local-first, com espaços PF e PJ separados, números auditáveis e uma assistente de IA que explica cada valor que mostra.

## Situação do projeto

O O Razão está em **refundação**. O produto foi redefinido no Plano Mestre V3.0 e a aplicação será reconstruída como app web instalável (PWA) em TypeScript, com cofre local cifrado e livro-razão interno em partidas dobradas.

O código deste repositório é a **base histórica** `1.22.0-beta.20`, com as correções dos subincrementos 21.1 e 21.2 (importação de extratos CSV/OFX). Ele está congelado como referência: suas regras de domínio e testes serão migrados para a nova aplicação.

| Item | Estado |
|---|---|
| Base histórica | `1.22.0-beta.20` + 21.1 + 21.2 — congelada |
| Nova aplicação | Em especificação (Plano Mestre V3.0) |
| Uso com dados reais | **Não recomendado** — há defeitos conhecidos nesta base |

## Executar a base histórica

Requisitos: Node.js 22.12 ou superior.

```bash
npm ci
npm test
npm run dev
```

Use somente dados fictícios. A base histórica tem defeitos conhecidos: lançamentos feitos após as 21h podem receber a data do dia seguinte, e a opção "Tentar recuperação local" da tela de erro pode deixar os dados inacessíveis.

## Stack da base histórica

React 19, Vite 8 e Electron 45. O armazenamento Web usa `localStorage`, sem cifragem; o Desktop usa `safeStorage`. Os testes são scripts Node executados por `npm test` e pela CI (Ubuntu e Windows).

## Licença

Software proprietário. Copyright © 2026 Luís Eduardo de Sousa Barbosa. Todos os direitos reservados. Veja [LICENSE](./LICENSE).
