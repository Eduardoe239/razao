import React, { useEffect, useState } from 'react';
import { auditLedger } from '../domain/ledger.js';
import { createBackup, parseBackupText, serializeHistoricalBackup, validateHistoricalBackupState } from '../domain/backup.js';
import { listLocalBackupHistory, loadLocalBackup, recordLocalBackup } from '../services/backupHistory.js';

/**
 * PAINEL DE DIAGNÓSTICO E SAÚDE DO SISTEMA PARA BETA-TESTERS (.EXE / WEB)
 */
export function DiagnosticModal({ isOpen, onClose, state, onRestoreBackup }) {
  const [testResults, setTestResults] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupHistory, setBackupHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isExportingHistoryId, setIsExportingHistoryId] = useState(null);

  const isDesktop = typeof window !== 'undefined' && window.electronAPI?.isDesktop;

  const refreshBackupHistory = async () => {
    setIsLoadingHistory(true);
    try {
      if (isDesktop && typeof window.electronAPI?.listRecoveryBackups === 'function') {
        setBackupHistory(await window.electronAPI.listRecoveryBackups());
      } else if (!isDesktop) {
        setBackupHistory(listLocalBackupHistory());
      } else {
        setBackupHistory([]);
      }
    } catch (error) {
      setBackupMessage(`Não foi possível listar os backups: ${error?.message || 'erro desconhecido'}`);
      setBackupHistory([]);
    } finally { setIsLoadingHistory(false); }
  };

  useEffect(() => { if (isOpen) refreshBackupHistory(); }, [isOpen, isDesktop]);

  if (!isOpen) return null;

  const handleRunDiagnostics = () => {
    setIsRunningTests(true);
    try {
      const transactions = Array.isArray(state?.transactions) ? state.transactions : [];
      const accounts = Array.isArray(state?.accounts) ? state.accounts : [];
      const cards = Array.isArray(state?.cards) ? state.cards : [];
      const budgets = state?.budgets && typeof state.budgets === 'object' ? state.budgets : {};
      const ledgerAudit = auditLedger(accounts, transactions, { virtualAccountIds: cards.map(card => card?.id).filter(Boolean) });
      const invalidAmounts = transactions.filter(tx =>
        tx?.status !== 'cancelado' && (!Number.isSafeInteger(tx?.amountCents) || tx.amountCents <= 0)
      );
      const duplicateIds = transactions.length - new Set(transactions.map(tx => tx?.id).filter(Boolean)).size;
      const desktopStorageAvailable = !isDesktop || Boolean(
        window.electronAPI?.loadState && window.electronAPI?.saveState
      );
      const checks = [
        {
          name: 'Integridade do livro-razão',
          passed: ledgerAudit.valid,
          detail: ledgerAudit.valid
            ? `${ledgerAudit.checkedTransactions} lançamentos e ${ledgerAudit.checkedAccounts} contas verificados`
            : `${ledgerAudit.issues.length} problema(s) encontrado(s)`
        },
        {
          name: 'Valores em centavos inteiros',
          passed: invalidAmounts.length === 0,
          detail: invalidAmounts.length === 0 ? 'Nenhum valor inválido encontrado' : `${invalidAmounts.length} lançamento(s) com valor inválido`
        },
        {
          name: 'Identificadores únicos',
          passed: duplicateIds === 0,
          detail: duplicateIds === 0 ? 'Nenhum identificador duplicado' : `${duplicateIds} ocorrência(s) duplicada(s)`
        },
        {
          name: 'API de persistência desktop',
          passed: desktopStorageAvailable,
          detail: isDesktop ? (desktopStorageAvailable ? 'Métodos de leitura e gravação expostos' : 'API de persistência incompleta') : 'Não aplicável no navegador'
        },
        {
          name: 'Persistência real dos dados',
          passed: null,
          detail: 'O diagnóstico local não executa um ciclo real de gravação e restauração'
        }
      ];
      const failedChecks = checks.filter(check => check.passed === false).length;
      setTestResults({
        status: failedChecks ? 'ATTENTION' : 'CHECKED',
        timestamp: new Date().toISOString(),
        environment: isDesktop ? `Desktop (${window.electronAPI.platform || 'plataforma desconhecida'})` : 'Navegador',
        schemaVersion: state?.version || state?.schemaVersion || 4,
        metrics: {
          totalTransactions: transactions.length,
          totalAccounts: accounts.length,
          totalCards: cards.length,
          totalBudgets: Object.keys(budgets).length
        },
        checks,
        ledgerIssues: ledgerAudit.issues.slice(0, 20),
        totalLedgerIssues: ledgerAudit.issues.length
      });
    } catch (error) {
      setTestResults({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        environment: isDesktop ? 'Desktop' : 'Navegador',
        schemaVersion: state?.version || state?.schemaVersion || 4,
        metrics: { totalTransactions: 0, totalAccounts: 0, totalCards: 0, totalBudgets: 0 },
        checks: [{ name: 'Execução do diagnóstico', passed: false, detail: error?.message || 'Falha desconhecida' }],
        ledgerIssues: [],
        totalLedgerIssues: 0
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const backup = createBackup({ ...state, schemaVersion: state?.schemaVersion || 4, userProfile: state?.userProfile });
      const dataStr = JSON.stringify(backup, null, 2);
      let historyWarning = '';
      if (!isDesktop) {
        const historyResult = recordLocalBackup(state, 'Backup exportado pelo painel de diagnóstico');
        if (historyResult.saved) setBackupHistory(listLocalBackupHistory());
        else historyWarning = ` O arquivo externo pode ser exportado, mas não foi adicionado ao histórico local: ${historyResult.reason || 'falha ao gravar o catálogo'}`;
      }
      if (isDesktop && window.electronAPI?.saveFileDialog) {
        const result = await window.electronAPI.saveFileDialog({ defaultName: `razao-backup-${new Date().toISOString().slice(0, 10)}.json`, content: dataStr });
        if (!result) { setBackupMessage('Exportação cancelada; nenhum arquivo foi salvo.'); return; }
        setBackupMessage('Backup exportado. Guarde-o em um local seguro.');
      } else {
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `razao-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setBackupMessage(`Arquivo de backup preparado para download. Confirme que o navegador o salvou.${historyWarning}`);
      }
    } catch (error) {
      setBackupMessage(`Não foi possível exportar o backup: ${error?.message || 'erro desconhecido'}`);
    }
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBackupMessage('');
    setIsRestoring(true);
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('O arquivo excede o limite de 25 MB.');
      const parsed = parseBackupText(await file.text());
      if (!parsed.valid) throw new Error(parsed.issues.join(' '));
      const { accounts, transactions, cards, auditEvents } = parsed.summary;
      const summary = `Backup de ${new Date(parsed.summary.createdAt).toLocaleString('pt-BR')}.\n\nContas: ${accounts}\nLançamentos: ${transactions}\nCartões: ${cards}\nEventos de auditoria: ${auditEvents}\n\nA restauração substituirá os dados financeiros atuais. Exporte um backup atual antes de continuar. Deseja restaurar?`;
      if (!window.confirm(summary)) {
        setBackupMessage('Restauração cancelada; os dados atuais foram mantidos.');
        return;
      }
      const restoreResult = await onRestoreBackup?.(parsed.state);
      setBackupMessage(restoreResult?.recoverySnapshotUpdated === false
        ? 'Backup aplicado, mas a cópia do último estado confirmado não pôde ser atualizada. Exporte um backup externo antes de continuar.'
        : 'Backup validado e aplicado. Os dados anteriores foram preservados em uma cópia de recuperação quando havia estado salvo. Confira os dados no painel.');
    } catch (error) {
      setBackupMessage(`Não foi possível aplicar o backup: ${error?.message || 'arquivo inválido ou falha de gravação'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportHistoricalBackup = async (backup) => {
    if (!backup?.valid || isRestoring || isExportingHistoryId) return;
    setIsExportingHistoryId(backup.id);
    setBackupMessage('');
    try {
      let loaded;
      if (isDesktop) {
        if (typeof window.electronAPI?.loadRecoveryBackup !== 'function') {
          throw new Error('Esta versão do desktop não oferece leitura de backups históricos.');
        }
        loaded = await window.electronAPI.loadRecoveryBackup(backup.id);
      } else {
        loaded = loadLocalBackup(backup.id);
      }
      const content = serializeHistoricalBackup(loaded?.state, loaded?.createdAt);
      const datePart = (loaded?.createdAt && !Number.isNaN(Date.parse(loaded.createdAt))
        ? new Date(loaded.createdAt)
        : new Date()).toISOString().slice(0, 10);
      const defaultName = `razao-backup-historico-${datePart}.json`;
      if (isDesktop) {
        if (typeof window.electronAPI?.saveFileDialog !== 'function') {
          throw new Error('Esta versão do desktop não oferece exportação de arquivos.');
        }
        const result = await window.electronAPI.saveFileDialog({ defaultName, content });
        if (!result) {
          setBackupMessage('Exportação da cópia histórica cancelada; nenhum arquivo foi salvo.');
          return;
        }
        setBackupMessage('Cópia histórica exportada. Guarde o arquivo em um local seguro.');
      } else {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = defaultName;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setBackupMessage('Cópia histórica preparada para download. Confirme que o navegador salvou o arquivo.');
      }
    } catch (error) {
      setBackupMessage(`Não foi possível exportar a cópia histórica: ${error?.message || 'erro desconhecido'}`);
    } finally {
      setIsExportingHistoryId(null);
    }
  };

  const handleRestoreHistoricalBackup = async (backup) => {
    if (!backup?.valid) { setBackupMessage(`Este backup não pode ser restaurado: ${backup?.issue || 'falha de validação'}`); return; }
    if (isRestoring) return;
    setIsRestoring(true);
    setBackupMessage('');
    try {
      let loaded;
      if (isDesktop) {
        if (typeof window.electronAPI?.loadRecoveryBackup !== 'function') throw new Error('Esta versão do desktop não oferece leitura de backups históricos.');
        loaded = await window.electronAPI.loadRecoveryBackup(backup.id);
      } else {
        loaded = loadLocalBackup(backup.id);
      }
      // IPC/arquivos locais são fronteiras de confiança: valide também o conteúdo
      // financeiro, não apenas a existência de arrays de contas e lançamentos.
      const validated = validateHistoricalBackupState(loaded?.state, loaded?.createdAt);
      if (!validated.valid) throw new Error(`A cópia histórica não passou na validação: ${validated.issues.join(' ')}`);
      loaded = { ...loaded, state: validated.state, summary: validated.summary };
      const dateText = loaded.createdAt ? new Date(loaded.createdAt).toLocaleString('pt-BR') : 'data desconhecida';
      const confirmed = window.confirm(`Restaurar a cópia de ${dateText}?\n\nContas: ${loaded.accounts ?? loaded.summary?.accounts ?? 0}\nLançamentos: ${loaded.transactions ?? loaded.summary?.transactions ?? 0}\n\nOs dados atuais serão preservados em uma nova cópia de recuperação antes da troca.`);
      if (!confirmed) { setBackupMessage('Restauração cancelada; os dados atuais foram mantidos.'); return; }
      const restoreResult = await onRestoreBackup?.(loaded.state);
      setBackupMessage(restoreResult?.recoverySnapshotUpdated === false
        ? 'Backup histórico restaurado, mas a cópia do último estado confirmado não pôde ser atualizada. Exporte um backup externo antes de continuar.'
        : 'Backup histórico restaurado com sucesso.');
      await refreshBackupHistory();
    } catch (error) {
      setBackupMessage(`Falha ao restaurar backup histórico: ${error?.message || 'erro desconhecido'}`);
    } finally { setIsRestoring(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <div>
              <h3 className="modal-title">Diagnóstico de Saúde & Beta-Tester</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Verificação de integridade para distribuição em grupo fechado (.exe / Web)
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Ambiente Atual:</span>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--brand-accent)' }}>
                {isDesktop ? `🖥️ Desktop Windows/Executável (.exe)` : '🌐 Web Browser (SPA)'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Versão do Schema:</span>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-income)' }}>
                v{state?.version || state?.schemaVersion || 4}.0
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              className="btn-primary"
              onClick={handleRunDiagnostics}
              disabled={isRunningTests}
              style={{ flex: 1, padding: '12px', fontSize: '13px' }}
            >
              {isRunningTests ? 'Executando Testes...' : '⚡ Executar Bateria de Testes'}
            </button>

            <button
              onClick={handleExportBackup}
              style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              💾 Exportar Backup (.json)
            </button>
            <label style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '13px', cursor: isRestoring ? 'wait' : 'pointer', textAlign: 'center' }}>
              {isRestoring ? 'Validando...' : '↩️ Restaurar Backup'}
              <input type="file" accept="application/json,.json" onChange={handleImportBackup} disabled={isRestoring} style={{ display: 'none' }} />
            </label>
          </div>

          {backupMessage && <p role="status" style={{ margin: '-8px 0 16px', fontSize: '12px', color: backupMessage.startsWith('Backup rejeitado') || backupMessage.startsWith('Backup aplicado, mas') || backupMessage.startsWith('Backup histórico restaurado, mas') || backupMessage.startsWith('Não foi') || backupMessage.startsWith('Falha') ? '#d97706' : 'var(--text-secondary)' }}>{backupMessage}</p>}

          <section style={{ border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '16px' }} aria-label="Gerenciador de backups">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Gerenciador de backups</h4>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{isDesktop ? 'Último estado salvo confirmado e cópias pré-restauração criptografadas no dispositivo' : 'Até cinco cópias locais recentes; também exporte arquivos JSON externos'}</p>
              </div>
              <button onClick={refreshBackupHistory} disabled={isLoadingHistory || isRestoring} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-card)', background: 'var(--surface-subtle)', color: 'var(--text-primary)', cursor: 'pointer' }}>{isLoadingHistory ? 'Atualizando…' : 'Atualizar'}</button>
            </div>
            {backupHistory.length === 0 ? <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '10px 0 2px' }}>{isLoadingHistory ? 'Carregando cópias…' : 'Nenhuma cópia histórica disponível neste dispositivo ainda.'}</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {backupHistory.map(item => <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', borderTop: '1px solid var(--border-card)', paddingTop: '9px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.label || (item.valid ? 'Cópia de recuperação' : 'Backup inválido')}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : 'Data indisponível'} · {item.accounts ?? 0} contas · {item.transactions ?? 0} lançamentos · {Math.max(1, Math.round((item.sizeBytes || 0) / 1024))} KB</p>
                  {!item.valid && <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#d97706' }}>{item.issue || 'Validação falhou'}</p>}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button disabled={!item.valid || isRestoring || Boolean(isExportingHistoryId)} onClick={() => handleExportHistoricalBackup(item)} aria-label={`Exportar ${item.label || 'backup histórico'}`} style={{ padding: '8px 9px', borderRadius: '8px', border: '1px solid var(--border-card)', background: 'var(--surface-subtle)', color: 'var(--text-primary)', cursor: item.valid && !isRestoring && !isExportingHistoryId ? 'pointer' : 'not-allowed', opacity: item.valid ? 1 : .5 }}>{isExportingHistoryId === item.id ? 'Exportando…' : 'Exportar'}</button>
                  <button disabled={!item.valid || isRestoring || Boolean(isExportingHistoryId)} onClick={() => handleRestoreHistoricalBackup(item)} aria-label={`Restaurar ${item.label || 'backup histórico'}`} style={{ padding: '8px 9px', borderRadius: '8px', border: '1px solid var(--border-card)', background: 'var(--surface-subtle)', color: 'var(--text-primary)', cursor: item.valid && !isRestoring && !isExportingHistoryId ? 'pointer' : 'not-allowed', opacity: item.valid ? 1 : .5 }}>Restaurar</button>
                </div>
              </div>)}
            </div>}
          </section>

          {testResults && (
            <div style={{
              background: 'var(--surface-subtle)',
              border: `1px solid ${testResults.status === 'ATTENTION' || testResults.status === 'ERROR' ? '#f59e0b' : 'var(--border-card)'}`, 
              borderRadius: 'var(--radius-md)',
              padding: '16px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', color: testResults.status === 'ATTENTION' || testResults.status === 'ERROR' ? '#d97706' : 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{testResults.status === 'ATTENTION' || testResults.status === 'ERROR' ? '!' : 'i'}</span> {testResults.status === 'ATTENTION' ? 'Diagnóstico concluído: requer atenção' : testResults.status === 'ERROR' ? 'Não foi possível concluir o diagnóstico' : 'Diagnóstico local concluído'}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {testResults.checks.map((check, idx) => (
                  <div key={idx} style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: 'minmax(120px, 0.8fr) minmax(0, 1.2fr)', gap: '8px', borderBottom: '1px solid var(--border-card)', paddingBottom: '6px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{check.passed === true ? '✓' : check.passed === false ? '⚠' : '—'} {check.name}:</span>
                    <span style={{ color: check.passed === false ? '#d97706' : 'var(--text-muted)' }}>{check.detail}</span>
                  </div>
                ))}
                {testResults.totalLedgerIssues > 0 && <div style={{ marginTop: '12px' }}><strong style={{ fontSize: '12px' }}>Problemas de consistência ({testResults.totalLedgerIssues})</strong><ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-muted)' }}>{testResults.ledgerIssues.map((issue, idx) => <li key={`${issue.transactionId}-${idx}`}>{issue.transactionId ? `${issue.transactionId}: ` : ''}{issue.reason}</li>)}</ul>{testResults.totalLedgerIssues > testResults.ledgerIssues.length && <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Exibindo os primeiros 20 problemas.</p>}</div>}
              </div>
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={onClose} style={{ background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }}>
          Fechar Painel
        </button>
      </div>
    </div>
  );
}
