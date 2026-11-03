# Evidências — beta.21 / subincremento 21.2 (valores e linhas de CSV/OFX)

Somente dados fictícios. Nenhum extrato real foi usado.

## Ambiente (03/11/2026)

| Item | Valor |
|---|---|
| Sistema | Windows 11 Pro (notebook do proprietário) |
| Node | 24.19.0 |
| Navegador | Google Chrome 156.0.8078.80, perfil temporário (Playwright `launch` sem `userDataDir`), `pt-BR`, `America/Sao_Paulo`, 1440×900 |
| Automação | `playwright-core` 1.64.1 instalado **fora do projeto** (diretório temporário); não é dependência do `package.json` |
| Aplicação | `npx vite --port 3000 --strictPort` sobre a árvore de trabalho da 21.2 |

## Reprodução

```
npx vite --port 3000 --strictPort          # na raiz do repositório
npm install playwright-core@1              # em um diretório FORA do repositório
node e2e-import-21-2.cjs <pasta-de-saída>   # a partir desse diretório
```

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `e2e-import-21-2.cjs` | Roteiro E2E (derivado da etapa de importação de `docs/audit/fase0/evidencias/visual/_roteiros/functional.cjs`) |
| `e2e-21.2-resultado.json` | Resultado bruto: `allPass: true`, 0 erros de página |
| `01-csv-revisao.png` | CSV da validação da Fase 0: "4 de 5 registro(s) válido(s) · 1 rejeitado(s)"; Café **Saída − R$ 4,50** (antes R$ 450,00); D'Avila presente (antes perdida); Estorno **Entrada + R$ 100,00** (antes saída); linha 6 rejeitada com motivo |
| `02-csv-rejeitados.png` | Idêntica à 01 (mesmo SHA-256): a seção de rejeitados já estava visível sem rolagem |
| `03-ofx-revisao.png` | OFX: `-1.234,56` → **Saída − R$ 1.234,56**; data 20261331 e valor `1.234` rejeitados com motivo; aviso de TRNTYPE contrário ao sinal |
| `04-csv-sem-negativos-aviso.png` | Aviso "Nenhum valor negativo encontrado" |
| `05-csv-delimitador-ambiguo.png` | Delimitador ambíguo: erro explícito na etapa de entrada, nada vai para a revisão |
| `SHA256SUMS` | Hashes dos arquivos acima |

## Achado registrado durante o E2E (fora do escopo da 21.2)

**IMP-01** — ao confirmar, "Padaria D'Avila fictícia" foi **ignorada** com o aviso "A categoria selecionada não pertence ao perfil ativo". Causa: `predictCategory` (`src/domain/categoryLearning.js:144-152`) devolve IDs fixos inexistentes (`alimentacao`, `transporte`, `lazer`) para descrições com "padaria", "restaurante", "uber", "posto", "netflix", "99" etc.; `applyReconciliationDecisions` rejeita a categoria. O defeito existia na beta.20, mascarado pela perda da linha (FIN-03). O parser está correto: a etapa `csv_apply_davila` grava "Livraria D'Avila fictícia" com 1.250 centavos, despesa. Ver `docs/risks/RISK_REGISTER.md`.
