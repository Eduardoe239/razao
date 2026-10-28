import React, { useState, useEffect } from 'react';

/**
 * NAVEGAÇÃO E APP SHELL REPAGINADO (O RAZÃO 3.0)
 * Resolve integralmente as críticas sobre navegabilidade, acessibilidade e abas.
 * Suporta navegação por teclado (Alt+1..6), Bottom Nav no Mobile e Sidebar no Desktop.
 */

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Painel Geral', icon: '📊', shortcut: 'Alt+1' },
  { id: 'transactions', label: 'Lançamentos', icon: '💸', shortcut: 'Alt+2' },
  { id: 'invoices', label: 'Cartões & Faturas', icon: '💳', shortcut: 'Alt+3', badgeKey: 'pendingInvoices' },
  { id: 'budget', label: 'Orçamento', icon: '🎯', shortcut: 'Alt+4' },
  { id: 'commitments', label: 'Compromissos', icon: '📅', shortcut: 'Alt+5' },
  { id: 'settings', label: 'Ajustes & Backup', icon: '⚙️', shortcut: 'Alt+6' }
];

export function AppShell({ activeTab, setActiveTab, onNewTransaction, badges = {}, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Navegação por teclado (Atalhos Globais)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key, 10) - 1;
        if (NAV_ITEMS[index]) {
          e.preventDefault();
          setActiveTab(NAV_ITEMS[index].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
      {/* 1. SIDEBAR DESKTOP */}
      <aside
        style={{
          width: sidebarCollapsed ? '80px' : '260px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
        }}
        className="desktop-only"
      >
        {/* Header com Logo Oficial */}
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--brand-blue-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '20px',
              color: '#FFF',
              boxShadow: 'var(--brand-blue-glow)'
            }}>
              R
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: '800', tracking: '0.05em', color: '#FFF' }}>O RAZÃO</h1>
                <p style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Finanças com Lógica</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {sidebarCollapsed ? '➡️' : '⬅️'}
          </button>
        </div>

        {/* Botão de Ação Rápida */}
        <div style={{ padding: '16px 12px' }}>
          <button
            onClick={onNewTransaction}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--brand-blue-gradient)',
              color: '#FFF',
              border: 'none',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--brand-blue-glow)',
              transition: 'transform 0.2s'
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            {!sidebarCollapsed && <span>Novo Lançamento</span>}
          </button>
        </div>

        {/* Links de Navegação Principal */}
        <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }} role="tablist">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const badge = badges[item.badgeKey];
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'rgba(0, 180, 216, 0.15)' : 'transparent',
                  color: isActive ? '#00B4D8' : '#94A3B8',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {!sidebarCollapsed && <span style={{ flex: 1, fontSize: '14px' }}>{item.label}</span>}
                {!sidebarCollapsed && badge > 0 && (
                  <span style={{
                    background: 'var(--color-expense)',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '9999px'
                  }}>
                    {badge}
                  </span>
                )}
                {!sidebarCollapsed && (
                  <span style={{ fontSize: '10px', opacity: 0.4, fontFamily: 'var(--font-mono)' }}>{item.shortcut}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Rodapé do Menu com Versão */}
        {!sidebarCollapsed && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-glass)', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
            O Razão v3.0 Executivo
          </div>
        )}
      </aside>

      {/* 2. ÁREA PRINCIPAL DO CONTEÚDO */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingBottom: '80px' /* Espaço mobile */ }}>
        {/* Top Header com Data Operacional e Status */}
        <header style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(2, 6, 23, 0.8)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#F8FAFC' }}>
              {NAV_ITEMS.find(i => i.id === activeTab)?.label || 'Painel Geral'}
            </h2>
            <p style={{ fontSize: '12px', color: '#94A3B8' }}>Data operacional: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '9999px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--color-income)',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-income)' }} />
              Domínio Sincronizado
            </span>
          </div>
        </header>

        {/* Conteúdo da Aba Ativa */}
        <main style={{ padding: '24px', flex: 1 }} className="animate-fade-in">
          {children}
        </main>
      </div>

      {/* 3. BOTTOM NAVIGATION MOBILE */}
      <div
        className="mobile-only"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 4px',
          zIndex: 50
        }}
      >
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isActive ? '#00B4D8' : '#94A3B8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ fontWeight: isActive ? '700' : '400' }}>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        {/* FAB Central Mobile */}
        <button
          onClick={onNewTransaction}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--brand-blue-gradient)',
            color: '#FFF',
            border: 'none',
            fontSize: '24px',
            fontWeight: '700',
            boxShadow: 'var(--brand-blue-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Novo Lançamento"
        >
          +
        </button>
      </div>

      {/* Regras CSS Responsivas */}
      <style>{`
        @media (min-width: 768px) {
          .mobile-only { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}
