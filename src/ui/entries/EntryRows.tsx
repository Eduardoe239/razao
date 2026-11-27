// Linhas de lançamento, usadas na lista por dia e nos resultados da busca. No modo de seleção, cada linha
// vira uma caixa de marcar (recategorizar em lote, CAT-004).
import type { DayGroup } from '@/application/entry-list';
import { categoryName, signedCents } from '@/application/entry-list';
import type { FlowRow } from '@/application/entry-ops';
import { formatBRL, formatDate } from '@/application/format';
import type { Category } from '@/application/model';
import { Amount } from '../components/ds';

export function flowTitle(r: FlowRow, categories: readonly Category[]): string {
  return (
    r.description ||
    (r.parts.length > 1 ? 'Lançamento dividido' : categoryName(categories, r.parts[0]?.categoryId ?? ''))
  );
}

function iniciais(texto: string): string {
  const p = texto.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? p[0]?.[1] ?? '')).toUpperCase() || '·';
}

export interface RowsProps {
  readonly categories: readonly Category[];
  readonly accountNames: ReadonlyMap<string, string>;
  readonly onOpen: (entryId: string) => void;
  /** Com seleção ligada, tocar na linha marca ou desmarca em vez de abrir. */
  readonly selection?:
    { readonly marked: ReadonlySet<string>; readonly toggle: (id: string) => void } | undefined;
  /** Na busca, a data aparece na linha, porque os resultados não vêm agrupados por dia. */
  readonly showDate?: boolean;
}

function Conteudo({ r, p }: { r: FlowRow; p: RowsProps }) {
  const titulo = flowTitle(r, p.categories);
  const cat =
    r.parts.length > 1
      ? `${String(r.parts.length)} categorias`
      : categoryName(p.categories, r.parts[0]?.categoryId ?? '');
  return (
    <div className={r.status === 'pendente' ? 'rz-tx rz-tx-pending' : 'rz-tx'}>
      <span className="rz-tx-icon" aria-hidden="true">
        {iniciais(titulo)}
      </span>
      <div>
        <div className="rz-tx-title">{titulo}</div>
        <div className="rz-tx-meta">
          {p.showDate ? `${formatDate(r.date)} · ` : ''}
          {p.accountNames.get(r.accountId) ?? ''} · {cat}
          {r.edited ? ' · editado' : ''}
        </div>
      </div>
      <div className="rz-tx-right">
        <Amount cents={signedCents(r)} />
      </div>
    </div>
  );
}

export function FlowRows(p: RowsProps & { rows: readonly FlowRow[]; label: string }) {
  return (
    <ul className="rz-list rz-flow-rows" aria-label={p.label}>
      {p.rows.map((r) => (
        <li key={r.entryId}>
          {p.selection ? (
            <label className="rz-row-check">
              <input
                type="checkbox"
                className="rz-checkbox"
                checked={p.selection.marked.has(r.entryId)}
                onChange={() => {
                  p.selection?.toggle(r.entryId);
                }}
              />
              <Conteudo r={r} p={p} />
            </label>
          ) : (
            <button
              type="button"
              className="rz-row-btn"
              onClick={() => {
                p.onOpen(r.entryId);
              }}
            >
              <Conteudo r={r} p={p} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DayGroups(p: RowsProps & { groups: readonly DayGroup[] }) {
  return (
    <>
      {p.groups.map((g) => (
        <section key={g.date} className="rz-day" aria-label={g.label}>
          <div className="rz-day-head">
            <span>{g.label}</span>
            <span className="rz-num">{formatBRL(g.totalCents, { signed: true })}</span>
          </div>
          <FlowRows {...p} rows={g.rows} label={g.label} />
        </section>
      ))}
    </>
  );
}
