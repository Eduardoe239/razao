import React from 'react';

/**
 * CARD DE CICLO DE FATURA DE CARTÃO DE CRÉDITO (O RAZÃO 6.0)
 */

export function InvoiceCycleCard({ card, invoice, formatCurrency, onPayInvoice }) {
  if (!card || !invoice) return null;

  const limitCents = card.limitCents || 100000;
  const usedCents = invoice.totalCents || 0;
  const remainingCents = invoice.remainingCents || 0;
  const usagePercentage = Math.min(100, Math.round((usedCents / limitCents) * 100));

  const isClosed = invoice.status === 'fechada' || invoice.status === 'vencida';

  return (
    <div className="summary-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="summary-icon-wrapper" style={{ background: 'var(--brand-light)', color: 'var(--brand-accent)' }}>
            💳
          </div>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{card.name}</h4>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Fechamento: Dia {card.closingDay} • Vencimento: Dia {card.dueDay}
            </p>
          </div>
        </div>

        <span style={{
          fontSize: '11px',
          fontWeight: '800',
          padding: '4px 8px',
          borderRadius: 'var(--radius-pill)',
          background: isClosed ? 'var(--color-expense-bg)' : 'var(--color-income-bg)',
          color: isClosed ? 'var(--color-expense)' : 'var(--color-income)',
          textTransform: 'uppercase'
        }}>
          {invoice.status}
        </span>
      </div>

      {/* BARRA DE USO DO LIMITE */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          <span>Uso do Limite ({usagePercentage}%)</span>
          <span>{formatCurrency(usedCents)} / {formatCurrency(limitCents)}</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'var(--surface-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${usagePercentage}%`, height: '100%', background: 'var(--brand-gradient)', borderRadius: '999px' }} />
        </div>
      </div>

      {/* BOTÃO DE LIQUIDAÇÃO DE FATURA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Saldo Devedor</span>
          <span className="font-mono-tabular" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-expense)' }}>
            {formatCurrency(remainingCents)}
          </span>
        </div>

        {remainingCents > 0 && (
          <button
            onClick={() => onPayInvoice(card, invoice)}
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 18px', fontSize: '13px' }}
          >
            Pagar Fatura
          </button>
        )}
      </div>
    </div>
  );
}
