import React, { useEffect, useState } from 'react';
import { RazaoLogo } from './RazaoLogo';
import packageJson from '../../package.json';

const NAV_GROUPS = [
  {
    label: 'Visão geral',
    items: [
      { id: 'dashboard', label: 'Visão geral', icon: 'overview', description: 'Resumo do seu dinheiro e do período.' },
      { id: 'transactions', label: 'Lançamentos', icon: 'transactions', description: 'Consulte, filtre e organize suas movimentações.' },
    ]
  },
  {
    label: 'Organização',
    items: [
      { id: 'invoices', label: 'Cartões e faturas', icon: 'card', badgeKey: 'pendingInvoices', description: 'Acompanhe ciclos, vencimentos e pagamentos.' },
      { id: 'budget', label: 'Orçamentos', icon: 'budget', description: 'Defina limites e monitore gastos por categoria.' },
      { id: 'analytics', label: 'Relatórios', icon: 'analytics', description: 'Entenda tendências, categorias e evolução.' },
      { id: 'importer', label: 'Importar dados', icon: 'import', description: 'Importe arquivos e confira divergências antes de aplicar.' },
    ]
  },
  {
    label: 'Planejamento',
    items: [
      { id: 'ai_predictive', label: 'Planejamento', icon: 'planning', description: 'Explore previsões, cenários e alertas financeiros.' },
    ]
  },
  {
    label: 'Conta e controle',
    items: [
      { id: 'profile', label: 'Perfil', icon: 'profile', description: 'Acompanhe seu perfil e suas conquistas.' },
      { id: 'settings', label: 'Preferências', icon: 'settings', description: 'Ajuste a experiência e as opções do aplicativo.' },
      { id: 'audit', label: 'Histórico de Auditoria', icon: 'history', description: 'Consulte eventos registrados no histórico.' },
      { id: 'integrity', label: 'Integridade Financeira', icon: 'shield', description: 'Execute verificações de consistência dos dados.' },
    ]
  }
];

export const NAV_ITEMS = NAV_GROUPS.flatMap(group => group.items).map((item, index) => ({
  ...item,
  shortcut: index < 9 ? `Alt+${index + 1}` : undefined
}));

const ICON_PATHS = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="4" rx="1.5"/><rect x="14" y="10" width="7" height="11" rx="1.5"/><rect x="3" y="13" width="7" height="8" rx="1.5"/></>,
  transactions: <><path d="M7 7h13M7 12h13M7 17h8"/><path d="M3.5 7h.01M3.5 12h.01M3.5 17h.01" strokeWidth="2.6"/></>,
  card: <><rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M3 9h18M7 15h4"/></>,
  budget: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-7"/><path d="M16 6h3v3"/></>,
  analytics: <><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/><path d="M16 6h4v4"/></>,
  planning: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="6.5"/><path d="m9.5 12 1.7 1.7 3.5-3.7"/></>,
  import: <><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M5 16v4h14v-4"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4L17 17.4a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" transform="translate(1 1) scale(.92)"/></>,
  history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4 4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
  eyeOff: <><path d="m3 3 18 18M10.6 6.2A10.6 10.6 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-3.1 3.5M6.2 6.3C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a10 10 0 0 0 3.2-.5"/><path d="M9.8 9.8a3 3 0 0 0 4.4 4.4"/></>,
  shieldCheck: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m8.5 12 2.3 2.3 4.7-4.8"/></>,
  chevronDown: <path d="m6 9 6 6 6-6"/>,
  sparkle: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></>,
  arrowRight: <><path d="M4 12h15M13 6l6 6-6 6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7h.01"/></>
};

function AppIcon({ name, size = 20, className = '' }) {
  return (
    <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name] || ICON_PATHS.overview}
    </svg>
  );
}

