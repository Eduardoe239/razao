// Carrega as receitas, despesas e categorias do espaço. Espaço da Alpha 1 sem categorias ganha as padrão
// na primeira vez (D-049); em modo seguro nada é gravado e a tela mostra o que existe.
import { useEffect, useState } from 'react';
import { messageFor } from '@/application/errors';
import type { FlowRow } from '@/application/entry-ops';
import type { Category } from '@/application/model';
import type { VaultSession, WorkspaceView } from '@/application/session';

export type EntriesState =
  | { readonly t: 'carregando' }
  | { readonly t: 'erro'; readonly msg: string }
  | { readonly t: 'ok'; readonly rows: readonly FlowRow[]; readonly categories: readonly Category[] };

/**
 * A lista é lida de novo quando o espaço é relido (`view` novo, depois de qualquer gravação em qualquer tela)
 * ou quando `chave` muda (gravação feita nesta tela).
 */
export function useEntries(session: VaultSession, view: WorkspaceView, chave = 0): EntriesState {
  const workspaceId = view.workspace.id;
  const [estado, setEstado] = useState<EntriesState>({ t: 'carregando' });
  useEffect(() => {
    let vivo = true;
    const ler = async () => {
      let categories = await session.entries.categories(workspaceId);
      if (!categories.length && !session.safeMode) {
        await session.entries.ensureDefaults(workspaceId);
        categories = await session.entries.categories(workspaceId);
      }
      const rows = await session.entries.list(workspaceId);
      if (vivo) setEstado({ t: 'ok', rows, categories });
    };
    ler().catch((e: unknown) => {
      if (vivo) setEstado({ t: 'erro', msg: messageFor(e) });
    });
    return () => {
      vivo = false;
    };
  }, [session, workspaceId, view, chave]);
  return estado;
}
