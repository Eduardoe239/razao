# Relatório de verificações automatizadas — O Razão v1.22.0-beta.17

**Data:** 28/10/2026  
**Base:** `1.22.0-beta.16`  
**Finalidade:** evidência reproduzível da verificação estática e automatizada antes de qualquer decisão sobre o gate da Fase 0.

## Resumo executivo

| Verificação | Resultado | Interpretação correta |
|---|---|---|
| `npm test` | PASS — código de saída 0 | O script agregador encadeia 47 scripts `.mjs`; inclui domínio, regressão, simulações e verificações estáticas. |
| Suíte de domínio financeira | 100 aprovados, 0 falhas | Não substitui jornada completa na interface real. |
| Parser monetário | 28 assertions, 0 falhas | Casos explícitos aceitos/recusados para formatação e centavos inteiros. |
| Validação de estado | 17 assertions, 0 falhas | Estrutura e invariantes selecionadas; não cobre todos os schemas legados. |
| Fronteira de confiança Electron | 7 checks, 0 falhas | APIs de Electron simuladas, não Electron/Windows real. |
| Validação de backup histórico | 10 assertions, 0 falhas | Não demonstra a migração de todos os formatos históricos suportados. |
| Auditoria local | 17 assertions; integração 21 checks | Não torna o log imutável nem assinado. |
| Recuperação desktop | 5 cenários, 0 falhas | `safeStorage`/Electron mockados. |
| Recuperação Web | 5 checks, 0 falhas | `localStorage` simulado; sem quota real ou concorrência multiaba. |
| Consistência restauração/snapshot Web | 4 cenários, 0 falhas | Testes de serviço, sem renderer real. |
| Outbox | 4 cenários, 0 falhas | Não testa servidor remoto produtivo. |
| Fluxo visual/estático de recuperação inicial | 13 checks, 0 falhas | Não é clique/teclado real nem E2E visual. |
| `node --check` JS/MJS | PASS | Todos os `.js`/`.mjs` sob `src`, `api`, `scripts`. |
| `node --check electron/main.cjs` | PASS | Verifica sintaxe, não execução na aplicação empacotada. |
| Parse/transpile estático JSX | 23 arquivos, 0 erros | Não é type-check/bundling/build integral. |
| Integridade de arquivo | registrada no manifesto após empacotamento | `unzip -t` e SHA-256 são verificados ao gerar a entrega. |

## Comandos executados

```bash
npm test
find src api scripts -type f \( -name '*.js' -o -name '*.mjs' \) -print0 | while IFS= read -r -d '' f; do node --check "$f"; done
node --check electron/main.cjs
```

O parse dos 23 JSX foi realizado com `typescript.transpileModule` usando emissão React JSX e alvo ES2022. Os comandos foram executados no pacote em `/tmp/razao_beta17` antes de gerar o ZIP final.

## Bloqueadores não resolvidos por testes automatizados

1. O helper `src/domain/migrations.js` declara `CURRENT_SCHEMA_VERSION = 3`, enquanto o estado corrente sanitizado declara `version: 4`. `migrateData()` não está ligado ao boot/restauração; compatibilidade por schema antigo não está provada. Ver `F0-S1-11` no backlog.
2. As jornadas J01–J20 ainda não foram executadas integralmente num navegador real com dataset limpo e dataset volumoso.
3. A aplicação não foi carregada num Electron/Windows real nesta sessão; safeStorage, IPC, caminhos e rollback real permanecem sem prova runtime.
4. Não há evidência de quota real, encerramento abrupto, armazenamento multiaba, desempenho com 5.000+ entidades ou revisão visual completa de acessibilidade.
5. `npm install` excedeu o limite desta sessão; não foi criado lockfile incompleto e a auditoria reprodutível de dependências/SCA não foi completada.
6. O Plano Mestre reserva build/instalador para a fase de empacotamento; por isso não foi executado `npm run build` nem gerado `.exe` nesta etapa.
7. G1–G9 ainda exigem decisões e aprovações formais, incluindo revisão independente de segurança/privacidade. Testes verdes, isoladamente, não aprovam esses gates.

## Parecer

**Evidência automatizada: aprovada para os comandos listados. Gate da Fase 0: ABERTO / NÃO APROVADO.** Não declarar o sistema pronto para lançamento ou uso irrestrito com dados financeiros reais até corrigir os bloqueadores e concluir as provas manuais/ambientais descritas no Plano Mestre.
