import React from 'react';

/**
 * CONTROLADOR DE ABAS SEGMENTADAS (O RAZÃO 3.0)
 * Resolve a crítica sobre navegação confusa entre sub-módulos.
 * Oferece alternância instantânea com animação fluida, alto contraste e suporte a teclados.
 */

export function SegmentedTabs({ tabs, activeTab, onChange, size = 'medium' }) {
  const paddingMap = {
    small: '4px 8px',
    medium: '6px 12px',
    large: '8px 16px'
  };

  const fontSizeMap = {
    small: '12px',
    medium: '13px',
    large: '14px'
  };

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-glass)',
        borderRadius: '12px',
        maxWidth: '100%',
        overflowX: 'auto'
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              padding: paddingMap[size],
              fontSize: fontSizeMap[size],
              fontWeight: isActive ? '700' : '500',
              color: isActive ? '#FFFFFF' : '#94A3B8',
              background: isActive ? 'var(--brand-blue-gradient)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: isActive ? 'var(--brand-blue-glow)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#FFF',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '9999px'
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
