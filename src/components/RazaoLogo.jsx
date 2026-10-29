import React from 'react';

/** Marca simplificada para uso consistente em áreas claras e compactas. */
export function RazaoLogoIcon({ size = 40, style = {}, className = '' }) {
  return (
    <div className={`razao-brand-mark ${className}`} style={{ width: size, height: size, ...style }} aria-hidden="true">
      <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 8h12.4c5.2 0 8.8 3.2 8.8 8 0 4.2-2.7 7.2-7 8l6.7 8h-7.3l-5.8-7.5H15V32H9V8Zm6 5v6.7h6.1c2 0 3.2-1.2 3.2-3.3 0-2.2-1.2-3.4-3.4-3.4H15Z" fill="currentColor"/>
        <path d="M5 32V25h4v7H5Zm6 0V21h4v11h-4Zm6 0V17h4v15h-4Z" fill="#6F98C2"/>
      </svg>
    </div>
  );
}

export function RazaoLogo({ size = 'md', showSubtitle = true, isDesktop = false }) {
  const iconSize = size === 'sm' ? 34 : size === 'lg' ? 52 : size === 'xl' ? 72 : 40;
  const titleSize = size === 'sm' ? 14 : size === 'lg' ? 21 : size === 'xl' ? 27 : 16;
  return (
    <div className={`razao-brand razao-brand-${size}`}>
      <RazaoLogoIcon size={iconSize} />
      <span className="razao-brand-text">
        <strong style={{ fontSize: titleSize }}>O Razão</strong>
        {showSubtitle && <small>Suas finanças. Com lógica.{isDesktop ? ' · Desktop' : ''}</small>}
      </span>
    </div>
  );
}