function NavigationItems({ activeTab, setActiveTab, badges, onNavigate, compact = false }) {
  return NAV_GROUPS.map(group => (
    <div className="sidebar-nav-group" key={group.label}>
      <div className="sidebar-group-label">{group.label}</div>
      {group.items.map(item => {
        const active = activeTab === item.id;
        const badge = badges[item.badgeKey] || 0;
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => { setActiveTab(item.id); onNavigate?.(); }}
            className={`sidebar-nav-item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
            title={compact ? item.label : undefined}
          >
            <span className="sidebar-nav-icon"><AppIcon name={item.icon} size={19} /></span>
            <span className="sidebar-nav-label">{item.label}</span>
            {badge > 0 && <span className="sidebar-nav-badge" aria-label={`${badge} fatura(s) pendente(s)`}>{badge}</span>}
          </button>
        );
      })}
    </div>
  ));
}

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
  const activeTabMeta = NAV_ITEMS.find(item => item.id === activeTab) || NAV_ITEMS[0];
  const isDesktop = typeof window !== 'undefined' && Boolean(window.electronAPI?.isDesktop);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const item = NAV_ITEMS.find(candidate => candidate.shortcut === `Alt+${event.key}`);
        if (item) { event.preventDefault(); setActiveTab(item.id); setDrawerOpen(false); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setActiveTab]);

  const submitAssistantQuestion = () => {
    const prompt = aiPromptInput.trim();
    if (!prompt) return;
    onAIQuickAsk?.(prompt);
    setActiveTab('ai_predictive');
    setAiPromptInput('');
    setDrawerOpen(false);
  };

  const closeDrawer = () => setDrawerOpen(false);
  const mobileNav = [
    NAV_ITEMS.find(item => item.id === 'dashboard'),
    NAV_ITEMS.find(item => item.id === 'transactions'),
    NAV_ITEMS.find(item => item.id === 'invoices'),
    NAV_ITEMS.find(item => item.id === 'budget')
  ];
  const currentIsMobileMain = mobileNav.some(item => item.id === activeTab);

  return (
    <div className="app-shell-root">
      <aside className="app-sidebar" aria-label="Navegação principal">
        <div className="sidebar-brand"><RazaoLogo size="md" showSubtitle={false} isDesktop={isDesktop} /></div>
        <button className="sidebar-workspace" type="button" onClick={() => setProfileMode?.(profileMode === 'PF' ? 'PJ' : 'PF')} aria-label={`Perfil atual ${profileMode}. Alternar para ${profileMode === 'PF' ? 'PJ' : 'PF'}`}>
          <span className={`workspace-monogram ${profileMode === 'PJ' ? 'is-business' : ''}`}>{profileMode}</span>
          <span className="workspace-copy"><strong>{profileMode === 'PF' ? 'Finanças pessoais' : 'Finanças profissionais'}</strong><small>{profileMode === 'PF' ? 'Pessoa física' : 'Pessoa jurídica'}</small></span>
          <AppIcon name="chevronDown" size={16} />
        </button>
        <nav className="sidebar-navigation">
          <NavigationItems activeTab={activeTab} setActiveTab={setActiveTab} badges={badges} />
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-footer-link" onClick={onOpenDiagnostic}>
            <span className="sidebar-nav-icon"><AppIcon name="shieldCheck" size={18} /></span>
            <span className="sidebar-nav-label">Diagnóstico e saúde</span>
          </button>
          <div className="sidebar-local-status"><span className="status-dot" /><span>Dados locais neste dispositivo</span></div>
          <small className="sidebar-version">v{packageJson.version} · Beta</small>
        </div>
      </aside>

      {drawerOpen && <button type="button" className="mobile-drawer-backdrop" aria-label="Fechar menu" onClick={closeDrawer} />}
      <aside className={`mobile-drawer${drawerOpen ? ' is-open' : ''}`} aria-label="Menu completo" aria-hidden={!drawerOpen} inert={!drawerOpen}>
        <div className="mobile-drawer-header">
          <RazaoLogo size="sm" showSubtitle={false} />
          <button type="button" className="icon-button" onClick={closeDrawer} aria-label="Fechar menu"><AppIcon name="close" /></button>
        </div>
        <div className="mobile-drawer-profile">
          <div className="profile-avatar">{userProfile.name?.trim()?.[0]?.toUpperCase() || 'U'}</div>
          <div className="mobile-drawer-profile-copy"><strong>{userProfile.name || 'Seu perfil'}</strong><small>{profileMode === 'PF' ? 'Finanças pessoais' : 'Finanças profissionais'}</small></div>
        </div>
        <nav className="mobile-drawer-navigation">
          <NavigationItems activeTab={activeTab} setActiveTab={setActiveTab} badges={badges} onNavigate={closeDrawer} />
          <button type="button" className="sidebar-footer-link" onClick={() => { closeDrawer(); onOpenDiagnostic?.(); }}><span className="sidebar-nav-icon"><AppIcon name="shieldCheck" /></span><span className="sidebar-nav-label">Diagnóstico e saúde</span></button>
        </nav>
        <div className="mobile-drawer-footer">Aplicativo local · v{packageJson.version}</div>
      </aside>

      <div className="app-main-column">
        <header className="app-topbar">
          <div className="topbar-left">
            <button type="button" className="icon-button mobile-menu-button" onClick={() => setDrawerOpen(true)} aria-label="Abrir menu"><AppIcon name="menu" size={21} /></button>
            <div className="topbar-context"><span className="topbar-context-label">O Razão</span><span className="topbar-separator">/</span><span className="topbar-current-page">{activeTabMeta.label}</span></div>
          </div>
          <div className="topbar-assistant">
            <AppIcon name="sparkle" size={17} />
            <input
              type="text"
              aria-label="Perguntar ao assistente do Razão"
              placeholder="Pergunte sobre suas finanças..."
              value={aiPromptInput}
              onChange={event => setAiPromptInput(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') submitAssistantQuestion(); }}
            />
            <kbd>Enter ↵</kbd>
            <button type="button" className="assistant-submit" aria-label="Enviar pergunta" onClick={submitAssistantQuestion} disabled={!aiPromptInput.trim()}><AppIcon name="arrowRight" size={17} /></button>
          </div>
          <div className="topbar-actions">
            <div className="profile-switcher" aria-label="Alternar perfil financeiro">
              <button type="button" className={profileMode === 'PF' ? 'is-selected' : ''} aria-pressed={profileMode === 'PF'} onClick={() => setProfileMode?.('PF')}>PF</button>
              <button type="button" className={profileMode === 'PJ' ? 'is-selected' : ''} aria-pressed={profileMode === 'PJ'} onClick={() => setProfileMode?.('PJ')}>PJ</button>
            </div>
            <button type="button" className={`icon-button privacy-button${hideAmounts ? ' is-enabled' : ''}`} onClick={() => setHideAmounts?.(!hideAmounts)} aria-label={hideAmounts ? 'Exibir valores financeiros' : 'Ocultar valores financeiros'} aria-pressed={hideAmounts} title={hideAmounts ? 'Exibir valores' : 'Ocultar valores'}><AppIcon name={hideAmounts ? 'eyeOff' : 'eye'} size={18} /></button>
            <button type="button" className="icon-button diagnostic-button" onClick={onOpenDiagnostic} aria-label="Abrir diagnóstico e saúde" title="Diagnóstico e saúde"><AppIcon name="shieldCheck" size={18} /></button>
            <button type="button" className="topbar-avatar-button" onClick={() => setActiveTab('profile')} aria-label="Abrir perfil"><span className="profile-avatar">{userProfile.name?.trim()?.[0]?.toUpperCase() || 'U'}</span></button>
          </div>
        </header>

        <main className="app-main-content">
          <div className="page-header">
            <div className="page-heading-copy">
              <div className="page-eyebrow">{profileMode === 'PF' ? 'PESSOAL' : 'PROFISSIONAL'} <span className="eyebrow-dot" /> VISÃO FINANCEIRA</div>
              <h1>{activeTabMeta.label}</h1>
              <p>{activeTabMeta.description}</p>
            </div>
            <div className="page-header-actions">
              <button type="button" className="button-secondary diagnostic-header-button" onClick={onOpenDiagnostic}><AppIcon name="shieldCheck" size={17} /><span>Diagnóstico</span></button>
              <button type="button" className="button-primary new-transaction-button" onClick={onNewTransaction}><AppIcon name="plus" size={18} /><span>Novo lançamento</span></button>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="profile-context-notice" role="note">
              <AppIcon name="info" size={17} />
              <span>Atenção: separação PF/PJ ainda parcial; contas, cartões, categorias e orçamentos ainda não têm isolamento completo. Não use essa alternância como garantia de segregação contábil, fiscal ou de acesso. Os dados permanecem neste dispositivo.</span>
            </div>
          )}

          <div className="app-page-body">{children}</div>
          <footer className="app-content-footer"><span>O Razão · Suas finanças, com lógica.</span><span>Seus dados permanecem neste dispositivo, conforme o modo de armazenamento configurado.</span></footer>
        </main>
      </div>

      <nav className="mobile-bottom-navigation" aria-label="Navegação rápida">
        {mobileNav.map(item => (
          <button type="button" key={item.id} className={`mobile-nav-item${activeTab === item.id ? ' is-active' : ''}`} onClick={() => { setActiveTab(item.id); closeDrawer(); }} aria-current={activeTab === item.id ? 'page' : undefined}>
            <AppIcon name={item.icon} size={20} /><span>{item.id === 'dashboard' ? 'Início' : item.id === 'transactions' ? 'Movimentos' : item.id === 'invoices' ? 'Cartões' : 'Orçamento'}</span>
            {item.badgeKey && badges[item.badgeKey] > 0 && <span className="mobile-nav-badge" />}
          </button>
        ))}
        <button type="button" className={`mobile-nav-item${!currentIsMobileMain ? ' is-active' : ''}`} onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen}>
          <AppIcon name="menu" size={20} /><span>Mais</span>
        </button>
      </nav>

      <button type="button" onClick={onNewTransaction} className="mobile-fab" aria-label="Adicionar novo lançamento"><AppIcon name="plus" size={24} /></button>
    </div>
  );
}
