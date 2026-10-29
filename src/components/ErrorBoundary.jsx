import React from 'react';
import { getPreRestoreBackupKey } from '../services/storage.js';

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
    // Desktop state is owned by Electron's native persistence layer. Removing a
    // browser localStorage key would not safely reset that state.
    if (window.electronAPI?.isDesktop) {
      window.alert('A redefinição local pela tela de exceção não está disponível na versão desktop. Recarregue a aplicação ou use o fluxo de recuperação do aplicativo. Nenhum dado foi alterado.');
      return;
    }

    if (!window.confirm('Deseja redefinir o estado local para tentar recuperar a aplicação? Antes, uma cópia será criada e verificada.')) return;

    try {
      const storageKey = 'razao_app_state_v3';
      const backupKey = getPreRestoreBackupKey();
      const current = localStorage.getItem(storageKey);

      if (current !== null) {
        const snapshot = JSON.stringify({
          format: 'orazao-pre-restore-snapshot',
          createdAt: new Date().toISOString(),
          existed: true,
          raw: current
        });
        localStorage.setItem(backupKey, snapshot);

        // Confirm the exact backup can be read and parsed before touching the
        // active state. If this fails, leave the current state untouched.
        const storedSnapshot = localStorage.getItem(backupKey);
        const verified = storedSnapshot ? JSON.parse(storedSnapshot) : null;
        if (
          !verified ||
          verified.format !== 'orazao-pre-restore-snapshot' ||
          verified.existed !== true ||
          verified.raw !== current
        ) {
          throw new Error('Não foi possível verificar a cópia de segurança. O estado atual foi mantido.');
        }
      }

      localStorage.removeItem(storageKey);
      if (localStorage.getItem(storageKey) !== null) {
        throw new Error('Não foi possível redefinir o estado local. A cópia prévia foi preservada.');
      }
      window.location.reload();
    } catch (error) {
      console.error('Falha na redefinição segura do estado local:', error);
      window.alert(`${error?.message || 'Não foi possível redefinir o estado local.'} Nenhum novo dado será apagado por esta ação.`);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-recovery-screen">
          <section className="error-recovery-card" aria-labelledby="error-recovery-title">
            <div className="error-recovery-mark" aria-hidden="true">!</div>
            <span className="recovery-eyebrow">RECUPERAÇÃO DA INTERFACE</span>
            <h1 id="error-recovery-title">O Razão encontrou um problema</h1>
            <p>A interface encontrou um erro inesperado. Esta tela não permite confirmar a integridade de todos os dados. Evite redefinir o estado sem uma cópia verificada.</p>
            <details className="recovery-error-details">
              <summary>Detalhes técnicos do erro</summary>
              <pre>{this.state.error?.toString()}</pre>
              {this.state.errorInfo?.componentStack && <pre>{this.state.errorInfo.componentStack}</pre>}
            </details>
            <div className="error-recovery-actions">
              <button type="button" onClick={this.handleReload} className="button-primary">Recarregar aplicação</button>
              <button type="button" onClick={this.handleResetState} className="button-secondary">Tentar recuperação local</button>
            </div>
            <p className="error-recovery-footnote">A recuperação local cria e verifica uma cópia antes de qualquer redefinição. Se não conseguir confirmar a cópia, o estado atual será preservado.</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}