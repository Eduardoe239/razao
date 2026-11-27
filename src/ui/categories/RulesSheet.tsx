// Regras automáticas (CAT-003): "descrição contém X → categoria Y", em ordem de prioridade.
// Vale a primeira que combinar; a sugestão sempre pode ser trocada no lançamento.
import { useState } from 'react';
import { categoryName, categoryOptions } from '@/application/entry-list';
import type { FlowRow } from '@/application/entry-ops';
import { messageFor } from '@/application/errors';
import type { Category, CategoryRuleItem } from '@/application/model';
import { normalizeSearch } from '@/application/search';
import type { VaultSession } from '@/application/session';
import { Alert, Button, EmptyState, TextField } from '../components/ds';
import { Icon } from '../components/Icon';
import { SelectField } from '../components/Sheet';

function NovaRegra(p: {
  session: VaultSession;
  workspaceId: string;
  categories: readonly Category[];
  rows: readonly FlowRow[];
  onDone: (m: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [cat, setCat] = useState('');
  const [op] = useState(() => p.session.newOperationId());
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const opcoes = [
    ...categoryOptions(p.categories, 'despesa').map((o) => ({ ...o, label: `Despesa · ${o.label}` })),
    ...categoryOptions(p.categories, 'receita').map((o) => ({ ...o, label: `Receita · ${o.label}` })),
  ];
  const alvo = normalizeSearch(texto);
  const antigos =
    alvo.length >= 2 ? p.rows.filter((r) => normalizeSearch(r.description).includes(alvo)).length : 0;
  const criar = async () => {
    if (busy) return;
    if (!cat) {
      setErro('Escolha a categoria que a regra vai sugerir.');
      return;
    }
    setBusy(true);
    setErro(undefined);
    try {
      await p.session.entries.createRule(p.workspaceId, { pattern: texto, categoryId: cat, operationId: op });
      p.onDone(`Regra "${texto.trim()}" criada.`);
    } catch (e) {
      setErro(messageFor(e));
      setBusy(false);
    }
  };
  return (
    <form
      className="rz-form rz-card rz-rule-new"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void criar();
      }}
    >
      <TextField
        label="Quando a descrição contém"
        value={texto}
        onChange={setTexto}
        maxLength={80}
        help="De 2 a 80 letras. Maiúsculas e acentos não fazem diferença."
      />
      <SelectField
        label="Sugerir a categoria"
        value={cat}
        onChange={setCat}
        options={[{ value: '', label: 'Escolha a categoria' }, ...opcoes]}
      />
      {antigos ? (
        <p className="rz-help">
          {antigos === 1 ? '1 lançamento antigo tem' : `${String(antigos)} lançamentos antigos têm`} esse
          texto. A regra vale para os próximos; para mudar os antigos, use Selecionar na lista de lançamentos.
        </p>
      ) : null}
      {erro ? <Alert tone="negative">{erro}</Alert> : null}
      <Button type="submit" variant="primary" busy={busy}>
        Criar regra
      </Button>
    </form>
  );
}

export function RulesSheet(p: {
  session: VaultSession;
  workspaceId: string;
  rules: readonly CategoryRuleItem[];
  categories: readonly Category[];
  rows: readonly FlowRow[];
  onChanged: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const agir = async (fn: (op: string) => Promise<unknown>, m: string) => {
    if (busy) return;
    setBusy(true);
    setErro(undefined);
    try {
      await fn(p.session.newOperationId());
      p.onChanged(m);
    } catch (e) {
      setErro(messageFor(e));
    } finally {
      setBusy(false);
    }
  };
  const ids = p.rules.map((r) => r.id);
  const mover = (i: number, d: number) => {
    const n = [...ids];
    const j = i + d;
    const a = n[i];
    const b = n[j];
    if (a === undefined || b === undefined) return;
    n[i] = b;
    n[j] = a;
    void agir(
      (operationId) => p.session.entries.reorderRules(p.workspaceId, { ruleIds: n, operationId }),
      'Ordem das regras alterada.',
    );
  };
  return (
    <div className="rz-form">
      <p className="rz-sheet-text">
        Quando a descrição tiver o texto, o app sugere a categoria. Vale a primeira da lista que combinar, e
        você sempre pode trocar a sugestão.
      </p>
      {erro ? <Alert tone="negative">{erro}</Alert> : null}
      {p.rules.length ? (
        <ol className="rz-list rz-rules" aria-label="Regras em ordem de prioridade">
          {p.rules.map((r, i) => {
            const nomeCat = categoryName(p.categories, r.categoryId);
            return (
              <li key={r.id} className="rz-rule">
                <span className="rz-rule-pos rz-num">{i + 1}º</span>
                <span className={r.active ? 'rz-rule-text' : 'rz-rule-text rz-rule-off'}>
                  <span>
                    contém <strong>"{r.pattern}"</strong>
                  </span>
                  <span className="rz-help">
                    sugere {nomeCat}
                    {r.active ? '' : ' · desligada'}
                  </span>
                </span>
                <span className="rz-rule-actions">
                  <button
                    type="button"
                    className="rz-period-btn"
                    aria-label={`Subir a regra ${r.pattern}`}
                    disabled={i === 0 || busy}
                    onClick={() => {
                      mover(i, -1);
                    }}
                  >
                    <Icon name="chevron" size={18} />
                  </button>
                  <button
                    type="button"
                    className="rz-period-btn rz-rule-down"
                    aria-label={`Descer a regra ${r.pattern}`}
                    disabled={i === p.rules.length - 1 || busy}
                    onClick={() => {
                      mover(i, 1);
                    }}
                  >
                    <Icon name="chevron" size={18} />
                  </button>
                  <label className="rz-rule-toggle">
                    <span className="rz-visually-hidden">Regra {r.pattern} ligada</span>
                    <input
                      type="checkbox"
                      className="rz-checkbox"
                      checked={r.active}
                      disabled={busy}
                      onChange={() =>
                        void agir(
                          (operationId) =>
                            p.session.entries.updateRule(p.workspaceId, {
                              ruleId: r.id,
                              pattern: r.pattern,
                              categoryId: r.categoryId,
                              active: !r.active,
                              operationId,
                            }),
                          r.active ? `Regra "${r.pattern}" desligada.` : `Regra "${r.pattern}" ligada.`,
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="rz-period-btn"
                    aria-label={`Apagar a regra ${r.pattern}`}
                    disabled={busy}
                    onClick={() =>
                      void agir(
                        (operationId) =>
                          p.session.entries.removeRule(p.workspaceId, { ruleId: r.id, operationId }),
                        `Regra "${r.pattern}" apagada.`,
                      )
                    }
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState
          title="Nenhuma regra ainda"
          text='Crie uma regra como "posto" → Combustível e a categoria já vem escolhida no próximo lançamento.'
        />
      )}
      <NovaRegra
        key={p.rules.length}
        session={p.session}
        workspaceId={p.workspaceId}
        categories={p.categories}
        rows={p.rows}
        onDone={p.onChanged}
      />
    </div>
  );
}
