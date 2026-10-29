import React, { useMemo, useState } from 'react';
import { auditStateIntegrity } from '../domain/auditIntegrity.js';
import { auditEventsForProfile, countUnclassifiedAuditEvents } from '../domain/auditLog.js';
import { entitiesForProfile } from '../domain/profileIsolation.js';

export function AuditIntegrityPanel({ state, profileMode = 'PF' }) {
  const [showAll, setShowAll] = useState(false);
  const profileTransactions = (state?.transactions || []).filter(tx => tx?.profileType === profileMode);
  const profileAudit = auditEventsForProfile(state?.auditLog, profileMode);
  const unclassifiedEvents = countUnclassifiedAuditEvents(state?.auditLog);
  const profileAccounts = entitiesForProfile(state?.accounts, profileMode);
  const profileCards = entitiesForProfile(state?.cards, profileMode);
  const virtualAccountIds = profileCards.map(card => card?.id).filter(Boolean);
  const result = useMemo(() => auditStateIntegrity({ auditLog: profileAudit, transactions: profileTransactions, accounts: profileAccounts, virtualAccountIds }), [profileAudit, profileTransactions, profileAccounts, virtualAccountIds.join('|')]);
  const shown = showAll ? result.issues : result.issues.slice(0, 30);
  return <section className="summary-card" style={{ display: 'block', padding: 22 }}>
    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'start' }}>
      <div><h3 className="section-title">Integridade financeira e do histórico</h3><p style={{ color: 'var(--text-secondary)', fontSize: 12, maxWidth: 720 }}>Cruza eventos de auditoria, lançamentos atuais e regras do livro-razão para detectar inconsistências comuns. Não é uma certificação criptográfica.</p></div>
      <span style={{ background: result.ok ? 'rgba(22,163,74,.12)' : 'rgba(217,119,6,.12)', color: result.ok ? '#16a34a' : '#d97706', border: `1px solid ${result.ok ? 'rgba(22,163,74,.35)' : 'rgba(217,119,6,.35)'}`, padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>{result.ok ? 'Sem inconsistências detectadas' : `${result.issues.length} problema(s) detectado(s)`}</span>
    </div>
    {unclassifiedEvents > 0 && <p role="status" style={{ color: '#b45309', fontSize: 12, marginTop: 10 }}>{unclassifiedEvents} evento(s) sem perfil foram excluídos da análise deste perfil; a trilha precisa de classificação controlada. Nenhum conteúdo ambíguo é mostrado entre PF/PJ.</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, margin: '18px 0' }}>
      {[['Eventos analisados', result.checkedEvents], ['Eventos válidos', result.validEvents], ['Lançamentos', result.checkedTransactions], ['Contas', result.checkedAccounts], ['Lançamentos antigos sem trilha', result.legacyTransactionsWithoutAudit]].map(([label, value]) => <div key={label} style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-card)', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div><strong style={{ fontSize: 20 }}>{value}</strong></div>)}
    </div>
    {result.issues.length > 0 ? <><h4 style={{ margin: '10px 0', fontSize: 13 }}>Itens para revisar</h4><div style={{ display: 'grid', gap: 8 }}>{shown.map((issue, index) => <div key={`${issue.code}-${issue.eventId || issue.transactionId || index}`} style={{ border: '1px solid var(--border-card)', borderRadius: 8, padding: 10, fontSize: 12 }}><strong style={{ color: '#d97706' }}>{issue.code}</strong><div style={{ marginTop: 4 }}>{issue.message}</div></div>)}</div>{result.issues.length > 30 && <button className="btn-primary" onClick={() => setShowAll(v => !v)} style={{ marginTop: 12 }}>{showAll ? 'Mostrar menos' : `Mostrar todos (${result.issues.length})`}</button>}</> : <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Nenhum problema conhecido foi detectado nas verificações executadas. Isso não garante que todos os dados estejam corretos.</p>}
    <details style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: 11 }}><summary style={{ cursor: 'pointer' }}>Limitações desta verificação</summary><ul>{result.limitations.map(item => <li key={item} style={{ marginTop: 6 }}>{item}</li>)}</ul></details>
  </section>;
}
