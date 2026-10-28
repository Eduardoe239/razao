import React, { useState } from 'react';

/**
 * LISTA E TABELA DE LANÇAMENTOS REPAGINADA (O RAZÃO 3.0)
 * Apresentação de alto nível com busca em tempo real, filtros por tipo/status,
 * suporte a ordenação e numerais tabulares rigorosos.
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all'); // all, receita, despesa, transferencia
  const [selectedStatus, setSelectedStatus] = useState('all'); // all, pago, pendente

  // Mapeamento auxiliar de IDs para nomes
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // Filtragem Reativa
  const filtered = transactions.filter(t => {
    const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          categoryMap.get(t.categoryId)?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || t.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      {/* Barra de Filtros e Busca */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por descrição ou categoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1 1 240px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(2, 6, 23, 0.6)',
            border: '1px solid var(--border-glass)',
            color: '#F8FAFC',
            fontSize: '13px',
            outline: 'none'
          }}
        />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Filtro de Tipo */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '10px',
              background: 'rgba(2, 6, 23, 0.6)',
              border: '1px solid var(--border-glass)',
              color: '#F8FAFC',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Todos os Tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
            <option value="transferencia">Transferências</option>
          </select>

          {/* Filtro de Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '10px',
              background: 'rgba(2, 6, 23, 0.6)',
              border: '1px solid var(--border-glass)',
              color: '#F8FAFC',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">Todos os Status</option>
            <option value="pago">PAGO / Liquidado</option>
            <option value="pendente">PENDENTE</option>
          </select>
        </div>
      </div>

      {/* Feed de Lançamentos */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
          <p style={{ fontSize: '28px', marginBottom: '8px' }}>📂</p>
          <p style={{ fontSize: '14px', fontWeight: '600' }}>Nenhum lançamento encontrado</p>
          <p style={{ fontSize: '12px' }}>Ajuste os filtros ou crie um novo lançamento.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((t) => {
            const isIncome = t.type === 'receita';
            const isTransfer = t.type === 'transferencia';
            const isPending = t.status === 'pendente';
            const amountColor = isIncome ? 'var(--color-income)' : isTransfer ? 'var(--color-transfer)' : 'var(--color-expense)';

            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(2, 6, 23, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  transition: 'background 0.2s'
                }}
              >
                {/* Esquerda: Ícone + Descrição + Metadados */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => onToggleStatus(t)}
                    title={isPending ? "Marcar como Pago" : "Marcar como Pendente"}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      background: isPending ? 'var(--color-pending-bg)' : isIncome ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
                      color: isPending ? 'var(--color-pending)' : isIncome ? 'var(--color-income)' : 'var(--color-expense)',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isPending ? '⏳' : isIncome ? '↓' : '↑'}
                  </button>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC' }}>
                      {t.description || 'Lançamento sem título'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>{t.date}</span>
                      <span>•</span>
                      <span>{categoryMap.get(t.categoryId) || 'Geral'}</span>
                      <span>•</span>
                      <span>{accountMap.get(t.accountId) || 'Conta'}</span>
                      {t.installmentsGroup && (
                        <span style={{ color: '#00B4D8', fontWeight: '700' }}>({t.installmentIndex}/{t.installmentsTotal})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direita: Valor Monotípico + Ações */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="font-mono-tabular" style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: amountColor }}>
                      {isIncome ? '+' : '-'}{formatCurrency(t.amountCents || 0)}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: isPending ? 'var(--color-pending)' : '#64748B'
                    }}>
                      {isPending ? 'Pendente' : 'Pago'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => onEditTransaction(t)}
                      style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px' }}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(t.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-expense)', cursor: 'pointer', padding: '6px' }}
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
      )}
    </div>
  );
}
