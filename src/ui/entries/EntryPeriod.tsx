// Cartão do período com os totais sempre visíveis (LAN-011) e o aviso com "Desfazer" (LAN-006).
import { useEffect } from 'react';
import type { FlowTotals } from '@/application/entry-list';
import { monthLabel, shiftMonth } from '@/application/entry-list';
import { formatBRL } from '@/application/format';
import { Icon } from '../components/Icon';

export function PeriodCard(p: {
  /** aaaa-mm; null na aba A vencer, que mostra todos os pendentes. */
  month: string | null;
  totals: FlowTotals;
  onMonth: (month: string) => void;
  /** IA-004: só aparece com a Razão IA ligada. */
  onExplain?: (() => void) | undefined;
}) {
  const { month, totals } = p;
  const terceiro =
    month === null
      ? { rotulo: 'A vencer', valor: totals.pending }
      : { rotulo: 'Resultado', valor: totals.result };
  return (
    <section className="rz-card rz-period" aria-label="Período e totais">
      <div className="rz-period-top">
        {month !== null ? (
          <div className="rz-period-nav">
            <button
              type="button"
              className="rz-period-btn"
              aria-label="Mês anterior"
              onClick={() => {
                p.onMonth(shiftMonth(month, -1));
              }}
            >
              <Icon name="back" size={18} />
            </button>
            <span className="rz-period-label">{monthLabel(month)}</span>
            <button
              type="button"
              className="rz-period-btn"
              aria-label="Próximo mês"
              onClick={() => {
                p.onMonth(shiftMonth(month, 1));
              }}
            >
              <Icon name="forward" size={18} />
            </button>
          </div>
        ) : (
          <span className="rz-period-label">Tudo o que ainda vai entrar ou sair</span>
        )}
        {p.onExplain ? (
          <button type="button" className="rz-explain-open" onClick={p.onExplain}>
            Explicar
          </button>
        ) : null}
      </div>
      <dl className="rz-totals">
        <div>
          <dt>Entradas</dt>
          <dd className="rz-num rz-totals-in">{formatBRL(totals.income, { signed: true })}</dd>
        </div>
        <div>
          <dt>Saídas</dt>
          <dd className="rz-num">{formatBRL(totals.expense)}</dd>
        </div>
        <div>
          <dt>{terceiro.rotulo}</dt>
          <dd className="rz-num">{formatBRL(terceiro.valor, { signed: true })}</dd>
        </div>
      </dl>
    </section>
  );
}

export function UndoToast(p: { texto: string; onUndo: () => void; onDone: () => void }) {
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
