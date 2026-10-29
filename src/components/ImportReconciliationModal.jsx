import React, { useEffect, useState } from 'react';
import { parseOFX, parseCSV } from '../domain/importers';
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
    if (importType === 'ofx') {
      extracted = parseOFX(rawText);
    } else if (importType === 'csv') {
      extracted = parseCSV(rawText);
    } else if (importType === 'ocr') {
      const single = parseReceiptText(rawText);
      if (single && single.amountCents > 0) {
        extracted = [single];
      }
    }

    if (extracted.length === 0) {
      alert('Nenhum lançamento válido foi identificado no conteúdo fornecido.');
      return;
    }

    const importedWithSource = extracted.map(item => ({ ...item, source: importType }));
    const reconciled = reconcileTransactions(importedWithSource, existingTransactions, { accountId: selectedAccountId, profileType });
    setParsedItems(reconciled.map(item => ({ ...item, selected: item.reconciliationStatus === 'unique' || item.reconciliationStatus === 'match_pending' })));
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
              <button className={`pill-tab ${importType === 'open_finance' ? 'active' : ''}`} onClick={() => setImportType('open_finance')}>
                🧪 Demonstração bancária
              </button>
              <button className={`pill-tab ${importType === 'ofx' ? 'active' : ''}`} onClick={() => setImportType('ofx')}>
                📄 Extrato .OFX
              </button>
              <button className={`pill-tab ${importType === 'csv' ? 'active' : ''}`} onClick={() => setImportType('csv')}>
                Planilha .CSV
              </button>
              <button className={`pill-tab ${importType === 'ocr' ? 'active' : ''}`} onClick={() => setImportType('ocr')}>
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
                    onChange={(e) => setRawText(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                  />
                </div>

                <button className="btn-primary" onClick={handleProcessManual} disabled={!rawText.trim()}>
                  Analisar & Reconciliar Lançamentos
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {parsedItems.length} Lançamento(s) Encontrado(s)
              </span>
              <button
                onClick={() => setStep('input')}
                style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                ← Voltar
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', marginBottom: '20px' }}>
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
                        <span className="font-mono-tabular" style={{ fontSize: '13px', fontWeight: '800', color: item.type === 'despesa' ? 'var(--color-expense)' : 'var(--color-income)' }}>
                          {formatCurrency(item.amountCents)}
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

            <button className="btn-primary" onClick={handleConfirmImport}>
              Confirmar {parsedItems.filter(i => i.selected).length} decisão(ões) de conciliação
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
