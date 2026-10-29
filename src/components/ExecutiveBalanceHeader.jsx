import React from 'react';

/** Resumo executivo: separa o saldo disponível dos indicadores do período. */
export function ExecutiveBalanceHeader({
  realizedCents = 0,
  projectedCents = 0,
  committedCents = 0,
  availableCents = 0,
  incomeCents = 0,
  expenseCents = 0,
  formatCurrency,
  hideAmounts = false
}) {
  const maskValue = value => hideAmounts ? '••••••' : value;
  const metrics = [
    { label: 'Saldo realizado', value: formatCurrency(realizedCents), className: '' },
    { label: 'Saldo previsto', value: formatCurrency(projectedCents), className: '' },
    { label: 'Comprometido', value: formatCurrency(committedCents), className: 'is-committed' },
    { label: 'Disponível', value: formatCurrency(availableCents), className: 'is-available' }
  ];

  return (
    <section className="executive-balance-wrap" aria-label="Resumo do saldo financeiro">
      <div className="hero-balance-card">
        <div className="hero-balance-head">
          <div>
            <div className="hero-balance-kicker"><span className="status-dot" /> SALDO DISPONÍVEL</div>
            <div className="hero-balance-caption" style={{ marginTop: 7 }}>O que está disponível considerando os lançamentos deste período</div>
          </div>
          <span className="hero-balance-caption">Valores em reais</span>
        </div>
        <div className="hero-balance-value font-mono-tabular">{maskValue(formatCurrency(availableCents))}</div>
        <div className="hero-balance-metrics">
          {metrics.map(metric => (
            <div className="hero-metric" key={metric.label}>
              <span className="hero-metric-label">{metric.label}</span>
              <span className={`hero-metric-value ${metric.className}`}>{maskValue(metric.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="summary-split-grid" aria-label="Entradas e saídas do período">
        <div className="summary-card">
          <div className="summary-icon-wrapper summary-icon-income" aria-hidden="true"><span>↘</span></div>
          <div className="summary-info">
            <span className="summary-label">Entradas do período</span>
            <strong className="summary-value">{maskValue(formatCurrency(incomeCents))}</strong>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon-wrapper summary-icon-expense" aria-hidden="true"><span>↗</span></div>
          <div className="summary-info">
            <span className="summary-label">Saídas do período</span>
            <strong className="summary-value">{maskValue(formatCurrency(expenseCents))}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
