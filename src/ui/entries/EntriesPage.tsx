// Lançamentos: para onde foi o dinheiro? Mês, totais do filtro sempre visíveis, lista por dia e detalhe
// (LAN-011, D-050). Excluir mostra "Desfazer" por 10 s (LAN-006). Busca, CSV e seleção em lote no I-05.
import { useCallback, useMemo, useState } from 'react';
import type { FlowFilter, FlowTab } from '@/application/entry-list';
import {
  activeFilterCount,
  emptyFilter,
  filterFlows,
  flowTotals,
  groupByDay,
  monthLabel,
  monthOfDate,
} from '@/application/entry-list';
import type { FlowRow, UndoToken } from '@/application/entry-ops';
import { createSuggester } from '@/application/ai';
import { explainFlows } from '@/application/explain';
import { ExplainSheet } from '../ai/ExplainSheet';
import { messageFor } from '@/application/errors';
import type { VaultSession, WorkspaceView } from '@/application/session';
import { Alert, Button, EmptyState } from '../components/ds';
import { Sheet } from '../components/Sheet';
import { EntryDetail } from './EntryDetail';
import { EntryFilters } from './EntryFilters';
import { EntryForm } from './EntryForm';
import { DayGroups, flowTitle } from './EntryRows';
import { ExportSheet, RecategorizeSheet } from './EntrySheets';
import { PeriodCard, UndoToast } from './EntryPeriod';
import { SearchSheet } from './SearchSheet';
import { useEntries } from './useEntries';

type Painel =
  | { t: 'novo' | 'filtros' | 'buscar' | 'exportar' | 'recategorizar' | 'explicar' }
  | { t: 'detalhe' | 'editar' | 'duplicar'; id: string }
  | null;

const TABS: readonly FlowTab[] = ['todos', 'entradas', 'saidas', 'a-vencer'];

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
  const [marcados, setMarcados] = useState<ReadonlySet<string> | null>(null);
  const contas = useMemo(() => new Map(view.accounts.map((a) => [a.account.id, a.account.name])), [view]);
  const iaLigada = session.entries.aiEnabled();
  const sugerir = useMemo(
    () =>
      estado.t === 'ok'
        ? createSuggester(estado.rows, estado.categories, estado.rules, iaLigada)
        : () => undefined,
    [estado, iaLigada],
  );
  const fechar = () => {
    setPainel(null);
    setErro(undefined);
  };
  const gravou = (m: string) => {
    setPainel(null);
    setMarcados(null);
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
  const nFiltros = activeFilterCount(f);
  const aberto = painel && 'id' in painel ? rows.find((r) => r.entryId === painel.id) : undefined;
  const titulo = (r: FlowRow) => flowTitle(r, categories);
  const selecionados = marcados ? lista.filter((r) => marcados.has(r.entryId)) : [];

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
  const abrir = (t: 'novo' | 'filtros' | 'buscar' | 'exportar' | 'recategorizar' | 'explicar') => () => {
    setPainel({ t });
  };

  return (
    <div className="rz-blocks rz-enter">
      <div className="rz-actions rz-entries-actions">
        <Button variant="primary" icon="plus" className="rz-only-desktop" onClick={abrir('novo')}>
          Novo lançamento
        </Button>
        <Button icon="search" onClick={abrir('buscar')}>
          Buscar
        </Button>
        <Button icon="sliders" onClick={abrir('filtros')}>
          {nFiltros ? `Filtros · ${String(nFiltros)}` : 'Filtros'}
        </Button>
        <Button icon="download" onClick={abrir('exportar')} aria-label="Exportar CSV">
          <span className="rz-only-desktop">Exportar CSV</span>
        </Button>
        <Button
          icon="check"
          aria-pressed={marcados !== null}
          onClick={() => {
            setMarcados(marcados ? null : new Set());
          }}
        >
          {marcados ? 'Cancelar seleção' : 'Selecionar'}
        </Button>
      </div>

      <PeriodCard
        month={tab === 'a-vencer' ? null : filtro.month}
        totals={totais}
        onMonth={(m) => {
          setFiltro({ ...filtro, month: m });
        }}
        onExplain={iaLigada && tab !== 'a-vencer' ? abrir('explicar') : undefined}
      />

      {lista.length === 0 ? (
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
        <DayGroups
          groups={groupByDay(lista, view.asOf)}
          categories={categories}
          accountNames={contas}
          onOpen={(id) => {
            setErro(undefined);
            setPainel({ t: 'detalhe', id });
          }}
          selection={
            marcados
              ? {
                  marked: marcados,
                  toggle: (id) => {
                    const n = new Set(marcados);
                    if (n.has(id)) n.delete(id);
                    else n.add(id);
                    setMarcados(n);
                  },
                }
              : undefined
          }
        />
      )}

      {marcados ? (
        <div className="rz-batch-bar" role="region" aria-label="Ações em lote">
          <span>
            {selecionados.length === 1 ? '1 selecionado' : `${String(selecionados.length)} selecionados`}
          </span>
          <Button
            size="sm"
            variant="primary"
            disabled={!selecionados.length}
            onClick={abrir('recategorizar')}
          >
            Recategorizar
          </Button>
        </div>
      ) : null}

      {painel?.t === 'novo' ? (
        <Sheet title="Novo lançamento" onClose={fechar}>
          <EntryForm
            session={session}
            view={view}
            categories={categories}
            rows={rows}
            suggest={sugerir}
            onDone={gravou}
          />
        </Sheet>
      ) : null}
      {painel?.t === 'explicar' ? (
        <Sheet title="O que compõe estes totais" onClose={fechar}>
          <ExplainSheet
            explanation={explainFlows(lista, categories, monthLabel(filtro.month).toLocaleLowerCase('pt-BR'))}
            onOpen={(id) => {
              setPainel({ t: 'detalhe', id });
            }}
          />
        </Sheet>
      ) : null}
      {painel?.t === 'buscar' ? (
        <Sheet title="Buscar" onClose={fechar}>
          <SearchSheet
            workspaceId={ws}
            rows={rows}
            categories={categories}
            accountNames={contas}
            onOpen={(id) => {
              setPainel({ t: 'detalhe', id });
            }}
            onCategory={(id) => {
              setFiltro({ ...filtro, categoryIds: [id] });
              setPainel(null);
            }}
          />
        </Sheet>
      ) : null}
      {painel?.t === 'exportar' ? (
        <Sheet title="Exportar CSV" onClose={fechar} bottom>
          <ExportSheet
            workspace={view.workspace}
            rows={lista}
            categories={categories}
            accountNames={contas}
            period={tab === 'a-vencer' ? 'a-vencer' : filtro.month}
            onDone={(m) => {
              setPainel(null);
              p.onChanged(m);
            }}
          />
        </Sheet>
      ) : null}
      {painel?.t === 'recategorizar' ? (
        <Sheet title="Recategorizar em lote" onClose={fechar} bottom>
          <RecategorizeSheet
            session={session}
            workspaceId={ws}
            rows={selecionados}
            categories={categories}
            onDone={gravou}
          />
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
            suggest={sugerir}
            duplicate={painel.t === 'duplicar'}
            onDone={gravou}
          />
        </Sheet>
      ) : null}
      {desfazer ? <UndoToast texto={desfazer.texto} onUndo={voltar} onDone={semDesfazer} /> : null}
    </div>
  );
}
