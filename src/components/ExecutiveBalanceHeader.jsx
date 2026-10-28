import React from 'react';

/**
 * CABEÇALHO HERO DE SALDOS (O RAZÃO 6.0)
 * Inspirado diretamente na interface "Money Manager".
 * Apresenta o saldo principal em destaque com badge de seleção de conta e
 * os 4 Saldos Executivos amarrados matematicamente.
 */

export function ExecutiveBalanceHeader({
  realizedCents = 0,
  projectedCents = 0,
  committedCents = 0,
  availableCents = 0,
  incomeCents = 0,
  expenseCents = 0,
  formatCurrency
}) {
  return (
    <div>
      {/* CARD PRINCIPAL HERO (AZUL / ROXO) */}
      <div className="hero-balance-card">
        <div className="hero-header">
          <div className="account-selector-pill">
            <span>Saldo Principal</span>
            <span style={{ fontSize: '10px' }}>▼</span>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', fontWeight: '700' }}>
            Consolidado
          </span>
        </div>

        <div className="hero-label">Patrimônio / Disponível</div>
        <div className="hero-amount font-mono-tabular">
          {formatCurrency(availableCents)}
        </div>

        {/* SUB-GRID COM OS 4 SALDOS DETERMINÍSTICOS */}
        <div className="saldos-grid">
          <div className="saldo-item">
            <span className="saldo-item-label">1. Realizado</span>
            <span className="saldo-item-value font-mono-tabular">
              {formatCurrency(realizedCents)}
            </span>
          </div>

          <div className="saldo-item">
            <span className="saldo-item-label">2. Previsto</span>
            <span className="saldo-item-value font-mono-tabular">
              {formatCurrency(projectedCents)}
            </span>
          </div>

          <div className="saldo-item">
            <span className="saldo-item-label">3. Comprometido</span>
            <span className="saldo-item-value font-mono-tabular" style={{ color: '#FCA5A5' }}>
              {formatCurrency(committedCents)}
            </span>
          </div>

          <div className="saldo-item">
            <span className="saldo-item-label">4. Livre / Disponível</span>
            <span className="saldo-item-value font-mono-tabular" style={{ color: '#6EE7B7' }}>
              {formatCurrency(availableCents)}
            </span>
          </div>
        </div>
      </div>

      {/* CARDS DIVIDIDOS: RECEITAS X DESPESAS (INCOME X EXPENSE SPLIT CARDS) */}
      <div className="summary-split-grid">
        <div className="summary-card">
          <div className="summary-icon-wrapper summary-icon-income">
            ↓
          </div>
          <div className="summary-info">
            <span className="summary-label">Entradas</span>
            <span className="summary-value font-mono-tabular" style={{ color: 'var(--color-income)' }}>
              {formatCurrency(incomeCents)}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrapper summary-icon-expense">
            ↑
          </div>
          <div className="summary-info">
            <span className="summary-label">Saídas</span>
            <span className="summary-value font-mono-tabular" style={{ color: 'var(--color-expense)' }}>
              {formatCurrency(expenseCents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
