import React, { useState } from 'react';

/**
 * PAINEL COMPLETO DO USUÁRIO & SISTEMA DE CONQUISTAS GAMIFICADO (O RAZÃO 3.0)
 * Permite a edição de dados pessoais (foto, nome, telefone, e-mail) e exibe
 * o quadro interativo de conquistas com títulos desbloqueáveis para motivação do usuário.
 */

export function UserProfilePanel({
  profile = {},
  onSaveProfile,
  achievementsData = {},
  formatCurrency,
  onEquipTitle
}) {
  const [activeSubTab, setActiveSubTab] = useState('achievements'); // 'achievements' | 'edit_profile'
  const [formData, setFormData] = useState({
    name: profile.name || 'Usuário Executivo',
    title: profile.title || 'Iniciado do Razão',
    email: profile.email || 'usuario@orazao.com.br',
    phone: profile.phone || '(11) 99999-8888',
    avatarUrl: profile.avatarUrl || '',
    accountType: profile.accountType || 'Conta Executiva Premium'
  });

  const { achievements = [], unlockedCount = 0, totalAchievements = 8, totalPoints = 0, completionPercentage = 0 } = achievementsData;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarSelect = (emoji) => {
    setFormData(prev => ({ ...prev, avatarUrl: emoji }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveProfile(formData);
    alert('Perfil atualizado com sucesso!');
  };

  // Nível calculado com base nos pontos acumulados
  const userLevel = Math.floor(totalPoints / 250) + 1;

  const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '👤', '🦁', '🦉', '🚀', '💎', '👑', '⚡'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. CARD HERO DE RESUMO DO PERFIL */}
      <div className="glass-card" style={{
        padding: '24px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(5, 11, 24, 0.98) 100%)',
        border: '1px solid var(--border-glass)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Avatar Icon */}
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '24px',
            background: 'var(--brand-blue-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            boxShadow: 'var(--brand-blue-glow)',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            {formData.avatarUrl || '👨‍💼'}
          </div>

          {/* Info Principal */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                background: 'rgba(0, 180, 216, 0.2)',
                color: 'var(--color-primary-light)',
                padding: '2px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                NÍVEL {userLevel}
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>• {formData.accountType}</span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#F8FAFC', margin: 0 }}>
              {formData.name}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '14px' }}>🏆</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#F59E0B' }}>
                {profile.title || formData.title}
              </span>
            </div>
          </div>

          {/* Botões de Sub-Navegação */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveSubTab('achievements')}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: 'none',
                background: activeSubTab === 'achievements' ? 'var(--brand-blue-gradient)' : 'rgba(255, 255, 255, 0.05)',
                color: activeSubTab === 'achievements' ? '#FFF' : '#94A3B8',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🏆 Conquistas ({unlockedCount}/{totalAchievements})
            </button>
            <button
              onClick={() => setActiveSubTab('edit_profile')}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: 'none',
                background: activeSubTab === 'edit_profile' ? 'var(--brand-blue-gradient)' : 'rgba(255, 255, 255, 0.05)',
                color: activeSubTab === 'edit_profile' ? '#FFF' : '#94A3B8',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ⚙️ Editar Perfil
            </button>
          </div>
        </div>

        {/* Barra de Progresso Geral de Conquistas */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: '#94A3B8' }}>Jornada de Conquistas Financeiras</span>
            <span style={{ fontWeight: '800', color: '#F8FAFC' }}>{totalPoints} XP ({completionPercentage}% Concluído)</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{
              width: `${completionPercentage}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0077B6 0%, #10B981 100%)',
              borderRadius: '9999px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      </div>

      {/* 2. CONTEÚDO DAS SUB-ABAS */}
      {activeSubTab === 'achievements' ? (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', marginBottom: '4px' }}>
              Quadro Geral de Conquistas & Títulos
            </h3>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
              Desbloqueie conquistas mantendo a disciplina financeira. Cada conquista concede um título honorífico exclusivo!
            </p>
          </div>

          {/* Grid de Conquistas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            {achievements.map((ach) => {
              const isEquipped = (profile.title || formData.title) === ach.titleUnlocked;

              return (
                <div
                  key={ach.id}
                  className="glass-card"
                  style={{
                    padding: '18px',
                    borderRadius: '16px',
                    background: ach.unlocked
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)'
                      : 'rgba(15, 23, 42, 0.6)',
                    border: ach.unlocked
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    opacity: ach.unlocked ? 1 : 0.75
                  }}
                >
                  <div>
                    {/* Header da Conquista */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: ach.unlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px'
                      }}>
                        {ach.icon}
                      </div>

                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '800',
                        background: ach.unlocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        color: ach.unlocked ? '#10B981' : '#64748B'
                      }}>
                        {ach.unlocked ? '✓ DESBLOQUEADO' : 'EM PROGRESSO'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#F8FAFC', marginBottom: '4px' }}>
                      {ach.name}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.4' }}>
                      {ach.description}
                    </p>

                    {/* Título Concedido */}
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(2, 6, 23, 0.6)',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ fontSize: '12px' }}>🎖️</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#F59E0B' }}>
                        Título: {ach.titleUnlocked}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso e Ação */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
                      <span>Progresso</span>
                      <span>{ach.percentage}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '12px' }}>
                      <div style={{
                        width: `${ach.percentage}%`,
                        height: '100%',
                        background: ach.unlocked ? '#10B981' : '#00B4D8',
                        borderRadius: '9999px'
                      }} />
                    </div>

                    {ach.unlocked && (
                      <button
                        onClick={() => onEquipTitle(ach.titleUnlocked)}
                        disabled={isEquipped}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '8px',
                          border: 'none',
                          background: isEquipped ? 'rgba(255, 255, 255, 0.1)' : 'var(--brand-blue-gradient)',
                          color: isEquipped ? '#64748B' : '#FFF',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: isEquipped ? 'default' : 'pointer'
                        }}
                      >
                        {isEquipped ? '✓ TÍTULO EQUIPADO' : 'EQUIPAR TÍTULO'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* FORMULÁRIO DE EDIÇÃO DE PERFIL */
        <div className="glass-card" style={{ padding: '24px', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC', marginBottom: '16px' }}>
            Dados do Usuário e Preferências
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Escolha de Avatar Emoji */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '8px' }}>
                Selecione seu Avatar / Ícone
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {AVATAR_OPTIONS.map(emoji => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => handleAvatarSelect(emoji)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      border: formData.avatarUrl === emoji ? '2px solid #00B4D8' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: formData.avatarUrl === emoji ? 'rgba(0, 180, 216, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      fontSize: '20px',
                      cursor: 'pointer'
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Campos de Texto */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(2, 6, 23, 0.8)',
                    border: '1px solid var(--border-glass)',
                    color: '#FFF',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                  Título Equipado
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(2, 6, 23, 0.8)',
                    border: '1px solid var(--border-glass)',
                    color: '#F59E0B',
                    fontWeight: '700',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(2, 6, 23, 0.8)',
                    border: '1px solid var(--border-glass)',
                    color: '#FFF',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>
                  Telefone / Celular
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(2, 6, 23, 0.8)',
                    border: '1px solid var(--border-glass)',
                    color: '#FFF',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: '12px',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--brand-blue-gradient)',
                color: '#FFF',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: 'var(--brand-blue-glow)'
              }}
            >
              SALVAR ALTERAÇÕES DO PERFIL
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
