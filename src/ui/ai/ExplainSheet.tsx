// Composição de um número (IA-004): saldo de partida, cada grupo com os lançamentos e o saldo de chegada.
// Tocar num grupo abre os lançamentos dele; tocar num lançamento abre o detalhe, quando a tela oferece.
import { useState } from 'react';
import type { Explanation } from '@/application/explain';
import { formatBRL, formatDate } from '@/application/format';

export function ExplainSheet(p: {
  explanation: Explanation;
  onOpen?: ((entryId: string) => void) | undefined;
}) {
  const e = p.explanation;
  const [aberto, setAberto] = useState<string | null>(e.groups[0]?.key ?? null);
  return (
    <div className="rz-explain">
      <p className="rz-explain-sentence">{e.sentence}</p>
      <section className="rz-card rz-explain-table" aria-label="Composição">
        {e.opening ? (
          <div className="rz-explain-row rz-explain-edge">
            <span>{e.opening.label}</span>
            <span className="rz-num">{formatBRL(e.opening.cents)}</span>
          </div>
        ) : null}
        {e.groups.map((g) => (
          <div key={g.key} className="rz-explain-group">
            <button
              type="button"
              className="rz-explain-row rz-explain-btn"
              aria-expanded={aberto === g.key}
              onClick={() => {
                setAberto(aberto === g.key ? null : g.key);
              }}
            >
              <span className="rz-explain-label">
                <span>{g.label}</span>
                <span className="rz-help">
                  {g.items.length === 1 ? '1 lançamento' : `${String(g.items.length)} lançamentos`}
                </span>
              </span>
              <span className={g.totalCents > 0 ? 'rz-num rz-explain-in' : 'rz-num'}>
                {formatBRL(g.totalCents, { signed: true })}
              </span>
            </button>
            {aberto === g.key ? (
              <ul className="rz-explain-items">
                {g.items.map((i, n) => (
                  <li key={`${i.entryId}-${String(n)}`}>
                    {p.onOpen ? (
                      <button
                        type="button"
                        className="rz-explain-link"
                        onClick={() => {
                          p.onOpen?.(i.entryId);
                        }}
                      >
                        {i.label} · {formatDate(i.date)}
                      </button>
                    ) : (
                      <span>
                        {i.label} · {formatDate(i.date)}
                      </span>
                    )}
                    <span className="rz-num">{formatBRL(i.amountCents, { signed: true })}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        {e.closing ? (
          <div className="rz-explain-row rz-explain-edge rz-explain-total">
            <span>{e.closing.label}</span>
            <span className="rz-num">{formatBRL(e.closing.cents)}</span>
          </div>
        ) : null}
      </section>
      {e.pending.count ? (
        <div className="rz-card rz-preview-card">
          <span className="rz-label">Ainda não entra no saldo</span>
          <span>
            {e.pending.count === 1
              ? '1 lançamento a vencer soma'
              : `${String(e.pending.count)} lançamentos a vencer somam`}{' '}
            <span className="rz-num">{formatBRL(e.pending.cents, { signed: true })}</span>. Entram quando você
            confirmar o pagamento.
          </span>
        </div>
      ) : null}
      <p className="rz-help">{e.method}</p>
    </div>
  );
}
