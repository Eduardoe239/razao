import React, { useEffect, useMemo, useState } from 'react';
import { calculateUserAchievements } from '../domain/achievements.js';
import { accountLedger } from '../domain/ledger.js';

const getInitials = name => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U';

export function UserProfilePanel({
  userProfile = {},
  onUpdateProfile,
  transactions = [],
  accounts = [],
  categories = [],
  budgets = {},
  commitments = []
}) {
  const [activeSection, setActiveSection] = useState('overview');
  const [formData, setFormData] = useState({
    name: userProfile.name || '',
    email: userProfile.email || '',
    phone: userProfile.phone || '',
    title: userProfile.title || 'Iniciado do Razão'
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setFormData({
      name: userProfile.name || '',
      email: userProfile.email || '',
      phone: userProfile.phone || '',
      title: userProfile.title || 'Iniciado do Razão'
    });
  }, [userProfile.name, userProfile.email, userProfile.phone, userProfile.title]);

  const netWorthCents = useMemo(() => accounts.reduce((sum, account) => sum + accountLedger(account, transactions).balanceCents, 0), [accounts, transactions]);
  const achievementData = useMemo(() => calculateUserAchievements({ transactions, budgets, categories }, netWorthCents, commitments), [transactions, budgets, categories, netWorthCents, commitments]);

  const handleChange = event => setFormData(current => ({ ...current, [event.target.name]: event.target.value }));
  const handleSubmit = event => {
    event.preventDefault();
    const updated = { ...userProfile, ...formData, avatarEmoji: getInitials(formData.name) };
    onUpdateProfile?.(updated);
    setMessage('Perfil atualizado neste dispositivo.');
    setActiveSection('overview');
  };

  return (
    <div className="profile-page">
      <section className="profile-summary-card">
        <div className="profile-summary-main">
          <div className="profile-avatar profile-avatar-large">{getInitials(userProfile.name || formData.name)}</div>
          <div className="profile-summary-copy">
            <span className="profile-section-eyebrow">SEU PERFIL</span>
            <h2>{userProfile.name || 'Configure seu perfil'}</h2>
            <p>{userProfile.email || 'Adicione um e-mail para completar seus dados.'}</p>
            <span className="profile-title-chip">{userProfile.title || 'Iniciado do Razão'}</span>
          </div>
        </div>
        <div className="profile-summary-stats">
          <div><span>Lançamentos</span><strong>{transactions.length}</strong></div>
          <div><span>Contas</span><strong>{accounts.length}</strong></div>
          <div><span>Conquistas</span><strong>{achievementData.unlockedCount}/{achievementData.totalAchievements}</strong></div>
        </div>
      </section>

      <div className="profile-page-toolbar">
        <div className="profile-section-tabs" role="tablist" aria-label="Seções do perfil">
          <button type="button" role="tab" aria-selected={activeSection === 'overview'} className={activeSection === 'overview' ? 'is-active' : ''} onClick={() => { setActiveSection('overview'); setMessage(''); }}>Resumo e conquistas</button>
          <button type="button" role="tab" aria-selected={activeSection === 'edit'} className={activeSection === 'edit' ? 'is-active' : ''} onClick={() => { setActiveSection('edit'); setMessage(''); }}>Editar dados</button>
        </div>
        {message && <span role="status" className="inline-success-message">{message}</span>}
      </div>

      {activeSection === 'overview' ? (
        <div className="profile-content-grid">
          <section className="profile-content-card">
            <div className="profile-card-heading"><div><h3>Conquistas financeiras</h3><p>Metas de uso baseadas nos registros locais.</p></div><span className="achievement-progress-count">{achievementData.completionPercentage}%</span></div>
            <div className="achievement-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={achievementData.completionPercentage} aria-label="Progresso total das conquistas"><span style={{ width: `${achievementData.completionPercentage}%` }} /></div>
            <div className="achievement-grid">
              {achievementData.achievements.map(achievement => (
                <article key={achievement.id} className={`achievement-card${achievement.unlocked ? ' is-unlocked' : ''}`}>
                  <div className="achievement-card-head"><span className="achievement-icon" aria-hidden="true">{achievement.unlocked ? '✓' : '•'}</span><span className={`achievement-status${achievement.unlocked ? ' is-unlocked' : ''}`}>{achievement.unlocked ? 'Conquistada' : 'Em progresso'}</span></div>
                  <h4>{achievement.name}</h4>
                  <p>{achievement.description}</p>
                  <div className="achievement-card-footer"><span>{achievement.titleUnlocked}</span><strong>{achievement.percentage}%</strong></div>
                  <div className="achievement-progress-track small"><span style={{ width: `${achievement.percentage}%` }} /></div>
                </article>
              ))}
            </div>
          </section>
          <aside className="profile-content-card profile-privacy-card">
            <span className="profile-info-icon" aria-hidden="true">i</span>
            <h3>Seus dados, seu controle</h3>
            <p>O Razão utiliza o perfil para personalizar a experiência. O armazenamento depende do modo de execução: navegador ou aplicativo desktop.</p>
            <div className="profile-detail-row"><span>Nome</span><strong>{userProfile.name || 'Não informado'}</strong></div>
            <div className="profile-detail-row"><span>E-mail</span><strong>{userProfile.email || 'Não informado'}</strong></div>
            <div className="profile-detail-row"><span>Telefone</span><strong>{userProfile.phone || 'Não informado'}</strong></div>
            <button type="button" className="button-secondary profile-edit-button" onClick={() => setActiveSection('edit')}>Editar informações</button>
          </aside>
        </div>
      ) : (
        <section className="profile-content-card profile-edit-card">
          <div className="profile-card-heading"><div><h3>Dados do perfil</h3><p>Estas informações ficam no estado local do aplicativo.</p></div></div>
          <form onSubmit={handleSubmit} className="profile-edit-form">
            <label>Nome de exibição<input type="text" name="name" autoComplete="name" value={formData.name} onChange={handleChange} placeholder="Como você quer ser identificado?" required maxLength={100} /></label>
            <label>E-mail<input type="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} placeholder="voce@exemplo.com" maxLength={160} /></label>
            <label>Telefone<input type="tel" name="phone" autoComplete="tel" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" maxLength={30} /></label>
            <label>Título do perfil<input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Ex.: Iniciado do Razão" maxLength={80} /></label>
            <div className="profile-form-actions"><button type="button" className="button-secondary" onClick={() => { setFormData({ name: userProfile.name || '', email: userProfile.email || '', phone: userProfile.phone || '', title: userProfile.title || 'Iniciado do Razão' }); setActiveSection('overview'); }}>Cancelar</button><button type="submit" className="button-primary">Salvar perfil</button></div>
          </form>
        </section>
      )}
    </div>
  );
}
