# Changelog — O Razão v1.22.0-beta.20

## Redesign amplo de UI/UX

- Reorganizada a arquitetura visual do shell, com navegação agrupada, barra superior, menu compacto para tablet e navegação dedicada para celular.
- Reconstruída a hierarquia do dashboard: saldo disponível, indicadores do período, movimentações recentes, compromissos e recorrências.
- Reformulada a lista de lançamentos com busca, filtros avançados e ações com nomes explícitos.
- Reescrito o painel de planejamento/assistente para remover o vocabulário visual “futurista”, explicitar o motor determinístico, comparar cenários e exibir alertas com hierarquia semântica.
- Reescrito o gerenciador de recorrências com campos rotulados, feedback de validação e ações de status consistentes.
- Alinhadas as APIs do painel de perfil e preferências com as propriedades realmente fornecidas pelo aplicativo.
- Reformuladas as telas de inicialização, recuperação e erro com uma linguagem visual coerente e sem afirmações excessivas sobre segurança.
- Normalizados estilos de cartões, botões, campos, tabelas, foco e movimento reduzido.
- O envio de uma pergunta pelo campo de assistente do topo agora entrega a pergunta ao painel de planejamento, em vez de apenas navegar para a tela.
- Removidos emojis de alguns rótulos/estados de interface reformulados e removida a expressão “cenários futuristas”.
- Mantido o aviso de limitação da separação PF/PJ, pois a alternância de perfil não é controle de acesso independente.

## Validação

- `npm test`: código de saída 0.
- Sintaxe de JSX: 23/23 arquivos analisados sem diagnósticos de sintaxe.
- CSS: parser PostCSS sem erro de sintaxe.
- O build Vite e a revisão visual real não puderam ser concluídos nesta sessão; ver `REVISAO_UI_UX_BETA.20.md` para limites e próximos passos de validação.
