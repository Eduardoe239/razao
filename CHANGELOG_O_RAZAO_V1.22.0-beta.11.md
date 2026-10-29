# O Razão — v1.22.0-beta.11

**Base:** v1.22.0-beta.10  
**Foco:** Fase 0 — desativação segura de autenticação demonstrativa  
**Status:** incremento técnico; Fase 0 ainda aberta.

## Correções
- Desativado o `UserAuthService` que mantinha usuários somente em memória, gerava hash determinístico fraco e emitia tokens de texto sem assinatura JWT.
- Desativado o `AuthService` legado que rotulava um hash trivial como Argon2id e montava uma assinatura de token sem HMAC/JWT real.
- Os dois serviços agora falham fechado com mensagem explícita de que a autenticação de produção não está configurada.
- Atualizados os testes do sistema para não tratar mais o protótipo como autenticação real.
- Adicionado teste dedicado para assegurar que cadastro/login não retornam tokens ou hashes fictícios.
- Versão incrementada para `1.22.0-beta.11`.

## Impacto e limitações
- Cadastro e login remotos ficam intencionalmente indisponíveis. A UI não tinha uma jornada real de autenticação conectada; o app continua com o modelo local-first atual.
- Isto não implementa autenticação de produção. Antes de habilitar contas remotas será necessário backend persistente, armazenamento de senha apropriado, emissão e validação de sessão, autorização por usuário, proteção contra abuso e testes de segurança.
- A classe `apiClient` ainda instancia o serviço desabilitado, mas chamadas de registro/login falham com mensagem clara; não há token falso.
- Open Finance continua demonstrativo, OCR continua sendo assistivo/prototípico e a sincronização remota não deve ser anunciada como serviço de produção.

## Testes executados
- `npm test` — passou com código de saída 0.
- Teste dedicado: 10 verificações de autenticação desativada até configuração segura.
- A suíte inclui verificações unitárias, estáticas e de integração simulada; isso **não** é evidência de E2E real, pentest ou revisão independente.
- Build e empacotamento não foram executados, conforme instrução do projeto para não antecipar a fase de packaging.

## Itens ainda bloqueadores da Fase 0
- Completar matriz as-built de todos os módulos e classificar real/parcial/mock.
- Verificar isolamento PF/PJ em todas as telas, relatórios, exportações, contas, cartões, faturas e migrações.
- Testar recuperação e persistência com falhas reais simuladas (interrupção, arquivo truncado, falta de espaço, restauração/rollback).
- Executar E2E pela interface nas jornadas P0 e revisão visual/manual em tamanhos e temas suportados.
- Completar revisão de segurança, privacidade, dependências e definição formal da modalidade local-first.
- Registrar evidências reproduzíveis e decisão explícita dos gates do Plano Mestre.
