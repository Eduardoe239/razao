import React, { useState } from 'react';
import { SegmentedTabs, DateNavigator } from './SegmentedTabs';

/**
 * COMPONENTE DE RELATÓRIOS & ANALYTICS (INSPIRADO NA TELA 2 DA REFERÊNCIA)
 * Apresenta gráfico em rosca (Donut Chart) com valor central e
 * lista de categorias com barras de progresso percentual e valores.
 */

export function ExpenseAnalytics({ transactions = [], categories = [], formatCurrency }) {
  const [period, setPeriod] = useState('monthly'); // weekly, monthly, quarterly

  // Filtrar despesas pagas
  const expenseTransactions = transactions.filter(t => t.type === 'despesa' && t.status === 'pago');
  const totalExpenseCents = expenseTransactions.reduce((acc, t) => acc + (t.amountCents || 0), 0);

  // Agrupamento por Categoria
  const categoryMap = {};
  expenseTransactions.forEach(t => {
    const catId = t.categoryId || 'uncategorized';
    if (!categoryMap[catId]) {
      categoryMap[catId] = 0;
    }
    categoryMap[catId] += (t.amountCents || 0);
  });

  const categoryList = Object.keys(categoryMap).map(catId => {
    const cat = categories.find(c => c.id === catId) || { name: 'Geral', icon: '🛒' };
    const cents = categoryMap[catId];
    const percentage = totalExpenseCents > 0 ? Math.round((cents / totalExpenseCents) * 100) : 0;
    return {
      id: catId,
      name: cat.name,
      icon: cat.icon || '📦',
      cents,
      percentage
    };
  }).sort((a, b) => b.cents - a.cents);

  return (
    <div>
      {/* SELETOR DE PERÍODO PILL */}
      <SegmentedTabs
        tabs={[
          { id: 'weekly', label: 'Semanal' },
          { id: 'monthly', label: 'Mensal' },
          { id: 'quarterly', label: '3 Meses' }
        ]}
        activeTab={period}
        onChange={setPeriod}
      />

      {/* NAVEGADOR DE DATA */}
      <DateNavigator
        label="Outubro 2026"
        onPrev={() => {}}
        onNext={() => {}}
      />

      {/* ÁREA DE ANÁLISE / DONUT CHART */}
      <div className="summary-card" style={{ flexDirection: 'column', alignItems: 'center', padding: '24px', marginBottom: '24px' }}>
        <div className="donut-container">
          <svg width="180" height="180" viewBox="0 0 100 100">
            {/* Círculo de Fundo */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="var(--surface-subtle)"
              strokeWidth="12"
            />
            {/* Anel de Progresso Donut */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="var(--brand-accent)"
              strokeWidth="12"
              strokeDasharray="251.2"
              strokeDashoffset="60"
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="donut-center-text">
            <span className="donut-center-label">Total Saídas</span>
            <div className="donut-center-amount font-mono-tabular" style={{ color: 'var(--color-expense)' }}>
              {formatCurrency(totalExpenseCents)}
            </div>
          </div>
        </div>
      </div>

      {/* BREAKDOWN POR CATEGORIA */}
      <div className="section-title-bar">
        <h3 className="section-title">Detalhamento por Categoria</h3>
        <span className="see-all-link">{categoryList.length} Categorias</span>
      </div>

      <div className="transaction-list">
        {categoryList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Nenhuma despesa registrada neste período.
          </div>
        ) : (
          categoryList.map((cat) => (
            <div key={cat.id} className="transaction-card-item">
              <div className="tx-left" style={{ flex: 1 }}>
                <div className="tx-icon-box" style={{ background: 'var(--brand-light)', color: 'var(--brand-accent)' }}>
                  {cat.icon}
                </div>
                <div className="tx-details" style={{ flex: 1, paddingRight: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="tx-title">{cat.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      {cat.percentage}%
                    </span>
                  </div>
                  {/* Barra de Progresso Percentual */}
                  <div style={{ width: '100%', height: '6px', background: 'var(--surface-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${cat.percentage}%`, height: '100%', background: 'var(--brand-gradient)', borderRadius: '999px' }} />
                  </div>
                </div>
              </div>

              <div className="tx-right">
                <span className="tx-amount font-mono-tabular" style={{ color: 'var(--color-expense)' }}>
                  - {formatCurrency(cat.cents)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
