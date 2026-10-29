# Guia de validação no notebook — Fase 0 — O Razão beta.18

Este é um roteiro de QA supervisionado para a versão-fonte `1.22.0-beta.18`. **Não é instalador nem release de produção.** Todas as jornadas devem usar dados fictícios e perfis de teste isolados.

## A. Preparar ambiente sem tocar em dados existentes

1. Baixe `razao-v1.22.0-beta.18-fase0-hardening.zip` e extraia para uma pasta nova, por exemplo `C:\O_Razao_beta18_test`. Não extraia por cima de uma pasta anterior.
2. Não teste no mesmo perfil de navegador que contenha dados existentes. Não use contas bancárias reais, senhas, CPF/CNPJ reais ou informações de terceiros.
3. Instale Node.js **22.12.0 ou superior**. Abra PowerShell na pasta extraída e confirme:

```powershell
node -v
npm -v
```

4. Instale dependências. Isso precisa de acesso ao registry npm e pode baixar o binário Electron. O `package.json` fixa dependências diretas, mas o ZIP não inclui `package-lock.json`: o ambiente onde preparei o artefato estava sem rede/cache suficientes para gerar um lockfile honesto. A instalação local deve criar o lockfile que será usado nesta sessão de teste.

```powershell
npm install
```

Não use `--ignore-scripts` no passo de instalação, pois Electron depende de script de instalação para obter seu runtime. Não execute `npm run build`, `npm run desktop:build` ou qualquer instalador nesta fase.

## B. Regressão automatizada antes de abrir a interface

Execute:

```powershell
npm test *> .\test-beta18.log
$testExit = $LASTEXITCODE
Get-Content .\test-beta18.log -Tail 60
if ($testExit -ne 0) { throw "FALHA: npm test terminou com código $testExit. Preserve o log e não avance para os testes destrutivos." }
Write-Host "PASS: npm test terminou com código 0. Log: $PWD\test-beta18.log"
```

Condições esperadas: exit code 0; `101 APROVADOS, 0 FALHAS` na suíte de domínio; resultado final `10 aprovados, 0 falhas` do grupo legado; novos testes de fixture, migração, perfil e segurança sem falhas. Se qualquer script falhar, **pare e guarde `test-beta18.log`**. Não ignore um erro só porque os últimos testes passaram.

Com a mesma instalação, gere a auditoria de dependências:

```powershell
npm audit --json *> .\npm-audit.json
$auditExit = $LASTEXITCODE
Write-Host "npm audit exit code: $auditExit"
Get-Content .\npm-audit.json -TotalCount 80
```

Um código diferente de zero não significa por si só falha funcional; indica relatório de vulnerabilidade/erro que deve ser triado, corrigido ou justificado antes de aprovar G4. Guarde `npm-audit.json`, não tente instalar versões aleatórias durante a sessão de validação.

## C. Web no Edge ou Chrome

1. Em um PowerShell, execute:

```powershell
npm run dev
```

2. Aguarde a URL local indicada. Nesta versão deve ser `http://127.0.0.1:3000`.
3. Abra essa URL em um **perfil novo de navegador** ou janela privada dedicada. O aplicativo Web guarda dados no `localStorage`; não use um perfil que já tenha dados que queira preservar.
4. Registre a versão `1.22.0-beta.18`, OS, versão do browser, resolução e escala/zoom.
5. Rode a matriz manual dos IDs J01–J19 em `MATRIZ_JORNADAS_CRITICAS_FASE0_BETA.18.md`, nesta ordem. Primeiro execute operações não destrutivas; deixe corrupção/restauração para o fim e só no perfil descartável.

### Fluxo mínimo e seguro

- Primeiro uso: devem aparecer contas PF e PJ com saldo zero, categorias por perfil, nenhum cartão ou lançamento fictício.
- Lançamento: insira `R$ 12,34`; confira 1.234 centavos implícitos pelo saldo; depois confirme que valores com mais de duas casas decimais são recusados, sem saldo/evento novo.
- PF/PJ: crie pelo menos uma despesa distinta em cada perfil e percorra painel, histórico, orçamento, previsão, auditoria, recorrência e importador. Não deve haver vazamento de IDs nem de totais.
- Backup: exporte JSON e salve fora da pasta do projeto. Registre contas/lançamentos e totals antes de importar; valide restauração integral somente depois de manter cópia externa.
- Importação: use `fixtures/fase0-importacao-controle.csv`. O arquivo contém 20 linhas fictícias e repetição intencional. Não confirme itens sem revisar a lista e a conta selecionada.
- Volume: use `fixtures/fase0-dados-volumosos-2000.csv` em um perfil descartável. O modal pede colar texto, então abra o CSV no Bloco de Notas, copie o conteúdo e cole no importador. Registre tempo, quantidade importada, filtro, pesquisa, scroll e exportação.
- Corrupção/recovery: somente depois de um backup externo e usando o perfil descartável. Use DevTools para corromper a chave primária `razao_app_state_v3`, recarregue e verifique se o último estado confirmado é recuperado ou se aparece a tela explícita de recuperação. Nunca execute esse passo no perfil padrão/real. A restauração de cópia válida deve conferir contagens e totais; a cópia alterada deve ser recusada.
- Não teste quota esgotada ou desligamento de energia no primeiro ciclo. Isso é etapa controlada adicional: precisa de um perfil descartável, backup externo, log e plano para não danificar o ambiente.

