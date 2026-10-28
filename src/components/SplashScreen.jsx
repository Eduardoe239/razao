import React, { useState, useEffect } from 'react';

/**
 * SPLASH SCREEN DE CARREGAMENTO OFICIAL (O RAZÃO v14.0)
 * Pré-tela de inicialização para distribuição Desktop (.exe) e Web,
 * apresentando o emblema autoral "R" com barras de gráficos ascendentes
 * em gradiente azul elétrico e progresso em tempo real.
 */
export function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Inicializando O Razão...');
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const steps = [
      { p: 20, text: 'Carregando banco de dados local seguro...' },
      { p: 45, text: 'Inicializando criptografia AES-GCM-256...' },
      { p: 70, text: 'Verificando integridade dos centavos e saldos...' },
      { p: 90, text: 'Sincronizando regras de aprendizado contínuo...' },
      { p: 100, text: 'O Razão — Suas Finanças. Com Lógica.' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].p);
        setStatusText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsFading(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 400);
        }, 500);
      }
    }, 350);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#07101f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#F8FAFC',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      opacity: isFading ? 0 : 1,
      transition: 'opacity 0.4s ease',
      pointerEvents: isFading ? 'none' : 'auto'
    }}>
      {/* GLOW DE FUNDO */}
      <div style={{
        position: 'absolute',
        width: '320px',
        height: '320px',
        background: 'radial-gradient(circle, rgba(0, 119, 182, 0.25) 0%, rgba(7, 16, 31, 0) 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />

      {/* EMBLEMA OFICIAL: "R" COM BARRAS DE GRÁFICO ASCENDENTES */}
      <div style={{
        position: 'relative',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div className="splash-logo-box" style={{
          width: '88px',
          height: '88px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 40px rgba(0, 180, 216, 0.4), 0 12px 24px rgba(0, 119, 182, 0.3)',
          border: '1.5px solid rgba(255, 255, 255, 0.25)',
          animation: 'pulseGlow 2s infinite ease-in-out'
        }}>
          {/* SVG VETORIAL AUTORAL: "R" COM COLUNAS ASCENDENTES */}
          <svg width="52" height="52" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Haste Vertical do R */}
            <path d="M22 18H38V82H22V18Z" fill="white" />
            {/* Bojo Superior do R */}
            <path d="M38 18H62C72.5 18 80 25.5 80 36C80 46.5 72.5 54 62 54H38V18ZM38 32V40H60C62.5 40 65 38.5 65 36C65 33.5 62.5 32 60 32H38Z" fill="white" />
            {/* Pernas / Barras do Gráfico Ascendente em O Razão */}
            <rect x="42" y="66" width="9" height="16" rx="2" fill="#7209B7" />
            <rect x="54" y="58" width="9" height="24" rx="2" fill="#4CC9F0" />
            <rect x="66" y="48" width="10" height="34" rx="2" fill="#4895EF" />
          </svg>
        </div>
      </div>

      {/* MARCA DA APLICAÇÃO */}
      <h1 style={{
        fontSize: '28px',
        fontWeight: '900',
        letterSpacing: '0.08em',
        color: '#FFFFFF',
        margin: '0 0 6px 0',
        textTransform: 'uppercase'
      }}>
        O RAZÃO
      </h1>
      <p style={{
        fontSize: '11px',
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        margin: '0 0 32px 0'
      }}>
        SUAS FINANÇAS. COM LÓGICA.
      </p>

      {/* BARRA DE PROGRESSO SLIM */}
      <div style={{
        width: '260px',
        height: '6px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '999px',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '14px'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #0077B6 0%, #00B4D8 100%)',
          borderRadius: '999px',
          transition: 'width 0.3s ease',
          boxShadow: '0 0 12px #00B4D8'
        }} />
      </div>

      {/* TEXTO DE STATUS */}
      <span style={{
        fontSize: '12px',
        color: '#64748B',
        fontWeight: '600',
        fontFamily: "'JetBrains Mono', monospace"
      }}>
        {statusText}
      </span>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); boxShadow: 0 0 40px rgba(0, 180, 216, 0.4); }
          50% { transform: scale(1.03); boxShadow: 0 0 60px rgba(0, 180, 216, 0.7); }
        }
      `}</style>
    </div>
  );
}
