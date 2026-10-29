# Dependências, runtime e limites de segurança — beta.18

## Versões diretas declaradas

| Pacote | Versão fixa no `package.json` | Papel |
|---|---:|---|
| Node.js | `>=22.12.0` | Runtime de desenvolvimento/testes |
| React | `19.3.1` | UI |
| React DOM | `19.3.1` | Renderização web |
| Vite | `8.3.5` | Dev server/build posterior |
| `@vitejs/plugin-react` | `6.1.2` | Pipeline JSX/React |
| Electron | `45.1.0` | Processo desktop de desenvolvimento e empacotamento posterior |
| `electron-builder` | `26.18.1` | Ferramenta de release futura; não executada nesta Fase 0 |

A tabela representa versões declaradas no código da beta.18, não um lockfile resolvido. Para confirmar a versão/tag e verificar avisos atuais, use o registry no notebook: [React no npm](https://www.npmjs.com/package/react), [Vite no npm](https://www.npmjs.com/package/vite), [plugin React no npm](https://www.npmjs.com/package/%40vitejs/plugin-react), [electron-builder no npm](https://www.npmjs.com/package/electron-builder?activeTab=versions) e [releases do Electron](https://releases.electronjs.org/).

## Situação de lockfile e SCA

Não existe `package-lock.json` entregue neste ZIP. A tentativa de criá-lo no ambiente de desenvolvimento falhou (`ENOTCACHED` em modo offline porque o pacote/transitive metadata não estava em cache; tentativa online anterior não concluiu por indisponibilidade de rede). Não foi gerado lockfile artificial. No notebook, `npm install` deverá criar o lockfile do ambiente e `npm audit --json` deverá ser salvo e triado. Para reprodutibilidade, futuras entregas devem incluir lockfile gerado com registry acessível e testar `npm ci` a partir dele.

## Controles já presentes (não confundir com auditoria independente)

- Electron: `contextIsolation`, `sandbox`, `nodeIntegration: false`, preload exposto via `contextBridge`, IPC limitado a handlers, validação da origem e bloqueio de popups/navegação externa.
- Content Security Policy em `index.html`, recursos estáticos relativos e zoom acessível.
- Escrita desktop protegida via `safeStorage`; falha se a proteção nativa não estiver disponível.
- Dados Web explicitamente não criptografados em repouso.
- Sem login remoto real, sem token/sessão fictícia, sem provedor bancário/Open Finance real, sem OCR visual real, sem backend de sincronização durável.

## Não realizado

Não houve `npm audit` real nesta sessão, SCA baseada em lockfile, SBOM, teste de penetração, análise ASVS formal, revisão externa de código, build de produção ou instalador. O projeto continua em modo de desenvolvimento e não deve ser tratado como certificado para gerir dados financeiros produtivos.
