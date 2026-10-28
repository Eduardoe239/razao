import React, { useState, useEffect } from 'react';

// Design System & Estilos
import './styles/theme.css';

// Componentes da Interface (Inspirados no Money Manager)
import { AppShell } from './components/AppShell';
import { ExecutiveBalanceHeader } from './components/ExecutiveBalanceHeader';
import { ExpenseAnalytics } from './components/ExpenseAnalytics';
import { InvoiceCycleCard } from './components/InvoiceCycleCard';
import { TransactionFeed } from './components/TransactionFeed';
import { TransactionModal } from './components/TransactionModal';
import { SegmentedTabs, DateNavigator } from './components/SegmentedTabs';

// Funções Puras do Domínio Financeiro
import { accountBalance } from './domain/accounts';
import { cardInvoices } from './domain/invoices';
import { buildCommitments } from './domain/commitments';
import { formatMoney } from './domain/money';
import { sanitizeState } from './domain/sanitize';
import { uid } from './domain/uid';
import { loadState, saveState } from './services/storage';

/**
 * APLICAÇÃO PRINCIPAL - O RAZÃO 6.0
 * Orquestrador UI/UX responsivo mobile-first.
 * Toda a lógica de negócios permanece estritamente purista em src/domain/.
 */

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, analytics, transactions, invoices, commitments, settings
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Estado Central Financeiro
  const [state, setState] = useState(() => {
    const loaded = loadState();
    return sanitizeState(loaded || {});
  });

  // Persistência Observável
  useEffect(() => {
    saveState(state);
  }, [state]);

  const { transactions = [], accounts = [], categories = [], cards = [] } = state;

  // Helper de Formatação Monetária BRL
  const formatCurrency = (amountCents) => formatMoney(amountCents || 0);

  // Data Operacional do Sistema
  const todayISO = new Date().toISOString().slice(0, 10);

  // 1. CÁLCULO DOS SALDOS VIA DOMÍNIO
  const realizedCents = transactions
    .filter(t => t.status === 'pago')
    .reduce((acc, t) => {
      if (t.type === 'receita') return acc + (t.amountCents || 0);
      if (t.type === 'despesa') return acc - (t.amountCents || 0);
      return acc;
    }, 0);

  const pendingCents = transactions
    .filter(t => t.status === 'pendente')
    .reduce((acc, t) => {
      if (t.type === 'receita') return acc + (t.amountCents || 0);
      if (t.type === 'despesa') return acc - (t.amountCents || 0);
      return acc;
    }, 0);

  const projectedCents = realizedCents + pendingCents;

  // Entradas e Saídas Liquidadas no Mês
  const incomeCents = transactions
    .filter(t => t.type === 'receita' && t.status === 'pago')
    .reduce((acc, t) => acc + (t.amountCents || 0), 0);

  const expenseCents = transactions
    .filter(t => t.type === 'despesa' && t.status === 'pago')
    .reduce((acc, t) => acc + (t.amountCents || 0), 0);

  // Cartão Padrão e Faturas via Domínio
  const primaryCard = cards[0] || { id: 'card-1', name: 'Cartão Principal', limitCents: 500000, closingDay: 10, dueDay: 20 };
  const invoicesData = cardInvoices(primaryCard, transactions, todayISO.slice(0, 7), 2, 2, todayISO);
  const currentInvoice = invoicesData.find(i => i.monthKey === todayISO.slice(0, 7)) || invoicesData[0];

  const committedCents = currentInvoice ? currentInvoice.remainingCents : 0;
  const availableCents = realizedCents - committedCents;

  // Compromissos do Mês
  const commitments = buildCommitments({ transactions, todayISO, monthsAhead: 3 });

  // HANDLERS DE AÇÃO
  const handleSaveTransaction = (data) => {
    if (data.id) {
      // Edição
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === data.id ? { ...t, ...data } : t)
      }));
    } else {
      // Criação de Novo Lançamento
      const newTransaction = {
        ...data,
        id: uid()
      };
      setState(prev => ({
        ...prev,
        transactions: [newTransaction, ...prev.transactions]
      }));
    }
  };

  const handleDeleteTransaction = (id) => {
    if (window.confirm('Deseja realmente excluir este lançamento?')) {
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id)
      }));
    }
  };

  const handleToggleStatus = (t) => {
    const updatedStatus = t.status === 'pendente' ? 'pago' : 'pendente';
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(item => item.id === t.id ? { ...item, status: updatedStatus } : item)
    }));
  };

  const handlePayInvoice = (card, invoice) => {
    if (!invoice || invoice.remainingCents <= 0) return;
    const paymentAmount = invoice.remainingCents;

    const paymentTransaction = {
      id: uid(),
      type: 'despesa',
      description: `Pagamento de Fatura ${card.name}`,
      amountCents: paymentAmount,
      date: todayISO,
      accountId: accounts[0]?.id || 'acc-1',
      status: 'pago',
      linkedInvoiceKey: invoice.monthKey
    };

    setState(prev => ({
      ...prev,
      transactions: [paymentTransaction, ...prev.transactions]
    }));

    alert(`Pagamento de ${formatCurrency(paymentAmount)} realizado com sucesso!`);
  };

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onNewTransaction={() => { setEditingTransaction(null); setIsModalOpen(true); }}
      badges={{ pendingInvoices: currentInvoice?.status === 'fechada' ? 1 : 0 }}
    >
      {/* 1. PAINEL GERAL (DASHBOARD TELA 1) */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Cabeçalho Hero com os 4 Saldos e Cards Divididos */}
          <ExecutiveBalanceHeader
            realizedCents={realizedCents}
            projectedCents={projectedCents}
            committedCents={committedCents}
            availableCents={availableCents}
            incomeCents={incomeCents}
            expenseCents={expenseCents}
            formatCurrency={formatCurrency}
          />

          {/* Widget da Fatura do Cartão */}
          <InvoiceCycleCard
            card={primaryCard}
            invoice={currentInvoice}
            formatCurrency={formatCurrency}
            onPayInvoice={handlePayInvoice}
          />

          {/* Feed de Últimas Movimentações */}
          <div className="section-title-bar">
            <h3 className="section-title">Últimas Movimentações</h3>
            <span className="see-all-link" onClick={() => setActiveTab('transactions')}>
              Ver Extrato
            </span>
          </div>

          <TransactionFeed
            transactions={transactions.slice(0, 10)}
            accounts={accounts}
            categories={categories}
            formatCurrency={formatCurrency}
            onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
            onDeleteTransaction={handleDeleteTransaction}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      )}

      {/* 2. RELATÓRIOS & ANALYTICS (TELA 2 - BREAKDOWN DONUT) */}
      {activeTab === 'analytics' && (
        <div>
          <ExpenseAnalytics
            transactions={transactions}
            categories={categories}
            formatCurrency={formatCurrency}
          />
        </div>
      )}

      {/* 3. EXTRATO DE TRANSAÇÕES */}
      {activeTab === 'transactions' && (
        <div>
          <div className="section-title-bar" style={{ marginBottom: '16px' }}>
            <h3 className="section-title">Extrato de Lançamentos</h3>
            <button
              onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 14px', fontSize: '12px' }}
            >
              + Novo
            </button>
          </div>

          <TransactionFeed
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            formatCurrency={formatCurrency}
            onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
            onDeleteTransaction={handleDeleteTransaction}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      )}

      {/* 4. CARTÕES E FATURAS */}
      {activeTab === 'invoices' && (
        <div>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>
            Gestão do Ciclo de Faturas
          </h3>
          <InvoiceCycleCard
            card={primaryCard}
            invoice={currentInvoice}
            formatCurrency={formatCurrency}
            onPayInvoice={handlePayInvoice}
          />
        </div>
      )}

      {/* 5. COMPROMISSOS */}
      {activeTab === 'commitments' && (
        <div>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>
            Compromissos e Obrigações Futuras
          </h3>
          <div className="transaction-list">
            {commitments.length === 0 ? (
              <div className="summary-card" style={{ padding: '24px', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Nenhum compromisso pendente.
              </div>
            ) : (
              commitments.map((c, idx) => (
                <div key={idx} className="transaction-card-item">
                  <div className="tx-left">
                    <div className="tx-icon-box" style={{ background: 'var(--color-pending-bg)', color: 'var(--color-pending)' }}>
                      📅
                    </div>
                    <div className="tx-details">
                      <span className="tx-title">{c.description || 'Compromisso'}</span>
                      <span className="tx-subtitle">Vencimento: {c.date}</span>
                    </div>
                  </div>
                  <div className="tx-right">
                    <span className="tx-amount font-mono-tabular" style={{ color: 'var(--color-pending)' }}>
                      {formatCurrency(c.amountCents || 0)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. AJUSTES & BACKUP */}
      {activeTab === 'settings' && (
        <div className="summary-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '8px' }}>
            Configurações & Backup
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Exportação versionada em JSON e recuperação segura de backups sanitizados.
          </p>

          <button
            className="btn-primary"
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `razao_backup_${todayISO}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
          >
            Exportar Backup JSON
          </button>
        </div>
      )}

      {/* Modal Acessível de Novo/Editar Lançamento */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        accounts={accounts}
        categories={categories}
        initialData={editingTransaction}
      />
    </AppShell>
  );
}
