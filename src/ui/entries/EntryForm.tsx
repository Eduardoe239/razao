// Novo lançamento, edição e duplicar (LAN-001 a LAN-008, LAN-010; J-02). A categoria sugerida pela regra
// já vem escolhida e sempre pode ser trocada (CAT-003). Clique duplo grava uma vez só (LAN-012).
import { useRef, useState } from 'react';
import { categoryName, categoryOptions, lastCategory } from '@/application/entry-list';
import type { FlowEntryInput, FlowRow } from '@/application/entry-ops';
import { parseTags } from '@/application/entry-ops';
import type { Suggester } from '@/application/ai';
import { messageFor } from '@/application/errors';
import { formatBRL, readMoney } from '@/application/format';
import type { Category } from '@/application/model';
import type { VaultSession, WorkspaceView } from '@/application/session';
import { TransferForm } from '../accounts/AccountForms';
import { Alert, Button, MoneyField, TextField } from '../components/ds';
import { DateField, SelectField } from '../components/Sheet';

type Tipo = 'despesa' | 'receita' | 'transferencia';
type Parte = { categoryId: string; valor: string };

export interface EntryFormProps {
  readonly session: VaultSession;
  readonly view: WorkspaceView;
  readonly categories: readonly Category[];
  readonly rows: readonly FlowRow[];
  /** Sem `row`: novo. Com `row` e `duplicate`: cópia com a data de hoje. Com `row`: edição. */
  readonly row?: FlowRow | undefined;
  readonly duplicate?: boolean;
  readonly onDone: (message: string) => void;
  /** Sugestão de categoria (regras e Razão IA nível 1), montada uma vez por quem abre o formulário. */
  readonly suggest: Suggester;
}

const centavos = (c: number) => formatBRL(c).replace(/^R\$\s/, '');

