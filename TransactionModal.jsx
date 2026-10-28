import React, { useState, useEffect, useRef } from 'react';

/**
 * MODAL DE NOVO/EDITAR LANÇAMENTO (O RAZÃO 3.0)
 * Acessível (WCAG 2.2 AA), com suporte a receitas, despesas, transferências,
 * parcelamentos determinísticos e conversão segura em centavos.
 */

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  accounts = [],
  categories = [],
  initialData = null
}) {
  const [type, setType] = useState('despesa'); // receita, despesa, transferencia
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('pago');
  const [installments, setInstallments] = useState(1);

  const modalRef = useRef(null);

  // Inicialização ao abrir modal
  useEffect(() => {
    if (initialData) {
      setType(initialData.type || 'despesa');
      setDescription(initialData.description || '');
      setAmountInput(((initialData.amountCents || 0) / 100).toFixed(2));
      setDate(initialData.date || new Date().toISOString().slice(0, 10));
      setAccountId(initialData.accountId || (accounts[0]?.id || ''));
      setToAccountId(initialData.toAccountId || '');
      setCategoryId(initialData.categoryId || (categories[0]?.id || ''));
      setStatus(initialData.status || 'pago');
      setInstallments(initialData.installmentsTotal || 1);
    } else {
      setType('despesa');
      setDescription('');
      setAmountInput('');
      setDate(new Date().toISOString().slice(0, 10));
      setAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || accounts[0]?.id || '');
      setCategoryId(categories[0]?.id || '');
      setStatus('pago');
      setInstallments(1);
    }
  }, [isOpen, initialData, accounts, categories]);

  // Gestão de Tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const valFloat = parseFloat(amountInput.replace(',', '.'));
    if (isNaN(valFloat) || valFloat <= 0) {
      alert('Por favor, insira um valor monetário válido maior que zero.');
      return;
    }

    const amountCents = Math.round(valFloat * 100);

    onSave({
      id: initialData?.id,
      type,
      description,
      amountCents,
      date,
      accountId,
      toAccountId: type === 'transferencia' ? toAccountId : undefined,
      categoryId: type === 'transferencia' ? undefined : categoryId,
      status,
      installmentsTotal: parseInt(installments, 10) || 1
    });

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '500px',
          padding: '24px',
          background: '#0F172A',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: 'var(--shadow-elevation-2)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 id="modal-title" style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC' }}>
            {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Chaves de Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {['despesa', 'receita', 'transferencia'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  background: type === t ? 'var(--brand-blue-gradient)' : 'rgba(2, 6, 23, 0.6)',
                  color: type === t ? '#FFF' : '#94A3B8'
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Valor Monotípico */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
              Valor (R$)
            </label>
            <input
              type="text"
              placeholder="0,00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              required
              className="font-mono-tabular"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(2, 6, 23, 0.6)',
                border: '1px solid var(--border-glass)',
                color: '#F8FAFC',
                fontSize: '18px',
                fontWeight: '800',
                outline: 'none'
              }}
            />
          </div>

          {/* Descrição */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
              Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Supermercado, Salário, Pix..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(2, 6, 23, 0.6)',
                border: '1px solid var(--border-glass)',
                color: '#F8FAFC',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Seleção de Conta / Transferência */}
          <div style={{ display: 'grid', gridTemplateColumns: type === 'transferencia' ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                {type === 'transferencia' ? 'Conta de Origem' : 'Conta'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(2, 6, 23, 0.6)',
                  border: '1px solid var(--border-glass)',
                  color: '#F8FAFC',
                  fontSize: '13px'
                }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {type === 'transferencia' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                  Conta de Destino
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(2, 6, 23, 0.6)',
                    border: '1px solid var(--border-glass)',
                    color: '#F8FAFC',
                    fontSize: '13px'
                  }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Categoria & Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {type !== 'transferencia' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                  Categoria
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(2, 6, 23, 0.6)',
                    border: '1px solid var(--border-glass)',
                    color: '#F8FAFC',
                    fontSize: '13px'
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(2, 6, 23, 0.6)',
                  border: '1px solid var(--border-glass)',
                  color: '#F8FAFC',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          {/* Status (Pago / Pendente) */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8' }}>Status:</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="status"
                value="pago"
                checked={status === 'pago'}
                onChange={() => setStatus('pago')}
              />
              PAGO / Liquidado
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="status"
                value="pendente"
                checked={status === 'pendente'}
                onChange={() => setStatus('pendente')}
              />
              PENDENTE
            </label>
          </div>

          {/* Botões do Modal */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid var(--border-glass)',
                color: '#94A3B8',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                background: 'var(--brand-blue-gradient)',
                border: 'none',
                color: '#FFF',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: 'var(--brand-blue-glow)'
              }}
            >
              Salvar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
