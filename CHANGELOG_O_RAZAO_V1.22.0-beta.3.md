# O Razão — v1.22.0-beta.3

## Correção prioritária: recuperação após exceção da interface

- A tela de exceção passa a usar a mesma chave de snapshot prévio reconhecida pelo serviço de persistência, eliminando a chave de backup órfã.
- Antes de remover o estado ativo no fluxo de redefinição web, a aplicação grava e relê a cópia e verifica formato, presença e igualdade do conteúdo original.
- Se a cópia não puder ser gravada/verificada, a redefinição é interrompida e o estado ativo não é removido.
- O fluxo de redefinição local é bloqueado no desktop, onde a persistência é administrada pela API nativa do Electron; a tela informa que nenhum dado foi alterado.
- A mensagem de erro deixa de afirmar que os dados estão “100% seguros” e passa a comunicar a limitação com transparência.
- Adicionado teste automatizado estático para o contrato da recuperação e a ordem segura das operações.

## Limites desta versão

- Esta correção não constitui prova de recuperação ponta a ponta em navegadores reais nem substitui testes manuais de falhas de quota/armazenamento.
- O backup criado pela tela de exceção preserva o estado anterior; o fluxo de redefinição remove o estado ativo para tentar iniciar com estado vazio. A recuperação automática do snapshot continua condicionada ao contrato existente (estado ativo ilegível), não à remoção intencional da chave.
- A conexão Open Finance permanece uma demonstração simulada, sem conexão bancária real.
- Build e empacotamento desktop não foram executados nesta etapa, conforme o plano de desenvolvimento.
