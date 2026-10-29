# O Razão — v1.22.0-beta.10

- **Base anterior:** v1.22.0-beta.9.
- **Foco:** segurança semântica da fila outbox; impedir que uma sincronização não conectada seja apresentada como concluída.
- **Data:** 28/10/2026.

## Correções

- `OutboxSyncEngine.processQueue()` não simula mais sucesso quando não existe handler/servidor conectado; retorna `unconfigured` e preserva as operações pendentes.
- Operações marcadas `failed` permanecem na fila para inspeção/recuperação, mas não são reenviadas automaticamente sem uma ação explícita futura.
- Falhas repetidas incrementam a contagem de tentativas e marcam a operação como `failed` ao atingir o limite configurado.
- Falhas de persistência ao salvar a fila são reportadas como `persistence_error`.
- `RazaoLocalDatabase.enqueueOperation()` agora lança erro explícito se não conseguir persistir a nova mutação; não retorna um evento como se tivesse sido registrado com sucesso.
- Testes de sincronização ampliados para ausência de servidor, preservação da fila, limite de tentativas e falha de persistência.

## Testes executados

- `npm test`: **passou**, código de saída 0.
- Suíte de domínio: 101 aprovados, 0 falhas.
- Testes da outbox no conjunto principal: 10 aprovados, 0 falhas.
- Motor preditivo/isolamento: 11 aprovados, 0 falhas; integração estática: 3 verificações aprovadas.
- ZIP verificado com `unzip -t`.

## Limitações e itens pendentes

- A sincronização remota continua **não configurada** no aplicativo. Esta mudança evita sucesso falso, mas não implementa um backend de sincronização real.
- O serviço de backend atual ainda usa armazenamento em memória e resolução LWW; não deve ser tratado como pronto para produção.
- Os testes da outbox usam `localStorage` simulado/handler de teste; não são E2E reais nem prova de durabilidade sob falhas de sistema operacional.
- Não foi executado build, instalador `.exe`, teste visual manual, E2E de navegador/Electron, teste de penetração ou auditoria independente.
- **Fase 0 permanece aberta.** Esta versão não autoriza publicação no GitHub como release pronta nem liberação pública. Continuam bloqueadores o inventário visual/E2E, a decisão explícita de escopo de autenticação, a validação integral PF/PJ e os testes reais de recuperação/persistência previstos no Plano Mestre.

## Arquivos principais

- `src/services/syncQueue.js`
- `src/services/localDb.js`
- `src/services/syncQueue.test.js`
- `package.json`
