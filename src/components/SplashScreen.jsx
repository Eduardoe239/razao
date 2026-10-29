import React, { useEffect, useState } from 'react';
import { RazaoLogo } from './RazaoLogo';

/** Tela de entrada breve; sem percentuais artificiais de carregamento. */
export function SplashScreen({ onComplete }) {
  const [isFading, setIsFading] = useState(false);
  const isDesktop = typeof window !== 'undefined' && Boolean(window.electronAPI);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setIsFading(true), 420);
    const completeTimer = window.setTimeout(() => onComplete?.(), 610);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash-screen${isFading ? ' is-fading' : ''}`} role="status" aria-live="polite" aria-label="Abrindo O Razão">
      <div className="splash-card">
        <RazaoLogo size="xl" showSubtitle={false} isDesktop={isDesktop} />
        <div className="splash-brand-copy"><strong>O Razão</strong><span>Suas finanças. Com lógica.</span></div>
        <div className="splash-loader"><span /></div>
        <p className="splash-status">Iniciando a interface</p>
        <p className="splash-preparing">Preparando os recursos da aplicação…</p>
        {!isDesktop && <p className="splash-storage-note">Seus dados ficam neste navegador. O armazenamento Web não oferece criptografia em repouso.</p>}
      </div>
    </div>
  );
}
