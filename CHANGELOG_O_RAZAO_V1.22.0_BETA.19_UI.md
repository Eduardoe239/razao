# O Razão v1.22.0-beta.19 — refinamento de UI/UX

## Objetivo
Refinar a camada visual sem alterar regras financeiras, formato de persistência, migrações ou contratos de domínio.

## Mudanças
- Paleta clara como padrão, baseada em branco, cinzas frios e azul institucional sóbrio; removidos o gradiente multicolorido, o brilho ciano/roxo e sombras de aspecto neon.
- Tokens de design consolidados para superfícies, texto, bordas, foco, estados financeiros, raio e sombras.
- Componentes de navegação, cards, botões, campos, modal e listas com bordas e elevação mais discretas e consistentes.
- Ajustes responsivos para celular: uma coluna nos cards de resumo, números longos com quebra segura, alvos de toque maiores, modal em bottom-sheet, respeito à safe-area e tabelas com rolagem horizontal localizada.
- Melhorias de foco visível por teclado, alvos de toque, `touch-action: manipulation` e respeito a `prefers-reduced-motion`.
- Mantido o azul e a identidade existente do Razão; sem neon, sem novas cores de marca e sem dependência de fonte remota.
- Conteúdo principal com espaçamento mais generoso e largura máxima ajustada para telas de notebook.

## Limites de validação desta entrega
- `npm test`: aprovado nesta sessão, código 0.
- O `npm install` da sessão de edição excedeu o tempo limite; portanto não foi possível executar `npm run build` nem realizar inspeção visual em navegador real nesta sessão.
- A alteração não é uma aprovação automática da Fase 0. É necessária validação visual e funcional no notebook do usuário, além de conferência em larguras de celular e tablet.
