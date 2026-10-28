import React, { useState } from 'react';
import { queryAIAdvisor } from '../domain/aiContextEngine.js';
import { simulateScenarios } from '../domain/scenarioSimulator.js';
import { detectAnomalies } from '../domain/anomalyDetector.js';

/**
 * PAINEL DA IA RAZÃO & ANÁLISE PREDITIVA DE CENÁRIOS (O RAZÃO 3.0 - FASE 7)
 * Integração visual com o assistente conversacional, simulador What-If e detector de anomalias.
 */

export function AIPredictivePanel({ state, formatCurrency }) {
  const [selectedScenario, setSelectedScenario] = useState('expected'); // 'optimistic', 'expected', 'conservative'
  const [queryInput, setQueryInput] = useState('');
  const [activeAIResponse, setActiveAIResponse] = useState(null);
  const [ignoredAnomalies, setIgnoredAnomalies] = useState([]);

  const todayISO = new Date().toISOString().slice(0, 10);

  // 1. Simulação Preditiva
  const simulation = simulateScenarios({ state, todayISO, monthsAhead: 3 });
  const { monthlyProjections = [], summary = {} } = simulation;

  // 2. Detecção de Anomalias
  const allAnomalies = detectAnomalies(state, todayISO);
  const visibleAnomalies = allAnomalies.filter(a => !ignoredAnomalies.includes(a.id));

  // Handlers
  const handleQuery = (customPrompt) => {
    const promptToUse = customPrompt || queryInput;
    if (!promptToUse.trim()) return;

    const res = queryAIAdvisor(promptToUse, state, todayISO);
    setActiveAIResponse(res);
    setQueryInput('');
  };

  const handleIgnoreAnomaly = (id) => {
    setIgnoredAnomalies(prev => [...prev, id]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. SEÇÃO ASSISTENTE ESTRATÉGICO IA RAZÃO */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'var(--surface-card)', border: '1px solid var(--border-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--brand-gradient)',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            fontSize: '20px',
            boxShadow: 'var(--shadow-brand)'
          }}>
            🤖
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Assistente IA Razão
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Análise e simulações com lógica determinística
            </p>
          </div>
        </div>

        {/* Sugestões de Perguntas Rápidas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => handleQuery('Posso comprar um item de R$ 1.500,00 à vista?')}
            style={{ padding: '8px 12px', borderRadius: '20px', background: 'var(--surface-subtle)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            💡 Posso comprar R$ 1.500 à vista?
          </button>

          <button
            onClick={() => handleQuery('Quanto posso gastar livremente no fim de semana?')}
            style={{ padding: '8px 12px', borderRadius: '20px', background: 'var(--surface-subtle)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            🏖️ Limite seguro para o fim de semana?
          </button>

          <button
            onClick={() => handleQuery('Qual é o meu diagnóstico financeiro geral?')}
            style={{ padding: '8px 12px', borderRadius: '20px', background: 'var(--surface-subtle)', border: '1px solid var(--border-card)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            📊 Diagnóstico geral do mês
          </button>
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Digite sua dúvida ou simulação (ex: Posso gastar R$ 800?)"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            className="form-input"
            style={{ flex: 1 }}
          />
          <button
            onClick={() => handleQuery()}
            className="btn-primary"
            style={{ width: 'auto', padding: '0 24px' }}
          >
            Consultar
          </button>
        </div>

        {/* Resposta do Assistente */}
        {activeAIResponse && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            borderRadius: '16px',
            background: activeAIResponse.isSafe === false ? 'var(--color-expense-bg)' : 'var(--brand-light)',
            border: `1px solid ${activeAIResponse.isSafe === false ? 'var(--color-expense-border)' : 'var(--border-focus)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>
                {activeAIResponse.isSafe === false ? '⚠️' : '✅'}
              </span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Resposta do Motor Determinístico
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
              {activeAIResponse.answer}
            </p>
          </div>
        )}
      </div>

      {/* 2. SEÇÃO SIMULAÇÃO PREDITIVA DE CENÁRIOS (WHAT-IF) */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'var(--surface-card)', border: '1px solid var(--border-card)' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            Simulação de Cenários Futuristas (What-If)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Projeção em 3 perspectivas sem alterar lançamentos reais
          </p>
        </div>

        {/* Seletor de Cenário em Pílula */}
        <div className="pill-tabs-container" style={{ marginBottom: '20px' }}>
          <button
            className={`pill-tab ${selectedScenario === 'optimistic' ? 'active' : ''}`}
            onClick={() => setSelectedScenario('optimistic')}
          >
            🟢 Otimista (+15% corte)
          </button>

          <button
            className={`pill-tab ${selectedScenario === 'expected' ? 'active' : ''}`}
            onClick={() => setSelectedScenario('expected')}
          >
            🔵 Esperado (Tendência)
          </button>

          <button
            className={`pill-tab ${selectedScenario === 'conservative' ? 'active' : ''}`}
            onClick={() => setSelectedScenario('conservative')}
          >
            🔴 Conservador (+15% risco)
          </button>
        </div>

        {/* KPI Cards do Cenário Selecionado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--surface-subtle)', border: '1px solid var(--border-card)' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Saldo Projetado (3 Meses)
            </span>
            <div className="font-mono-tabular" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
              {selectedScenario === 'optimistic' && formatCurrency(summary.finalOptimisticCents)}
              {selectedScenario === 'expected' && formatCurrency(summary.finalExpectedCents)}
              {selectedScenario === 'conservative' && formatCurrency(summary.finalConservativeCents)}
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--surface-subtle)', border: '1px solid var(--border-card)' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Margem de Contingência / Margem
            </span>
            <div className="font-mono-tabular" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--brand-accent)', marginTop: '4px' }}>
              {formatCurrency(summary.spreadCents)}
            </div>
          </div>
        </div>

        {/* Tabela de Projeção Mês a Mês */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>Mês Referência</th>
                <th style={{ padding: '10px 8px' }}>Resultado Mensal</th>
                <th style={{ padding: '10px 8px' }}>Saldo Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {monthlyProjections.map((p, idx) => {
                const netCents = selectedScenario === 'optimistic' ? p.optimisticNetCents : selectedScenario === 'expected' ? p.expectedNetCents : p.conservativeNetCents;
                const balCents = selectedScenario === 'optimistic' ? p.optimisticBalanceCents : selectedScenario === 'expected' ? p.expectedBalanceCents : p.conservativeBalanceCents;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-card)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '700', color: 'var(--text-primary)' }}>{p.monthKey}</td>
                    <td className="font-mono-tabular" style={{ padding: '12px 8px', fontWeight: '700', color: netCents >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                      {netCents >= 0 ? '+ ' : ''}{formatCurrency(netCents)}
                    </td>
                    <td className="font-mono-tabular" style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {formatCurrency(balCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SEÇÃO ALERTAS DE ANOMALIAS */}
      <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', background: 'var(--surface-card)', border: '1px solid var(--border-card)' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            Anomalias & Detecção de Riscos
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Varredura em busca de cobranças duplicadas e riscos de estouro
          </p>
        </div>

        {visibleAnomalies.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--surface-subtle)', borderRadius: '12px' }}>
            🎉 Nenhuma anomalia ou cobrança duplicada detectada!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleAnomalies.map((anom) => (
              <div
                key={anom.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: anom.severity === 'high' ? 'var(--color-expense-bg)' : 'var(--color-pending-bg)',
                  border: `1px solid ${anom.severity === 'high' ? 'var(--color-expense-border)' : 'var(--color-pending-border)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', display: 'block' }}>
                    {anom.severity === 'high' ? '🚨' : '⚠️'} {anom.title}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    {anom.description}
                  </span>
                </div>

                <button
                  onClick={() => handleIgnoreAnomaly(anom.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-card)',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Ignorar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
