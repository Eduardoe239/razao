import React, { useEffect } from 'react';

const PALETTES = [
  { id: 'classic-blue', name: 'Azul institucional', description: 'Azul sereno, superfícies claras e contraste neutro.', swatches: ['#245b91', '#eaf1f8', '#f5f7fa'] },
  { id: 'slate', name: 'Azul ardósia', description: 'Uma paleta discreta, mais fria e de baixo contraste decorativo.', swatches: ['#50677f', '#edf1f5', '#f6f8fa'] },
  { id: 'forest', name: 'Verde sóbrio', description: 'Verde escuro e neutros claros, mantendo cores de status consistentes.', swatches: ['#356b58', '#eaf3ee', '#f5f8f6'] }
];

const DENSITIES = [
  { id: 'comfortable', label: 'Confortável', description: 'Mais espaço entre os elementos.' },
  { id: 'compact', label: 'Compacto', description: 'Mais informação na mesma área.' },
  { id: 'expanded', label: 'Amplo', description: 'Maior respiro para leitura.' }
];

function normalizeTheme(theme) {
  if (theme === 'executive-midnight' || theme === 'minimal-obsidian' || theme === 'slate') return 'slate';
  if (theme === 'emerald-gold' || theme === 'forest') return 'forest';
  return 'classic-blue';
}

export function PersonalizationPanel({ settings = {}, onSaveSettings }) {
  const currentTheme = normalizeTheme(settings.theme);
  const density = ['comfortable', 'compact', 'expanded'].includes(settings.density) ? settings.density : 'comfortable';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.accent = currentTheme;
    document.documentElement.dataset.density = density;
  }, [currentTheme, density]);

  const save = update => onSaveSettings?.({ ...settings, ...update });

  return (
    <div className="personalization-page">
      <section className="settings-panel">
        <div className="settings-panel-heading"><div><span className="profile-section-eyebrow">APARÊNCIA</span><h2>Personalize o Razão</h2><p>Ajuste a identidade visual sem efeitos luminosos ou distrações. As cores de receitas, despesas e alertas permanecem semânticas.</p></div></div>
        <div className="settings-section-heading"><h3>Paleta de cores</h3><p>Escolha uma das combinações sóbrias.</p></div>
        <div className="palette-grid" role="radiogroup" aria-label="Paleta de cores">
          {PALETTES.map(palette => (
            <button type="button" key={palette.id} role="radio" aria-checked={currentTheme === palette.id} className={`palette-choice${currentTheme === palette.id ? ' is-selected' : ''}`} onClick={() => save({ theme: palette.id })}>
              <span className="palette-preview" aria-hidden="true">{palette.swatches.map((color, index) => <span key={color} style={{ background: color, width: index === 0 ? '40%' : '30%' }} />)}</span>
              <span className="palette-choice-copy"><strong>{palette.name}</strong><small>{palette.description}</small></span>
              <span className="palette-radio" aria-hidden="true">{currentTheme === palette.id ? '✓' : ''}</span>
            </button>
          ))}
        </div>
        <div className="settings-divider" />
        <div className="settings-section-heading"><h3>Densidade da interface</h3><p>Escolha quanto espaço os componentes devem ocupar.</p></div>
        <div className="density-options" role="radiogroup" aria-label="Densidade da interface">
          {DENSITIES.map(option => <button type="button" key={option.id} role="radio" aria-checked={density === option.id} className={`density-option${density === option.id ? ' is-selected' : ''}`} onClick={() => save({ density: option.id })}><strong>{option.label}</strong><span>{option.description}</span></button>)}
        </div>
      </section>

      <section className="settings-panel settings-privacy-panel">
        <div className="settings-privacy-icon" aria-hidden="true">◉</div>
        <div className="settings-privacy-copy"><h3>Modo de privacidade visual</h3><p>Oculte saldos e valores pelo botão de olho na barra superior. Isso reduz a exposição visual, mas não criptografa nem bloqueia o acesso aos dados por si só.</p></div>
        <span className="settings-privacy-location">Barra superior</span>
      </section>
    </div>
  );
}
