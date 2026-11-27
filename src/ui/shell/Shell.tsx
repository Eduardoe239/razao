// Casca do app aberto: espaço ativo sempre visível, 5 áreas com sub-abas e troca de espaço (COF-005).
// Trocar de espaço recarrega a tela inteira a partir do outro espaço; nada é misturado.
import { useCallback, useEffect, useRef, useState } from 'react';
import { messageFor } from '@/application/errors';
import type { Workspace } from '@/application/model';
import type { VaultSession, WorkspaceView } from '@/application/session';
import { Alert, Badge, Button } from '../components/ds';
import { Icon } from '../components/Icon';
import { Toast } from '../components/Sheet';
import { Tabs, WorkspaceSwitch } from '../components/Tabs';
import { BackupPage } from '../backup/BackupPage';
import { useRazao } from '../context';
import { Espacos } from './Espacos';
import type { Route } from './nav';
import type { StorageStatus } from '@/application/ports';
import { BACKUP, CONFIG, CONFIG_SUBS, areaOf, parseRoute, routeHash } from './nav';
import { PageBody } from './Pages';
import { NewEntrySheet } from '../entries/NewEntrySheet';
import { SideNav } from './SideNav';

type Carga = { t: 'carregando' } | { t: 'ok'; view: WorkspaceView } | { t: 'erro'; msg: string };

export function Shell(p: {
  session: VaultSession;
  workspaces: readonly Workspace[];
  onLock: () => void;
  onWorkspacesChanged: () => Promise<void>;
  onWiped: () => void;
}) {
  const { session, workspaces, onLock, onWorkspacesChanged } = p;
  const app = useRazao();
  const [armazenamento, setArmazenamento] = useState<StorageStatus | null>(null);
  useEffect(() => {
    let vivo = true;
    app.storageStatus().then(
      (s) => {
        if (vivo) setArmazenamento(s);
      },
      () => undefined,
    );
    return () => {
      vivo = false;
    };
  }, [app]);
  // Só espaços ativos entram no seletor; os arquivados ficam em Espaços (COF-007).
  const ativos = workspaces.filter((w) => !w.archived);
  const [escolhido, setEscolhido] = useState(() => ativos[0]?.id ?? '');
  const ws = ativos.find((w) => w.id === escolhido) ?? ativos[0];
  const wsId = ws?.id ?? '';
  const kind = ws?.kind ?? 'PF';
  const [rota, setRota] = useState<Route>(() => parseRoute(window.location.hash, kind));
  const [carga, setCarga] = useState<Carga>({ t: 'carregando' });
  const [versao, setVersao] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!wsId) return;
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

  /** Depois de gravar: aviso, releitura do espaço e da lista de espaços. */
  const mudou = useCallback(
    (m: string) => {
      setAviso(m);
      setVersao((v) => v + 1);
      void onWorkspacesChanged();
    },
    [onWorkspacesChanged],
  );
  const semAviso = useCallback(() => {
    setAviso(null);
  }, []);
  /** Relê o espaço sem aviso (a tela que gravou já mostrou o seu, como o "Desfazer"). */
  const atualizar = useCallback(() => {
    setVersao((v) => v + 1);
  }, []);
  const [novo, setNovo] = useState(false);

  const trocarEspaco = (id: string) => {
    const novo = ativos.find((w) => w.id === id);
    if (!novo) return;
    setCarga({ t: 'carregando' });
    setEscolhido(id);
    // Sub-aba que não existe no outro tipo de espaço volta para a primeira da área.
    navegar(parseRoute(routeHash(rota), novo.kind));
  };

  const config = rota.area === 'config';
  const area = areaOf(rota.area);
  const subs = config ? CONFIG_SUBS : area.subs(kind);
  const tituloConfig = CONFIG_SUBS.find((s) => s.id === rota.sub)?.label ?? 'Espaços';
  const tom = kind === 'PJ' ? 'pj' : 'pf';
  const opcoes = ativos.map((w) => ({
    id: w.id,
    label: w.kind === 'PF' ? 'Pessoal' : 'Negócio',
    tone: w.kind === 'PJ' ? ('pj' as const) : ('pf' as const),
  }));
  const seletor =
    ativos.length > 1 ? (
      <WorkspaceSwitch options={opcoes} value={wsId} onChange={trocarEspaco} />
    ) : (
      <span className="rz-space-tag">
        <span className={`rz-dot rz-dot-${tom}`} aria-hidden="true" />
        <span>{kind === 'PF' ? 'Pessoal' : 'Negócio'}</span>
      </span>
    );
  const visivel = carga.t === 'ok' && carga.view.workspace.id === wsId ? carga.view : null;

  return (
    <div className="rz-shell" data-space={tom}>
      <SideNav kind={kind} route={rota} seletor={seletor} navigate={navegar} onLock={onLock} />

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
            aria-label="Backup e segurança"
            icon="shield"
            onClick={() => {
              navegar(BACKUP);
            }}
          />
          <Button
            variant="ghost"
            className="rz-icon-btn rz-only-mobile"
            aria-label="Espaços"
            icon="sliders"
            onClick={() => {
              navegar(CONFIG);
            }}
          />
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
              {config ? tituloConfig : area.label}
            </h1>
            <p className="rz-page-q">{config ? 'Configurações deste aparelho' : area.question}</p>
          </div>
          {subs.length > 1 ? (
            <div className={config ? 'rz-config-tabs' : 'rz-mobile-tabs'}>
              <Tabs
                label={config ? 'Configurações' : `Seções de ${area.label}`}
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
          {config && rota.sub === 'espacos' ? (
            <Espacos session={session} workspaces={workspaces} onChanged={mudou} />
          ) : null}
          {config && rota.sub === 'backup' ? (
            <BackupPage
              session={session}
              workspaces={workspaces}
              storage={armazenamento}
              onChanged={mudou}
              onWiped={p.onWiped}
            />
          ) : null}
          {!config && carga.t === 'carregando' ? (
            <div className="rz-card" aria-busy="true" aria-label="Carregando" style={{ minHeight: 160 }} />
          ) : null}
          {!config && carga.t === 'erro' ? (
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
          {!config && visivel ? (
            <PageBody
              route={rota}
              view={visivel}
              navigate={navegar}
              session={session}
              onChanged={mudou}
              onRefresh={atualizar}
              reminder={session.backupStatus(armazenamento?.persisted ?? false).reminder}
            />
          ) : null}
        </main>

        <nav className="rz-bottom" aria-label="Navegação principal">
          {(['inicio', 'lancamentos', 'novo', 'planejamento', 'ia'] as const).map((id) =>
            id === 'novo' ? (
              <button
                key={id}
                type="button"
                className="rz-fab"
                disabled={!visivel || session.safeMode}
                aria-label="Novo lançamento"
                onClick={() => {
                  setNovo(true);
                }}
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
      {novo && visivel ? (
        <NewEntrySheet
          session={session}
          view={visivel}
          onClose={() => {
            setNovo(false);
          }}
          onDone={(m) => {
            setNovo(false);
            mudou(m);
          }}
        />
      ) : null}
      <Toast message={aviso} onDone={semAviso} />
    </div>
  );
}
