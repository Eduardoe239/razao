# O Razão v1.22.0-beta.18

**Data:** 28/10/2026  
**Base anterior:** v1.22.0-beta.17  
**Ciclo:** `1.22.0-beta.n`, sem avançar a versão principal.  
**Objetivo:** hardening da Fase 0; preparação para validação manual Web/Electron, não lançamento.

## Correções e alterações reais

- Migração de schema canônica v1–v4 integrada ao fluxo de inicialização e de validação/importação de backups; conflito entre `version` e `schemaVersion` é recusado.
- Validação semântica ocorre antes da sanitização para impedir que registros financeiros danificados sejam removidos silenciosamente e o resultado passe a ser persistido como se estivesse íntegro.
- Primeiro uso gera contas PF/PJ com saldo zero e categorias locais por perfil, sem transações, cartões ou valores sintéticos. `sanitizeState` não instancia a fixture de demonstração como fallback.
- Migração de isolamento PF/PJ reescreve referências cruzadas em ambos os sentidos, preserva entidades originais e é idempotente; referências desconhecidas não são adivinhadas.
- Pagamento de fatura distingue `toAccountId` como ID de cartão quando `linkedInvoiceKey` existe. Transferência bancária comum exige conta de destino; a fronteira de persistência no Electron aplica a mesma regra.
- Guarda de mutação de lançamento valida proposta antes dos efeitos laterais: valor em centavos, ID da entidade editada, perfil, conta, categoria, cartão e destino de transferência. Não permite converter uma transferência existente pelo formulário simplificado.
- O formulário de lançamento usa o parser monetário estrito compartilhado; entradas com mais de duas casas decimais são recusadas, sem arredondamento silencioso na UI.
- Perfil Electron de desenvolvimento usa `.razao-desktop-test-profile/RazaoData`, isolado dos dados do aplicativo instalado.
- O inicializador Electron aguarda o renderer Vite em `127.0.0.1:5173`; o servidor Web normal é `127.0.0.1:3000`. README corrigido.
- Adicionados fixtures fictícios de importação: 20 linhas de controle (inclui duplicidade intencional) e 2.000 linhas volumosas; teste automatizado confere estrutura e centavos.
- Ligado ao `npm test` o script legado de testes de domínio que estava fora da cadeia; corrigido o fixture obsoleto de recorrência para usar `amountCents`.
- Endurecidos testes de validação do schema, isolamento, destino de faturas e perfil de desenvolvimento.

## Testes realizados nesta entrega

- `npm test`: terminou com exit code 0.
- 54 scripts de teste referenciados no `npm test` antes da expansão final; nesta versão a cadeia contém **55 scripts**, incluindo o conjunto legado `test-artifact.mjs`.
- Suíte de domínio: 101 aprovados, zero falhas.
- Teste de migração PF/PJ: 40 assertions; validação estrutural: 24 assertions; fronteira de confiança Electron: 19 checks; reconciliação: 29 verificações; parsing da fixture: 11 assertions (20 e 2.000 registros); formulário monetário: 31 assertions; mutação financeira: 12 assertions; contratos estáticos: 23 verificações. Todos aprovados.
- Sintaxe Node (JS/MJS/CJS) e análise parse/transpile de 23 arquivos JSX passaram.
- ZIP verificado com `unzip -t`; hash SHA-256 informado em arquivo separado.

## Limites e riscos conhecidos

- Nenhum build, instalador ou executável foi produzido/testado; a etapa está fora da Fase 0 por orientação do proprietário/Plano Mestre.
- Não foi possível obter `package-lock.json`: a rede do ambiente de trabalho não alcança o registry npm e o modo offline terminou com `ENOTCACHED`. Dependências diretas estão fixadas em versões exatas, mas a árvore transitiva ainda precisa ser travada/auditada na máquina conectada. Não foi inventado lockfile.
- Não executado E2E visual em navegador real ou Electron/Windows real; safeStorage foi testado com um Electron simulado.
- Testes de quota real, concorrência multiaba, interrupção abrupta de processo/energia, screen reader e teste manual de layouts ainda dependem do notebook.
- O armazenamento Web não é criptografado em repouso; histórico de auditoria é local e mutável.
- Autenticação real, Open Finance bancário, OCR real de imagem e sincronização remota durável não estão implementados nem devem ser apresentados como existentes.
- A Fase 0 continua ABERTA até que os itens remanescentes e gates do Plano Mestre sejam demonstrados e aprovados.
