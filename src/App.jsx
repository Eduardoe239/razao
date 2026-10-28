import React, { useState, useEffect } from 'react';

// Design System & Estilos
import './styles/theme.css';

// Componentes da Interface
import { SplashScreen } from './components/SplashScreen';
import { AppShell } from './components/AppShell';
import { SegmentedTabs } from './components/SegmentedTabs';
import { ExecutiveBalanceHeader } from './components/ExecutiveBalanceHeader';
import { InvoiceCycleCard } from './components/InvoiceCycleCard';
import { TransactionFeed } from './components/TransactionFeed';
import { TransactionModal } from './components/TransactionModal';
import { ExpenseAnalytics } from './components/ExpenseAnalytics';
import { UserProfilePanel } from './components/UserProfilePanel';
import { PersonalizationPanel } from './components/PersonalizationPanel';
import { FinancialCharts } from './components/FinancialCharts';
import { ImportReconciliationModal } from './components/ImportReconciliationModal';
import { AIPredictivePanel } from './components/AIPredictivePanel';
import { DiagnosticModal } from './components/DiagnosticModal';

// Domínio Financeiro Determinístico & Aprendizado Contínuo
import { cardInvoices } from './domain/invoices';
import { buildCommitments } from './domain/commitments';
import { formatMoney } from './domain/money';
import { sanitizeState } from './domain/sanitize';
import { uid } from './domain/uid';
import { calculateUserAchievements } from './domain/achievements';
import { recordCategoryRule, predictCategory } from './domain/categoryLearning';
import { loadStateEncrypted, saveStateEncrypted } from './services/encryptedStorage';
import { loadState, saveState } from './services/storage';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardPeriod, setDashboardPeriod] = useState('monthly');
  const [profileMode, setProfileMode] = useState('PF'); // 'PF' (Pessoal) ou 'PJ' (Empresarial/PME)
  const [hideAmounts, setHideAmounts] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Estado Central Financeiro
  const [state, setState] = useState(() => {
    const loaded = loadState();
    return sanitizeState(loaded || {});
  });

  // Tenta carregar estado criptografado se disponível
  useEffect(() => {
    async function initEncryptedData() {
      const encryptedData = await loadStateEncrypted();
      if (encryptedData) {
        setState(sanitizeState(encryptedData));
      }
    }
    initEncryptedData();
  }, []);

  // Estado do Perfil do Usuário
  const [userProfile, setUserProfile] = useState(() => {
    return state.userProfile || {
      name: 'Eduardo',
      email: 'eduardo@orazao.com.br',
      phone: '(11) 98765-4321',
      avatarEmoji: '👨‍💼',
      title: 'Iniciado do Razão'
    };
  });

  // Persistência Criptografada Observável
  useEffect(() => {
    saveState({ ...state, userProfile });
    saveStateEncrypted({ ...state, userProfile });
  }, [state, userProfile]);

  const { transactions = [], accounts = [], categories = [], cards = [] } = state;

  // Filtragem Dinâmica por Perfil PF / PJ (Inspirado no Organizze)
  const filteredTransactions = transactions.filter(t => {
    if (profileMode === 'PJ') return t.profileType === 'PJ';
    return !t.profileType || t.profileType === 'PF';
  });

  const formatCurrency = (amountCents) => {
    if (hideAmounts) return '••••••';
    return formatMoney(amountCents || 0);
  };
  const todayISO = new Date().toISOString().slice(0, 10);

  // 1. CÁLCULO DOS 4 SALDOS EXECUTIVOS VIA DOMÍNIO
  const realizedCents = filteredTransactions
    .filter(t => t.status === 'pago')
    .reduce((acc, t) => {
      if (t.type === 'receita') return acc + (t.amountCents || 0);
      if (t.type === 'despesa') return acc - (t.amountCents || 0);
      return acc;
    }, 0);

  const pendingCents = filteredTransactions
    .filter(t => t.status === 'pendente')
    .reduce((acc, t) => {
      if (t.type === 'receita') return acc + (t.amountCents || 0);
      if (t.type === 'despesa') return acc - (t.amountCents || 0);
      return acc;
    }, 0);

  const projectedCents = realizedCents + pendingCents;

  const primaryCard = cards[0] || { id: 'card-1', name: 'Cartão Black', limitCents: 1500000, closingDay: 10, dueDay: 20 };
  const invoicesData = cardInvoices(primaryCard, filteredTransactions, todayISO.slice(0, 7), 2, 2, todayISO);
  const currentInvoice = invoicesData.find(i => i.monthKey === todayISO.slice(0, 7)) || invoicesData[0];

  const committedCents = currentInvoice ? currentInvoice.remainingCents : 0;
  const availableCents = realizedCents - committedCents;

  const incomeCents = filteredTransactions
    .filter(t => t.type === 'receita' && t.status === 'pago')
    .reduce((acc, t) => acc + (t.amountCents || 0), 0);

  const expenseCents = filteredTransactions
    .filter(t => t.type === 'despesa' && t.status === 'pago')
    .reduce((acc, t) => acc + (t.amountCents || 0), 0);

  const commitments = buildCommitments({ transactions: filteredTransactions, todayISO, monthsAhead: 3 });

  // HANDLERS DE LANÇAMENTO & APRENDIZADO
  const handleSaveTransaction = (data) => {
    // Grava regra de aprendizado para categorização automática futura
    if (data.description && data.categoryId) {
      recordCategoryRule(data.description, data.categoryId);
    }

    const txData = {
      ...data,
      profileType: profileMode
    };

    if (txData.id) {
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === txData.id ? { ...t, ...txData } : t)
      }));
    } else {
      const newTransaction = {
        ...txData,
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

    const paymentTransaction = {
      id: uid(),
      type: 'despesa',
      description: `Pagamento de Fatura ${card.name}`,
      amountCents: paymentAmount,
      date: todayISO,
      accountId: accounts[0]?.id || 'acc-1',
      status: 'pago',
      profileType: profileMode,
      linkedInvoiceKey: invoice.monthKey
    };

    setState(prev => ({
      ...prev,
      transactions: [paymentTransaction, ...prev.transactions]
    }));

    alert(`Pagamento de ${formatCurrency(paymentAmount)} realizado com sucesso!`);
  };

  const handleImportConfirmed = (importedTxs) => {
    // Aplica o motor de aprendizado automático de categoria
    const processedTxs = importedTxs.map(t => {
      const autoCat = predictCategory(t.description, t.categoryId || 'outros');
      return {
        ...t,
        categoryId: autoCat,
        profileType: profileMode
      };
    });

    setState(prev => ({
      ...prev,
      transactions: [...processedTxs, ...prev.transactions]
    }));
    alert(`${processedTxs.length} lançamento(s) importado(s), categorizado(s) e reconciliado(s) com sucesso!`);
  };

  return (
    <>
      {/* 1. TELA DE ABERTURA SPLASH SCREEN (VERSÃO .EXE DESKTOP E WEB) */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <AppShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewTransaction={() => { setEditingTransaction(null); setIsModalOpen(true); }}
        onOpenDiagnostic={() => setIsDiagnosticModalOpen(true)}
        userProfile={userProfile}
        badges={{ pendingInvoices: currentInvoice?.status === 'fechada' ? 1 : 0 }}
        profileMode={profileMode}
        setProfileMode={setProfileMode}
        hideAmounts={hideAmounts}
        setHideAmounts={setHideAmounts}
      >
        {/* 1. ABA PAINEL GERAL (DASHBOARD) */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Navegador de Períodos em Pílulas */}
            <div className="pill-tabs-container">
              <button className={`pill-tab ${dashboardPeriod === 'weekly' ? 'active' : ''}`} onClick={() => setDashboardPeriod('weekly')}>
                Semanal
              </button>
              <button className={`pill-tab ${dashboardPeriod === 'monthly' ? 'active' : ''}`} onClick={() => setDashboardPeriod('monthly')}>
                Mensal
              </button>
              <button className={`pill-tab ${dashboardPeriod === 'quarterly' ? 'active' : ''}`} onClick={() => setDashboardPeriod('quarterly')}>
                3 Meses
              </button>
            </div>

            {/* Navegador de Datas */}
            <div className="date-navigator">
              <button className="date-nav-btn">◀</button>
              <span className="date-nav-label">Outubro 2026 ({profileMode})</span>
              <button className="date-nav-btn">▶</button>
            </div>

            {/* Card Hero dos 4 Saldos Executivos */}
            <ExecutiveBalanceHeader
              realizedCents={realizedCents}
              projectedCents={projectedCents}
              committedCents={committedCents}
              availableCents={availableCents}
              incomeCents={incomeCents}
              expenseCents={expenseCents}
              formatCurrency={formatCurrency}
            />

            {/* Ações Rápidas: Importar Extrato */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button
                onClick={() => setIsImportModalOpen(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border-card)',
                  color: 'var(--brand-accent)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>📥</span> Importar OFX / Pix
              </button>
            </div>

            {/* Lista Recente de Lançamentos */}
            <div className="section-title-bar">
              <h3 className="section-title">Últimas Movimentações ({profileMode})</h3>
              <span className="see-all-link" onClick={() => setActiveTab('transactions')}>Ver Todas →</span>
            </div>

            <TransactionFeed
              transactions={filteredTransactions.slice(0, 8)}
              accounts={accounts}
              categories={categories}
              formatCurrency={formatCurrency}
              onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
              onDeleteTransaction={handleDeleteTransaction}
              onToggleStatus={handleToggleStatus}
            />
          </div>
        )}

        {/* 2. ABA LANÇAMENTOS */}
        {activeTab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="section-title">Histórico ({profileMode})</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-primary)',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  📥 Importar
                </button>
                <button
                  onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                  className="btn-primary"
                  style={{ padding: '10px 16px', fontSize: '13px' }}
                >
                  + Novo Lançamento
                </button>
              </div>
            </div>

            <TransactionFeed
              transactions={filteredTransactions}
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
            <InvoiceCycleCard
              card={primaryCard}
              invoice={currentInvoice}
              formatCurrency={formatCurrency}
              onPayInvoice={handlePayInvoice}
            />
          </div>
        )}

        {/* 4. ABA LIMITES & ORÇAMENTO */}
        {activeTab === 'budget' && (
          <div className="summary-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '24px' }}>
            <h3 className="section-title" style={{ marginBottom: '12px' }}>Orçamento por Categoria ({profileMode})</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Controle de limites por categoria. Orçamento zero é mantido explicitamente como R$ 0,00.
            </p>
          </div>
        )}

        {/* 5. ABA GRÁFICOS & MÉTRICAS */}
        {activeTab === 'analytics' && (
          <div>
            <FinancialCharts
              transactions={filteredTransactions}
              categories={categories}
              formatCurrency={formatCurrency}
              hideAmounts={hideAmounts}
            />
            <ExpenseAnalytics
              transactions={filteredTransactions}
              categories={categories}
              formatCurrency={formatCurrency}
            />
          </div>
        )}

        {/* 6. ABA IA RAZÃO & CENÁRIOS (FASE 7) */}
        {activeTab === 'ai_predictive' && (
          <AIPredictivePanel
            state={{ ...state, transactions: filteredTransactions }}
            formatCurrency={formatCurrency}
          />
        )}

        {/* 7. ABA EXTRATOR & OPEN FINANCE */}
        {activeTab === 'importer' && (
          <div className="summary-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>📥</span>
              <div>
                <h3 className="section-title">Extrator Multiformato & Open Finance</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Importe extratos OFX, planilhas CSV ou comprovantes Pix para reconciliação e categorização aprendida automaticamente.
                </p>
              </div>
            </div>

            <button className="btn-primary" onClick={() => setIsImportModalOpen(true)}>
              Abrir Importador e Extrator de Comprovantes
            </button>
          </div>
        )}

        {/* 8. ABA CONQUISTAS & PERFIL DO USUÁRIO */}
        {activeTab === 'profile' && (
          <UserProfilePanel
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            transactions={filteredTransactions}
            accounts={accounts}
          />
        )}

        {/* 9. ABA PERSONALIZAÇÃO & AJUSTES */}
        {activeTab === 'settings' && (
          <PersonalizationPanel
            state={state}
            todayISO={todayISO}
          />
        )}

        {/* Modais Acessíveis */}
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
          accounts={accounts}
          categories={categories}
          initialData={editingTransaction}
        />

        <ImportReconciliationModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          existingTransactions={filteredTransactions}
          accounts={accounts}
          categories={categories}
          formatCurrency={formatCurrency}
          onImportConfirmed={handleImportConfirmed}
        />

        <DiagnosticModal
          isOpen={isDiagnosticModalOpen}
          onClose={() => setIsDiagnosticModalOpen(false)}
          state={state}
        />
      </AppShell>
    </>
  );
}
