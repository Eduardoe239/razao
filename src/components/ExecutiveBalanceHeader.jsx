import React from 'react';

/**
 * CABEÇALHO EXECUTIVO DE SALDOS (O RAZÃO 3.0)
 * Elimina toda a ambiguidade matemática ao separar rigorosamente os 4 saldos do sistema:
 * 1. Saldo Realizado (Dinheiro Efetivo)
 * 2. Saldo Previsto (Projeção do Mês)
 * 3. Saldo Comprometido (Faturas & Obrigações)
 * 4. Saldo Disponível (Recursos Livres)
 */

export function ExecutiveBalanceHeader({
  realizedCents = 0,
  projectedCents = 0,
  committedCents = 0,
  availableCents = 0,
  formatCurrency
}) {
  const cards = [
    {
      id: 'realized',
      title: 'Saldo Realizado',
      subtitle: 'Liquidados em Conta',
      amountCents: realizedCents,
      color: 'var(--color-income)',
      bgColor: 'var(--color-income-bg)',
      icon: '💵',
      tooltip: 'Dinheiro efetivamente recebido menos despesas já pagas.'
    },
    {
      id: 'projected',
      title: 'Saldo Previsto',
      subtitle: 'Final do Período',
      amountCents: projectedCents,
      color: 'var(--brand-blue-cyan)',
      bgColor: 'rgba(0, 180, 216, 0.12)',
      icon: '📈',
      tooltip: 'Saldo realizado + receitas e despesas pendentes projetadas.'
    },
    {
      id: 'committed',
      title: 'Comprometido',
      subtitle: 'Faturas & Fixas',
      amountCents: committedCents,
      color: 'var(--color-pending)',
      bgColor: 'var(--color-pending-bg)',
      icon: '🔒',
      tooltip: 'Reservado para faturas de cartão abertas e compromissos fixos.'
    },
    {
      id: 'available',
      title: 'Saldo Disponível',
      subtitle: 'Recursos Livres',
      amountCents: availableCents,
      color: '#A855F7',
      bgColor: 'rgba(168, 85, 247, 0.12)',
      icon: '💎',
      tooltip: 'Recursos livres para uso sem afetar suas obrigações financeiras.'
    }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {cards.map((card) => (
        <div
          key={card.id}
          className="glass-card"
          style={{
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
            borderLeft: `4px solid ${card.color}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}>
                {card.title}
              </span>
              <p style={{ fontSize: '11px', color: '#64748B' }}>{card.subtitle}</p>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}
            >
              {card.icon}
            </div>
          </div>

          <div className="font-mono-tabular" style={{ fontSize: '24px', fontWeight: '800', color: '#F8FAFC' }}>
            {formatCurrency(card.amountCents)}
          </div>
        </div>
      ))}
    </div>
  );
}
