// Filtros da lista (LAN-011): conta, categoria, situação e tag. O botão diz quantos lançamentos sobram.
import { useState } from 'react';
import type { FlowFilter } from '@/application/entry-list';
import { categoryOptions, filterFlows, flowTotals } from '@/application/entry-list';
import type { FlowRow } from '@/application/entry-ops';
import { formatBRL } from '@/application/format';
import type { Category } from '@/application/model';
import type { WorkspaceView } from '@/application/session';
import { Button, TextField } from '../components/ds';

function Chips<T extends string>(p: {
  legend: string;
  options: readonly { value: T; label: string }[];
  isOn: (v: T) => boolean;
  toggle: (v: T) => void;
  multi: boolean;
}) {
  return (
    <fieldset className="rz-fieldset">
      <legend className="rz-label">{p.legend}</legend>
      <div className="rz-chips" role={p.multi ? 'group' : 'radiogroup'} aria-label={p.legend}>
        {p.options.map((o) => (
          <button
            key={o.value}
            type="button"
            className="rz-chip"
            role={p.multi ? 'checkbox' : 'radio'}
            aria-checked={p.isOn(o.value)}
            onClick={() => {
              p.toggle(o.value);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const alternar = (lista: readonly string[], v: string) =>
  lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];

export function EntryFilters(p: {
  view: WorkspaceView;
  rows: readonly FlowRow[];
  categories: readonly Category[];
  value: FlowFilter;
  onApply: (f: FlowFilter) => void;
}) {
  const [f, setF] = useState<FlowFilter>(p.value);
  const contas = p.view.accounts.map((a) => ({ value: a.account.id, label: a.account.name }));
  const principais = [
    ...categoryOptions(p.categories, 'despesa'),
    ...categoryOptions(p.categories, 'receita'),
  ]
    .filter((o) => !o.label.includes(' › '))
    .map((o) => ({ value: o.value, label: o.label }));
  const sobram = filterFlows(p.rows, f, p.categories);
  const t = flowTotals(sobram);
  const n = sobram.length;
  return (
    <div className="rz-form">
      <Chips
        legend="Conta"
        options={contas}
        multi
        isOn={(v) => f.accountIds.includes(v)}
        toggle={(v) => {
          setF({ ...f, accountIds: alternar(f.accountIds, v) });
        }}
      />
      <Chips
        legend="Situação"
        multi={false}
        options={[
          { value: 'todos', label: 'Todas' },
          { value: 'realizado', label: 'Realizado' },
          { value: 'pendente', label: 'A vencer' },
        ]}
        isOn={(v) => f.status === v}
        toggle={(v) => {
          setF({ ...f, status: v });
        }}
      />
      <Chips
        legend="Categoria"
        options={principais}
        multi
        isOn={(v) => f.categoryIds.includes(v)}
        toggle={(v) => {
          setF({ ...f, categoryIds: alternar(f.categoryIds, v) });
        }}
      />
      <TextField
        label="Tag"
        value={f.tag}
        onChange={(tag) => {
          setF({ ...f, tag });
        }}
        placeholder="Ex.: viagem"
      />
      <p className="rz-help rz-num" aria-live="polite">
        Total realizado do filtro: {formatBRL(t.result, { signed: true })}
      </p>
      <div className="rz-form-actions">
        <Button
          variant="primary"
          size="lg"
          block
          onClick={() => {
            p.onApply(f);
          }}
        >
          {n === 0
            ? 'Ver lista sem resultados'
            : `Ver ${String(n)} ${n === 1 ? 'lançamento' : 'lançamentos'}`}
        </Button>
        <Button
          variant="ghost"
          block
          onClick={() => {
            setF({ ...f, accountIds: [], categoryIds: [], status: 'todos', tag: '' });
          }}
        >
          Limpar filtros
        </Button>
      </div>
    </div>
  );
}
