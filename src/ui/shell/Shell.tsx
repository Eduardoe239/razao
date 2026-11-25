// Casca do app aberto: espaço ativo sempre visível, 5 áreas com sub-abas e troca de espaço (COF-005).
// Trocar de espaço recarrega a tela inteira a partir do outro espaço; nada é misturado.
import { useCallback, useEffect, useRef, useState } from 'react';
import { messageFor } from '@/application/errors';
import type { Workspace } from '@/application/model';
import type { VaultSession, WorkspaceView } from '@/application/session';
import { Alert, Badge, Button } from '../components/ds';
import { Icon } from '../components/Icon';
import { Tabs, WorkspaceSwitch } from '../components/Tabs';
import type { Route } from './nav';
import { AREAS, areaOf, parseRoute, routeHash } from './nav';
import { PageBody } from './Pages';

type Carga = { t: 'carregando' } | { t: 'ok'; view: WorkspaceView } | { t: 'erro'; msg: string };

export function Shell({
  session,
  workspaces,
  onLock,
}: {
  session: VaultSession;
  workspaces: readonly Workspace[];
  onLock: () => void;
}) {
  const [wsId, setWsId] = useState(() => workspaces[0]?.id ?? '');
  const ws = workspaces.find((w) => w.id === wsId) ?? workspaces[0];
  const kind = ws?.kind ?? 'PF';
  const [rota, setRota] = useState<Route>(() => parseRoute(window.location.hash, kind));
  const [carga, setCarga] = useState<Carga>({ t: 'carregando' });
  const [versao, setVersao] = useState(0);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let vivo = true;
    session.view(wsId).then(
      (view) => {
        if (vivo) setCarga({ t: 'ok', view });
      },
      (erro: unknown) => {
        if (vivo) setCarga({ t: 'erro', msg: messageFor(erro) });
      },
    );
    return () => {
      vivo = false;
    };
  }, [session, wsId, versao]);

  useEffect(() => {
    const ouvir = () => {
      setRota(parseRoute(window.location.hash, kind));
    };
    window.addEventListener('hashchange', ouvir);
    return () => {
      window.removeEventListener('hashchange', ouvir);
    };
  }, [kind]);

  const navegar = useCallback((r: Route) => {
    setRota(r);
    if (window.location.hash !== routeHash(r)) window.location.hash = routeHash(r);
    // Leitor de tela e teclado vão para o título da tela nova.
    window.requestAnimationFrame(() => titulo.current?.focus());
  }, []);

  const trocarEspaco = (id: string) => {
    const novo = workspaces.find((w) => w.id === id);
    if (!novo) return;
    setCarga({ t: 'carregando' });
    setWsId(id);
    // Sub-aba que não existe no outro tipo de espaço volta para a primeira da área.
    navegar(parseRoute(routeHash(rota), novo.kind));
  };

  const area = areaOf(rota.area);
  const subs = area.subs(kind);
  const tom = kind === 'PJ' ? 'pj' : 'pf';
  const opcoes = workspaces.map((w) => ({
    id: w.id,
    label: w.kind === 'PF' ? 'Pessoal' : 'Negócio',
    tone: w.kind === 'PJ' ? ('pj' as const) : ('pf' as const),
  }));
  const seletor =
    workspaces.length > 1 ? (
      <WorkspaceSwitch options={opcoes} value={wsId} onChange={trocarEspaco} />
    ) : (
      <span className="rz-space-tag">
        <span className={`rz-dot rz-dot-${tom}`} aria-hidden="true" />
        <span>{kind === 'PF' ? 'Pessoal' : 'Negócio'}</span>
      </span>
    );

  return (
    <div className="rz-shell" data-space={tom}>
      <aside className="rz-side" aria-label="Navegação principal">
        <div className="rz-brand">
          <img src="/favicon.png" alt="" width={28} height={28} />O Razão
        </div>
        {seletor}
        <nav className="rz-nav">
          {AREAS.map((a) => {
            const aberta = a.id === rota.area;
            return (
              <div key={a.id}>
                <button
                  type="button"
                  className="rz-nav-item"
                  aria-expanded={aberta}
                  onClick={() => {
                    if (!aberta) navegar({ area: a.id, sub: a.subs(kind)[0]?.id ?? '' });
                  }}
                >
                  <Icon name={a.icon} />
                  {a.label}
                  <span className="rz-nav-chev">
                    <Icon name="chevron" size={16} />
                  </span>
                </button>
                <div className="rz-nav-subs" data-open={aberta}>
                  <div>
                    {a.subs(kind).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="rz-nav-sub"
                        tabIndex={aberta ? 0 : -1}
                        aria-current={aberta && s.id === rota.sub ? 'page' : undefined}
                        onClick={() => {
                          navegar({ area: a.id, sub: s.id });
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
        <div className="rz-side-foot">
          <Button variant="ghost" icon="lock" block onClick={onLock}>
            Bloquear o cofre
          </Button>
        </div>
      </aside>

      <div className="rz-mainwrap">
        <header className="rz-top">
          <div className="rz-top-space">
            <span className="rz-only-mobile">{seletor}</span>
            <span className="rz-only-desktop">
              <Badge tone={tom}>{ws ? (ws.kind === 'PF' ? 'Pessoal' : ws.name) : ''}</Badge>
            </span>
          </div>
          <Button
            variant="ghost"
            className="rz-icon-btn rz-only-mobile"
            aria-label="Bloquear o cofre"
            icon="lock"
            onClick={onLock}
          />
        </header>

        <main className="rz-page" key={`${wsId}/${rota.area}/${rota.sub}`}>
          <div className="rz-page-head rz-enter">
            <h1 ref={titulo} tabIndex={-1} className="rz-page-title">
              {area.label}
            </h1>
            <p className="rz-page-q">{area.question}</p>
          </div>
          {subs.length > 1 ? (
            <div className="rz-mobile-tabs">
              <Tabs
                label={`Seções de ${area.label}`}
                items={subs}
                value={rota.sub}
                onChange={(id) => {
                  navegar({ area: rota.area, sub: id });
                }}
              />
            </div>
          ) : null}
          {session.safeMode ? (
            <Alert tone="warning" title="Cofre em modo seguro">
              Um registro danificado foi separado, sem apagar nada. Você pode consultar os dados, mas novas
              gravações ficam bloqueadas até a recuperação.
            </Alert>
          ) : null}
          {carga.t === 'carregando' ? (
            <div className="rz-card" aria-busy="true" aria-label="Carregando" style={{ minHeight: 160 }} />
          ) : null}
          {carga.t === 'erro' ? (
            <Alert tone="negative" title="Não foi possível ler este espaço">
              {carga.msg}{' '}
              <Button
                size="sm"
                onClick={() => {
                  setCarga({ t: 'carregando' });
                  setVersao((v) => v + 1);
                }}
              >
                Tentar de novo
              </Button>
            </Alert>
          ) : null}
          {carga.t === 'ok' && carga.view.workspace.id === wsId ? (
            <PageBody route={rota} view={carga.view} navigate={navegar} />
          ) : null}
        </main>

        <nav className="rz-bottom" aria-label="Navegação principal">
          {(['inicio', 'lancamentos', 'novo', 'planejamento', 'ia'] as const).map((id) =>
            id === 'novo' ? (
              <button
                key={id}
                type="button"
                className="rz-fab"
                disabled
                aria-label="Novo lançamento (ainda não disponível)"
              >
                <Icon name="plus" size={24} />
              </button>
            ) : (
              <button
                key={id}
                type="button"
                className="rz-bottom-btn"
                aria-current={rota.area === id ? 'page' : undefined}
                onClick={() => {
                  navegar({ area: id, sub: areaOf(id).subs(kind)[0]?.id ?? '' });
                }}
              >
                <Icon name={areaOf(id).icon} size={22} />
                {areaOf(id).short}
              </button>
            ),
          )}
        </nav>
      </div>
    </div>
  );
}
