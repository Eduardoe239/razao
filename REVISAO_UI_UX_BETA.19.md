# Revisão de UI/UX — O Razão beta.19

## Referências consultadas

1. **ONETHING — How to Design a Banking App Dashboard for Data Clarity** (publicado/atualizado em setembro de 2026): orienta a priorizar posição financeira, mudanças recentes e próxima ação; deixar saldos contextualizados e projetar estados vazios, carregamento, dados parciais e falhas. https://www.onething.design/post/banking-app-dashboard-design
2. **Vercel — Web Interface Guidelines**: recomenda navegação por teclado, foco visível, alvos de toque adequados para celular, feedback claro, confirmação de ações destrutivas, estados de interface completos, respeito à redução de movimento e teste em celular/notebook/telas grandes. https://vercel.com/design/guidelines
3. **CMS Design System — UX Design Principles**: consistência de controles e linguagem, guiar o usuário até a conclusão, acessibilidade, expectativas claras, explicar resultados e construir confiança. https://design.cms.gov/guidelines/design-principles/
4. **Wise Design** (referência pública de identidade de produto financeiro): https://wise.design/

As referências são princípios e padrões públicos de produto; não significam que o Razão copie componentes proprietários ou que tenha sido possível auditar interfaces autenticadas de cada banco.

## Decisões de direção visual
- Branco e cinza frio como superfícies; azul institucional como cor de ação e orientação.
- Verde/vermelho/âmbar reservados a estados financeiros e mensagens semânticas, com fundo suave e texto legível.
- Remover gradientes multicoloridos, brilhos e sombras decorativas; manter profundidade apenas para hierarquia.
- Valor monetário e rótulo contextual devem ter prioridade sobre ornamento.
- Componentes semelhantes devem compartilhar altura, raio, foco, espaçamento e estados hover/disabled.
- No celular, evitar colunas estreitas, preservar a legibilidade de valores longos e permitir rolagem horizontal apenas dentro de tabelas quando necessário.
- Feedback para salvar, erro, vazio e recuperação deve ser explícito; não comunicar sucesso sem confirmação da operação.

## Validação manual pendente

| Área | Desktop/notebook | Tablet | Celular |
|---|---|---|---|
| Navegação e perfil PF/PJ | Pendente | Pendente | Pendente |
| Painel, saldos e gráficos | Pendente | Pendente | Pendente |
| Lançamento/edição e validação monetária | Pendente | Pendente | Pendente |
| Cartões e faturas | Pendente | Pendente | Pendente |
| Orçamento, recorrências e previsões | Pendente | Pendente | Pendente |
| Importação, conciliação, backup e restauração | Pendente | Pendente | Pendente |
| Modais, alertas, estados vazios e erros | Pendente | Pendente | Pendente |
| Teclado, foco visível, zoom e redução de movimento | Pendente | Pendente | Pendente |

**Critério de aceite:** nenhuma sobreposição/corte, sem rolagem horizontal global, valores e botões legíveis, fluxo completo sem áreas inertes, foco visível, mensagens de estado claras e sem alteração de regras/dados financeiros.
