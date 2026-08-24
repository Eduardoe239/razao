# O Razão — controle financeiro pessoal

App de gestão de gastos: painel, lançamentos, contas, recorrências, metas,
análises com previsão e mais. Roda 100% no seu navegador, sem servidor —
seus dados ficam salvos só na sua máquina (localStorage do navegador).

## Como rodar

Pré-requisito: ter o **Node.js** instalado (versão 18 ou mais nova).
Baixe em https://nodejs.org se ainda não tiver.

1. Descompacte esta pasta em algum lugar do seu computador.
2. Abra um terminal dentro da pasta `razao-app`.
3. Instale as dependências (só precisa fazer isso uma vez):

   ```
   npm install
   ```

4. Rode o app:

   ```
   npm run dev
   ```

5. O terminal vai mostrar um endereço, algo como `http://localhost:5173`.
   Abra esse endereço no navegador — pronto, o app está rodando.

Pra parar, é só fechar o terminal ou apertar `Ctrl+C`.

## Passar pros seus amigos usarem

Cada pessoa precisa rodar a própria cópia na própria máquina (os dados
ficam salvos localmente no navegador de cada um, não são compartilhados
entre vocês). Duas formas fáceis:

- **Mandar a pasta inteira** (zipada) pra cada amigo, e cada um segue os
  passos acima na própria máquina.
- **Publicar online de graça**, daí todo mundo só acessa um link (sem
  precisar instalar nada). O jeito mais simples é o
  [Vercel](https://vercel.com) ou o [Netlify](https://netlify.com):
  suba esta pasta num repositório do GitHub e conecte no site deles —
  eles detectam que é um projeto Vite automaticamente e publicam um link
  público. Nesse caso, cada visitante ainda tem seus dados salvos só no
  próprio navegador (ninguém vê os dados de ninguém).

## Sobre os dados

Os dados ficam salvos no `localStorage` do navegador que você usar pra
abrir o app. Isso quer dizer:
- Se você limpar os dados de navegação do navegador, os lançamentos somem.
- Os dados não sincronizam entre computadores/navegadores diferentes.
- Pra fazer backup, use o botão **Exportar backup (.json)** dentro da
  aba Ajustes do próprio app, e guarde o arquivo em lugar seguro.
