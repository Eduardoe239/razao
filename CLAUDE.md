# O Razão — instruções para Claude Code

## Fonte normativa
Leia integralmente `PLANO_MESTRE_O_RAZAO_V2.0.md` antes de qualquer implementação. É a referência obrigatória de produto, arquitetura, PF/PJ, modelo financeiro, IA, segurança, UX, qualidade, roadmap e critérios de release.

## Regras essenciais
- Comece confirmando repositório, branch, `git status`, versão, hash e estado real do notebook. Preserve alterações locais e nunca substitua a base por um ZIP antigo.
- Trabalhe incrementalmente. Não reescreva o aplicativo nem implemente todas as fases de uma vez.
- O estado real do código e as evidências prevalecem sobre README/changelogs desatualizados; corrija a documentação divergente.
- Não use dados financeiros reais em testes, logs, prompts ou fixtures.
- Não marque cadastro, autenticação, sync, Open Finance, OCR ou IA como produtivos se dependem de mocks, serviços em memória ou regras determinísticas locais.
- PF/PJ precisa de `Workspace` independente e isolamento em domínio, storage, API, banco, IA, exportação e suporte; um seletor visual não é controle de segurança.
- Dinheiro em centavos inteiros; saldo derivado; transferência e pagamento de fatura sem dupla contagem; toda mutação crítica é idempotente e auditável.
- Não aplique LWW em eventos financeiros. Conflitos financeiros exigem resolução explícita.
- IA sugere e explica; não executa pagamento, transferência, exclusão ou ações sensíveis autonomamente.
- Preserve a logo oficial e a direção visual azul/branco/cinza aprovada; não use neon.
- Faça backup antes de migração/restore; prove rollback.
- Todo trabalho deve ter critérios de aceite e testes. Registre resultados reais, limitações e evidências. Nunca esconda uma falha.
- Não priorize instalador/`electron-builder` antes da fase final de distribuição, salvo necessidade de validação expressamente justificada.

## Regras complementares obrigatórias
Decisões do proprietário em `docs/PRODUCT/DECISIONS.md` complementam o Plano Mestre sem reescrevê-lo.
- **Saída de cada Alpha (D-011, RC-001):** uma Alpha **não** está concluída porque a implementação terminou. Após o gate técnico do Plano, prepare o pacote de avaliação (versão e hash imutáveis, changelog, matriz de funcionalidades, limitações conhecidas, critérios de aceite, roteiro de testes, dados sintéticos, evidências de QA, formulário estruturado), submeta-o a avaliação externa multidisciplinar compatível com o escopo, trie o feedback, implemente e reteste as correções necessárias e obtenha a aprovação formal do proprietário antes de congelar a versão ou iniciar a Alpha seguinte. Nunca declare uma Alpha encerrada sem essa aprovação.

## Primeira entrega obrigatória
Produza baseline as-built do repositório do notebook, inventário de recursos e mocks, mapa de persistência, matriz de mutações financeiras, matriz de isolamento PF/PJ, riscos P0/P1/P2/P3 e resultado de `npm test`. Depois proponha um backlog pequeno e ordenado, conforme o plano mestre.
