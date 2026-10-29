# O Razão — v1.22.0-beta.14

## Foco
Persistência Web local-first: recuperação do último estado confirmado e comunicação visível de falhas no snapshot secundário.

## Alterações
- Adicionada a chave `razao_app_state_v3.last-known-good`, com envelope versionado e timestamp, contendo os bytes JSON do último estado financeiro cuja gravação principal foi confirmada.
- As gravações Web validam o estado serializado, gravam o estado principal, confirmam a leitura de retorno e só então atualizam a cópia de recuperação.
- Em corrupção JSON/estrutura inválida do estado principal, a leitura tenta recuperar primeiro o último estado confirmado e depois a cópia pré-restauração. Se todas as cópias falharem, a leitura falha explicitamente em vez de retornar estado vazio.
- A limpeza explícita legada (`saveState(null)`) remove a cópia recuperável para evitar ressuscitar dados apagados.
- Se a gravação principal for concluída mas a cópia secundária falhar (por exemplo, quota excedida), a gravação principal continua sendo reportada corretamente como bem-sucedida e a interface recebe aviso acessível `role="alert"`. Uma gravação principal não confirmada emite aviso de falha.
- Uma gravação posterior que atualize a cópia secundária limpa o aviso de armazenamento.
- Atualizados testes de contrato e adicionados testes comportamentais usando o módulo real de persistência com `localStorage` simulado.

## Testes executados
- `npm test`: código de saída 0.
- Testes de domínio: 100 aprovados, 0 falhas.
- Recuperação desktop: 4 cenários aprovados.
- Recuperação Web: 5 cenários aprovados, cobrindo estado corrompido, quota/falha do snapshot, fallback pré-restauração, falha de todas as cópias e limpeza explícita.
- Integridade estrutural do ZIP: verificada após empacotamento.

## Limitações conhecidas
- Os testes Web simulam `localStorage`; não são testes E2E em Chromium real nem reproduzem todos os comportamentos de quota, encerramento abrupto, perfil corrompido ou concorrência de múltiplas abas.
- `localStorage` não oferece transação atômica entre a chave principal e a cópia. O mecanismo confirma a chave principal antes de atualizar o snapshot e informa falhas secundárias, mas não equivale a um banco transacional.
- A cópia local não é criptografia em repouso. Backup/snapshot no mesmo armazenamento/origem não protege contra exclusão de todo o perfil do navegador, perda física do dispositivo ou malware com acesso à sessão.
- Não foi executado build, instalador ou teste visual/E2E nesta rodada, de acordo com a instrução de adiar build/empacotamento.
- A Fase 0 permanece aberta. Esta entrega não demonstra todos os requisitos do Plano Mestre.
