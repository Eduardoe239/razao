// Raiz da interface: decide entre primeiro acesso, desbloqueio, cofre sumido e o app aberto.
// Bloqueado, nada do cofre fica na tela nem na memória da interface (COF-002).
import { useCallback, useEffect, useState } from 'react';
import { messageFor } from '@/application/errors';
import type { Workspace } from '@/application/model';
import type { VaultSession } from '@/application/session';
import { Alert, Button } from './components/ds';
import { useRazao } from './context';
import { Onboarding } from './screens/Onboarding';
import { Unlock } from './screens/Unlock';
import { VaultMissing } from './screens/VaultMissing';
import { Shell } from './shell/Shell';
import { useAutoLock } from './useAutoLock';

type Fase =
  | { readonly t: 'carregando' }
  | { readonly t: 'erro'; readonly msg: string }
  | { readonly t: 'novo' }
  | { readonly t: 'sumiu' }
  | { readonly t: 'restaurar' }
  | { readonly t: 'bloqueado'; readonly aviso?: string }
  | { readonly t: 'aberto'; readonly session: VaultSession; readonly workspaces: readonly Workspace[] };

export function App() {
  const app = useRazao();
  const [fase, setFase] = useState<Fase>({ t: 'carregando' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    app.presence().then(
      (p) => {
        if (vivo) setFase(p === 'novo' ? { t: 'novo' } : p === 'sumiu' ? { t: 'sumiu' } : { t: 'bloqueado' });
      },
      (erro: unknown) => {
        if (vivo) setFase({ t: 'erro', msg: messageFor(erro) });
      },
    );
    return () => {
      vivo = false;
    };
  }, [app, tentativa]);

  const aberto = fase.t === 'aberto' ? fase.session : null;
  const bloquear = useCallback(
    (aviso?: string) => {
      aberto?.lock();
      setFase(aviso ? { t: 'bloqueado', aviso } : { t: 'bloqueado' });
    },
    [aberto],
  );
  const porInatividade = useCallback(() => {
    bloquear('O cofre foi bloqueado por inatividade.');
  }, [bloquear]);
  useAutoLock(aberto !== null, porInatividade);

  /** Relê a lista de espaços depois de criar, arquivar ou excluir um deles. */
  const recarregar = useCallback(async (session: VaultSession) => {
    try {
      const ws = await session.workspaces();
      setFase((f) => (f.t === 'aberto' && f.session === session ? { ...f, workspaces: ws } : f));
    } catch (erro) {
      setFase({ t: 'erro', msg: messageFor(erro) });
    }
  }, []);

  const abrir = useCallback(async (session: VaultSession) => {
    try {
      setFase({ t: 'aberto', session, workspaces: await session.workspaces() });
    } catch (erro) {
      session.lock();
      setFase({ t: 'erro', msg: messageFor(erro) });
    }
  }, []);

  switch (fase.t) {
    case 'carregando':
      return <div className="rz-splash" aria-busy="true" aria-label="Abrindo o Razão" />;
    case 'erro':
      return (
        <main className="rz-auth">
          <div className="rz-auth-col rz-auth-center">
            <Alert tone="negative" title="Não foi possível abrir o cofre">
              {fase.msg}
            </Alert>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setTentativa((n) => n + 1);
                setFase({ t: 'carregando' });
              }}
            >
              Tentar de novo
            </Button>
          </div>
        </main>
      );
    case 'restaurar':
      return (
        <VaultMissing
          onOpen={(s, ws) => {
            // Depois de restaurar, a pessoa começa pelo Início, não pela última tela antes do problema.
            window.location.hash = '';
            setFase({ t: 'aberto', session: s, workspaces: ws });
          }}
          onBack={() => {
            setFase({ t: 'novo' });
          }}
        />
      );
    case 'novo':
      return (
        <Onboarding
          onRestore={() => {
            setFase({ t: 'restaurar' });
          }}
          onOpen={(s, ws) => {
            setFase({ t: 'aberto', session: s, workspaces: ws });
          }}
        />
      );
    case 'sumiu':
      return (
        <VaultMissing
          onOpen={(s, ws) => {
            // Depois de restaurar, a pessoa começa pelo Início, não pela última tela antes do problema.
            window.location.hash = '';
            setFase({ t: 'aberto', session: s, workspaces: ws });
          }}
        />
      );
    case 'bloqueado':
      return (
        <Unlock
          notice={fase.aviso}
          onUnlocked={(s) => {
            void abrir(s);
          }}
        />
      );
    case 'aberto':
      if (fase.workspaces.length === 0) {
        return (
          <Onboarding
            session={fase.session}
            onOpen={(s, ws) => {
              setFase({ t: 'aberto', session: s, workspaces: ws });
            }}
            onLock={() => {
              bloquear();
            }}
          />
        );
      }
      return (
        <Shell
          session={fase.session}
          workspaces={fase.workspaces}
          onLock={() => {
            bloquear();
          }}
          onWorkspacesChanged={() => recarregar(fase.session)}
          onWiped={() => {
            window.location.hash = '';
            setFase({ t: 'carregando' });
            setTentativa((n) => n + 1);
          }}
        />
      );
  }
}
