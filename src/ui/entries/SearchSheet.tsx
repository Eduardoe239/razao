// Busca em todos os meses do espaço ativo (REL-005). O índice fica só na memória e some ao fechar o app;
// as buscas recentes também só valem enquanto o app está aberto.
import { useMemo, useState } from 'react';
import { flowTotals } from '@/application/entry-list';
import type { FlowRow } from '@/application/entry-ops';
import { formatBRL } from '@/application/format';
import type { Category } from '@/application/model';
import { buildSearchIndex, searchCategories, searchFlows } from '@/application/search';
import { Button, EmptyState, TextField } from '../components/ds';
import { categoryName } from '@/application/entry-list';
import { FlowRows } from './EntryRows';

const MOSTRAR = 100;
/** Só na memória desta aba, por espaço: nada de busca é gravado no aparelho. */
const recentes = new Map<string, string[]>();

export function SearchSheet(p: {
  workspaceId: string;
  rows: readonly FlowRow[];
  categories: readonly Category[];
  accountNames: ReadonlyMap<string, string>;
  onOpen: (entryId: string) => void;
  onCategory: (categoryId: string) => void;
}) {
  const [q, setQ] = useState('');
  const indice = useMemo(
    () => buildSearchIndex(p.rows, p.categories, p.accountNames),
    [p.rows, p.categories, p.accountNames],
  );
  const achados = useMemo(() => searchFlows(indice, q), [indice, q]);
  const cats = searchCategories(p.categories, q);
  const anteriores = recentes.get(p.workspaceId) ?? [];
  const lembrar = () => {
    const t = q.trim();
    if (!t) return;
    recentes.set(p.workspaceId, [t, ...anteriores.filter((x) => x !== t)].slice(0, 5));
  };
  const total = flowTotals(achados);
  const vazio = !q.trim();
  return (
    <div className="rz-form">
      <TextField
        label="Buscar em todos os meses"
        value={q}
        onChange={setQ}
        placeholder="Descrição, categoria, conta, valor ou tag"
        autoFocus
      />
      {vazio ? (
        <div className="rz-search-hint">
          {anteriores.length ? (
            <div className="rz-chips" role="group" aria-label="Buscas recentes">
              {anteriores.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="rz-chip"
                  onClick={() => {
                    setQ(r);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          ) : null}
          <p className="rz-help">Procura neste espaço, só neste aparelho. Nada sai daqui.</p>
        </div>
      ) : null}
      {!vazio && achados.length ? (
        <p className="rz-search-summary" aria-live="polite">
          <span>
            {achados.length === 1 ? '1 lançamento' : `${String(achados.length)} lançamentos`}
            {achados.length > MOSTRAR ? `, mostrando os ${String(MOSTRAR)} mais novos` : ''}
          </span>
          <span className="rz-num">{formatBRL(total.result + total.pending, { signed: true })}</span>
        </p>
      ) : null}
      {cats.length ? (
        <div className="rz-search-cats">
          {cats.map((c) => (
            <Button
              key={c.id}
              size="sm"
              onClick={() => {
                lembrar();
                p.onCategory(c.id);
              }}
            >
              Ver {categoryName(p.categories, c.id)} na lista
            </Button>
          ))}
        </div>
      ) : null}
      {!vazio && achados.length ? (
        <FlowRows
          label="Resultados da busca"
          rows={achados.slice(0, MOSTRAR)}
          categories={p.categories}
          accountNames={p.accountNames}
          showDate
          onOpen={(id) => {
            lembrar();
            p.onOpen(id);
          }}
        />
      ) : null}
      {!vazio && !achados.length ? (
        <EmptyState
          title="Nada encontrado"
          text="Nenhum lançamento deste espaço tem esse texto. Tente outra palavra ou só parte do valor, como 126,40."
        />
      ) : null}
    </div>
  );
}
