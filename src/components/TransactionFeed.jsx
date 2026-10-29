import React, { useMemo, useState } from 'react';
import { filterTransactions, transactionsToCSV } from '../domain/transactionSearch.js';

const INITIAL_FILTERS = {
  search: '', type: 'todos', status: 'todos', accountId: 'todos', categoryId: 'todos',
  startDate: '', endDate: '', minAmount: '', maxAmount: '', sortBy: 'date_desc'
};

export function TransactionFeed({
  transactions = [], accounts = [], categories = [], formatCurrency,
  hideAmounts = false, advancedFilters = false,
  onEditTransaction, onDeleteTransaction, onToggleStatus
}) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [message, setMessage] = useState('');
  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters, { accounts, categories }),
    [transactions, filters, accounts, categories]
  );
  const maskVal = formatted => hideAmounts ? '••••••' : formatted;
  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  const clearFilters = () => { setFilters(INITIAL_FILTERS); setMessage('Filtros removidos.'); };
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => value !== INITIAL_FILTERS[key]);

  const handleExportCSV = async () => {
    try {
      if (hideAmounts && typeof window !== 'undefined' && !window.confirm('O arquivo CSV conterá os valores financeiros reais, mesmo com o modo de privacidade visual ativado. Deseja continuar?')) {
        setMessage('Exportação cancelada.');
        return;
      }
      if (filteredTransactions.length === 0) {
        setMessage('Não há lançamentos para exportar com esses filtros.');
        return;
      }
      const csv = transactionsToCSV(filteredTransactions, { accounts, categories });
      const date = new Date().toISOString().slice(0, 10);
      const defaultName = `razao-lancamentos-${date}.csv`;
      if (typeof window !== 'undefined' && window.electronAPI?.saveFileDialog) {
        const result = await window.electronAPI.saveFileDialog({
          title: 'Exportar lançamentos filtrados', defaultName, content: csv,
          filters: [{ name: 'Planilha CSV', extensions: ['csv'] }]
        });
        setMessage(result?.saved ? `CSV exportado com ${filteredTransactions.length} lançamento(s).` : 'Exportação cancelada; nenhum arquivo foi salvo.');
        return;
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = defaultName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMessage(`CSV preparado com ${filteredTransactions.length} lançamento(s). Confirme o download no navegador.`);
    } catch (error) {
      setMessage(`Não foi possível exportar o CSV: ${error?.message || 'erro desconhecido'}`);
    }
  };

  return (
    <div className={`transaction-feed${advancedFilters ? ' transaction-feed-advanced' : ''}`}>
      <div className="transaction-filter-bar">
        <label className="transaction-search-field">
          <span className="sr-only">Buscar lançamentos</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4 4"/></svg>
          <input aria-label="Buscar lançamentos" type="search" placeholder="Buscar descrição, conta ou categoria" value={filters.search} onChange={event => updateFilter('search', event.target.value)} />
        </label>
        <label className="filter-select-wrap"><span className="sr-only">Filtrar por tipo</span>
          <select aria-label="Filtrar por tipo" value={filters.type} onChange={event => updateFilter('type', event.target.value)}>
            <option value="todos">Todos os tipos</option><option value="despesa">Despesas</option><option value="receita">Receitas</option><option value="transferencia">Transferências</option>
          </select>
        </label>
        <label className="filter-select-wrap"><span className="sr-only">Filtrar por status</span>
          <select aria-label="Filtrar por status" value={filters.status} onChange={event => updateFilter('status', event.target.value)}>
            <option value="todos">Todos os status</option><option value="pago">Pagos / liquidados</option><option value="pendente">Pendentes</option><option value="cancelado">Cancelados</option>
          </select>
        </label>
        {advancedFilters && <button type="button" className="button-secondary export-csv-button" onClick={handleExportCSV} disabled={filteredTransactions.length === 0}>Exportar CSV</button>}
      </div>

      {advancedFilters && (
        <section className="advanced-filter-panel" aria-labelledby="advanced-filter-title">
          <div className="advanced-filter-heading">
            <strong id="advanced-filter-title">Filtros avançados</strong>
            <button type="button" className="text-button" onClick={clearFilters} disabled={!hasActiveFilters}>Limpar filtros</button>
          </div>
          <div className="advanced-filter-grid">
            <label>Conta ou cartão
              <select value={filters.accountId} onChange={event => updateFilter('accountId', event.target.value)}>
                <option value="todos">Todas as contas</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name || account.bankName || account.id}</option>)}
              </select>
            </label>
            <label>Categoria
              <select value={filters.categoryId} onChange={event => updateFilter('categoryId', event.target.value)}>
                <option value="todos">Todas as categorias</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name || category.id}</option>)}
              </select>
            </label>
            <label>Data inicial<input type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={event => updateFilter('startDate', event.target.value)} /></label>
            <label>Data final<input type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={event => updateFilter('endDate', event.target.value)} /></label>
            <label>Valor mínimo (R$)<input type="text" inputMode="decimal" placeholder="Ex.: 50,00" value={filters.minAmount} onChange={event => updateFilter('minAmount', event.target.value)} /></label>
            <label>Valor máximo (R$)<input type="text" inputMode="decimal" placeholder="Ex.: 1.500,00" value={filters.maxAmount} onChange={event => updateFilter('maxAmount', event.target.value)} /></label>
            <label>Ordenar por
              <select value={filters.sortBy} onChange={event => updateFilter('sortBy', event.target.value)}>
                <option value="date_desc">Data: mais recentes</option><option value="date_asc">Data: mais antigos</option><option value="amount_desc">Maior valor</option><option value="amount_asc">Menor valor</option><option value="description_asc">Descrição: A–Z</option>
              </select>
            </label>
          </div>
        </section>
      )}

      <div className="transaction-results-meta" aria-live="polite">
        <span>{filteredTransactions.length} de {transactions.length} lançamento(s){hasActiveFilters ? ' · filtros ativos' : ''}</span>
        {message && <span role="status">{message}</span>}
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="empty-state transaction-empty-state">
          <span className="empty-state-mark" aria-hidden="true">⌕</span>
          <strong>Nenhum lançamento encontrado</strong>
          <p>{hasActiveFilters ? 'Tente ajustar os filtros ou limpe a busca para ver mais resultados.' : 'Quando você registrar uma movimentação, ela aparecerá aqui.'}</p>
          {hasActiveFilters && <button type="button" className="button-secondary" onClick={clearFilters}>Limpar filtros</button>}
        </div>
      ) : (
        <div className="transaction-list">
          {filteredTransactions.map(t => {
            const transaction = t;
            const category = categories.find(item => item.id === transaction.categoryId) || { name: 'Geral', icon: '•' };
            const isExpense = transaction.type === 'despesa';
            const isIncome = transaction.type === 'receita';
            const isPending = transaction.status === 'pendente';
            const amountClass = isExpense ? 'is-expense' : isIncome ? 'is-income' : 'is-transfer';
            const typeLabel = isExpense ? 'Despesa' : isIncome ? 'Receita' : 'Transferência';
            return (
              <article key={transaction.id} className="transaction-card-item">
                <div className="tx-left">
                  <div className={`tx-icon-box ${amountClass}`} aria-hidden="true">{category.icon || '•'}</div>
                  <div className="tx-details">
                    <strong className="tx-title">{transaction.description || 'Lançamento'}</strong>
                    <span className="tx-subtitle">{category.name} <span aria-hidden="true">·</span> {transaction.date} <span aria-hidden="true">·</span> {typeLabel}</span>
                  </div>
                </div>
                <div className="tx-right">
                  <strong className={`tx-amount ${amountClass}`}>{isExpense ? '− ' : isIncome ? '+ ' : ''}{maskVal(formatCurrency(transaction.amountCents || 0))}</strong>
                  <div className="tx-actions">
                    {t.status === 'cancelado' ? (
                      <span className="tx-status-badge is-canceled">Cancelado</span>
                    ) : (
                      <button type="button" className={`tx-status-badge ${isPending ? 'is-pending' : 'is-paid'}`} onClick={() => onToggleStatus(transaction)} title="Alternar entre pago e pendente" aria-label={`Status ${transaction.status}; clique para alternar`}>{isPending ? 'Pendente' : transaction.status === 'pago' ? 'Pago' : transaction.status}</button>
                    )}
                    <button type="button" className="tx-action-button" onClick={() => onEditTransaction(transaction)} title="Editar lançamento" aria-label={`Editar ${transaction.description || 'lançamento'}`}>Editar</button>
                    <button type="button" className="tx-action-button is-danger" onClick={() => onDeleteTransaction(transaction.id)} title="Excluir lançamento" aria-label={`Excluir ${transaction.description || 'lançamento'}`}>Excluir</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
