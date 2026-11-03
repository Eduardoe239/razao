import React, { useEffect, useState } from 'react';
import { parseOFXDetailed, parseCSVDetailed, toLegacyImportRow } from '../domain/importers';
import { parseReceiptText } from '../domain/receiptOcr';
import { reconcileTransactions } from '../domain/reconciliation';
import { uid } from '../domain/uid';
import { apiClient } from '../services/apiClient';

const BANKS_LIST = [
  { id: 'nubank', name: 'Nubank', icon: '🟣', bg: 'rgba(130, 10, 209, 0.15)', border: '#820AD1' },
  { id: 'itau', name: 'Itaú Unibanco', icon: '🟠', bg: 'rgba(236, 112, 0, 0.15)', border: '#EC7000' },
  { id: 'bradesco', name: 'Bradesco', icon: '🔴', bg: 'rgba(204, 9, 47, 0.15)', border: '#CC092F' },
  { id: 'bb', name: 'Banco do Brasil', icon: '🟡', bg: 'rgba(255, 205, 0, 0.15)', border: '#FFCD00' },
  { id: 'santander', name: 'Santander', icon: '🔴', bg: 'rgba(236, 0, 0, 0.15)', border: '#EC0000' },
  { id: 'inter', name: 'Banco Inter', icon: '🟢', bg: 'rgba(255, 122, 0, 0.15)', border: '#FF7A00' },
  { id: 'c6', name: 'C6 Bank', icon: '⬛', bg: 'rgba(36, 36, 36, 0.3)', border: '#888' }
];

