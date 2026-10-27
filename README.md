# 💰 O Razão — Controle Financeiro Pessoal

**O Razão** é uma aplicação de gestão financeira pessoal desenvolvida para ajudar no controle de gastos, organização de contas, planejamento de orçamento e acompanhamento de metas financeiras.

O projeto reúne recursos para registrar movimentações, gerenciar contas, realizar transferências, controlar recorrências e parcelas, acompanhar metas e analisar a evolução financeira.

O objetivo é tornar a gestão do dinheiro mais simples, organizada e inteligente, oferecendo uma visão clara da situação financeira e ajudando nas decisões do dia a dia.

## ✨ Funcionalidades

- 📊 **Painel financeiro:** visão geral das finanças e das movimentações.
- 💸 **Lançamentos:** registro e gerenciamento de receitas e despesas.
- 🏦 **Contas:** organização dos saldos e movimentações por conta.
- 🔄 **Transferências:** movimentação de valores entre contas.
- 📅 **Recorrências:** gerenciamento de movimentações recorrentes.
- 💳 **Parcelamentos:** distribuição de valores entre parcelas, com precisão nos centavos.
- 🎯 **Metas financeiras:** acompanhamento de limites de gastos e objetivos de poupança.
- 📈 **Análises e previsões:** ferramentas para compreender a evolução financeira e auxiliar no planejamento.
- 💾 **Backup:** exportação dos dados financeiros para um arquivo JSON.
- ⚙️ **Ajustes:** configurações e ferramentas de gerenciamento dos dados.

## 🛠️ Tecnologias utilizadas

- **React** — construção da interface.
- **JavaScript** — lógica da aplicação.
- **Vite** — ambiente de desenvolvimento e build.
- **Node.js** — ambiente necessário para executar as ferramentas do projeto.
- **Vitest** — testes automatizados.
- **localStorage** — armazenamento local dos dados financeiros.

## 🚀 Como executar o projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) — versão 18 ou superior.
- npm, incluído na instalação do Node.js.

### Instalação

**1. Clone o repositório:**

```bash
git clone https://github.com/Eduardoe239/razao.git
```

**2. Entre na pasta do projeto:**

```bash
cd razao
```

**3. Instale as dependências:**

```bash
npm install
```

**4. Inicie o servidor de desenvolvimento:**

```bash
npm run dev
```

**5. Acesse a aplicação:**

Abra no navegador o endereço exibido no terminal, normalmente:

```text
http://localhost:5173
```

Pronto! A aplicação estará disponível para uso no seu computador.

Para encerrar a execução, pressione `Ctrl + C` no terminal.

## 🧪 Testes automatizados

O projeto possui testes automatizados para validar regras importantes do núcleo financeiro, incluindo operações monetárias e distribuição de valores entre parcelas.

Para executar os testes, utilize:

```bash
npm test
```

Os testes ajudam a identificar regressões e preservar a consistência dos cálculos financeiros durante o desenvolvimento.

## 🌐 Como acessar online

O Razão pode ser publicado em uma plataforma de hospedagem compatível com React e Vite, como:

- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)

### Publicação

1. Envie o projeto para o GitHub.
2. Conecte o repositório à plataforma de hospedagem.
3. Configure o comando de build como `npm run build`.
4. Configure o diretório de publicação como `dist`, caso não seja detectado automaticamente.
5. Conclua a publicação e acesse o endereço gerado.

Depois da publicação, qualquer pessoa com acesso ao link poderá abrir a aplicação sem precisar instalar o Node.js ou executar comandos no próprio computador.

**Importante:** na arquitetura local atual, cada pessoa mantém seus próprios dados no navegador. A publicação online disponibiliza a aplicação, mas não cria sincronização automática entre usuários ou dispositivos.

## 🔐 Armazenamento e backup

Na versão baseada em armazenamento local, os dados são mantidos no `localStorage` do navegador utilizado para acessar a aplicação.

Isso significa que:

- Os dados ficam separados por navegador e dispositivo.
- Não existe sincronização automática entre computadores.
- Limpar os dados locais do navegador pode apagar os registros financeiros.
- A utilização de outro navegador não recupera automaticamente os dados anteriores.

### Como fazer backup

1. Abra a aplicação.
2. Acesse a aba **Ajustes**.
3. Utilize a opção **Exportar backup (.json)**.
4. Guarde o arquivo em um local seguro.

Recomenda-se realizar backups periódicos para evitar a perda dos registros financeiros.

## 🏗️ Arquitetura e desenvolvimento

O desenvolvimento do O Razão segue uma evolução incremental, organizada em fases e orientada pela especificação funcional e técnica do projeto.

### Fase 1 — Integridade estrutural

**Status: concluída**

- Correção do tratamento de datas locais.
- Preservação de metadados durante a edição de registros.
- Exclusão de registros com atenção à integridade referencial.

### Fase 2 — Núcleo financeiro

**Status: concluída**

- Representação de valores monetários em centavos inteiros.
- Criação do módulo `src/domain/money.js`, com testes automatizados.
- Transferências entre contas tratadas como operações próprias.
- Distribuição determinística de centavos no parcelamento.
- Metas de poupança com acompanhamento virtual ou reserva real em uma conta dedicada.

### Fase 3 e evolução contínua

**Status: em desenvolvimento**

Principais frentes de evolução:

- Gestão de cartões de crédito e ciclos de faturas.
- Orçamento geral por período.
- Maior separação entre regras de negócio e interface.
- Expansão dos testes de integração.
- Melhorias de acessibilidade e confiabilidade.
- Evolução das análises e previsões financeiras.

Para consultar os requisitos e critérios de implementação, consulte o documento `Razao_Especificacao_10_de_10`, caso esteja disponível no repositório.

### Estrutura atual

Parte significativa da lógica da aplicação ainda está concentrada em `src/App.jsx`.

O módulo `src/domain/money.js` representa o início da extração das regras de negócio para módulos independentes. A evolução arquitetural busca ampliar a modularidade, facilitar os testes e reduzir o acoplamento entre a interface e o núcleo financeiro.

## 🎯 Objetivo do projeto

O Razão busca evoluir de uma ferramenta de registro de receitas e despesas para uma solução mais completa de gestão financeira pessoal.

A proposta é reunir organização, consistência nos cálculos, previsibilidade e recursos inteligentes em uma aplicação prática para o dia a dia.

## 🤝 Contribuições

O Razão está em constante evolução!

Sugestões, ideias, relatos de problemas e melhorias são bem-vindos. Se você encontrar algum erro ou tiver uma ideia para aprimorar a aplicação, fique à vontade para contribuir com o projeto.

## 🚀 Próximos passos

O objetivo é continuar evoluindo o Razão, ampliando suas funcionalidades e tornando a gestão financeira cada vez mais prática, inteligente e acessível.

---

**O Razão** — mais clareza sobre o dinheiro, mais controle sobre as decisões. 💙
