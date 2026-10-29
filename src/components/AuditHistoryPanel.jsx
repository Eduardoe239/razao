import React, { useMemo, useState } from 'react';
import { auditEventsForProfile, countUnclassifiedAuditEvents } from '../domain/auditLog.js';

const ACTION_LABELS = {
  transaction_created: 'Lançamento criado',
  transaction_updated: 'Lançamento editado',
  transaction_deleted: 'Lançamento excluído',
  transaction_status_changed: 'Situação alterada',
  invoice_payment_registered: 'Pagamento local de fatura',
  balance_adjustment_applied: 'Ajuste de conciliação',
  import_reconciliation_summary: 'Resumo de importação',
  backup_restored: 'Backup restaurado',
  recurring_rule_created: 'Recorrência criada',
  recurring_rule_toggled: 'Recorrência ativada/pausada',
  recurring_rule_deleted: 'Recorrência excluída',
  budget_limit_set: 'Limite de orçamento definido',
  budget_limit_removed: 'Limite de orçamento removido'
};
const money = cents => Number.isSafeInteger(cents) ? (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const safe = value => typeof value === 'string' ? value : '';

export function AuditHistoryPanel({ auditLog = [], profileMode = 'PF' }) {
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const unclassifiedEvents = countUnclassifiedAuditEvents(auditLog);
  const events = useMemo(() => auditEventsForProfile(auditLog, profileMode)
    .filter(event => actionFilter === 'all' || event.action === actionFilter)
    .filter(event => {
      const haystack = [event.entityId, event.action, event.before?.description, event.after?.description, ...(Object.values(event.metadata || {}))].map(String).join(' ').toLocaleLowerCase('pt-BR');
      return haystack.includes(query.trim().toLocaleLowerCase('pt-BR'));
    }).slice().sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || ''))), [auditLog, profileMode, actionFilter, query]);

  return <section className="summary-card" style={{ display: 'block', padding: '22px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }}>
      <div><h3 className="section-title">Histórico de auditoria</h3><p style={{ color: 'var(--text-secondary)', fontSize: 12, maxWidth: 680 }}>Registro local das principais alterações financeiras, com snapshots quando disponíveis. Não é um log criptograficamente imutável.</p></div>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{events.length} evento(s) visível(is) · máximo de 500 armazenados</span>
    </div>
    {unclassifiedEvents > 0 && <p role="status" style={{ color: '#b45309', fontSize: 12, marginTop: 10 }}>{unclassifiedEvents} evento(s) sem perfil confiável foram ocultados para evitar misturar históricos PF/PJ. Eles precisam ser classificados durante uma revisão controlada do backup.</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, margin: '18px 0' }}>
      <input aria-label="Buscar eventos de auditoria" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por descrição ou ID" style={{ minWidth: 0, padding: 10, borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--surface-card)', color: 'var(--text-primary)' }} />
      <select aria-label="Filtrar por ação" value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--surface-card)', color: 'var(--text-primary)' }}>
        <option value="all">Todas as ações</option>{Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    {events.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{auditLog.length ? 'Nenhum evento corresponde aos filtros.' : 'Ainda não há eventos de auditoria. A trilha começa a ser criada após as ações suportadas nesta versão; operações antigas não são reconstruídas.'}</p> : <div style={{ display: 'grid', gap: 10 }}>
      {events.map((event, index) => <article key={`${safe(event.id)}-${index}`} style={{ border: '1px solid var(--border-card)', borderRadius: 10, padding: 14, background: 'var(--surface-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><strong style={{ fontSize: 13 }}>{ACTION_LABELS[event.action] || `Ação desconhecida: ${safe(event.action) || '—'}`}</strong><span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{safe(event.timestamp) ? new Date(event.timestamp).toLocaleString('pt-BR') : 'Data inválida'}</span></div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>Perfil {event.profileType || 'desconhecido'} · ID: {safe(event.entityId) || '—'} · Evento: {safe(event.id) || 'sem ID'}</div>
        {(event.before || event.after) && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginTop: 10 }}>
          {event.before && <div style={{ background: 'var(--surface-subtle)', borderRadius: 8, padding: 10 }}><strong style={{ fontSize: 11 }}>Antes</strong><div style={{ fontSize: 12, marginTop: 4 }}>{safe(event.before.description) || safe(event.before.categoryId) || '—'}</div><div style={{ fontSize: 12 }}>{money(event.before.amountCents)} · {safe(event.before.status) || (event.before.active !== undefined ? (event.before.active ? 'Ativa' : 'Pausada') : event.before.monthKey ? `Mês ${safe(event.before.monthKey)}` : '—')}</div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{safe(event.before.date)}</div></div>}
          {event.after && <div style={{ background: 'var(--surface-subtle)', borderRadius: 8, padding: 10 }}><strong style={{ fontSize: 11 }}>Depois</strong><div style={{ fontSize: 12, marginTop: 4 }}>{safe(event.after.description) || safe(event.after.categoryId) || '—'}</div><div style={{ fontSize: 12 }}>{money(event.after.amountCents)} · {safe(event.after.status) || (event.after.active !== undefined ? (event.after.active ? 'Ativa' : 'Pausada') : event.after.monthKey ? `Mês ${safe(event.after.monthKey)}` : '—')}</div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{safe(event.after.date)}</div></div>}
        </div>}
        {event.metadata && Object.keys(event.metadata).length > 0 && <details style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}><summary style={{ cursor: 'pointer' }}>Detalhes do evento</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(event.metadata, null, 2)}</pre></details>}
      </article>)}
    </div>}
  </section>;
}
