import React from 'react';

/** Fail-closed screen for recovery when authoritative local storage cannot be read. */
export function StartupRecoveryScreen({ error, backups = [], isDesktop = false, busyId = '', message = '', onRetry, onRestoreBackup, onImportBackup }) {
  const messageIsError = message.toLowerCase().includes('não foi possível') || message.toLowerCase().includes('falha') || message.toLowerCase().includes('recusado');

  return (
    <main className="startup-recovery-screen">
      <section className="startup-recovery-card" aria-labelledby="startup-recovery-title">
        <div className="recovery-heading-mark" aria-hidden="true">!</div>
        <span className="recovery-eyebrow">RECUPERAÇÃO SEGURA</span>
        <h1 id="startup-recovery-title">Os dados precisam ser recuperados</h1>
        <p className="recovery-lead">O Razão não conseguiu confirmar a leitura do armazenamento principal. Por segurança, a gravação automática foi bloqueada e nenhum estado vazio será salvo por cima dos dados existentes.</p>
        <details className="recovery-error-details">
          <summary>Detalhes técnicos do erro</summary>
          <pre>{error || 'Erro de leitura não especificado.'}</pre>
        </details>
        <button type="button" onClick={onRetry} disabled={Boolean(busyId)} className="button-primary recovery-retry-button">Tentar ler novamente</button>

        <div className="recovery-section-heading"><h2>Recuperar uma cópia validada</h2><p>Uma restauração substitui os dados ativos. O Razão tentará preservar o estado atual antes da troca; mantenha também uma cópia externa, quando disponível.</p></div>
        {backups.length > 0 ? (
          <div className="recovery-backup-list">
            {backups.map(backup => (
              <div className="recovery-backup-row" key={backup.id}>
                <div className="recovery-backup-copy">
                  <strong>{backup.label || backup.id}</strong>
                  <span>{backup.createdAt ? new Date(backup.createdAt).toLocaleString('pt-BR') : 'Data desconhecida'}{Number.isInteger(backup.accounts) ? ` · ${backup.accounts} contas` : ''}{Number.isInteger(backup.transactions) ? ` · ${backup.transactions} lançamentos` : ''}</span>
                  {backup.issue && <small className="recovery-backup-error">{backup.issue}</small>}
                </div>
                <button type="button" onClick={() => onRestoreBackup?.(backup)} disabled={Boolean(busyId) || backup.valid === false} className="button-secondary recovery-restore-button">{busyId === backup.id ? 'Restaurando…' : 'Validar e restaurar'}</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="recovery-no-backups">{isDesktop ? 'Nenhuma cópia desktop disponível foi identificada. Você ainda pode importar um backup JSON externo.' : 'Nenhuma cópia do histórico local foi encontrada ou o catálogo não pôde ser lido. O catálogo não será sobrescrito silenciosamente; você ainda pode importar um backup JSON externo.'}</p>
        )}
        <label className="recovery-import-label">Importar backup JSON externo
          <input type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onImportBackup?.(file); }} disabled={Boolean(busyId)} />
        </label>
        {message && <p role="status" aria-live="polite" className={`recovery-message${messageIsError ? ' is-error' : ''}`}>{message}</p>}
        <p className="recovery-footer-note">{isDesktop ? 'Modo desktop: a recuperação usa os arquivos protegidos do aplicativo. Não há fallback para localStorage.' : 'Modo navegador: os dados ficam neste navegador e não são criptografados em repouso.'} Não limpe os dados do aplicativo nem do navegador enquanto a recuperação estiver em andamento.</p>
      </section>
    </main>
  );
}
