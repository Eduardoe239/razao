# O Razão

**Suas finanças. Com lógica.** Gestor financeiro brasileiro para pessoa física e para o seu negócio (MEI, autônomo, microempresa), com os dados cifrados no seu próprio aparelho.

> **Situação:** em reconstrução. A Alpha 1 está em andamento no branch `alpha1`: um app web instalável (PWA), local e cifrado. Ainda não guarda dados. A versão anterior (`1.22.0-beta.20`) está preservada nas tags `v1.22.0-beta.20` e `base-historica-21.2`.

## Como funciona

- **Local e cifrado:** os dados ficam no navegador, num cofre cifrado com AES-256-GCM e chave protegida por Argon2id. Nada sai do aparelho sem uma ação sua.
- **Contas certas:** um livro-razão em partidas dobradas, com dinheiro em centavos inteiros e regras verificadas por testes de propriedade.
- **PF e PJ separados:** dois espaços isolados, com retirada e aporte registrados dos dois lados.

## Desenvolvimento

Requer Node 22 ou mais novo (a CI usa o Node 24).

```bash
npm ci
npm run dev       # app em modo de desenvolvimento
npm run verify    # tipos, lint, formato, testes, build e verificações
npm run e2e       # testes ponta a ponta (Chromium, Firefox e WebKit)
```

Pilha: TypeScript estrito, React, Vite, Vitest e Playwright. Hospedagem estática no Cloudflare Pages.

## Licença

Código publicado só para leitura, com todos os direitos reservados. Veja [LICENSE](LICENSE).
