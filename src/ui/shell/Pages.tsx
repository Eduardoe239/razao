// Conteúdo das sub-abas. Na I-05a existem de verdade a Visão geral e as Contas; as outras dizem com
// honestidade que ainda não estão disponíveis, sem dado fictício (Volume 09: nada de demonstração como pronto).
import { formatDate } from '@/application/format';
import type { AccountView, WorkspaceView } from '@/application/session';
import { ACCOUNT_KIND_LABELS } from '@/application/model';
import { Amount, Badge, Button, EmptyState, StatCard } from '../components/ds';
import type { Route } from './nav';
import { areaOf } from './nav';

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? partes[0]?.[1] ?? '')).toUpperCase();
}

function AccountList({ accounts }: { accounts: readonly AccountView[] }) {
  return (
    <ul className="rz-list" aria-label="Contas" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {accounts.map(({ account, balance }) => (
        <li key={account.id} className="rz-tx">
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
        </li>
      ))}
    </ul>
  );
}

function contasTexto(n: number): string {
  return n === 1 ? '1 conta' : `${String(n)} contas`;
}

function Inicio({ view, navigate }: { view: WorkspaceView; navigate: (r: Route) => void }) {
  const ativas = view.accounts.filter((a) => !a.account.archived);
  const verContas = () => {
    navigate({ area: 'contas', sub: 'contas' });
  };
  return (
    <div className="rz-blocks rz-home rz-enter">
      <div className="rz-home-stat">
        <StatCard
          label="Saldo em contas"
          cents={view.total}
          hero
          foot={`${contasTexto(ativas.length)} · até hoje, ${formatDate(view.asOf)}`}
        />
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
          {['Importar um extrato', 'Cadastrar um cartão', 'Registrar o primeiro gasto'].map((s) => (
            <div key={s} className="rz-suggest">
              <span>{s}</span>
              <Badge>Em breve</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Contas({ view }: { view: WorkspaceView }) {
  const ativas = view.accounts.filter((a) => !a.account.archived);
  if (!ativas.length) {
    return (
      <div className="rz-card rz-enter">
        <EmptyState
          title="Nenhuma conta neste espaço"
          text="As contas deste espaço aparecem aqui, com o saldo de cada uma."
        />
      </div>
    );
  }
  return (
    <div className="rz-blocks rz-enter">
      <StatCard
        label="Total em contas"
        cents={view.total}
        foot={`${contasTexto(ativas.length)} · até hoje, ${formatDate(view.asOf)}`}
      />
      <AccountList accounts={ativas} />
    </div>
  );
}

export function PageBody({
  route,
  view,
  navigate,
}: {
  route: Route;
  view: WorkspaceView;
  navigate: (r: Route) => void;
}) {
  if (route.area === 'inicio' && route.sub === 'visao-geral')
    return <Inicio view={view} navigate={navigate} />;
  if (route.area === 'contas' && route.sub === 'contas') return <Contas view={view} />;
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