## D. Electron de desenvolvimento no Windows (sem build/instalador)

Somente depois de `npm install` e `npm test` aprovados:

1. Pare o servidor Web (`Ctrl+C`).
2. Abra PowerShell na raiz extraída e execute:

```powershell
npm run desktop:dev
```

3. O script usa renderer Vite em `http://127.0.0.1:5173` e define o diretório de dados **isolado** em `.razao-desktop-test-profile\RazaoData`. Este modo é deliberadamente diferente do aplicativo instalado. Não remova nem altere a pasta de dados do aplicativo instalado.
4. Crie apenas dados fictícios, feche a janela Electron normalmente e abra de novo. Confira persistência e auditoria; confirme que o arquivo principal é `razao_app_db.enc` e que existe snapshot `razao_app_db.last-known-good.enc` quando os fluxos aplicáveis já tenham salvo o estado.
5. Confira que a pasta `.razao-desktop-test-profile` foi criada e que os dados do aplicativo instalado continuam inalterados. No modo empacotado, a variável de teste é ignorada; não estamos testando o executável final nesta fase.
6. Registre versão do Windows, Node, Electron e resultado. Feche com `Ctrl+C` no terminal. O script deve encerrar Vite e Electron.

O teste automatizado usa `safeStorage` simulado; somente esta etapa no Windows fornece evidência real de comportamento nativo. Mesmo que passe, isso não certifica todos os caminhos de recuperação, quota ou bloqueio do sistema.

## E. Teste visual e acessibilidade

Com browser dedicado, confira largura aproximada 375 px, 768 px e 1280 px, tema claro/escuro quando disponível, zoom 100%, 125% e 200%. Navegue usando apenas Tab/Shift+Tab, Enter, Espaço e Escape; valide foco visível, fechar/cancelar modal, labels legíveis, mensagens de erro e conteúdo não cortado. Abra DevTools, registre erros de Console e violações CSP. Se possível, use um leitor de tela e registre os resultados. Não marque G6 como aprovado apenas porque JSX passou no parser.

## F. Evidência que deverá voltar para a próxima rodada

Mantenha numa pasta separada (sem dados reais):

- `test-beta18.log`
- `npm-audit.json`
- screenshots das telas vazias, modais, estados inválidos, PF/PJ e viewport
- backup JSON fictício válido e cópia deliberadamente adulterada (somente teste)
- contagens/totais antes/depois da restauração
- resultado J01–J20 (PASS/FAIL/BLOCKED/NOT RUN), ambiente e passo exato de falhas
- screenshots/logs da sessão Electron e evidência de `.razao-desktop-test-profile/RazaoData`

Se algo falhar, pare, preserve estado e backup, não continue aplicando mutações e anote o passo exato. Um teste real é PASS somente com resultado observável; intenção ou teste simulado não basta.

## G. Gates que não devem ser autodeclarados

- G1: owner confirma a classificação real/parcial/mock e o escopo local-first.
- G2: jornadas financeiras reais aprovadas, inclusive fatura parcial/completa, transferência, recorrências e conciliação.
- G3: recuperação, migração, falha de leitura/escrita e rollback em ambiente local, com dados preservados.
- G4: lockfile reproduzível, auditoria de dependências e segredos, revisão de segurança/threat model e isolamento.
- G5: owner aprova privacidade, retenção, exportação/exclusão, fornecedores e consentimentos aplicáveis.
- G6: UI/a11y aprovada por teste de tarefa e acessibilidade real.
- G7: suporte, política de beta e incidente aprovados.
- G8: build/distribuição apenas na fase posterior do Plano Mestre.
- G9: exige zero S0/S1 abertos, regressão verde, release candidate e checklist assinado; a beta.18 não satisfaz este gate antes dos testes.