export function ImportReconciliationModal({
  isOpen,
  onClose,
  existingTransactions = [],
  accounts = [],
  categories = [],
  profileType = 'PF',
  formatCurrency,
  onImportConfirmed
}) {
  const [importType, setImportType] = useState('open_finance'); // open_finance, ofx, csv, ocr
  const [selectedBank, setSelectedBank] = useState(BANKS_LIST[0]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [rawText, setRawText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || 'acc-1');
  const [parsedItems, setParsedItems] = useState([]);
  const [step, setStep] = useState('input'); // input -> review
  // Resultado detalhado do parser CSV/OFX: registros válidos, rejeitados e avisos.
  const [importReport, setImportReport] = useState(null);
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    if (accounts.some(account => account?.id === selectedAccountId)) return;
    setSelectedAccountId(accounts.find(account => account?.id)?.id || '');
  }, [accounts, selectedAccountId]);

  if (!isOpen) return null;

  // Fluxo demonstrativo com dados sintéticos; ainda não conecta a uma instituição real.
  const handleOpenFinanceConnect = async () => {
    setIsConnecting(true);
    try {
      // 1. Gera sessão de conexão com o banco regulado
      const session = await apiClient.startOpenFinanceSession('user-active-1', selectedBank.name);

      // 2. Simula captura do extrato e faturas via Webhook/API
      const today = new Date().toISOString().slice(0, 10);
      const mockBankFeed = [
        { amount: -185.50, description: `Pix Enviado - Mercado ${selectedBank.name}`, date: today, fitid: `of-${session.sessionId}-1` },
        { amount: 3500.00, description: `Salário / Proventos ${selectedBank.name}`, date: today, fitid: `of-${session.sessionId}-2` },
        { amount: -42.90, description: `Assinatura Streaming ${selectedBank.name}`, date: today, fitid: `of-${session.sessionId}-3` }
      ];

      const bankPayload = await apiClient.syncBankPayload(session.sessionId, mockBankFeed);
      
      if (bankPayload.success && bankPayload.transactions) {
        const extracted = bankPayload.transactions.map(t => ({
          description: t.description,
          amountCents: t.amountCents,
          type: t.type,
          date: t.date,
          status: 'pago',
          importedId: t.fitid,
          source: 'open_finance_demo'
        }));

        const reconciled = reconcileTransactions(extracted, existingTransactions, { accountId: selectedAccountId, profileType });
        // Dados sintéticos nunca devem vir pré-selecionados para importação financeira.
        setParsedItems(reconciled.map(item => ({ ...item, selected: false })));
        setStep('review');
      }
    } catch (err) {
      alert(`Não foi possível gerar a demonstração: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleProcessManual = () => {
    let extracted = [];
    let report = null;
    setInputError('');
    if (importType === 'ofx' || importType === 'csv') {
      const detailed = importType === 'ofx' ? parseOFXDetailed(rawText) : parseCSVDetailed(rawText);
      if (detailed.fatal) {
        setInputError(detailed.fatal.message);
        return;
      }
      extracted = detailed.rows.map(toLegacyImportRow);
      report = { stats: detailed.stats, rejected: detailed.rejected, warnings: detailed.warnings };
      if (extracted.length === 0 && detailed.rejected.length === 0) {
        setInputError(detailed.warnings[0]?.message || 'Nenhum lançamento foi identificado no conteúdo fornecido.');
        return;
      }
    } else if (importType === 'ocr') {
      const single = parseReceiptText(rawText);
      if (single && single.amountCents > 0) {
        extracted = [single];
      }
    }

    if (extracted.length === 0 && !report) {
      setInputError('Nenhum lançamento válido foi identificado no conteúdo fornecido.');
      return;
    }

    const importedWithSource = extracted.map(item => ({ ...item, source: importType }));
    const reconciled = reconcileTransactions(importedWithSource, existingTransactions, { accountId: selectedAccountId, profileType });
    setParsedItems(reconciled.map(item => ({ ...item, selected: item.reconciliationStatus === 'unique' || item.reconciliationStatus === 'match_pending' })));
    setImportReport(report);
    setStep('review');
  };

  const handleConfirmImport = () => {
    if (!accounts.some(account => account?.id === selectedAccountId)) {
      alert('Selecione uma conta de destino válida antes de confirmar a conciliação.');
      return;
    }

    const selected = parsedItems.filter(item => item.selected && !['duplicate', 'invalid'].includes(item.reconciliationStatus));
    if (selected.length === 0) {
      alert('Nenhuma decisão selecionada para aplicar. Itens duplicados ou inválidos não podem ser importados.');
      return;
    }

    onImportConfirmed(selected, selectedAccountId, categories[0]?.id || '');
    setStep('input');
    setRawText('');
    setParsedItems([]);
    setImportReport(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🏛️</span>
            <div>
              <h3 className="modal-title">Importador & Conciliação</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Demonstração local — sem conexão bancária real
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {step === 'input' ? (
          <div>
            {/* Seleção do Tipo de Conexão */}
            <div className="pill-tabs-container" style={{ marginBottom: '16px' }}>
              <button className={`pill-tab ${importType === 'open_finance' ? 'active' : ''}`} onClick={() => { setImportType('open_finance'); setInputError(''); }}>
                🧪 Demonstração bancária
              </button>
              <button className={`pill-tab ${importType === 'ofx' ? 'active' : ''}`} onClick={() => { setImportType('ofx'); setInputError(''); }}>
                📄 Extrato .OFX
              </button>
              <button className={`pill-tab ${importType === 'csv' ? 'active' : ''}`} onClick={() => { setImportType('csv'); setInputError(''); }}>
                Planilha .CSV
              </button>
              <button className={`pill-tab ${importType === 'ocr' ? 'active' : ''}`} onClick={() => { setImportType('ocr'); setInputError(''); }}>
                🧾 Comprovante Pix
              </button>
            </div>

            {/* ABA demonstrativa: valores sintéticos; não é conexão bancária real */}
            {importType === 'open_finance' && (
              <div>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '20px' }}>🔒</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--color-pending)', display: 'block' }}>DEMONSTRAÇÃO — NÃO É UMA CONEXÃO BANCÁRIA</strong>
                    Esta tela gera movimentações fictícias para testar revisão e conciliação. Não autentica em bancos, não consulta contas reais e não usa uma conexão Pluggy. Por segurança, os lançamentos demonstrativos começam desmarcados e só serão aplicados se você os selecionar manualmente.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Selecione a Instituição Financeira</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '8px' }}>
                    {BANKS_LIST.map(bank => {
                      const isSelected = selectedBank.id === bank.id;
                      return (
                        <button
                          type="button"
                          key={bank.id}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedBank(bank)}
                          style={{
                            padding: '10px',
                            borderRadius: 'var(--radius-md)',
                            background: isSelected ? bank.bg : 'var(--surface-subtle)',
                            border: `2px solid ${isSelected ? bank.border : 'var(--border-card)'}`,
                            cursor: 'pointer',
                            textAlign: 'left',
                            font: 'inherit',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ fontSize: '20px' }}>{bank.icon}</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>{bank.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Vincular à Conta de Destino</label>
                  <select className="form-select" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn-primary"
                  onClick={handleOpenFinanceConnect}
                  disabled={isConnecting}
                  style={{ marginTop: '12px', background: 'var(--brand-gradient)' }}
                >
                  {isConnecting ? 'Preparando dados de demonstração...' : `Simular importação de ${selectedBank.name}`}
                </button>
              </div>
            )}

            {/* ABAS MANUAIS: OFX, CSV, OCR */}
            {importType !== 'open_finance' && (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Cole o conteúdo de um arquivo ou comprovante para análise local. Confira as sugestões antes de aplicar alterações ao histórico.
                </p>

                <div className="form-group">
                  <label className="form-label">Conta de Destino</label>
                  <select className="form-select" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Conteúdo do Arquivo / Comprovante</label>
                  <textarea
                    className="form-input"
                    rows={7}
                    placeholder={
                      importType === 'ofx'
                        ? 'Cole aqui o texto contido no seu arquivo .ofx...'
                        : importType === 'csv'
                        ? 'Cole as linhas da sua planilha CSV (ex: Data;Descrição;Valor)...'
                        : 'Cole o texto do comprovante de pagamento Pix ou nota fiscal...'
                    }
                    value={rawText}
                    onChange={(e) => { setRawText(e.target.value); setInputError(''); }}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                  />
                </div>

                {inputError && (
                  <div role="alert" style={{ padding: '10px 12px', marginBottom: '12px', borderRadius: 'var(--radius-md)', background: 'var(--color-expense-bg)', border: '1px solid var(--color-expense-border)', color: 'var(--color-expense)', fontSize: '12px', fontWeight: 600 }}>
                    {inputError}
                  </div>
                )}

                <button className="btn-primary" onClick={handleProcessManual} disabled={!rawText.trim()}>
                  Analisar & Reconciliar Lançamentos
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span role="status" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {importReport
                  ? `${importReport.stats.valid} de ${importReport.stats.dataRecords} registro(s) válido(s)${importReport.stats.rejected > 0 ? ` · ${importReport.stats.rejected} rejeitado(s)` : ''}`
                  : `${parsedItems.length} Lançamento(s) Encontrado(s)`}
              </span>
              <button
                onClick={() => { setStep('input'); setImportReport(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                ← Voltar
              </button>
            </div>

            {importReport?.warnings?.length > 0 && (
              <div role="status" aria-label="Avisos sobre o arquivo" style={{ padding: '10px 12px', marginBottom: '12px', borderRadius: 'var(--radius-md)', background: 'var(--color-pending-bg)', border: '1px solid var(--color-pending-border)' }}>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--color-pending)', marginBottom: '4px' }}>Atenção antes de importar</strong>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  {importReport.warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', marginBottom: '20px' }}>
              {parsedItems.length === 0 && (
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Nenhum registro válido para importar. Confira os motivos abaixo.</p>
              )}
              {parsedItems.map((item, idx) => {
                const isDup = item.reconciliationStatus === 'duplicate';
                const isPending = item.reconciliationStatus === 'match_pending';
                const isReview = item.reconciliationStatus === 'review';
                const isInvalid = item.reconciliationStatus === 'invalid';

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-subtle)',
                      border: `1px solid ${isDup || isInvalid ? 'var(--color-expense-border)' : isReview ? 'var(--color-pending-border)' : 'var(--border-card)'}`, 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected}
                      disabled={isDup || isInvalid}
                      onChange={(e) => setParsedItems(previous => previous.map((row, rowIndex) => rowIndex === idx ? { ...row, selected: e.target.checked } : row))}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.description}</span>
                        <span className="font-mono-tabular" style={{ fontSize: '13px', fontWeight: '800', color: item.type === 'despesa' ? 'var(--color-expense)' : 'var(--color-income)', whiteSpace: 'nowrap' }}>
                          {item.type === 'despesa' ? 'Saída −' : 'Entrada +'} {formatCurrency(item.amountCents)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.date} • {(item.source || 'OPEN_FINANCE').toUpperCase()}</span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-pill)',
                          background: isDup || isInvalid ? 'var(--color-expense-bg)' : isPending || isReview ? 'var(--color-pending-bg)' : 'var(--color-income-bg)',
                          color: isDup || isInvalid ? 'var(--color-expense)' : isPending || isReview ? 'var(--color-pending)' : 'var(--color-income)'
                        }}>
                          {isDup ? 'ID duplicado — ignorar' : isInvalid ? 'Dados inválidos' : isPending ? 'Baixa pendência' : isReview ? (item.reviewKind === 'possible_duplicate' ? 'Possível duplicata' : 'Revisão manual') : 'Novo'}
                        </span>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '11px', lineHeight: 1.4, color: 'var(--text-muted)' }}>{item.reason}{item.confidence > 0 ? ` · Confiança estimada: ${item.confidence}%` : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {importReport?.rejected?.length > 0 && (
              <section aria-label="Registros rejeitados" style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 800, color: 'var(--color-expense)' }}>
                  {importReport.rejected.length} registro(s) rejeitado(s) — não serão importados
                </h4>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {importReport.rejected.map((item, idx) => (
                    <li key={`${item.line}-${idx}`} style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--color-expense-bg)', border: '1px solid var(--color-expense-border)', fontSize: '11px', lineHeight: 1.4 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {item.endLine > item.line ? `Linhas ${item.line}–${item.endLine}` : `Linha ${item.line}`}:
                      </strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{item.reason}</span>
                      <code style={{ display: 'block', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{item.excerpt}</code>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <button className="btn-primary" onClick={handleConfirmImport} disabled={parsedItems.length === 0}>
              Confirmar {parsedItems.filter(i => i.selected).length} decisão(ões) de conciliação
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
