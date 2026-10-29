import React, { useEffect, useState } from 'react';
import { queryAIAdvisor } from '../domain/aiContextEngine.js';
import { simulateScenarios } from '../domain/scenarioSimulator.js';
import { detectAnomalies } from '../domain/anomalyDetector.js';

/** Planejamento financeiro local com regras determinísticas e projeções explicáveis. */
export function AIPredictivePanel({ state, formatCurrency, initialPrompt = '', onPromptConsumed }) {
  const [selectedScenario, setSelectedScenario] = useState('expected');
  const [queryInput, setQueryInput] = useState('');
  const [activeAIResponse, setActiveAIResponse] = useState(null);
  const [ignoredAnomalies, setIgnoredAnomalies] = useState([]);

  useEffect(() => {
    if (!initialPrompt?.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    setActiveAIResponse(queryAIAdvisor(initialPrompt.trim(), state, today));
    setQueryInput('');
    onPromptConsumed?.();
  }, [initialPrompt, onPromptConsumed, state]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const simulation = simulateScenarios({ state, todayISO, monthsAhead: 3 });
  const { monthlyProjections = [], summary = {} } = simulation;
  const allAnomalies = detectAnomalies(state, todayISO);
  const visibleAnomalies = allAnomalies.filter(anomaly => !ignoredAnomalies.includes(anomaly.id));

  const handleQuery = (customPrompt) => {
    const prompt = (customPrompt ?? queryInput).trim();
    if (!prompt) return;
    const response = queryAIAdvisor(prompt, state, todayISO);
    setActiveAIResponse(response);
    setQueryInput('');
  };

  const metrics = [
    { label: 'Saldo projetado em 3 meses', value: selectedScenario === 'optimistic' ? summary.finalOptimisticCents : selectedScenario === 'expected' ? summary.finalExpectedCents : summary.finalConservativeCents },
    { label: 'Margem entre cenários', value: summary.spreadCents }
  ];

  return (
    <div className="ai-page-stack">
      <section className="ai-panel" aria-labelledby="ai-advisor-title">
        <div className="ai-panel-heading">
          <span className="ai-heading-mark" aria-hidden="true">R</span>
          <div>
            <span className="profile-section-eyebrow">ASSISTENTE FINANCEIRO</span>
            <h2 id="ai-advisor-title">Pergunte sobre suas finanças</h2>
            <p>Respostas calculadas com os registros locais e regras do Razão. As projeções não alteram seus lançamentos.</p>
          </div>
        </div>

        <div className="ai-suggestion-row" aria-label="Perguntas sugeridas">
          <button type="button" className="ai-suggestion-chip" onClick={() => handleQuery('Posso comprar um item de R$ 1.500,00 à vista?')}>Posso comprar por R$ 1.500 à vista?</button>
          <button type="button" className="ai-suggestion-chip" onClick={() => handleQuery('Quanto posso gastar livremente no fim de semana?')}>Quanto posso gastar no fim de semana?</button>
          <button type="button" className="ai-suggestion-chip" onClick={() => handleQuery('Qual é o meu diagnóstico financeiro geral?')}>Como está minha situação financeira?</button>
        </div>

        <form className="ai-question-form" onSubmit={event => { event.preventDefault(); handleQuery(); }}>
          <label className="sr-only" htmlFor="razao-ai-question">Sua pergunta financeira</label>
          <input id="razao-ai-question" type="text" placeholder="Ex.: Posso assumir uma despesa de R$ 800?" value={queryInput} onChange={event => setQueryInput(event.target.value)} maxLength={500} />
          <button type="submit" className="button-primary" disabled={!queryInput.trim()}>Consultar</button>
        </form>

        {activeAIResponse && (
          <div className={`ai-response${activeAIResponse.isSafe === false ? ' is-warning' : ' is-result'}`} role="status" aria-live="polite">
            <div className="ai-response-heading"><span className="ai-response-status-mark" aria-hidden="true">{activeAIResponse.isSafe === false ? '!' : '✓'}</span><strong>Resultado da análise</strong><span className="ai-response-method">Motor determinístico</span></div>
            <p>{activeAIResponse.answer}</p>
          </div>
        )}
      </section>

      <section className="ai-panel" aria-labelledby="scenario-title">
        <div className="ai-panel-heading ai-panel-heading-spread">
          <div>
            <span className="profile-section-eyebrow">PLANEJAMENTO</span>
            <h2 id="scenario-title">Simulação de cenários</h2>
            <p>Compare três hipóteses para os próximos meses, sem modificar o saldo real.</p>
          </div>
          <div className="scenario-selector" role="group" aria-label="Cenário da projeção">
            <button type="button" aria-pressed={selectedScenario === 'optimistic'} className={selectedScenario === 'optimistic' ? 'is-selected is-optimistic' : ''} onClick={() => setSelectedScenario('optimistic')}>Otimista</button>
            <button type="button" aria-pressed={selectedScenario === 'expected'} className={selectedScenario === 'expected' ? 'is-selected' : ''} onClick={() => setSelectedScenario('expected')}>Esperado</button>
            <button type="button" aria-pressed={selectedScenario === 'conservative'} className={selectedScenario === 'conservative' ? 'is-selected is-conservative' : ''} onClick={() => setSelectedScenario('conservative')}>Conservador</button>
          </div>
        </div>

        <div className="scenario-kpi-grid">
          {metrics.map(metric => <div className="scenario-kpi" key={metric.label}><span>{metric.label}</span><strong className="font-mono-tabular">{formatCurrency(metric.value || 0)}</strong></div>)}
        </div>

        <div className="data-table-scroll">
          <table className="product-data-table">
            <caption className="sr-only">Projeção financeira mensal por cenário</caption>
            <thead><tr><th scope="col">Mês de referência</th><th scope="col">Resultado mensal</th><th scope="col">Saldo acumulado</th></tr></thead>
            <tbody>
              {monthlyProjections.map((projection, index) => {
                const netCents = selectedScenario === 'optimistic' ? projection.optimisticNetCents : selectedScenario === 'expected' ? projection.expectedNetCents : projection.conservativeNetCents;
                const balanceCents = selectedScenario === 'optimistic' ? projection.optimisticBalanceCents : selectedScenario === 'expected' ? projection.expectedBalanceCents : projection.conservativeBalanceCents;
                return <tr key={`${projection.monthKey}-${index}`}><th scope="row">{projection.monthKey}</th><td className={`font-mono-tabular ${netCents >= 0 ? 'is-income' : 'is-expense'}`}>{netCents >= 0 ? '+ ' : '− '}{formatCurrency(Math.abs(netCents))}</td><td className="font-mono-tabular">{formatCurrency(balanceCents)}</td></tr>;
              })}
              {monthlyProjections.length === 0 && <tr><td colSpan="3" className="data-table-empty">Ainda não há dados suficientes para exibir uma projeção.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="ai-method-note">As projeções são estimativas baseadas no histórico e nas regras atuais. Não representam garantia de resultados futuros.</p>
      </section>

      <section className="ai-panel" aria-labelledby="anomaly-title">
        <div className="ai-panel-heading ai-panel-heading-spread">
          <div><span className="profile-section-eyebrow">CONFERÊNCIA</span><h2 id="anomaly-title">Alertas e possíveis anomalias</h2><p>Registros que merecem uma segunda conferência, como cobranças possivelmente duplicadas.</p></div>
          <span className="anomaly-count">{visibleAnomalies.length} {visibleAnomalies.length === 1 ? 'alerta' : 'alertas'}</span>
        </div>
        {visibleAnomalies.length === 0 ? (
          <div className="ai-empty-state"><span className="ai-empty-mark" aria-hidden="true">✓</span><strong>Nenhuma anomalia identificada</strong><p>Isso não substitui a conferência dos extratos e das movimentações.</p></div>
        ) : (
          <div className="ai-anomaly-list">
            {visibleAnomalies.map(anomaly => <article key={anomaly.id} className={`ai-anomaly-item${anomaly.severity === 'high' ? ' is-high' : ''}`}><span className="ai-anomaly-mark" aria-hidden="true">{anomaly.severity === 'high' ? '!' : 'i'}</span><div className="ai-anomaly-copy"><strong>{anomaly.title}</strong><p>{anomaly.description}</p></div><button type="button" className="button-secondary" onClick={() => setIgnoredAnomalies(previous => [...previous, anomaly.id])}>Dispensar alerta</button></article>)}
          </div>
        )}
      </section>
    </div>
  );
}
