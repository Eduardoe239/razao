// Lançamentos: para onde foi o dinheiro? Mês, totais do filtro sempre visíveis, lista por dia e detalhe
// (LAN-011, D-050). Excluir mostra "Desfazer" por 10 s (LAN-006).
import { useCallback, useEffect, useState } from 'react';
import type { FlowFilter, FlowTab } from '@/application/entry-list';
import {
  activeFilterCount,
  categoryName,
  emptyFilter,
  filterFlows,
  flowTotals,
  groupByDay,
  monthLabel,
  monthOfDate,
  shiftMonth,
  signedCents,
} from '@/application/entry-list';
import type { FlowRow, UndoToken } from '@/application/entry-ops';
import { messageFor } from '@/application/errors';
import { formatBRL } from '@/application/format';
import type { VaultSession, WorkspaceView } from '@/application/session';
import { Alert, Amount, Button, EmptyState } from '../components/ds';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { EntryDetail } from './EntryDetail';
import { EntryFilters } from './EntryFilters';
import { EntryForm } from './EntryForm';
import { useEntries } from './useEntries';

type Painel =
  | { t: 'novo' }
  | { t: 'detalhe'; id: string }
  | { t: 'editar'; id: string }
  | { t: 'duplicar'; id: string }
  | { t: 'filtros' }
  | null;

const TABS: readonly FlowTab[] = ['todos', 'entradas', 'saidas', 'a-vencer'];

function iniciais(texto: string): string {
  const p = texto.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? p[0]?.[1] ?? '')).toUpperCase() || '·';
}

function UndoToast(p: { texto: string; onUndo: () => void; onDone: () => void }) {
  const { onDone } = p;
  useEffect(() => {
    const t = window.setTimeout(onDone, 10_000);
    return () => {
      window.clearTimeout(t);
    };
  }, [onDone]);
  return (
    <div className="rz-toast-area" role="status" aria-live="polite">
      <div className="rz-toast rz-toast-undo">
        <span>{p.texto}</span>
        <button type="button" className="rz-toast-btn" onClick={p.onUndo}>
          Desfazer
        </button>
      </div>
    </div>
  );
}

