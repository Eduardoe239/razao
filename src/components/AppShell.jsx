import React, { useState, useEffect } from 'react';

/**
 * APP SHELL EXECUTIVO E NAVEGAÇÃO MULTIPLATAFORMA (O RAZÃO v14.0)
 * Integra a logo marca oficial (R com colunas ascendentes), barra de comando rápido
 * da IA Razão, alternador dual PF/PJ e modo de privacidade estrito.
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
  onOpenDiagnostic,
  userProfile = {},
  badges = {},
  profileMode = 'PF',
  setProfileMode,
  hideAmounts = false,
  setHideAmounts,
  onAIQuickAsk,
  children
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');

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

  const handleAIKeyDown = (e) => {
    if (e.key === 'Enter' && aiPromptInput.trim()) {
      if (onAIQuickAsk) onAIQuickAsk(aiPromptInput);
      setActiveTab('ai_predictive');
      setAiPromptInput('');
    }
  };

  const activeTabMeta = NAV_ITEMS.find(i => i.id === activeTab) || NAV_ITEMS[0];
  const isDesktop = typeof window !== 'undefined' && window.electronAPI?.isDesktop;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* 1. TOP NAVBAR EXECUTIVA UNIFICADA COM LOGO OFICIAL E IA COMMAND BAR */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '68px',
        padding: '0 20px',
        background: 'rgba(7, 16, 31, 0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Esquerda: Botão Menu + LOGO MARCA OFICIAL "O RAZÃO" (VETOR "R" COM BARRAS ASCENDENTES) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="icon-btn"
            aria-label="Abrir Menu Principal"
            title="Abrir Menu Principal"
          >
            ☰
          </button>

          {/* EMBLEMA DA LOGO MARCA OFICIAL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 180, 216, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              flexShrink: 0
            }}>
              <svg width="26" height="26" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 18H38V82H22V18Z" fill="white" />
                <path d="M38 18H62C72.5 18 80 25.5 80 36C80 46.5 72.5 54 62 54H38V18ZM38 32V40H60C62.5 40 65 38.5 65 36C65 33.5 62.5 32 60 32H38Z" fill="white" />
                <rect x="42" y="66" width="9" height="16" rx="2" fill="#7209B7" />
                <rect x="54" y="58" width="9" height="24" rx="2" fill="#4CC9F0" />
                <rect x="66" y="48" width="10" height="34" rx="2" fill="#4895EF" />
              </svg>
            </div>
            <div className="mobile-hide-sm">
              <span style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.06em', color: 'var(--text-primary)', display: 'block', lineHeight: '1' }}>
                O RAZÃO
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: '700' }}>
                SUAS FINANÇAS. COM LÓGICA. {isDesktop ? '• BETA .EXE' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Centro: BARRA DE COMANDO DA IA RAZÃO (INSPIRADA NO PIERRE) */}
        <div style={{ flex: 1, maxWidth: '420px', margin: '0 12px' }} className="mobile-hide-sm">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-pill)',
            padding: '4px 14px',
            gap: '8px'
          }}>
            <span style={{ fontSize: '14px' }}>🤖</span>
            <input
              type="text"
              placeholder="Pergunte à IA Razão... (ex: posso gastar R$ 200?)"
              value={aiPromptInput}
              onChange={(e) => setAiPromptInput(e.target.value)}
              onKeyDown={handleAIKeyDown}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '12px',
                width: '100%',
                fontWeight: '500'
              }}
            />
            {aiPromptInput && (
              <button
                onClick={() => handleAIKeyDown({ key: 'Enter' })}
                style={{ background: 'var(--brand-accent)', border: 'none', color: '#FFF', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '10px' }}
              >
                ➔
              </button>
            )}
          </div>
        </div>

        {/* Direita: ALTERNADOR DUAL PF/PJ + MODO PRIVACIDADE + DIAGNÓSTICO + PERFIL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Alternador de Perfil PF/PJ (Organizze inspired) */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--surface-subtle)',
            borderRadius: 'var(--radius-pill)',
            padding: '2px',
            border: '1px solid var(--border-card)'
          }}>
            <button
              onClick={() => setProfileMode && setProfileMode('PF')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: profileMode === 'PF' ? 'var(--brand-gradient)' : 'transparent',
                color: profileMode === 'PF' ? '#FFF' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
              title="Visão Pessoa Física"
            >
              👤 PF
            </button>
            <button
              onClick={() => setProfileMode && setProfileMode('PJ')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: profileMode === 'PJ' ? 'var(--brand-gradient)' : 'transparent',
                color: profileMode === 'PJ' ? '#FFF' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
              title="Visão Empresarial / PME"
            >
              🏢 PJ
            </button>
          </div>

          {/* Modo de Privacidade (Ocultar Saldos para Proteção) */}
          <button
            onClick={() => setHideAmounts && setHideAmounts(!hideAmounts)}
            style={{
              background: hideAmounts ? 'var(--color-pending-bg)' : 'var(--surface-card)',
              border: `1px solid ${hideAmounts ? 'var(--color-pending-border)' : 'var(--border-card)'}`,
              color: hideAmounts ? 'var(--color-pending)' : 'var(--text-primary)',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            title={hideAmounts ? "Exibir Valores" : "Ocultar Valores (Privacidade)"}
          >
            {hideAmounts ? '🔒' : '👁️'}
          </button>

          {/* Diagnóstico */}
          <button
            onClick={onOpenDiagnostic}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-card)',
              color: 'var(--brand-accent)',
              fontSize: '11px',
              fontWeight: '800',
              padding: '6px 10px',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Painel de Diagnóstico do Beta-Tester"
          >
            <span>🛡️</span>
          </button>

          {/* Avatar do Usuário */}
          <div
            onClick={() => setActiveTab('profile')}
            className="user-avatar"
            style={{ cursor: 'pointer', width: '36px', height: '36px' }}
            title="Ver Perfil e Conquistas"
          >
            {userProfile.avatarEmoji || '👨‍💼'}
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
                background: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                color: '#FFF'
              }}>
                <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 18H38V82H22V18Z" fill="white" />
                  <path d="M38 18H62C72.5 18 80 25.5 80 36C80 46.5 72.5 54 62 54H38V18ZM38 32V40H60C62.5 40 65 38.5 65 36C65 33.5 62.5 32 60 32H38Z" fill="white" />
                  <rect x="42" y="66" width="9" height="16" rx="2" fill="#7209B7" />
                  <rect x="54" y="58" width="9" height="24" rx="2" fill="#4CC9F0" />
                  <rect x="66" y="48" width="10" height="34" rx="2" fill="#4895EF" />
                </svg>
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
            <div className="user-avatar">{userProfile.avatarEmoji || '👨‍💼'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userProfile.name || 'Usuário'} ({profileMode})
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

            <button
              onClick={() => { setDrawerOpen(false); onOpenDiagnostic(); }}
              className="drawer-nav-item"
              style={{ color: 'var(--brand-accent)', marginTop: '8px', borderTop: '1px solid var(--border-card)', paddingTop: '12px' }}
            >
              <span style={{ fontSize: '18px' }}>🛡️</span>
              <span style={{ flex: 1 }}>Diagnóstico & Saúde</span>
            </button>
          </nav>

          <div style={{ padding: '12px 0 0 0', borderTop: '1px solid var(--border-card)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔒 AES-256 / Local-First</span>
            <span>v14.0 Beta</span>
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
