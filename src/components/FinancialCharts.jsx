import React, { useState } from 'react';

/**
 * SISTEMA DE MÉTRICAS VISUAIS E ANALYTICS (O RAZÃO 3.0)
 * Fornece gráficos interativos, análise de evolução de caixa, distribuição por categoria
 * e indicadores estratégicos de desempenho financeiro.
 */

export function FinancialCharts({
  transactions = [],
  categories = [],
  accounts = [],
  formatCurrency,
  hideAmounts
}) {
  const [chartPeriod, setChartPeriod] = useState('6m'); // '3m', '6m', '1y'

  const maskValue = (formattedVal) => hideAmounts ? '••••••' : formattedVal;

  // 1. CÁLCULO DE EVOLUÇÃO MENSAL (ÚLTIMOS 6 MESES)
  const today = new Date();
  const monthsData = [];
  const numMonths = chartPeriod === '3m' ? 3 : chartPeriod === '6m' ? 6 : 12;

  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();

    const monthTx = transactions.filter(t => t.date && t.date.slice(0, 7) === monthKey && t.status === 'pago');
    const incomeCents = monthTx.filter(t => t.type === 'receita').reduce((acc, t) => acc + (t.amountCents || 0), 0);
    const expenseCents = monthTx.filter(t => t.type === 'despesa').reduce((acc, t) => acc + (t.amountCents || 0), 0);
    const netCents = incomeCents - expenseCents;

    monthsData.push({
      monthKey,
      label: monthLabel,
      incomeCents,
      expenseCents,
      netCents
    });
  }

  const maxValCents = Math.max(1, ...monthsData.map(m => Math.max(m.incomeCents, m.expenseCents)));

  // 2. CÁLCULO DE CATEGORIAS
  const expenseTx = transactions.filter(t => t.type === 'despesa' && t.status === 'pago');
  const totalExpenseCents = expenseTx.reduce((acc, t) => acc + (t.amountCents || 0), 0) || 1;

  const categoryMap = {};
  expenseTx.forEach(t => {
    const catId = t.categoryId || 'outros';
    categoryMap[catId] = (categoryMap[catId] || 0) + (t.amountCents || 0);
  });

  const categoryList = Object.entries(categoryMap).map(([catId, amountCents]) => {
    const cat = categories.find(c => c.id === catId) || { name: 'Outros / Geral', icon: '📦' };
    const percentage = Math.round((amountCents / totalExpenseCents) * 100);
    return {
      id: catId,
      name: cat.name,
      icon: cat.icon || '💸',
      amountCents,
      percentage
    };
  }).sort((a, b) => b.amountCents - a.amountCents);

  // 3. INDICADORES CHAVE (KPIS)
  const totalIncomeAll = monthsData.reduce((acc, m) => acc + m.incomeCents, 0);
  const totalExpenseAll = monthsData.reduce((acc, m) => acc + m.expenseCents, 0);
  const avgIncome = Math.round(totalIncomeAll / numMonths);
  const avgExpense = Math.round(totalExpenseAll / numMonths);
  const savingsRate = totalIncomeAll > 0 ? Math.max(0, Math.round(((totalIncomeAll - totalExpenseAll) / totalIncomeAll) * 100)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. SELETOR DE PERÍODO E KPIS RÁPIDOS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', margin: 0 }}>
            Evolução e Análise Financeira
          </h3>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
            Visualização métrica de caixa, distribuição de gastos e taxa de poupança.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          {['3m', '6m', '1y'].map(p => (
            <button
              key={p}
              onClick={() => setChartPeriod(p)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: chartPeriod === p ? 'var(--brand-blue-gradient)' : 'transparent',
                color: chartPeriod === p ? '#FFF' : '#94A3B8',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* CARDS DE KPIS ESTRATÉGICOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-card" style={{ padding: '16px', borderRadius: '16px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Média de Receita Mensal</span>
          <div className="font-mono-tabular" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-income)', marginTop: '4px' }}>
            {maskValue(formatCurrency(avgIncome))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderRadius: '16px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Média de Despesa Mensal</span>
          <div className="font-mono-tabular" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-expense)', marginTop: '4px' }}>
            {maskValue(formatCurrency(avgExpense))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderRadius: '16px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Taxa de Poupança Média</span>
          <div className="font-mono-tabular" style={{ fontSize: '18px', fontWeight: '800', color: '#F59E0B', marginTop: '4px' }}>
            {savingsRate}% do Faturamento
          </div>
        </div>
      </div>

      {/* 2. GRÁFICO HISTÓRICO DE FLUXO DE CAIXA (BARRAS PARALELAS COM ALTURA DINÂMICA) */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#F8FAFC', margin: 0 }}>
            Evolução de Entradas x Saídas
          </h4>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-income)', fontWeight: '700' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-income)' }} /> Entradas
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-expense)', fontWeight: '700' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-expense)' }} /> Saídas
            </span>
          </div>
        </div>

        {/* ÁREA DE BARRAS VISUAIS */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', height: '180px', paddingTop: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {monthsData.map((m) => {
            const incomeHeightPercent = Math.max(8, Math.round((m.incomeCents / maxValCents) * 100));
            const expenseHeightPercent = Math.max(8, Math.round((m.expenseCents / maxValCents) * 100));

            return (
              <div key={m.monthKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', width: '100%', justifyContent: 'center', height: '140px' }}>
                  {/* Barra Entradas */}
                  <div
                    title={`Entradas: ${formatCurrency(m.incomeCents)}`}
                    style={{
                      width: '40%',
                      maxWidth: '18px',
                      height: `${incomeHeightPercent}%`,
                      background: 'linear-gradient(180deg, #10B981 0%, rgba(16, 185, 129, 0.4) 100%)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.4s ease'
                    }}
                  />
                  {/* Barra Saídas */}
                  <div
                    title={`Saídas: ${formatCurrency(m.expenseCents)}`}
                    style={{
                      width: '40%',
                      maxWidth: '18px',
                      height: `${expenseHeightPercent}%`,
                      background: 'linear-gradient(180deg, #EF4444 0%, rgba(239, 68, 68, 0.4) 100%)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.4s ease'
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', marginTop: '8px' }}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. DISTRIBUIÇÃO POR CATEGORIA */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#F8FAFC', marginBottom: '16px' }}>
          Distribuição Percentual de Saídas por Categoria
        </h4>

        {categoryList.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#94A3B8' }}>Nenhum gasto registrado no período para análise.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {categoryList.map(cat => (
              <div key={cat.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC' }}>{cat.name}</span>
                  </div>
                  <div className="font-mono-tabular" style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC' }}>
                    {maskValue(formatCurrency(cat.amountCents))} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '400' }}>({cat.percentage}%)</span>
                  </div>
                </div>

                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${cat.percentage}%`,
                    height: '100%',
                    background: 'var(--brand-blue-gradient)',
                    borderRadius: '9999px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
