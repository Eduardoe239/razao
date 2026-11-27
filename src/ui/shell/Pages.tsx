// Conteúdo das sub-abas. Na I-05a existem de verdade a Visão geral e as Contas; as outras dizem com
// honestidade que ainda não estão disponíveis, sem dado fictício (Volume 09: nada de demonstração como pronto).
import { useState } from 'react';
import { formatDate } from '@/application/format';
import type { AccountView, VaultSession, WorkspaceView } from '@/application/session';
import { ACCOUNT_KIND_LABELS } from '@/application/model';
import { AccountSheet } from '../accounts/AccountSheet';
import { NewAccountForm, TransferForm } from '../accounts/AccountForms';
import type { BackupStatus } from '@/application/reminder';
import { Alert, Amount, Badge, Button, EmptyState, StatCard } from '../components/ds';
import { Sheet } from '../components/Sheet';
import { EntriesPage } from '../entries/EntriesPage';
import { AlertsBlock, ExplainBalanceSheet } from '../ai/HomeInsights';
import type { Route } from './nav';
import { BACKUP, areaOf } from './nav';

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? partes[0]?.[1] ?? '')).toUpperCase();
}

function AccountRow({ item }: { item: AccountView }) {
  const { account, balance } = item;
  return (
    <div className="rz-tx">
      <span className="rz-tx-icon" aria-hidden="true">
        {iniciais(account.name)}
      </span>
      <div>
        <div className="rz-tx-title">{account.name}</div>
        <div className="rz-tx-meta">{ACCOUNT_KIND_LABELS[account.kind]}</div>
      </div>
      <div className="rz-tx-right">
        <Amount cents={balance} kind="balance" />
      </div>
    </div>
  );
}

function AccountList({
  accounts,
  onSelect,
  label = 'Contas',
}: {
  accounts: readonly AccountView[];
  onSelect?: (a: AccountView) => void;
  label?: string;
}) {
  return (
    <ul className="rz-list" aria-label={label} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {accounts.map((item) => (
        <li key={item.account.id}>
          {onSelect ? (
            <button
              type="button"
              className="rz-row-btn"
              onClick={() => {
                onSelect(item);
              }}
            >
              <AccountRow item={item} />
            </button>
          ) : (
            <AccountRow item={item} />
          )}
        </li>
      ))}
    </ul>
  );
}

function contasTexto(n: number): string {
  return n === 1 ? '1 conta' : `${String(n)} contas`;
}

type Lembrete = BackupStatus['reminder'];

