// SEC-05: aviso de versão nova. Nada muda sozinho; a versão nova entra quando a pessoa toca em "Atualizar",
// depois de terminar qualquer gravação em andamento, ou quando o app for reaberto.
import { useEffect, useState } from 'react';
import { Button } from './components/ds';
import { useRazao } from './context';

export function UpdateBanner() {
  const app = useRazao();
  const [disponivel, setDisponivel] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(
    () =>
      app.onUpdateAvailable(() => {
        setDisponivel(true);
      }),
    [app],
  );
  if (!disponivel) return null;
  return (
    <div className="rz-update" role="status">
      <span>Há uma versão nova do Razão.</span>
      <Button
        size="sm"
        variant="primary"
        busy={busy}
        onClick={() => {
          setBusy(true);
          void app.applyUpdate().catch(() => {
            setBusy(false);
          });
        }}
      >
        {busy ? 'Atualizando…' : 'Atualizar'}
      </Button>
    </div>
  );
}
