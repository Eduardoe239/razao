import React from 'react';

/**
 * CABEÇALHO HERO DE SALDOS EXECUTIVOS (O RAZÃO 3.0)
 * Apresenta o saldo em destaque com os 4 Saldos Executivos amarrados matematicamente.
 * Suporta o modo de privacidade para ocultação de valores sensíveis.
 */

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
  const maskVal = (formatted) => hideAmounts ? '••••••' : formatted;

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* CARD PRINCIPAL HERO (ELEGÂNCIA VÍTREA COM GRADIENTE DA MARCA) */}
      <div className="hero-balance-card" style={{
        padding: '24px',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, #0077B6 0%, #050B18 100%)',
        boxShadow: 'var(--brand-blue-glow)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: '800',
            color: '#FFF',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>🏛️ Saldo Livre Consolidado</span>
          </div>

          <span style={{ fontSize: '11px', opacity: 0.8, color: '#E2E8F0', fontWeight: '700' }}>
            Domínio Determinístico
          </span>
        </div>

        <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>Disponível Imediato</div>
        <div className="font-mono-tabular" style={{ fontSize: '32px', fontWeight: '900', color: '#FFF', margin: '4px 0 20px 0', letterSpacing: '-0.02em' }}>
          {maskVal(formatCurrency(availableCents))}
        </div>

        {/* SUB-GRID COM OS 4 SALDOS DETERMINÍSTICOS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 12px', borderRadius: '12px' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block', fontWeight: '700' }}>1. Realizado</span>
            <span className="font-mono-tabular" style={{ fontSize: '14px', fontWeight: '800', color: '#FFF' }}>
              {maskVal(formatCurrency(realizedCents))}
            </span>
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 12px', borderRadius: '12px' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block', fontWeight: '700' }}>2. Previsto</span>
            <span className="font-mono-tabular" style={{ fontSize: '14px', fontWeight: '800', color: '#FFF' }}>
              {maskVal(formatCurrency(projectedCents))}
            </span>
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 12px', borderRadius: '12px' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block', fontWeight: '700' }}>3. Comprometido</span>
            <span className="font-mono-tabular" style={{ fontSize: '14px', fontWeight: '800', color: '#FCA5A5' }}>
              {maskVal(formatCurrency(committedCents))}
            </span>
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 12px', borderRadius: '12px' }}>
            <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block', fontWeight: '700' }}>4. Livre</span>
            <span className="font-mono-tabular" style={{ fontSize: '14px', fontWeight: '800', color: '#6EE7B7' }}>
              {maskVal(formatCurrency(availableCents))}
            </span>
          </div>
        </div>
      </div>

      {/* CARDS DIVIDIDOS: RECEITAS X DESPESAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '16px' }}>
        <div className="glass-card" style={{ padding: '16px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--color-income)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: '900'
          }}>
            ↓
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Entradas do Mês</span>
            <span className="font-mono-tabular" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-income)' }}>
              {maskVal(formatCurrency(incomeCents))}
            </span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--color-expense)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: '900'
          }}>
            ↑
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Saídas do Mês</span>
            <span className="font-mono-tabular" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-expense)' }}>
              {maskVal(formatCurrency(expenseCents))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
