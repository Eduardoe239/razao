// Formulários de conta: nova, editar, transferir e ajustar saldo (CON-001, CON-002, CON-004, CON-006).
// Cada formulário gera a sua operação uma vez: clique duplo ou repetição não gravam duas vezes (INV-06).
import type { SyntheticEvent } from 'react';
import { useRef, useState } from 'react';
import { messageFor } from '@/application/errors';
import { formatBRL, readMoney } from '@/application/format';
import type { Account, AccountKind } from '@/application/model';
import { ACCOUNT_KIND_LABELS, ACCOUNT_KINDS } from '@/application/model';
import type { VaultSession, WorkspaceView } from '@/application/session';
import { Alert, Button, MoneyField, TextField } from '../components/ds';
import { DateField, SelectField } from '../components/Sheet';

export interface FormProps {
  readonly session: VaultSession;
  readonly view: WorkspaceView;
  readonly onDone: (message: string) => void;
}

/** Envio com estado de ocupado, erro visível e a mesma operação em todas as tentativas. */
function useEnvio(session: VaultSession) {
  const op = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const run = async (fn: (operationId: string) => Promise<unknown>, depois: () => void) => {
    if (busy) return;
    op.current ??= session.newOperationId();
    setBusy(true);
    setErro(undefined);
    try {
      await fn(op.current);
      depois();
    } catch (e) {
      setErro(messageFor(e));
      setBusy(false);
    }
  };
  return { busy, erro, run };
}

const parar = (fn: () => void) => (e: SyntheticEvent) => {
  e.preventDefault();
  fn();
};

