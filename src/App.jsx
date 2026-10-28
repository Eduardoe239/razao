import React, { useState, useEffect } from 'react';

// Design System & Estilos
import './styles/theme.css';

// Componentes da Interface Repaginada
import { AppShell } from './components/AppShell';
import { SegmentedTabs } from './components/SegmentedTabs';
import { ExecutiveBalanceHeader } from './components/ExecutiveBalanceHeader';
import { InvoiceCycleCard } from './components/InvoiceCycleCard';
import { TransactionFeed } from './components/TransactionFeed';
import { TransactionModal } from './components/TransactionModal';

// Funções Puramente Determinísticas do Domínio
import { accountBalance } from './domain/accounts';
import { cardInvoices } from './domain/invoices';
import { buildCommitments } from './domain/commitments';
import { formatMoney } from './domain/money';
import { sanitizeState } from './domain/sanitize';
import { uid } from './domain/uid';
import { loadState, saveState } from './services/storage';

/**
 * APLICAÇÃO PRINCIPAL - O RAZÃO 3.0 (ORQUESTRADOR DE UI)
 * Atua estritamente como orquestrador visual.
 * Toda e qualquer regra financeira é delegada aos módulos de domínio.
 */

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, transactions, invoices, budget, commitments, settings
  const [dashboardSubTab, setDashboardSubTab] = useState('overview'); // overview, cashflow, forecast
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

  // Formatting Helper
  const formatCurrency = (amountCents) => formatMoney(amountCents || 0);

  // Data operacional do sistema
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

  // Cartão Padrão e Faturas via Domínio
  const primaryCard = cards[0] || { id: 'card-1', name: 'Cartão Principal', limitCents: 500000, closingDay: 10, dueDay: 20 };
  const invoicesData = cardInvoices(primaryCard, transactions, todayISO.slice(0, 7), 2, 2, todayISO);
  const currentInvoice = invoicesData.find(i => i.monthKey === todayISO.slice(0, 7)) || invoicesData[0];

  const committedCents = currentInvoice ? currentInvoice.remainingCents : 0;
  const availableCents = realizedCents - committedCents;

  // Compromissos do Mês
  const commitments = buildCommitments({ transactions, todayISO, monthsAhead: 3 });

  // HANDLERS DE AÇÃO DE NEGÓCIO
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
    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
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

    // Lançamento de despesa de pagamento de fatura
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
      {/* 1. ABA PAINEL GERAL (DASHBOARD) */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Sub-abas de Navegação Interna */}
          <div style={{ marginBottom: '20px' }}>
            <SegmentedTabs
              tabs={[
                { id: 'overview', label: 'Visão Geral Executiva', icon: '⚡' },
                { id: 'cashflow', label: 'Fluxo de Caixa', icon: '📊' },
                { id: 'forecast', label: 'Projeção Futurista', icon: '🎯' }
              ]}
              activeTab={dashboardSubTab}
              onChange={setDashboardSubTab}
            />
          </div>

          {/* Cabeçalho Executivo com os 4 Saldos */}
          <ExecutiveBalanceHeader
            realizedCents={realizedCents}
            projectedCents={projectedCents}
            committedCents={committedCents}
            availableCents={availableCents}
            formatCurrency={formatCurrency}
          />

          {/* Widget do Cartão de Crédito e Ciclo de Fatura */}
          <InvoiceCycleCard
            card={primaryCard}
            invoice={currentInvoice}
            formatCurrency={formatCurrency}
            onPayInvoice={handlePayInvoice}
          />

          {/* Lista Recente de Transações */}
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', color: '#F8FAFC' }}>
            Últimas Movimentações
          </h3>
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

      {/* 2. ABA LANÇAMENTOS (TRANSACTIONS) */}
      {activeTab === 'transactions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC' }}>Histórico Completo de Lançamentos</h3>
            <button
              onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'var(--brand-blue-gradient)',
                color: '#FFF',
                border: 'none',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              + Novo Lançamento
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

      {/* 3. ABA CARTÕES E FATURAS */}
      {activeTab === 'invoices' && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#F8FAFC' }}>
            Gestão do Ciclo de Faturas de Cartão
          </h3>
          <InvoiceCycleCard
            card={primaryCard}
            invoice={currentInvoice}
            formatCurrency={formatCurrency}
            onPayInvoice={handlePayInvoice}
          />
        </div>
      )}

      {/* 4. ABA ORÇAMENTO */}
      {activeTab === 'budget' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: '#F8FAFC' }}>
            Orçamento por Categoria
          </h3>
          <p style={{ fontSize: '13px', color: '#94A3B8' }}>
            Defina limites rigorosos de gastos para cada categoria. Orçamento zero é mantido explicitamente como 0 centavos.
          </p>
        </div>
      )}

      {/* 5. ABA COMPROMISSOS */}
      {activeTab === 'commitments' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: '#F8FAFC' }}>
            Compromissos e Contas Futuras
          </h3>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>
            Visualização sem dupla contagem de parcelas, faturas e obrigações fixas.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {commitments.map((c, idx) => (
              <div key={idx} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(2, 6, 23, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC' }}>{c.description || 'Compromisso'}</span>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Vencimento: {c.date}</span>
                </div>
                <span className="font-mono-tabular" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-pending)' }}>
                  {formatCurrency(c.amountCents || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ABA AJUSTES & BACKUP */}
      {activeTab === 'settings' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px', color: '#F8FAFC' }}>
            Configurações, Integridade & Backups
          </h3>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
            Exportação versionada em JSON e recuperação de backups sanitizados sem perda de metadados.
          </p>
          <button
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `razao_backup_${todayISO}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              background: 'var(--brand-blue-gradient)',
              color: '#FFF',
              border: 'none',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Exportar Backup JSON Versionado
          </button>
        </div>
      )}

      {/* Modal Acessível de Lançamento */}
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
