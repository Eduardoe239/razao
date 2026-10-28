import React from 'react';

/**
 * RECOVERABLE ERROR BOUNDARY FOR DESKTOP (.EXE) & WEB
 * Evita que o aplicativo trave em uma tela branca em caso de exceção na UI.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL UI ERROR CAUGHT BY BOUNDARY:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    if (window.confirm('Deseja redefinir o estado local para tentar recuperar a aplicação? Um backup será mantido.')) {
      try {
        const current = localStorage.getItem('razao_app_state_v3');
        if (current) {
          localStorage.setItem('razao_app_state_v3_backup_emergency', current);
        }
        localStorage.removeItem('razao_app_state_v3');
      } catch (e) {
        console.error(e);
      }
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#07101f',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          textAlign: 'center'
        }}>
          <div style={{
            background: '#151D2A',
            border: '1px solid #EF4444',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '520px',
            boxShadow: '0 20px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚨</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#EF4444', marginBottom: '12px' }}>
              O Razão — Recuperação de Exceção
            </h2>
            <p style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '20px', lineHeight: '1.6' }}>
              Identificamos uma oscilação temporária na renderização da interface. Seus dados financeiros permanecem 100% seguros e gravados.
            </p>

            <div style={{
              background: '#0B0F19',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #26334D',
              fontSize: '11px',
              color: '#FCA5A5',
              fontFamily: 'monospace',
              marginBottom: '24px',
              textAlign: 'left',
              maxHeight: '100px',
              overflowY: 'auto'
            }}>
              {this.state.error?.toString()}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                  color: '#FFF',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                🔄 Recarregar Aplicação
              </button>

              <button
                onClick={this.handleResetState}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: 'transparent',
                  color: '#94A3B8',
                  border: '1px solid #26334D',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                🛠️ Restaurar Padrões
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
