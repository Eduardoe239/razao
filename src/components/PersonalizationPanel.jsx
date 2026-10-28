import React from 'react';

/**
 * PAINEL DE PERSONALIZAÇÃO & IDENTIDADE VISUAL (O RAZÃO 3.0)
 * Permite ao usuário customizar temas visuais, estilos de card,
 * densidade da interface e ocultação de valores sensíveis.
 */

export function PersonalizationPanel({ settings = {}, onSaveSettings }) {
  const currentTheme = settings.theme || 'deep-tech-dark';
  const cardStyle = settings.cardStyle || 'glassmorphism';
  const density = settings.density || 'comfortable';
  const hideAmounts = !!settings.hideAmounts;

  const THEMES = [
    { id: 'deep-tech-dark', name: 'Deep Tech Dark', previewColor: '#0077B6', bg: '#020617', desc: 'Identidade oficial com azul elétrico e fundo slate noturno.' },
    { id: 'executive-midnight', name: 'Executive Midnight', previewColor: '#8B5CF6', bg: '#090D16', desc: 'Tons de roxo e azul marinho de alta sofisticação.' },
    { id: 'emerald-gold', name: 'Emerald Gold', previewColor: '#10B981', bg: '#041510', desc: 'Esmeralda vibrante focada em crescimento e patrimônio.' },
    { id: 'minimal-obsidian', name: 'Minimal Obsidian', previewColor: '#00B4D8', bg: '#000000', desc: 'Preto puro com alto contraste em telas OLED.' }
  ];

  const handleToggleTheme = (themeId) => {
    onSaveSettings({ ...settings, theme: themeId });
  };

  const handleCardStyleChange = (styleId) => {
    onSaveSettings({ ...settings, cardStyle: styleId });
  };

  const handleDensityChange = (densityId) => {
    onSaveSettings({ ...settings, density: densityId });
  };

  const handleToggleHideAmounts = () => {
    onSaveSettings({ ...settings, hideAmounts: !hideAmounts });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', marginBottom: '6px' }}>
          Personalização de Tema & Estilo
        </h3>
        <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
          Escolha a paleta visual e os efeitos de acabamento que mais combinam com o seu estilo de uso.
        </p>

        {/* 1. SELEÇÃO DE TEMA COLORIDO */}
        <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '12px' }}>
          Paleta de Cores e Ambiente
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {THEMES.map(theme => (
            <div
              key={theme.id}
              onClick={() => handleToggleTheme(theme.id)}
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: theme.bg,
                border: currentTheme === theme.id ? `2px solid ${theme.previewColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: currentTheme === theme.id ? `0 0 15px ${theme.previewColor}40` : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#FFF' }}>{theme.name}</span>
                <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: theme.previewColor }} />
              </div>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, lineHeight: '1.4' }}>
                {theme.desc}
              </p>
            </div>
          ))}
        </div>

        {/* 2. ESTILO DE CARDS */}
        <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '12px' }}>
          Estilo Visual das Superfícies (Cards)
        </label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {[
            { id: 'glassmorphism', label: 'Efeito Translucido (Glass)' },
            { id: 'solid', label: 'Sólido Executivo' },
            { id: 'neon', label: 'Borda Neon' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => handleCardStyleChange(item.id)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: cardStyle === item.id ? '1px solid #00B4D8' : '1px solid rgba(255, 255, 255, 0.1)',
                background: cardStyle === item.id ? 'rgba(0, 180, 216, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: cardStyle === item.id ? '#00B4D8' : '#94A3B8',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 3. DENSIDADE DA INTERFACE */}
        <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '12px' }}>
          Densidade do Layout
        </label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {[
            { id: 'comfortable', label: 'Confortável (Padrão)' },
            { id: 'compact', label: 'Compacto' },
            { id: 'expanded', label: 'Expandido' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => handleDensityChange(item.id)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: density === item.id ? '1px solid #00B4D8' : '1px solid rgba(255, 255, 255, 0.1)',
                background: density === item.id ? 'rgba(0, 180, 216, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: density === item.id ? '#00B4D8' : '#94A3B8',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 4. PRIVACIDADE E OCULTAÇÃO DE VALORES */}
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(2, 6, 23, 0.6)',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC', display: 'block' }}>
              Modo de Privacidade
            </span>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
              Oculta os saldos e valores numéricos da tela inicial por padrão (••••).
            </span>
          </div>

          <button
            onClick={handleToggleHideAmounts}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: hideAmounts ? '#10B981' : 'rgba(255, 255, 255, 0.1)',
              color: hideAmounts ? '#FFF' : '#94A3B8',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {hideAmounts ? 'ATIVADO (OCULTO)' : 'DESATIVADO'}
          </button>
        </div>
      </div>
    </div>
  );
}
