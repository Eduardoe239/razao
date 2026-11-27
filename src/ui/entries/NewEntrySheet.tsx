// Botão de novo lançamento da barra inferior do celular: abre o formulário de qualquer tela (J-02).
import { useMemo } from 'react';
import { createSuggester } from '@/application/ai';
import type { VaultSession, WorkspaceView } from '@/application/session';
import { Alert } from '../components/ds';
import { Sheet } from '../components/Sheet';
import { EntryForm } from './EntryForm';
import { useEntries } from './useEntries';

export function NewEntrySheet(p: {
  session: VaultSession;
  view: WorkspaceView;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const estado = useEntries(p.session, p.view);
  const iaLigada = p.session.entries.aiEnabled();
  const sugerir = useMemo(
    () =>
      estado.t === 'ok'
        ? createSuggester(estado.rows, estado.categories, estado.rules, iaLigada)
        : () => undefined,
    [estado, iaLigada],
  );
  return (
    <Sheet title="Novo lançamento" onClose={p.onClose}>
      {estado.t === 'ok' ? (
        <EntryForm
          session={p.session}
          view={p.view}
          categories={estado.categories}
          rows={estado.rows}
          suggest={sugerir}
          onDone={p.onDone}
        />
      ) : estado.t === 'erro' ? (
        <Alert tone="negative" title="Não foi possível abrir">
          {estado.msg}
        </Alert>
      ) : (
        <div aria-busy="true" aria-label="Carregando" style={{ minHeight: 120 }} />
      )}
    </Sheet>
  );
}
