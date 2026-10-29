import React from 'react';

/**
 * ABA SEGMENTADA OVAL (INSPIRADA NO PILL CONTROL DA REFERÊNCIA)
 */

export function SegmentedTabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="pill-tabs-container" role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`pill-tab ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function DateNavigator({ label, onPrev, onNext }) {
  return (
    <div className="date-navigator">
      <button className="date-nav-btn" onClick={onPrev} title="Período Anterior">
        ◀
      </button>
      <span className="date-nav-label">{label}</span>
      <button className="date-nav-btn" onClick={onNext} title="Próximo Período">
        ▶
      </button>
    </div>
  );
}
