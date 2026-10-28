import React, { useState, useEffect } from 'react';

/**
 * APP SHELL NATIVO & MOBILE-FIRST (O RAZÃO 6.0)
 * Reconstruído com base no design de referência "Money Manager".
 * Oferece navegação fluida, Top Navbar com drawer flutuante e navegação por toque sem atrito.
 */

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Início', icon: '🏠', shortcut: 'Alt+1' },
  { id: 'analytics', label: 'Relatórios', icon: '📊', shortcut: 'Alt+2' },
  { id: 'transactions', label: 'Extrato', icon: '💸', shortcut: 'Alt+3' },
  { id: 'invoices', label: 'Cartões', icon: '💳', shortcut: 'Alt+4', badgeKey: 'pendingInvoices' },
  { id: 'commitments', label: 'Compromissos', icon: '📅', shortcut: 'Alt+5' },
  { id: 'settings', label: 'Ajustes', icon: '⚙️', shortcut: 'Alt+6' }
];

export function AppShell({ activeTab, setActiveTab, onNewTransaction, badges = {}, children }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle Dark/Light Mode
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Atalhos Globais de Teclado
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
    <div className="app-layout">
      {/* 1. TOP NAVBAR SUPERIOR */}
      <header className="top-navbar">
        <div className="nav-left">
          <button
            className="icon-btn"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Abrir Menu"
          >
            ☰
          </button>
          <div className="nav-title">O Razão</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Botão Alternar Tema */}
          <button
            className="icon-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Alternar Tema"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {/* Avatar do Usuário */}
          <div className="user-avatar" title="Perfil do Usuário">
            R
          </div>
        </div>
      </header>

      {/* 2. DRAWER MOBILE OVERLAY (MENU LATERAL FLUTUANTE) */}
      <div
        className={`drawer-overlay ${isDrawerOpen ? 'open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
      >
        <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="user-avatar">R</div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>O Razão 6.0</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gestão com Lógica</p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setIsDrawerOpen(false)}>
              ✕
            </button>
          </div>

          <nav className="drawer-nav-list">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const badge = badges[item.badgeKey];
              return (
                <button
                  key={item.id}
                  className={`drawer-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsDrawerOpen(false);
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badge > 0 && (
                    <span style={{
                      background: 'var(--color-expense)',
                      color: '#FFF',
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: '999px'
                    }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div style={{ padding: '12px 0', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
            O Razão v6.0 • Local-First
          </div>
        </div>
      </div>

      {/* 3. CONTEÚDO DA PÁGINA */}
      <main style={{ flex: 1, padding: '20px 16px 100px 16px' }}>
        {children}
      </main>

      {/* 4. FLOATING ACTION BUTTON (FAB) */}
      <button
        className="fab-button"
        onClick={onNewTransaction}
        aria-label="Novo Lançamento"
        title="Novo Lançamento"
      >
        +
      </button>

      {/* 5. BOTTOM NAVIGATION BAR (FIXA NO RODAPÉ MOBILE) */}
      <nav className="bottom-nav">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