export function KindChips({ value, onChange }: { value: AccountKind; onChange: (k: AccountKind) => void }) {
  return (
    <fieldset className="rz-fieldset">
      <legend className="rz-label">Tipo</legend>
      <div role="radiogroup" aria-label="Tipo da conta" className="rz-chips">
        {ACCOUNT_KINDS.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={value === t}
            className="rz-chip"
            onClick={() => {
              onChange(t);
            }}
          >
            {ACCOUNT_KIND_LABELS[t]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Rodape({
  busy,
  label,
  erro,
  onCancel,
}: {
  busy: boolean;
  label: string;
  erro: string | undefined;
  onCancel?: () => void;
}) {
  return (
    <>
      {erro ? (
        <Alert tone="negative" title="Não deu certo">
          {erro}
        </Alert>
      ) : null}
      <div className="rz-form-actions">
        <Button type="submit" variant="primary" size="lg" block busy={busy}>
          {label}
        </Button>
        {onCancel ? (
          <Button variant="ghost" block onClick={onCancel}>
            Voltar
          </Button>
        ) : null}
      </div>
    </>
  );
}

export function NewAccountForm({ session, view, onDone }: FormProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<AccountKind>('corrente');
  const [saldo, setSaldo] = useState('');
  const [erros, setErros] = useState<{ nome?: string; saldo?: string }>({});
  const { busy, erro, run } = useEnvio(session);
  const enviar = () => {
    const e: { nome?: string; saldo?: string } = {};
    if (!nome.trim()) e.nome = 'Dê um nome à conta, como o do banco.';
    const v = saldo.trim() === '' ? null : readMoney(saldo, true);
    if (!v) e.saldo = 'Digite o saldo de hoje. Pode ser R$ 0,00.';
    else if (!v.ok) e.saldo = v.reason;
    setErros(e);
    if (e.nome || e.saldo || !v?.ok) return;
    void run(
      (operationId) =>
        session.createAccount(view.workspace.id, {
          name: nome,
          kind: tipo,
          openingCents: v.cents,
          operationId,
        }),
      () => {
        onDone(`Conta ${nome.trim()} criada com saldo de ${formatBRL(v.cents)}.`);
      },
    );
  };
  return (
    <form className="rz-form" onSubmit={parar(enviar)} noValidate>
      <TextField
        label="Nome da conta"
        value={nome}
        onChange={setNome}
        maxLength={60}
        autoFocus
        error={erros.nome}
      />
      <KindChips value={tipo} onChange={setTipo} />
      <MoneyField
        label="Saldo de hoje"
        value={saldo}
        onChange={setSaldo}
        help="Se a conta está no negativo, comece com o sinal de menos."
        error={erros.saldo}
      />
      <Rodape busy={busy} label="Criar conta" erro={erro} />
    </form>
  );
}

export function EditAccountForm({
  session,
  view,
  onDone,
  account,
  onCancel,
}: FormProps & { account: Account; onCancel: () => void }) {
  const [nome, setNome] = useState(account.name);
  const [tipo, setTipo] = useState<AccountKind>(account.kind);
  const [erroNome, setErroNome] = useState<string | undefined>();
  const { busy, erro, run } = useEnvio(session);
  const enviar = () => {
    setErroNome(nome.trim() ? undefined : 'Dê um nome à conta.');
    if (!nome.trim()) return;
    void run(
      (operationId) =>
        session.updateAccount(view.workspace.id, {
          accountId: account.id,
          name: nome,
          kind: tipo,
          operationId,
        }),
      () => {
        onDone(`Conta ${nome.trim()} atualizada.`);
      },
    );
  };
  return (
    <form className="rz-form" onSubmit={parar(enviar)} noValidate>
      <TextField
        label="Nome da conta"
        value={nome}
        onChange={setNome}
        maxLength={60}
        autoFocus
        error={erroNome}
      />
      <KindChips value={tipo} onChange={setTipo} />
      <Rodape busy={busy} label="Salvar" erro={erro} onCancel={onCancel} />
    </form>
  );
}

export function TransferForm({
  session,
  view,
  onDone,
  fromId,
  onCancel,
}: FormProps & { fromId?: string; onCancel?: () => void }) {
  const ativas = view.accounts.filter((a) => !a.account.archived);
  const opcoes = ativas.map((a) => ({
    value: a.account.id,
    label: `${a.account.name} · ${formatBRL(a.balance)}`,
  }));
  const inicial = fromId ?? ativas[0]?.account.id ?? '';
  const [de, setDe] = useState(inicial);
  const [para, setPara] = useState(ativas.find((a) => a.account.id !== inicial)?.account.id ?? '');
  const [valor, setValor] = useState('');
  const [tarifa, setTarifa] = useState('');
  const [data, setData] = useState(view.asOf as string);
  const [erros, setErros] = useState<{ valor?: string; tarifa?: string; para?: string }>({});
  const { busy, erro, run } = useEnvio(session);
  const enviar = () => {
    const e: { valor?: string; tarifa?: string; para?: string } = {};
    const v = readMoney(valor);
    const t = tarifa.trim() === '' ? ({ ok: true, cents: 0 } as const) : readMoney(tarifa);
    if (!v.ok) e.valor = valor.trim() ? v.reason : 'Digite o valor.';
    if (!t.ok) e.tarifa = t.reason;
    if (de === para) e.para = 'Escolha uma conta diferente da origem.';
    setErros(e);
    if (!v.ok || !t.ok || e.para) return;
    const nomeDe = ativas.find((a) => a.account.id === de)?.account.name ?? '';
    const nomePara = ativas.find((a) => a.account.id === para)?.account.name ?? '';
    void run(
      (operationId) =>
        session.transfer(view.workspace.id, {
          fromId: de,
          toId: para,
          amountCents: v.cents,
          feeCents: t.cents,
          date: data,
          operationId,
        }),
      () => {
        onDone(`Transferência de ${formatBRL(v.cents)} de ${nomeDe} para ${nomePara} salva.`);
      },
    );
  };
  if (ativas.length < 2) {
    return (
      <Alert tone="info">Para transferir, você precisa de pelo menos duas contas ativas neste espaço.</Alert>
    );
  }
  return (
    <form className="rz-form" onSubmit={parar(enviar)} noValidate>
      <SelectField label="De" value={de} onChange={setDe} options={opcoes} />
      <SelectField label="Para" value={para} onChange={setPara} options={opcoes} error={erros.para} />
      <MoneyField label="Valor" value={valor} onChange={setValor} error={erros.valor} />
      <MoneyField
        label="Tarifa (opcional)"
        value={tarifa}
        onChange={setTarifa}
        help="Cobrada da conta de origem, entra como despesa."
        error={erros.tarifa}
      />
      <DateField label="Data" value={data} max={view.asOf} onChange={setData} />
      <Rodape busy={busy} label="Transferir" erro={erro} {...(onCancel ? { onCancel } : {})} />
    </form>
  );
}

export function AdjustForm({
  session,
  view,
  onDone,
  account,
  balance,
  onCancel,
}: FormProps & { account: Account; balance: number; onCancel: () => void }) {
  const [alvo, setAlvo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<{ alvo?: string; motivo?: string }>({});
  const { busy, erro, run } = useEnvio(session);
  const lido = alvo.trim() ? readMoney(alvo, true) : null;
  const diferenca = lido?.ok ? lido.cents - balance : null;
  const enviar = () => {
    const e: { alvo?: string; motivo?: string } = {};
    if (!lido) e.alvo = 'Digite o saldo certo de hoje.';
    else if (!lido.ok) e.alvo = lido.reason;
    if (!motivo.trim()) e.motivo = 'Explique o motivo, por exemplo "conferi com o extrato".';
    setErros(e);
    if (!lido?.ok || e.motivo) return;
    void run(
      (operationId) =>
        session.adjustBalance(view.workspace.id, {
          accountId: account.id,
          targetCents: lido.cents,
          reason: motivo,
          operationId,
        }),
      () => {
        onDone(`Saldo de ${account.name} ajustado para ${formatBRL(lido.cents)}.`);
      },
    );
  };
  return (
    <form className="rz-form" onSubmit={parar(enviar)} noValidate>
      <p className="rz-ob-lead">
        Saldo no Razão hoje: <strong>{formatBRL(balance)}</strong>. Informe o saldo certo; a diferença vira um
        lançamento de ajuste.
      </p>
      <MoneyField
        label="Saldo certo de hoje"
        value={alvo}
        onChange={setAlvo}
        autoFocus
        error={erros.alvo}
        help={
          diferenca !== null
            ? `Diferença: ${formatBRL(diferenca, { signed: true })}`
            : 'Se a conta está no negativo, comece com o sinal de menos.'
        }
      />
      <TextField label="Motivo" value={motivo} onChange={setMotivo} maxLength={200} error={erros.motivo} />
      <Rodape busy={busy} label="Ajustar saldo" erro={erro} onCancel={onCancel} />
    </form>
  );
}
