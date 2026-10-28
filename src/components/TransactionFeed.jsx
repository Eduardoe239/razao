import React from 'react';

/**
 * LISTA DE TRANSAÇÕES (INSPIRADA NO EXTRATO DE CARDS DO MONEY MANAGER)
 */

export function TransactionFeed({
  transactions = [],
  accounts = [],
  categories = [],
  formatCurrency,
  onEditTransaction,
  onDeleteTransaction,
  onToggleStatus
}) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="summary-card" style={{ justifyContent: 'center', padding: '32px', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '13px', fontWeight: '600' }}>Nenhum lançamento registrado.</p>
      </div>
    );
  }

  return (
    <div className="transaction-list">
      {transactions.map((t) => {
        const category = categories.find(c => c.id === t.categoryId) || { name: 'Geral', icon: '📝' };
        const isExpense = t.type === 'despesa';
        const isIncome = t.type === 'receita';
        const isPending = t.status === 'pendente';

        const amountColor = isExpense
          ? 'var(--color-expense)'
          : isIncome
          ? 'var(--color-income)'
          : 'var(--color-transfer)';

        const iconBg = isExpense
          ? 'var(--color-expense-bg)'
          : isIncome
          ? 'var(--color-income-bg)'
          : 'var(--color-transfer-bg)';

        return (
          <div key={t.id} className="transaction-card-item">
            <div className="tx-left">
              <div className="tx-icon-box" style={{ background: iconBg, color: amountColor }}>
                {category.icon || (isExpense ? '💸' : isIncome ? '💰' : '🔄')}
              </div>
              <div className="tx-details">
                <span className="tx-title">{t.description || 'Lançamento'}</span>
                <span className="tx-subtitle">
                  {category.name} • {t.date}
                </span>
              </div>
            </div>

            <div className="tx-right">
              <span className="tx-amount font-mono-tabular" style={{ color: amountColor }}>
                {isExpense ? '- ' : isIncome ? '+ ' : ''}
                {formatCurrency(t.amountCents || 0)}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <button
                  onClick={() => onToggleStatus(t)}
                  className="tx-status-badge"
                  style={{
                    background: isPending ? 'var(--color-pending-bg)' : 'var(--color-income-bg)',
                    color: isPending ? 'var(--color-pending)' : 'var(--color-income)',
                    border: `1px solid ${isPending ? 'var(--color-pending-border)' : 'var(--color-income-border)'}`,
                    cursor: 'pointer'
                  }}
                  title="Clique para alternar status"
                >
                  {t.status}
                </button>

                <button
                  onClick={() => onEditTransaction(t)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}
                  title="Editar"
                >
                  ✏️
                </button>

                <button
                  onClick={() => onDeleteTransaction(t.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}
                  title="Excluir"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
