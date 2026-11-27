// Raiz do app: monta a aplicação com a infraestrutura real e entrega à interface.
// É o único arquivo que pode ligar todas as camadas (Volume 06, seção 2).
import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createRazaoApp } from './application/app';
import { browserClock } from './infra/clock';
import { uuidv7 } from './infra/ids';
import { createBackupFilePort } from './infra/backup/file';
import { createServiceWorkerUpdates, noUpdates } from './infra/pwa';
import { createVaultPort } from './infra/vault-adapter';
import { App } from './ui/App';
import { AppContext } from './ui/context';
import './ui/theme/tokens.css';
import './ui/theme/base.css';
import './ui/components/components.css';
import './ui/components/extra.css';
import './ui/screens/screens.css';
import './ui/shell/shell.css';
import './ui/entries/entries.css';

const raiz = document.getElementById('app');
if (!raiz) throw new Error('Elemento #app não encontrado no index.html.');

const app = createRazaoApp({
  vault: createVaultPort({
    local: window.localStorage,
    storage: navigator.storage,
    nowIso: () => browserClock.nowIso(),
    nowMs: () => browserClock.nowMs(),
  }),
  clock: browserClock,
  ids: { newId: () => uuidv7(Date.now()) },
  file: createBackupFilePort(),
  prefs: window.localStorage,
  // O service worker só existe no build; no modo de desenvolvimento não há versão nova para avisar.
  updates: import.meta.env.PROD ? createServiceWorkerUpdates() : noUpdates,
});

createRoot(raiz).render(
  <StrictMode>
    <AppContext.Provider value={app}>
      <App />
    </AppContext.Provider>
  </StrictMode>,
);
