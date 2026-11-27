// Ligar e desligar a Razão IA nível 1 (IA-013). O app funciona por completo com ela desligada.
import { useState } from 'react';
import type { VaultSession } from '@/application/session';

export function AiSettings(p: { session: VaultSession; onChanged: (m: string) => void }) {
  const [ligada, setLigada] = useState(() => p.session.entries.aiEnabled());
  return (
    <div className="rz-blocks rz-enter">
      <section className="rz-card rz-section" aria-labelledby="ia-n1">
        <h2 id="ia-n1" className="rz-section-title">
          Razão IA nível 1
        </h2>
        <p className="rz-sheet-text">
          Roda só neste aparelho, sem internet e sem custo. Não é um chat e não usa modelo de linguagem: são
          contas e regras que explicam o motivo de cada sugestão.
        </p>
        <ul className="rz-ia-list">
          <li>Sugere a categoria pelo seu histórico e pelas palavras da descrição.</li>
          <li>Mostra "Explicar" nos saldos e totais, com os lançamentos que formam cada número.</li>
          <li>
            Mostra no Início até 3 alertas: atrasado, saldo que pode ficar no vermelho, vencimento próximo e
            possível lançamento repetido.
          </li>
        </ul>
        <label className="rz-check-line rz-ia-switch">
          <span>{ligada ? 'Ligada' : 'Desligada'}</span>
          <input
            type="checkbox"
            role="switch"
            className="rz-checkbox"
            aria-label="Razão IA nível 1"
            checked={ligada}
            onChange={() => {
              const novo = !ligada;
              p.session.entries.setAiEnabled(novo);
              setLigada(novo);
              p.onChanged(novo ? 'Razão IA ligada neste aparelho.' : 'Razão IA desligada neste aparelho.');
            }}
          />
        </label>
        <p className="rz-help">
          Desligada, o app continua completo: só some o que é sugestão, explicação automática e alerta. As
          suas regras automáticas continuam valendo, porque foi você quem criou. Vale para este aparelho.
        </p>
      </section>
    </div>
  );
}
