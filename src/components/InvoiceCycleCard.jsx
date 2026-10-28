import React from 'react';

/**
 * WIDGET DE CARTÃO E CICLO DE FATURAS (O RAZÃO 3.0)
 * Exibe a saúde do cartão de crédito, barra de utilização do limite, datas de fechamento/vencimento
 * e botão direto para liquidação de fatura com validação matemática.
 */

export function InvoiceCycleCard({ card, invoice, formatCurrency, onPayInvoice }) {
  if (!card) return null;

  const limitCents = card.limitCents || 0;
  const currentTotalCents = invoice?.totalCents || 0;
  const remainingCents = invoice?.remainingCents ?? currentTotalCents;
  const usagePercent = limitCents > 0 ? Math.min(100, Math.round((currentTotalCents / limitCents) * 100)) : 0;

  const isClosed = invoice?.status === 'fechada' || invoice?.status === 'vencida';
  const isPaid = invoice?.status === 'paga' || remainingCents === 0;

  return (
    <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #475569 0%, #0F172A 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            💳
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#F8FAFC' }}>{card.name || 'Cartão de Crédito'}</h3>
            <p style={{ fontSize: '12px', color: '#94A3B8' }}>
              Fechamento: Dia {card.closingDay || '10'} • Vencimento: Dia {card.dueDay || '20'}
            </p>
          </div>
        </div>

        {/* Badge de Status da Fatura */}
        <span
          style={{
            padding: '6px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            background: isPaid ? 'var(--color-income-bg)' : isClosed ? 'var(--color-expense-bg)' : 'var(--color-pending-bg)',
            color: isPaid ? 'var(--color-income)' : isClosed ? 'var(--color-expense)' : 'var(--color-pending)'
          }}
        >
          {isPaid ? 'Fatura Paga' : isClosed ? 'Fatura Fechada' : 'Fatura em Aberto'}
        </span>
      </div>

      {/* Grid de Valores da Fatura */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', padding: '16px', background: 'rgba(2, 6, 23, 0.4)', borderRadius: '12px', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Total da Fatura</span>
          <span className="font-mono-tabular" style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC' }}>
            {formatCurrency(currentTotalCents)}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Saldo Devedor</span>
          <span className="font-mono-tabular" style={{ fontSize: '18px', fontWeight: '800', color: remainingCents > 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
            {formatCurrency(remainingCents)}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Limite Disponível</span>
          <span className="font-mono-tabular" style={{ fontSize: '18px', fontWeight: '800', color: '#00B4D8' }}>
            {formatCurrency(Math.max(0, limitCents - currentTotalCents))}
          </span>
        </div>
      </div>

      {/* Barra de Uso do Limite */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: '#94A3B8' }}>
          <span>Uso do Limite Total ({usagePercent}%)</span>
          <span className="font-mono-tabular">{formatCurrency(limitCents)}</span>
        </div>
        <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${usagePercent}%`,
              background: usagePercent > 85 ? 'var(--color-expense)' : 'var(--brand-blue-gradient)',
              borderRadius: '9999px',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      </div>

      {/* Botão de Ação para Pagamento de Fatura */}
      {remainingCents > 0 && (
        <button
          onClick={() => onPayInvoice(card, invoice)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            background: 'var(--color-income)',
            color: '#020617',
            border: 'none',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
        >
          Pagar Fatura ({formatCurrency(remainingCents)})
        </button>
      )}
    </div>
  );
}
