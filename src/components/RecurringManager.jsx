import React, { useEffect, useState } from 'react';
import { validateRecurringRule } from '../domain/recurring.js';
import { parseMoneyInputToCents } from '../domain/money.js';

export function RecurringManager({ recurring = [], accounts = [], categories = [], formatCurrency, onAdd, onToggle, onDelete }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('despesa');
  const [day, setDay] = useState('10');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accountId && accounts[0]?.id) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const submit = (event) => {
    event.preventDefault();
    const parsedAmount = parseMoneyInputToCents(amount);
    if (!parsedAmount.valid || parsedAmount.cents <= 0) {
      setError(parsedAmount.valid ? 'O valor recorrente deve ser maior que zero.' : parsedAmount.reason);
      return;
    }
    const rule = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: description.trim(), amountCents: parsedAmount.cents, type,
      dayOfMonth: Number(day), accountId, categoryId: categoryId || undefined,
      startDate: startDate || undefined, endDate: endDate || undefined, active: true
    };
    const validation = validateRecurringRule(rule);
    if (!validation.valid) { setError(validation.reason); return; }
    if (!accountId) { setError('Selecione a conta associada.'); return; }
    onAdd(rule);
    setDescription(''); setAmount(''); setError('');
  };

  const activeCount = recurring.filter(item => item.active).length;

  return (
    <section className="recurring-manager" aria-labelledby="recurring-manager-title">
      <div className="recurring-manager-heading">
        <div><span className="profile-section-eyebrow">AUTOMAÇÕES LOCAIS</span><h2 id="recurring-manager-title">Despesas e receitas recorrentes</h2><p>Cadastre regras mensais. Os lançamentos só são criados por meio das ações explícitas do Razão.</p></div>
        <span className="recurring-active-count">{activeCount} {activeCount === 1 ? 'regra ativa' : 'regras ativas'}</span>
      </div>

      <form className="recurring-form" onSubmit={submit}>
        <div className="recurring-form-field recurring-description-field"><label htmlFor="recurring-description">Descrição</label><input id="recurring-description" placeholder="Ex.: Internet" value={description} onChange={event => setDescription(event.target.value)} required maxLength={100} /></div>
        <div className="recurring-form-field"><label htmlFor="recurring-amount">Valor (R$)</label><input id="recurring-amount" placeholder="0,00" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} required /></div>
        <div className="recurring-form-field"><label htmlFor="recurring-type">Tipo</label><select id="recurring-type" value={type} onChange={event => setType(event.target.value)}><option value="despesa">Despesa</option><option value="receita">Receita</option></select></div>
        <div className="recurring-form-field"><label htmlFor="recurring-day">Dia do mês</label><input id="recurring-day" type="number" min="1" max="31" value={day} onChange={event => setDay(event.target.value)} required /></div>
        <div className="recurring-form-field recurring-account-field"><label htmlFor="recurring-account">Conta associada</label><select id="recurring-account" value={accountId} onChange={event => setAccountId(event.target.value)} required><option value="">Selecione uma conta</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
        <div className="recurring-form-field"><label htmlFor="recurring-category">Categoria</label><select id="recurring-category" value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">Sem categoria</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        <div className="recurring-form-field"><label htmlFor="recurring-start">Data inicial</label><input id="recurring-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></div>
        <div className="recurring-form-field"><label htmlFor="recurring-end">Data final (opcional)</label><input id="recurring-end" type="date" min={startDate || undefined} value={endDate} onChange={event => setEndDate(event.target.value)} /></div>
        <div className="recurring-form-action"><button type="submit" className="button-primary">Adicionar recorrência</button></div>
        {error && <p className="recurring-form-error" role="alert">{error}</p>}
      </form>

      {recurring.length === 0 ? (
        <div className="empty-state recurring-empty-state"><span className="empty-state-mark" aria-hidden="true">↻</span><strong>Nenhuma recorrência cadastrada</strong><p>Use o formulário para registrar uma despesa fixa ou receita mensal.</p></div>
      ) : (
        <div className="recurring-rule-list" aria-label="Regras recorrentes cadastradas">
          {recurring.map(rule => (
            <article key={rule.id} className={`recurring-rule${rule.active ? '' : ' is-paused'}`}>
              <div className="recurring-rule-main"><span className={`recurring-type-mark ${rule.type === 'receita' ? 'is-income' : 'is-expense'}`} aria-hidden="true">{rule.type === 'receita' ? '↑' : '↓'}</span><div className="recurring-rule-copy"><strong>{rule.description}</strong><span>Todo dia {rule.dayOfMonth} · {rule.type === 'receita' ? 'Receita' : 'Despesa'}{rule.endDate ? ` · até ${rule.endDate}` : ''}</span></div></div>
              <div className="recurring-rule-value"><strong className={rule.type === 'receita' ? 'is-income' : ''}>{formatCurrency(rule.amountCents)}</strong><span className={`recurring-rule-state${rule.active ? ' is-active' : ''}`}>{rule.active ? 'Ativa' : 'Pausada'}</span></div>
              <div className="recurring-rule-actions"><button type="button" className="button-secondary" onClick={() => onToggle(rule.id)}>{rule.active ? 'Pausar' : 'Ativar'}</button><button type="button" className="button-secondary is-destructive" onClick={() => { if (window.confirm(`Excluir a recorrência “${rule.description}”?`)) onDelete(rule.id); }}>Excluir</button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
