// Registro do service worker e aviso de versão nova (NFR-001, SEC-05).
// A versão nova fica esperando; só entra quando a aplicação pede (depois de a pessoa tocar em "Atualizar"
// e sem gravação em andamento) ou quando todas as abas do app forem fechadas.
import type { UpdatePort } from '@/application/ports';

export function createServiceWorkerUpdates(url = '/sw.js'): UpdatePort {
  const ouvintes = new Set<() => void>();
  let esperando: ServiceWorker | null = null;
  const avisar = (sw: ServiceWorker | null) => {
    if (!sw || !navigator.serviceWorker.controller) return;
    esperando = sw;
    for (const f of ouvintes) f();
  };

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker
      .register(url, { scope: '/' })
      .then((reg) => {
        avisar(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const novo = reg.installing;
          novo?.addEventListener('statechange', () => {
            if (novo.state === 'installed') avisar(novo);
          });
        });
        // Procura versão nova ao voltar para o app e de hora em hora.
        const procurar = () => {
          void reg.update().catch(() => undefined);
        };
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) procurar();
        });
        window.setInterval(procurar, 60 * 60_000);
      })
      .catch(() => undefined);
  }

  return {
    onAvailable(f) {
      ouvintes.add(f);
      if (esperando) f();
      return () => {
        ouvintes.delete(f);
      };
    },
    async apply() {
      const sw = esperando;
      if (!sw) return;
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => {
            resolve();
          },
          { once: true },
        );
        sw.postMessage({ type: 'SKIP_WAITING' });
      });
      window.location.reload();
    },
  };
}

/** Sem service worker (testes de unidade e modo de desenvolvimento): nunca há versão nova. */
export const noUpdates: UpdatePort = {
  onAvailable: () => () => undefined,
  apply: () => Promise.resolve(),
};