function Inicio({
  session,
  view,
  navigate,
  reminder,
}: {
  session: VaultSession;
  view: WorkspaceView;
  navigate: (r: Route) => void;
  reminder: Lembrete;
}) {
  const [explicar, setExplicar] = useState(false);
  const ia = session.entries.aiEnabled();
  const ativas = view.accounts.filter((a) => !a.account.archived);
  const verContas = () => {
    navigate({ area: 'contas', sub: 'contas' });
  };
  return (
    <div className="rz-blocks rz-enter">
      {reminder ? (
        <Alert tone={reminder.tone} title="Hora de fazer backup">
          {reminder.text}{' '}
          <Button
            size="sm"
            onClick={() => {
              navigate(BACKUP);
            }}
          >
            Fazer backup
          </Button>
        </Alert>
      ) : null}
      <AlertsBlock
        session={session}
        view={view}
        onSee={(a) => {
          navigate({ area: 'lancamentos', sub: a.kind === 'duplicado' ? 'todos' : 'a-vencer' });
        }}
      />
      <div className="rz-blocks rz-home">
        <div className="rz-home-stat">
          <StatCard
            label="Saldo em contas"
            cents={view.total}
            hero
            foot={`${contasTexto(ativas.length)} · até hoje, ${formatDate(view.asOf)}`}
          />
          {ia ? (
            <button
              type="button"
              className="rz-explain-open rz-home-explain"
              onClick={() => {
                setExplicar(true);
              }}
            >
              Por que o saldo mudou
            </button>
          ) : null}
        </div>
        <section className="rz-section rz-home-contas" aria-labelledby="suas-contas">
          <div className="rz-section-head">
            <h2 id="suas-contas" className="rz-section-title">
              Suas contas
            </h2>
            <Button variant="ghost" size="sm" onClick={verContas}>
              Ver contas
            </Button>
          </div>
          {ativas.length ? (
            <AccountList accounts={ativas.slice(0, 5)} />
          ) : (
            <div className="rz-card">
              <EmptyState
                title="Nenhuma conta neste espaço"
                text="As contas deste espaço aparecem aqui, com o saldo de cada uma."
              />
            </div>
          )}
        </section>
        <section className="rz-card rz-section rz-home-passos" aria-labelledby="passos">
          <h2 id="passos" className="rz-section-title">
            Próximos passos
          </h2>
          <div className="rz-list" style={{ border: 0 }}>
            {['Importar um extrato', 'Cadastrar um cartão'].map((s) => (
              <div key={s} className="rz-suggest">
                <span>{s}</span>
                <Badge>Em breve</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
      {explicar ? (
        <ExplainBalanceSheet
          session={session}
          view={view}
          onClose={() => {
            setExplicar(false);
          }}
        />
      ) : null}
    </div>
  );
}

type Painel = { t: 'nova' } | { t: 'transferir' } | { t: 'conta'; id: string } | null;

function Contas({
  session,
  view,
  onChanged,
}: {
  session: VaultSession;
  view: WorkspaceView;
  onChanged: (m: string) => void;
}) {
  const [painel, setPainel] = useState<Painel>(null);
  const ativas = view.accounts.filter((a) => !a.account.archived);
  const arquivadas = view.accounts.filter((a) => a.account.archived);
  const fechar = () => {
    setPainel(null);
  };
  const feito = (m: string) => {
    setPainel(null);
    onChanged(m);
  };
  const selecionada =
    painel?.t === 'conta' ? view.accounts.find((a) => a.account.id === painel.id) : undefined;
  return (
    <div className="rz-blocks rz-enter">
      <div className="rz-actions">
        <Button
          variant="primary"
          icon="plus"
          onClick={() => {
            setPainel({ t: 'nova' });
          }}
        >
          Nova conta
        </Button>
        <Button
          icon="transfer"
          disabled={ativas.length < 2}
          onClick={() => {
            setPainel({ t: 'transferir' });
          }}
        >
          Transferir
        </Button>
      </div>
      {ativas.length ? (
        <>
          <StatCard
            label="Total em contas"
            cents={view.total}
            foot={`${contasTexto(ativas.length)} · até hoje, ${formatDate(view.asOf)}`}
          />
          <AccountList
            accounts={ativas}
            onSelect={(a) => {
              setPainel({ t: 'conta', id: a.account.id });
            }}
          />
        </>
      ) : (
        <div className="rz-card">
          <EmptyState
            title="Nenhuma conta neste espaço"
            text="Crie uma conta para acompanhar o saldo dela aqui."
          />
        </div>
      )}
      {arquivadas.length ? (
        <details className="rz-archived">
          <summary>Arquivadas ({arquivadas.length})</summary>
          <AccountList
            label="Contas arquivadas"
            accounts={arquivadas}
            onSelect={(a) => {
              setPainel({ t: 'conta', id: a.account.id });
            }}
          />
        </details>
      ) : null}
      {painel?.t === 'nova' ? (
        <Sheet title="Nova conta" onClose={fechar}>
          <NewAccountForm session={session} view={view} onDone={feito} />
        </Sheet>
      ) : null}
      {painel?.t === 'transferir' ? (
        <Sheet title="Transferir" onClose={fechar}>
          <TransferForm session={session} view={view} onDone={feito} />
        </Sheet>
      ) : null}
      {selecionada ? (
        <AccountSheet session={session} view={view} item={selecionada} onClose={fechar} onDone={feito} />
      ) : null}
    </div>
  );
}

export function PageBody({
  route,
  view,
  navigate,
  session,
  onChanged,
  onRefresh,
  reminder,
}: {
  route: Route;
  view: WorkspaceView;
  navigate: (r: Route) => void;
  session: VaultSession;
  onChanged: (m: string) => void;
  onRefresh: () => void;
  reminder: Lembrete;
}) {
  if (route.area === 'lancamentos')
    return (
      <EntriesPage
        session={session}
        view={view}
        tab={route.sub}
        onChanged={onChanged}
        onRefresh={onRefresh}
      />
    );
  if (route.area === 'inicio' && route.sub === 'visao-geral')
    return <Inicio session={session} view={view} navigate={navigate} reminder={reminder} />;
  if (route.area === 'contas' && route.sub === 'contas')
    return <Contas session={session} view={view} onChanged={onChanged} />;
  const area = areaOf(route.area);
  const sub = area.subs(view.workspace.kind).find((s) => s.id === route.sub)?.label ?? area.label;
  return (
    <div className="rz-card rz-enter">
      <EmptyState
        title={`${sub}: ainda não disponível`}
        text="Esta parte do Razão ainda não está pronta nesta versão de teste. Nada foi omitido dos seus dados."
      />
    </div>
  );
}
