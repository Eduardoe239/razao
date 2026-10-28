import React, { useState, useEffect } from 'react';

/**
 * APP SHELL & NAVEGAÇÃO UNIFICADA SEM REDUNDÂNCIA (O RAZÃO — FASE 7)
 * Centraliza a navegação no Drawer ativado pelo botão de 3 tracinhos (Hamburger Menu).
 */

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Painel Geral', icon: '📊', shortcut: 'Alt+1' },
  { id: 'transactions', label: 'Lançamentos', icon: '💸', shortcut: 'Alt+2' },
  { id: 'invoices', label: 'Cartões & Faturas', icon: '💳', shortcut: 'Alt+3', badgeKey: 'pendingInvoices' },
  { id: 'budget', label: 'Limites & Orçamento', icon: '🎯', shortcut: 'Alt+4' },
  { id: 'analytics', label: 'Gráficos & Métricas', icon: '📈', shortcut: 'Alt+5' },
  { id: 'ai_predictive', label: 'IA Razão & Cenários', icon: '🤖', shortcut: 'Alt+6' },
  { id: 'importer', label: 'Extrator & Open Finance', icon: '📥', shortcut: 'Alt+7' },
  { id: 'profile', label: 'Conquistas & Perfil', icon: '🏆', shortcut: 'Alt+8' },
  { id: 'settings', label: 'Personalização & Ajustes', icon: '⚙️', shortcut: 'Alt+9' }
];

export function AppShell({
  activeTab,
  setActiveTab,
  onNewTransaction,
  userProfile = {},
  badges = {},
  children
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setDrawerOpen(false);
  };

  const activeTabMeta = NAV_ITEMS.find(i => i.id === activeTab) || NAV_ITEMS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* 1. TOP NAVBAR EXECUTIVA UNIFICADA */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '64px',
        padding: '0 20px',
        background: 'rgba(7, 16, 31, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Esquerda: Botão 3 Tracinhos + Logo Marca "O RAZÃO" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="icon-btn"
            aria-label="Abrir Menu Principal"
            title="Abrir Menu Principal"
          >
            ☰
          </button>

          {/* Logo Oficial O RAZÃO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--brand-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '18px',
              color: '#FFF',
              boxShadow: 'var(--shadow-brand)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              R
            </div>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.05em', color: 'var(--text-primary)', display: 'block', lineHeight: '1' }}>
                O RAZÃO
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '700' }}>
                SUAS FINANÇAS. COM LÓGICA.
              </span>
            </div>
          </div>
        </div>

        {/* Direita: Título Ativo Equipado do Usuário */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {userProfile.title && (
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              color: 'var(--color-pending)',
              background: 'var(--color-pending-bg)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-pending-border)'
            }} className="mobile-hide-sm">
              🏆 {userProfile.title}
            </span>
          )}

          <div
            onClick={() => setActiveTab('profile')}
            className="user-avatar"
            style={{ cursor: 'pointer' }}
            title="Ver Perfil e Conquistas"
          >
            {userProfile.avatarEmoji || '👤'}
          </div>
        </div>
      </header>

      {/* 2. DRAWER / MENU LATERAL FLUTUANTE OCULTÁVEL */}
      <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)}>
        <aside className="drawer-content" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--brand-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                color: '#FFF',
                fontSize: '16px'
              }}>
                R
              </div>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>O RAZÃO</span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>

          {/* Card do Usuário no Drawer */}
          <div
            onClick={() => handleSelectTab('profile')}
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-subtle)',
              marginBottom: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div className="user-avatar">{userProfile.avatarEmoji || '👤'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userProfile.name || 'Usuário'}
              </div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-pending)' }}>
                🏆 {userProfile.title || 'Iniciado do Razão'}
              </div>
            </div>
          </div>

          {/* Links do Menu */}
          <nav className="drawer-nav-list">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const badge = badges[item.badgeKey];

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`drawer-nav-item ${isActive ? 'active' : ''}`}
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
                      borderRadius: 'var(--radius-pill)'
                    }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div style={{ padding: '12px 0 0 0', borderTop: '1px solid var(--border-card)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🟢 Local-First Sync</span>
            <span>v10.0 Certificada</span>
          </div>
        </aside>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '20px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>{activeTabMeta.icon}</span>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>
              {activeTabMeta.label}
            </h2>
          </div>
        </div>

        {children}
      </main>

      {/* 4. FAB FLUTUANTE (+ NOVO LANÇAMENTO) */}
      <button
        onClick={onNewTransaction}
        className="fab-button"
        aria-label="Adicionar Novo Lançamento"
        title="Adicionar Novo Lançamento"
      >
        +
      </button>

      <style>{`
        @media (max-width: 480px) {
          .mobile-hide-sm { display: none !important; }
        }
      `}</style>
    </div>
  );
}