export function EntryForm(p: EntryFormProps) {
  const { session, view, categories, row } = p;
  const ws = view.workspace.id;
  const editando = row !== undefined && !p.duplicate;
  const contas = view.accounts.filter((a) => !a.account.archived || a.account.id === row?.accountId);
  const [tipo, setTipo] = useState<Tipo>(row?.kind ?? 'despesa');
  const kind = tipo === 'receita' ? 'receita' : 'despesa';
  const opcoes = categoryOptions(categories, kind);
  const inicialCat = row?.parts.length === 1 ? (row.parts[0]?.categoryId ?? '') : '';
  const [valor, setValor] = useState(row ? centavos(row.amountCents) : '');
  const [descricao, setDescricao] = useState(row?.description ?? '');
  const [categoria, setCategoria] = useState(inicialCat || (lastCategory(p.rows, 'despesa') ?? ''));
  const [catTocada, setCatTocada] = useState(row !== undefined);
  const [dividido, setDividido] = useState((row?.parts.length ?? 0) > 1);
  const [partes, setPartes] = useState<Parte[]>(
    row && row.parts.length > 1
      ? row.parts.map((x) => ({ categoryId: x.categoryId, valor: centavos(x.amountCents) }))
      : [
          { categoryId: '', valor: '' },
          { categoryId: '', valor: '' },
        ],
  );
  const [conta, setConta] = useState(row?.accountId ?? contas[0]?.account.id ?? '');
  const hoje = view.asOf as string;
  const [data, setData] = useState(row && !p.duplicate ? (row.date as string) : hoje);
  const [status, setStatus] = useState(row && !p.duplicate ? row.status : 'realizado');
  const [tags, setTags] = useState(row?.tags.join(', ') ?? '');
  const [nota, setNota] = useState(row?.note ?? '');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const op = useRef<string | null>(null);
  const select = useRef<HTMLDivElement>(null);

  // CAT-003 e IA-001: regra da pessoa, histórico ou palavras, só enquanto ela não escolheu a categoria sozinha.
  const sugerida =
    !catTocada && !dividido && tipo !== 'transferencia' && descricao.trim()
      ? p.suggest(descricao, kind)
      : undefined;
  const categoriaFinal = sugerida?.categoryId ?? categoria;

  /** Ao trocar de tipo, a categoria volta para a última usada naquele tipo (receita só oferece receita). */
  const mudarTipo = (novo: Tipo) => {
    setTipo(novo);
    const k = novo === 'receita' ? 'receita' : 'despesa';
    if (k !== kind) {
      setCategoria(lastCategory(p.rows, k) ?? '');
      setCatTocada(false);
    }
  };

  const total = readMoney(valor);
  const somaPartes = partes.reduce((s, x) => {
    const v = readMoney(x.valor);
    return s + (v.ok ? v.cents : 0);
  }, 0);
  const falta = total.ok ? total.cents - somaPartes : 0;

  const enviar = async () => {
    if (busy) return;
    const e: Record<string, string> = {};
    if (!total.ok) e['valor'] = valor.trim() ? total.reason : 'Digite o valor.';
    if (!conta) e['conta'] = 'Escolha a conta.';
    if (!dividido && !categoriaFinal) e['categoria'] = 'Escolha a categoria.';
    if (dividido) {
      partes.forEach((x, i) => {
        const v = readMoney(x.valor);
        if (!x.categoryId) e[`cat${String(i)}`] = 'Escolha a categoria.';
        if (!v.ok) e[`val${String(i)}`] = x.valor.trim() ? v.reason : 'Digite o valor.';
      });
      if (new Set(partes.map((x) => x.categoryId)).size !== partes.length) {
        e['partes'] = 'Cada categoria aparece uma vez só na divisão.';
      } else if (total.ok && falta !== 0) {
        e['partes'] =
          falta > 0 ? `Falta distribuir ${formatBRL(falta)}.` : `Passou ${formatBRL(-falta)} do total.`;
      }
    }
    setErros(e);
    if (Object.keys(e).length || !total.ok) return;
    const input: Omit<FlowEntryInput, 'operationId'> = {
      kind,
      accountId: conta,
      parts: dividido
        ? partes.map((x) => {
            const v = readMoney(x.valor);
            return { categoryId: x.categoryId, amountCents: v.ok ? v.cents : 0 };
          })
        : [{ categoryId: categoriaFinal, amountCents: total.cents }],
      date: data,
      status,
      description: descricao,
      tags: parseTags(tags),
      note: nota,
    };
    op.current ??= session.newOperationId();
    setBusy(true);
    setErro(undefined);
    try {
      const pronto = { ...input, operationId: op.current };
      if (editando) await session.entries.edit(ws, row.entryId, pronto);
      else await session.entries.create(ws, pronto);
      const nome =
        descricao.trim() || (dividido ? 'Lançamento dividido' : categoryName(categories, categoria));
      p.onDone(`${nome} · ${formatBRL(total.cents)} ${editando ? 'alterado' : 'salvo'}.`);
    } catch (falha) {
      setErro(messageFor(falha));
      setBusy(false);
    }
  };

  const tipos: [Tipo, string][] = editando
    ? [
        ['despesa', 'Saída'],
        ['receita', 'Entrada'],
      ]
    : [
        ['despesa', 'Saída'],
        ['receita', 'Entrada'],
        ['transferencia', 'Transferência'],
      ];

  const seletorTipo = (
    <div className="rz-seg rz-entry-type" role="group" aria-label="Tipo">
      {tipos.map(([id, rotulo]) => (
        <button
          key={id}
          type="button"
          className="rz-seg-btn"
          aria-pressed={tipo === id}
          onClick={() => {
            mudarTipo(id);
          }}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );

  if (tipo === 'transferencia') {
    return (
      <div className="rz-form">
        {seletorTipo}
        <TransferForm session={session} view={view} onDone={p.onDone} />
      </div>
    );
  }

  const opcoesSelect = [{ value: '', label: 'Escolha a categoria' }, ...opcoes];
  return (
    <form
      className="rz-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
    >
      {seletorTipo}
      <MoneyField label="Valor" value={valor} onChange={setValor} error={erros['valor']} autoFocus={!row} />
      <TextField label="Descrição" value={descricao} onChange={setDescricao} maxLength={200} />
      {sugerida ? (
        <div className="rz-suggestion" role="status">
          <span>
            Categoria sugerida: <strong>{categoryName(categories, sugerida.categoryId)}</strong>
            <span className="rz-suggestion-why">{sugerida.why}</span>
          </span>
          <Button
            size="sm"
            onClick={() => {
              setCategoria(sugerida.categoryId);
              setCatTocada(true);
              select.current?.querySelector('select')?.focus();
            }}
          >
            Trocar
          </Button>
        </div>
      ) : null}
      {!dividido ? (
        <div ref={select}>
          <SelectField
            label="Categoria"
            value={categoriaFinal}
            onChange={(v) => {
              setCatTocada(true);
              setCategoria(v);
            }}
            options={opcoesSelect}
            error={erros['categoria']}
          />
        </div>
      ) : (
        <fieldset className="rz-fieldset rz-split">
          <legend className="rz-label">Dividir em categorias</legend>
          {partes.map((x, i) => (
            <div key={i} className="rz-split-row">
              <SelectField
                label={`Categoria ${String(i + 1)}`}
                value={x.categoryId}
                onChange={(v) => {
                  setPartes(partes.map((y, j) => (j === i ? { ...y, categoryId: v } : y)));
                }}
                options={opcoesSelect}
                error={erros[`cat${String(i)}`]}
              />
              <MoneyField
                label={`Valor ${String(i + 1)}`}
                value={x.valor}
                onChange={(v) => {
                  setPartes(partes.map((y, j) => (j === i ? { ...y, valor: v } : y)));
                }}
                error={erros[`val${String(i)}`]}
              />
            </div>
          ))}
          <div className="rz-split-foot">
            <span className="rz-split-actions">
              <Button
                variant="ghost"
                size="sm"
                disabled={partes.length >= 10}
                onClick={() => {
                  setPartes([...partes, { categoryId: '', valor: '' }]);
                }}
              >
                Adicionar categoria
              </Button>
              {partes.length > 2 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPartes(partes.slice(0, -1));
                  }}
                >
                  Tirar a última
                </Button>
              ) : null}
            </span>
            <span
              className={`rz-num ${falta === 0 && total.ok ? 'rz-split-ok' : 'rz-split-left'}`}
              aria-live="polite"
            >
              {!total.ok
                ? 'Digite o valor total'
                : falta === 0
                  ? 'Tudo distribuído'
                  : falta > 0
                    ? `Falta ${formatBRL(falta)}`
                    : `Passou ${formatBRL(-falta)}`}
            </span>
          </div>
          {erros['partes'] ? (
            <span className="rz-help" role="alert">
              {erros['partes']}
            </span>
          ) : null}
        </fieldset>
      )}
      <label className="rz-check-line">
        <span>Dividir em mais de uma categoria</span>
        <input
          type="checkbox"
          className="rz-checkbox"
          checked={dividido}
          onChange={() => {
            setDividido(!dividido);
          }}
        />
      </label>
      <div className="rz-form-pair">
        <SelectField
          label={kind === 'receita' ? 'Recebido em' : 'Pago com'}
          value={conta}
          onChange={setConta}
          options={contas.map((a) => ({ value: a.account.id, label: a.account.name }))}
          error={erros['conta']}
        />
        <DateField
          label="Data"
          value={data}
          {...(status === 'realizado' ? { max: hoje } : {})}
          onChange={setData}
        />
      </div>
      <fieldset className="rz-fieldset">
        <legend className="rz-label">Situação</legend>
        <div className="rz-seg rz-entry-type" role="group" aria-label="Situação">
          {(
            [
              ['realizado', 'Realizado'],
              ['pendente', 'A vencer'],
            ] as const
          )
            .filter(([id]) => !editando || row.status === 'pendente' || id === 'realizado')
            .map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                className="rz-seg-btn"
                aria-pressed={status === id}
                onClick={() => {
                  setStatus(id);
                }}
              >
                {rotulo}
              </button>
            ))}
        </div>
        <span className="rz-help">
          {status === 'pendente'
            ? 'Fica em A vencer e não entra no saldo até você confirmar o pagamento.'
            : 'Já aconteceu: entra no saldo da conta. Data futura só como A vencer.'}
        </span>
      </fieldset>
      <details className="rz-more" open={Boolean(row?.tags.length) || Boolean(row?.note)}>
        <summary>Tags e observação</summary>
        <div className="rz-form">
          <TextField
            label="Tags"
            value={tags}
            onChange={setTags}
            placeholder="viagem, trabalho"
            help="Separe com vírgula. Servem para filtrar."
          />
          <TextField label="Observação" value={nota} onChange={setNota} maxLength={500} />
        </div>
      </details>
      {erro ? (
        <Alert tone="negative" title="Não deu certo">
          {erro}
        </Alert>
      ) : null}
      <div className="rz-form-actions">
        <Button type="submit" variant="primary" size="lg" block busy={busy}>
          {editando ? 'Salvar alteração' : 'Salvar lançamento'}
        </Button>
      </div>
    </form>
  );
}
