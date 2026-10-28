import React, { useState, useEffect } from 'react';
import { parseToCents } from '../domain/money';

/**
 * MODAL DE LANÇAMENTO (INSPIRADO NA TELA 3 DA REFERÊNCIA MONEY MANAGER)
 */

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  accounts = [],
  categories = [],
  initialData = null
}) {
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState('despesa');
  const [status, setStatus] = useState('pago');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description || '');
      setAmountStr(initialData.amountCents ? (initialData.amountCents / 100).toString() : '');
      setType(initialData.type || 'despesa');
      setStatus(initialData.status || 'pago');
      setDate(initialData.date || new Date().toISOString().slice(0, 10));
      setAccountId(initialData.accountId || (accounts[0]?.id || ''));
      setCategoryId(initialData.categoryId || (categories[0]?.id || ''));
    } else {
      setDescription('');
      setAmountStr('');
      setType('despesa');
      setStatus('pago');
      setDate(new Date().toISOString().slice(0, 10));
      setAccountId(accounts[0]?.id || '');
      setCategoryId(categories[0]?.id || '');
    }
  }, [initialData, isOpen, accounts, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const amountCents = parseToCents(amountStr);

    if (!description.trim()) {
      alert('Por favor, informe a descrição do lançamento.');
      return;
    }
    if (amountCents <= 0) {
      alert('Por favor, informe um valor válido.');
      return;
    }

    onSave({
      id: initialData?.id,
      description,
      amountCents,
      type,
      status,
      date,
      accountId: accountId || accounts[0]?.id,
      categoryId: categoryId || categories[0]?.id
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 className="modal-title">
            {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* CAMPO DE VALOR HERO DESTAQUE */}
          <div className="form-amount-hero font-mono-tabular" style={{ color: type === 'despesa' ? 'var(--color-expense)' : 'var(--color-income)' }}>
            <span style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>R$</span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '32px',
                fontWeight: '800',
                color: 'inherit',
                width: '180px',
                textAlign: 'center'
              }}
              autoFocus
            />
          </div>

          {/* TIPO: RECEITA / DESPESA */}
          <div className="form-group">
            <label className="form-label">Tipo de Lançamento</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`pill-tab ${type === 'despesa' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  background: type === 'despesa' ? 'var(--color-expense-bg)' : 'var(--surface-subtle)',
                  color: type === 'despesa' ? 'var(--color-expense)' : 'var(--text-secondary)',
                  border: `1px solid ${type === 'despesa' ? 'var(--color-expense-border)' : 'var(--border-card)'}`
                }}
                onClick={() => setType('despesa')}
              >
                ↑ Saída (Despesa)
              </button>

              <button
                type="button"
                className={`pill-tab ${type === 'receita' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  background: type === 'receita' ? 'var(--color-income-bg)' : 'var(--surface-subtle)',
                  color: type === 'receita' ? 'var(--color-income)' : 'var(--text-secondary)',
                  border: `1px solid ${type === 'receita' ? 'var(--color-income-border)' : 'var(--border-card)'}`
                }}
                onClick={() => setType('receita')}
              >
                ↓ Entrada (Receita)
              </button>
            </div>
          </div>

          {/* DESCRIÇÃO */}
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Tênis, Supermercado, Salário..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* CATEGORIA & CONTA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon || '📝'} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Conta Origem</label>
              <select
                className="form-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    💳 {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DATA & STATUS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Data</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pago">✅ Pago / Liquidado</option>
                <option value="pendente">⏳ Pendente</option>
              </select>
            </div>
          </div>

          {/* BOTÃO PRINCIPAL DE SALVAR */}
          <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>
            SALVAR LANÇAMENTO
          </button>
        </form>
      </div>
    </div>
  );
}
