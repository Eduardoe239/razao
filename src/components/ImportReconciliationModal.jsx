import React, { useState } from 'react';
import { parseOFX, parseCSV } from '../domain/importers';
import { parseReceiptText } from '../domain/receiptOcr';
import { reconcileTransactions } from '../domain/reconciliation';
import { uid } from '../domain/uid';

export function ImportReconciliationModal({
  isOpen,
  onClose,
  existingTransactions = [],
  accounts = [],
  categories = [],
  formatCurrency,
  onImportConfirmed
}) {
  const [importType, setImportType] = useState('ofx'); // ofx, csv, ocr
  const [rawText, setRawText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || 'acc-1');
  const [parsedItems, setParsedItems] = useState([]);
  const [step, setStep] = useState('input'); // input -> review

  if (!isOpen) return null;

  const handleProcess = () => {
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

    // Processa reconciliação
    const reconciled = reconcileTransactions(extracted, existingTransactions);
    setParsedItems(reconciled.map(item => ({ ...item, selected: item.reconciliationStatus !== 'duplicate' })));
    setStep('review');
  };

  const handleConfirmImport = () => {
    const toImport = parsedItems
      .filter(item => item.selected)
      .map(item => ({
        id: uid(),
        description: item.description,
        amountCents: item.amountCents,
        type: item.type,
        date: item.date,
        status: item.status || 'pago',
        accountId: selectedAccountId,
        categoryId: categories[0]?.id || 'cat-1',
        importedId: item.importedId
      }));

    if (toImport.length === 0) {
      alert('Nenhum item selecionado para importação.');
      return;
    }

    onImportConfirmed(toImport);
    setStep('input');
    setRawText('');
    setParsedItems([]);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📥</span>
            <h3 className="modal-title">Extrator & Open Finance</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {step === 'input' ? (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Importe extratos bancários (.ofx), planilhas (.csv) ou cole o texto de comprovantes Pix para reconciliação automática.
            </p>

            {/* Seleção do Tipo de Arquivo */}
            <div className="pill-tabs-container">
              <button className={`pill-tab ${importType === 'ofx' ? 'active' : ''}`} onClick={() => setImportType('ofx')}>
                Extrato .OFX
              </button>
              <button className={`pill-tab ${importType === 'csv' ? 'active' : ''}`} onClick={() => setImportType('csv')}>
                Planilha .CSV
              </button>
              <button className={`pill-tab ${importType === 'ocr' ? 'active' : ''}`} onClick={() => setImportType('ocr')}>
                Comprovante / Pix
              </button>
            </div>

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
                rows={8}
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

            <button className="btn-primary" onClick={handleProcess} disabled={!rawText.trim()}>
              Analisar & Reconciliar
            </button>
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

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-subtle)',
                      border: `1px solid ${isDup ? 'var(--color-expense-border)' : 'var(--border-card)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => {
                        const updated = [...parsedItems];
                        updated[idx].selected = e.target.checked;
                        setParsedItems(updated);
                      }}
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
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.date} • {item.source.toUpperCase()}</span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-pill)',
                          background: isDup ? 'var(--color-expense-bg)' : isPending ? 'var(--color-pending-bg)' : 'var(--color-income-bg)',
                          color: isDup ? 'var(--color-expense)' : isPending ? 'var(--color-pending)' : 'var(--color-income)'
                        }}>
                          {isDup ? '⚠️ Duplicado' : isPending ? '🔄 Baixa Pendência' : '✅ Novo'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="btn-primary" onClick={handleConfirmImport}>
              Importar {parsedItems.filter(i => i.selected).length} Lançamento(s)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