export function EntriesPage(p: {
  session: VaultSession;
  view: WorkspaceView;
  tab: string;
  onChanged: (m: string) => void;
  onRefresh: () => void;
}) {
  const { session, view } = p;
  const ws = view.workspace.id;
  const tab: FlowTab = TABS.find((t) => t === p.tab) ?? 'todos';
  const [chave, setChave] = useState(0);
  const estado = useEntries(session, view, chave);
  const [filtro, setFiltro] = useState<FlowFilter>(() => emptyFilter(monthOfDate(view.asOf)));
  const [painel, setPainel] = useState<Painel>(null);
  const [desfazer, setDesfazer] = useState<{ token: UndoToken; texto: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const fechar = () => {
    setPainel(null);
    setErro(undefined);
  };
  const gravou = (m: string) => {
    setPainel(null);
    setChave((c) => c + 1);
    p.onChanged(m);
  };
  const semDesfazer = useCallback(() => {
    setDesfazer(null);
  }, []);

  if (estado.t === 'carregando') {
    return (
      <div
        className="rz-card"
        aria-busy="true"
        aria-label="Carregando lançamentos"
        style={{ minHeight: 160 }}
      />
    );
  }
  if (estado.t === 'erro') {
    return (
      <Alert tone="negative" title="Não foi possível ler os lançamentos">
        {estado.msg}
      </Alert>
    );
  }
  const { rows, categories } = estado;
  const f = { ...filtro, tab };
  const lista = filterFlows(rows, f, categories);
  const totais = flowTotals(lista);
  const grupos = groupByDay(lista, view.asOf);
  const nFiltros = activeFilterCount(f);
  const achar = (id: string) => rows.find((r) => r.entryId === id);
  const aberto = painel && 'id' in painel ? achar(painel.id) : undefined;
  const titulo = (r: FlowRow) =>
    r.description ||
    (r.parts.length > 1 ? 'Lançamento dividido' : categoryName(categories, r.parts[0]?.categoryId ?? ''));

  const agir = async (fn: (op: string) => Promise<unknown>, depois: () => void) => {
    if (busy) return;
    setBusy(true);
    setErro(undefined);
    try {
      await fn(session.newOperationId());
      depois();
    } catch (e) {
      setErro(messageFor(e));
    } finally {
      setBusy(false);
    }
  };
  const excluir = (r: FlowRow) =>
    agir(
      async (operationId) => {
        const { undo } = await session.entries.remove(ws, { entryId: r.entryId, operationId });
        if (undo) setDesfazer({ token: undo, texto: `${titulo(r)} excluído. Some dos totais.` });
      },
      () => {
        setPainel(null);
        setChave((c) => c + 1);
        p.onRefresh();
      },
    );
  const confirmar = (r: FlowRow) =>
    agir(
      (operationId) => session.entries.confirm(ws, { entryId: r.entryId, date: view.asOf, operationId }),
      () => {
        gravou(`${titulo(r)} confirmado hoje. Entrou no saldo.`);
      },
    );
  const voltar = () => {
    const d = desfazer;
    setDesfazer(null);
    if (!d) return;
    void agir(
      (operationId) => session.entries.undoRemove(ws, { undo: d.token, operationId }),
      () => {
        gravou('Lançamento recuperado.');
      },
    );
  };

  const terceiro =
    tab === 'a-vencer'
      ? { rotulo: 'A vencer', valor: totais.pending }
      : { rotulo: 'Resultado', valor: totais.result };

  return (
    <div className="rz-blocks rz-enter">
      <div className="rz-actions rz-entries-actions">
        <Button
          variant="primary"
          icon="plus"
          className="rz-only-desktop"
          onClick={() => {
            setPainel({ t: 'novo' });
          }}
        >
          Novo lançamento
        </Button>
        <Button
          icon="sliders"
          onClick={() => {
            setPainel({ t: 'filtros' });
          }}
        >
          {nFiltros ? `Filtros · ${String(nFiltros)}` : 'Filtros'}
        </Button>
      </div>

      <section className="rz-card rz-period" aria-label="Período e totais">
        {tab !== 'a-vencer' ? (
          <div className="rz-period-nav">
            <button
              type="button"
              className="rz-period-btn"
              aria-label="Mês anterior"
              onClick={() => {
                setFiltro({ ...filtro, month: shiftMonth(filtro.month, -1) });
              }}
            >
              <Icon name="back" size={18} />
            </button>
            <span className="rz-period-label">{monthLabel(filtro.month)}</span>
            <button
              type="button"
              className="rz-period-btn"
              aria-label="Próximo mês"
              onClick={() => {
                setFiltro({ ...filtro, month: shiftMonth(filtro.month, 1) });
              }}
            >
              <Icon name="forward" size={18} />
            </button>
          </div>
        ) : (
          <span className="rz-period-label">Tudo o que ainda vai entrar ou sair</span>
        )}
        <dl className="rz-totals">
          <div>
            <dt>Entradas</dt>
            <dd className="rz-num rz-totals-in">{formatBRL(totais.income, { signed: true })}</dd>
          </div>
          <div>
            <dt>Saídas</dt>
            <dd className="rz-num">{formatBRL(totais.expense)}</dd>
          </div>
          <div>
            <dt>{terceiro.rotulo}</dt>
            <dd className="rz-num">{formatBRL(terceiro.valor, { signed: true })}</dd>
          </div>
        </dl>
      </section>

      {grupos.length === 0 ? (
        <div className="rz-card">
          <EmptyState
            title={rows.length === 0 ? 'Nenhum lançamento ainda' : 'Nada neste filtro'}
            text={
              rows.length === 0
                ? 'Registre uma entrada ou uma saída pelo botão de novo lançamento.'
                : 'Troque o mês ou limpe os filtros para ver mais lançamentos.'
            }
          />
        </div>
      ) : (
        grupos.map((g) => (
          <section key={g.date} className="rz-day" aria-label={g.label}>
            <div className="rz-day-head">
              <span>{g.label}</span>
              <span className="rz-num">{formatBRL(g.totalCents, { signed: true })}</span>
            </div>
            <ul className="rz-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {g.rows.map((r) => {
                const conta = view.accounts.find((a) => a.account.id === r.accountId)?.account.name ?? '';
                const cat =
                  r.parts.length > 1
                    ? `${String(r.parts.length)} categorias`
                    : categoryName(categories, r.parts[0]?.categoryId ?? '');
                return (
                  <li key={r.entryId}>
                    <button
                      type="button"
                      className="rz-row-btn"
                      onClick={() => {
                        setErro(undefined);
                        setPainel({ t: 'detalhe', id: r.entryId });
                      }}
                    >
                      <div className={r.status === 'pendente' ? 'rz-tx rz-tx-pending' : 'rz-tx'}>
                        <span className="rz-tx-icon" aria-hidden="true">
                          {iniciais(titulo(r))}
                        </span>
                        <div>
                          <div className="rz-tx-title">{titulo(r)}</div>
                          <div className="rz-tx-meta">
                            {conta} · {cat}
                            {r.edited ? ' · editado' : ''}
                          </div>
                        </div>
                        <div className="rz-tx-right">
                          <Amount cents={signedCents(r)} />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {painel?.t === 'novo' ? (
        <Sheet title="Novo lançamento" onClose={fechar}>
          <EntryForm session={session} view={view} categories={categories} rows={rows} onDone={gravou} />
        </Sheet>
      ) : null}
      {painel?.t === 'filtros' ? (
        <Sheet title="Filtros" onClose={fechar} bottom>
          <EntryFilters
            view={view}
            rows={rows}
            categories={categories}
            value={f}
            onApply={(novo) => {
              setFiltro({ ...novo, month: filtro.month });
              setPainel(null);
            }}
          />
        </Sheet>
      ) : null}
      {painel?.t === 'detalhe' && aberto ? (
        <Sheet title={titulo(aberto)} onClose={fechar} bottom>
          <EntryDetail
            row={aberto}
            view={view}
            categories={categories}
            today={view.asOf}
            busy={busy}
            erro={erro}
            onEdit={() => {
              setPainel({ t: 'editar', id: aberto.entryId });
            }}
            onDuplicate={() => {
              setPainel({ t: 'duplicar', id: aberto.entryId });
            }}
            onDelete={() => void excluir(aberto)}
            onConfirm={() => void confirmar(aberto)}
          />
        </Sheet>
      ) : null}
      {(painel?.t === 'editar' || painel?.t === 'duplicar') && aberto ? (
        <Sheet title={painel.t === 'editar' ? 'Editar lançamento' : 'Duplicar lançamento'} onClose={fechar}>
          <EntryForm
            session={session}
            view={view}
            categories={categories}
            rows={rows}
            row={aberto}
            duplicate={painel.t === 'duplicar'}
            onDone={gravou}
          />
        </Sheet>
      ) : null}
      {desfazer ? <UndoToast texto={desfazer.texto} onUndo={voltar} onDone={semDesfazer} /> : null}
    </div>
  );
}
