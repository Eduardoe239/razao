import React, { useState } from 'react';

/**
 * FEED DE LANÇAMENTOS E TRANSAÇÕES (O RAZÃO 3.0)
 * Card items com filtro dinâmico de busca, tipo, status e suporte ao modo de privacidade.
 */

export function TransactionFeed({
  transactions = [],
  accounts = [],
  categories = [],
  formatCurrency,
  hideAmounts = false,
  onEditTransaction,
  onDeleteTransaction,
  onToggleStatus
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos'); // 'todos', 'receita', 'despesa', 'transferencia'
  const [filterStatus, setFilterStatus] = useState('todos'); // 'todos', 'pago', 'pendente'

  const maskVal = (formatted) => hideAmounts ? '••••••' : formatted;

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'todos' || t.type === filterType;
    const matchesStatus = filterStatus === 'todos' || t.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* BARRA DE FILTROS E PESQUISA */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '12px',
        borderRadius: '16px',
        border: '1px solid var(--border-glass)'
      }}>
        {/* Campo de Busca */}
        <div style={{ flex: '1 1 200px' }}>
          <input
            type="text"
            placeholder="🔍 Buscar por descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(2, 6, 23, 0.8)',
              border: '1px solid var(--border-glass)',
              color: '#FFF',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Filtro de Tipo */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '10px',
            borderRadius: '10px',
            background: 'rgba(2, 6, 23, 0.8)',
            border: '1px solid var(--border-glass)',
            color: '#FFF',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          <option value="todos">Todos os Tipos</option>
          <option value="despesa">Despesas</option>
          <option value="receita">Receitas</option>
          <option value="transferencia">Transferências</option>
        </select>

        {/* Filtro de Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '10px',
            borderRadius: '10px',
            background: 'rgba(2, 6, 23, 0.8)',
            border: '1px solid var(--border-glass)',
            color: '#FFF',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          <option value="todos">Todos os Status</option>
          <option value="pago">Pagos / Liquidados</option>
          <option value="pendente">Pendentes</option>
        </select>
      </div>

      {/* FEED DE LANÇAMENTOS */}
      {filteredTransactions.length === 0 ? (
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', borderRadius: '16px', color: '#94A3B8' }}>
          <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>🔍</span>
          <p style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Nenhum lançamento encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredTransactions.map((t) => {
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
              ? 'rgba(239, 68, 68, 0.15)'
              : isIncome
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(139, 92, 246, 0.15)';

            return (
              <div
                key={t.id}
                className="glass-card"
                style={{
                  padding: '14px 18px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  border: '1px solid var(--border-glass)'
                }}
              >
                {/* Esquerda: Ícone & Detalhes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0
                  }}>
                    {category.icon || (isExpense ? '💸' : isIncome ? '💰' : '🔄')}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.description || 'Lançamento'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                      {category.name} • {t.date}
                    </div>
                  </div>
                </div>

                {/* Direita: Valor & Ações */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="font-mono-tabular" style={{ fontSize: '15px', fontWeight: '800', color: amountColor }}>
                    {isExpense ? '- ' : isIncome ? '+ ' : ''}
                    {maskVal(formatCurrency(t.amountCents || 0))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => onToggleStatus(t)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '800',
                        border: 'none',
                        background: isPending ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: isPending ? '#F59E0B' : '#10B981',
                        cursor: 'pointer'
                      }}
                      title="Alternar Pago/Pendente"
                    >
                      {t.status}
                    </button>

                    <button
                      onClick={() => onEditTransaction(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.7 }}
                      title="Editar Lançamento"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => onDeleteTransaction(t.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', opacity: 0.7 }}
                      title="Excluir Lançamento"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
