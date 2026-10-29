import React, { useEffect, useMemo, useState } from 'react';
import { parseStatementBalance, reconcileAccountBalance } from '../domain/balanceReconciliation.js';
import { analyzeBalanceDiscrepancy, prepareBalanceAdjustment } from '../domain/balanceCorrection.js';

const localISODate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function AccountBalanceReconciliationModal({
  isOpen,
  onClose,
  accounts = [],
  transactions = [],
  categories = [],
  profileType = 'PF',
  onApplyAdjustment,
  formatCurrency
}) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts.find(account => account?.id)?.id || '');
  const [asOfDate, setAsOfDate] = useState(localISODate());
  const [statementBalance, setStatementBalance] = useState('');
  const [result, setResult] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [adjustmentKind, setAdjustmentKind] = useState('');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(localISODate());
  const [adjustmentCategoryId, setAdjustmentCategoryId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [adjustmentDraft, setAdjustmentDraft] = useState(null);
  const [confirmAdjustment, setConfirmAdjustment] = useState(false);
  const [adjustmentMessage, setAdjustmentMessage] = useState('');

  useEffect(() => {
    if (!accounts.some(account => account?.id === selectedAccountId)) {
      setSelectedAccountId(accounts.find(account => account?.id)?.id || '');
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find(account => account?.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  useEffect(() => {
    setResult(null);
    setValidationMessage('');
    setAdjustmentDraft(null);
    setConfirmAdjustment(false);
    setAdjustmentMessage('');
  }, [selectedAccountId, asOfDate, statementBalance]);

  if (!isOpen) return null;

  const runReconciliation = (event) => {
    event.preventDefault();
    const parsed = parseStatementBalance(statementBalance);
    if (!selectedAccount) {
      setResult(null);
      setValidationMessage('Cadastre ou selecione uma conta antes de conferir o saldo.');
      return;
    }
    if (!parsed.valid) {
      setResult(null);
      setValidationMessage(parsed.reason);
      return;
    }
    const next = reconcileAccountBalance({
      account: selectedAccount,
      transactions,
      statementBalanceCents: parsed.amountCents,
      asOfDate
    });
    setResult(next);
    setValidationMessage(next.errors?.join(' ') || '');
    setAdjustmentDraft(null);
    setConfirmAdjustment(false);
    setAdjustmentMessage('');
    const defaultKind = next.differenceCents > 0 ? 'income' : 'expense';
    setAdjustmentKind(next.differenceCents > 0 ? 'income' : 'expense');
    setAdjustmentDescription(next.differenceCents > 0 ? 'Entrada não registrada no extrato' : 'Despesa/tarifa não registrada no extrato');
    setAdjustmentDate(asOfDate);
    setTargetAccountId(accounts.find(item => item?.id && item.id !== selectedAccount.id)?.id || '');
    const categoryType = defaultKind === 'income' ? 'receita' : 'despesa';
    setAdjustmentCategoryId(categories.find(item => item?.type === categoryType)?.id || categories[0]?.id || '');
  };

  const discrepancyReview = result?.valid ? analyzeBalanceDiscrepancy(result) : null;
  const adjustmentType = adjustmentKind === 'income' ? 'receita' : adjustmentKind === 'expense' ? 'despesa' : 'transferencia';
  const usableCategories = categories.filter(item => item?.id && item.type === adjustmentType);

  const prepareAdjustment = (event) => {
    event.preventDefault();
    setAdjustmentMessage('');
    const prepared = prepareBalanceAdjustment({
      result, account: selectedAccount, accounts, adjustmentKind, description: adjustmentDescription,
      date: adjustmentDate, categoryId: adjustmentCategoryId, targetAccountId, profileType
    });
    if (!prepared.valid) {
      setAdjustmentDraft(null);
      setAdjustmentMessage(prepared.reason);
      return;
    }
    setAdjustmentDraft(prepared.draft);
    setConfirmAdjustment(false);
  };

  const applyPreparedAdjustment = () => {
    if (!adjustmentDraft || !confirmAdjustment || typeof onApplyAdjustment !== 'function') return;
    const outcome = onApplyAdjustment(adjustmentDraft, result);
    if (!outcome?.ok || !outcome.transaction) {
      setAdjustmentMessage(outcome?.message || 'Não foi possível aplicar o ajuste. Faça a conferência novamente.');
      setAdjustmentDraft(null);
      setConfirmAdjustment(false);
      return;
    }
    const nextTransactions = [...transactions, outcome.transaction];
    const nextResult = reconcileAccountBalance({
      account: selectedAccount, transactions: nextTransactions,
      statementBalanceCents: result.statementBalanceCents, asOfDate: result.asOfDate
    });
    setResult(nextResult);
    setAdjustmentDraft(null);
    setConfirmAdjustment(false);
    setAdjustmentMessage(nextResult.status === 'matched' ? 'Ajuste registrado. O saldo agora confere com o valor informado.' : 'Ajuste registrado, mas ainda existe divergência. Revise os demais lançamentos.');
  };

  const money = (value) => typeof formatCurrency === 'function'
    ? formatCurrency(value)
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((value || 0) / 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="balance-reconcile-title" onClick={event => event.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🧮</span>
            <div>
              <h3 className="modal-title" id="balance-reconcile-title">Conferência de saldo</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Compare o livro-razão com o saldo informado no extrato.</p>
            </div>
          </div>
          <button type="button" aria-label="Fechar conferência" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ border: '1px solid var(--border-card)', background: 'var(--surface-subtle)', borderRadius: '12px', padding: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          A conferência inicial é somente de leitura. Nenhum lançamento será criado sem revisão e confirmação explícita. O saldo considera movimentos pagos até a data escolhida; pendências, cancelamentos e movimentos futuros ficam separados.
        </div>

        <form onSubmit={runReconciliation} style={{ display: 'grid', gap: '14px' }}>
          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Conta a conferir
            <select value={selectedAccountId} onChange={event => setSelectedAccountId(event.target.value)} required disabled={!accounts.length} style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }}>
              <option value="">Selecione uma conta</option>
              {accounts.filter(account => account?.id).map(account => <option key={account.id} value={account.id}>{account.name || account.bankName || account.id}</option>)}
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Data do extrato
              <input type="date" value={asOfDate} onChange={event => setAsOfDate(event.target.value)} required style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }} />
            </label>
            <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Saldo no extrato (R$)
              <input inputMode="decimal" autoComplete="off" placeholder="Ex.: 1.250,75" value={statementBalance} onChange={event => setStatementBalance(event.target.value)} required style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }} />
            </label>
          </div>
          {validationMessage && <p role="alert" style={{ color: '#ef4444', fontSize: '12px', margin: 0 }}>{validationMessage}</p>}
          <button className="btn-primary" type="submit" style={{ padding: '12px 16px' }} disabled={!accounts.length}>Conferir saldo</button>
        </form>

        {result?.valid && (
          <section aria-live="polite" style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
            <div style={{ border: `1px solid ${result.status === 'matched' ? 'var(--color-income, #16a34a)' : '#f59e0b'}`, borderRadius: '14px', padding: '16px', display: 'grid', gap: '8px' }}>
              <strong style={{ color: result.status === 'matched' ? 'var(--color-income, #16a34a)' : '#f59e0b' }}>
                {result.status === 'matched' ? '✓ Saldo conciliado' : '⚠ Diferença encontrada'}
              </strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '12px' }}>
                <div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saldo calculado</div><strong>{money(result.calculatedBalanceCents)}</strong></div>
                <div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saldo no extrato</div><strong>{money(result.statementBalanceCents)}</strong></div>
                <div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Diferença (extrato − Razão)</div><strong>{money(result.differenceCents)}</strong></div>
              </div>
              {result.status === 'difference' && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>{result.differenceCents > 0 ? 'O extrato mostra um saldo maior que o calculado.' : 'O extrato mostra um saldo menor que o calculado.'} Revise taxas, lançamentos ausentes, datas e a classificação das movimentações antes de editar qualquer registro.</p>}
            </div>

            {result.status === 'difference' && discrepancyReview && (
              <div style={{ border: '1px solid var(--border-card)', borderRadius: '12px', padding: '14px', display: 'grid', gap: '12px' }}>
                <div>
                  <strong style={{ fontSize: '13px' }}>Investigar a divergência</strong>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '5px 0 0' }}>São hipóteses para revisão, não conclusões automáticas. Primeiro confira o extrato e o histórico.</p>
                </div>
                <div style={{ display: 'grid', gap: '9px' }}>
                  {discrepancyReview.suggestions.map(suggestion => (
                    <div key={suggestion.id} style={{ background: 'var(--surface-subtle)', borderRadius: '9px', padding: '10px' }}>
                      <strong style={{ fontSize: '12px' }}>{suggestion.title}</strong>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.45 }}>{suggestion.description}</p>
                    </div>
                  ))}
                </div>
                {discrepancyReview.cautions.length > 0 && (
                  <div style={{ borderLeft: '3px solid #f59e0b', padding: '7px 10px', display: 'grid', gap: '5px' }}>
                    {discrepancyReview.cautions.map((caution, index) => <p key={index} style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{caution}</p>)}
                  </div>
                )}
                <form onSubmit={prepareAdjustment} style={{ display: 'grid', gap: '11px', paddingTop: '4px' }}>
                  <strong style={{ fontSize: '12px' }}>Preparar um lançamento de ajuste</strong>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Use somente se confirmar que a movimentação realmente não está no histórico. O ajuste será um novo lançamento pago, marcado como ajuste de conciliação e vinculado à conferência.</p>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Classificação do ajuste
                    <select value={adjustmentKind} onChange={event => { setAdjustmentKind(event.target.value); setAdjustmentDraft(null); setConfirmAdjustment(false); setAdjustmentMessage(''); setAdjustmentCategoryId(categories.find(item => item?.type === (event.target.value === 'income' ? 'receita' : event.target.value === 'expense' ? 'despesa' : ''))?.id || ''); setAdjustmentDescription(event.target.value === 'income' ? 'Entrada não registrada no extrato' : event.target.value === 'expense' ? 'Despesa/tarifa não registrada no extrato' : 'Transferência não registrada no extrato'); }} style={{ padding: '10px', borderRadius: '9px', background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }}>
                      {result.differenceCents > 0 ? <option value="income">Entrada / receita ausente</option> : <option value="expense">Despesa / tarifa ausente</option>}
                      <option value="transfer">Transferência entre contas</option>
                    </select>
                  </label>
                  {adjustmentKind === 'transfer' && (
                    <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Conta contraparte
                      <select value={targetAccountId} onChange={event => { setTargetAccountId(event.target.value); setAdjustmentDraft(null); setConfirmAdjustment(false); }} required style={{ padding: '10px', borderRadius: '9px', background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }}>
                        <option value="">Selecione outra conta</option>
                        {accounts.filter(item => item?.id && item.id !== selectedAccountId).map(item => <option key={item.id} value={item.id}>{item.name || item.bankName || item.id}</option>)}
                      </select>
                    </label>
                  )}
                  {adjustmentKind !== 'transfer' && (
                    <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Categoria
                      <select value={adjustmentCategoryId} onChange={event => { setAdjustmentCategoryId(event.target.value); setAdjustmentDraft(null); setConfirmAdjustment(false); }} style={{ padding: '10px', borderRadius: '9px', background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }}>
                        <option value="">Sem categoria</option>
                        {usableCategories.map(item => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}
                      </select>
                    </label>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                    <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>Data do movimento<input type="date" value={adjustmentDate} max={asOfDate} onChange={event => { setAdjustmentDate(event.target.value); setAdjustmentDraft(null); setConfirmAdjustment(false); }} required style={{ padding: '10px', borderRadius: '9px', background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }} /></label>
                    <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>Valor do ajuste<input value={money(Math.abs(result.differenceCents))} readOnly aria-readonly="true" style={{ padding: '10px', borderRadius: '9px', background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }} /></label>
                  </div>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>Descrição do lançamento<input value={adjustmentDescription} maxLength={120} onChange={event => { setAdjustmentDescription(event.target.value); setAdjustmentDraft(null); setConfirmAdjustment(false); }} required style={{ padding: '10px', borderRadius: '9px', background: 'var(--surface-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }} /></label>
                  <button className="btn-primary" type="submit" style={{ padding: '11px' }}>Preparar correção para revisão</button>
                </form>
                {adjustmentMessage && <p role="status" style={{ color: adjustmentMessage.includes('não foi') || adjustmentMessage.includes('mudaram') ? '#ef4444' : 'var(--color-income, #16a34a)', fontSize: '12px', margin: 0 }}>{adjustmentMessage}</p>}
                {adjustmentDraft && (
                  <div style={{ border: '1px solid #f59e0b', borderRadius: '10px', padding: '12px', display: 'grid', gap: '9px' }}>
                    <strong style={{ fontSize: '12px' }}>Revise antes de registrar</strong>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px' }}><span>{adjustmentDraft.description} · {adjustmentDraft.date}</span><strong>{money(adjustmentDraft.amountCents)}</strong></div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>O lançamento será salvo como pago, com origem “ajuste de conciliação”. Não edita nem exclui registros anteriores.</p>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={confirmAdjustment} onChange={event => setConfirmAdjustment(event.target.checked)} style={{ marginTop: '2px' }} />
                      Confirmei no extrato que esta movimentação está ausente e não é uma duplicata.
                    </label>
                    <button type="button" className="btn-primary" disabled={!confirmAdjustment || typeof onApplyAdjustment !== 'function'} onClick={applyPreparedAdjustment} style={{ padding: '11px' }}>Confirmar e registrar ajuste</button>
                  </div>
                )}
              </div>
            )}


            <div style={{ border: '1px solid var(--border-card)', borderRadius: '12px', padding: '14px', display: 'grid', gap: '10px' }}>
              <strong style={{ fontSize: '13px' }}>Composição do saldo calculado</strong>
              {[
                ['Saldo inicial', result.openingBalanceCents],
                ['Receitas pagas', result.incomeCents],
                ['Despesas pagas', -result.expenseCents],
                ['Transferências recebidas', result.transferInCents],
                ['Transferências enviadas', -result.transferOutCents]
              ].map(([label, amount]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px' }}><span style={{ color: 'var(--text-secondary)' }}>{label}</span><span>{money(amount)}</span></div>)}
            </div>

            <div style={{ background: 'var(--surface-subtle)', borderRadius: '12px', padding: '14px', display: 'grid', gap: '7px', fontSize: '12px' }}>
              <strong>Movimentações não incluídas no cálculo</strong>
              <div>Pendentes: {result.counts.pendingExcluded}</div>
              <div>Canceladas: {result.counts.cancelledExcluded}</div>
              <div>Após a data do extrato: {result.counts.futureExcluded}</div>
              <div>Data ausente/inválida: {result.counts.invalidDateExcluded}</div>
              <div>Dados inválidos: {result.counts.invalidMovementExcluded}</div>
              <div>Movimentações pagas consideradas: {result.counts.included}</div>
            </div>
          </section>
        )}
        {!accounts.length && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '14px' }}>Você ainda não cadastrou contas para conferir.</p>}
      </div>
    </div>
  );
}
