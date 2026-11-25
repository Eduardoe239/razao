// Primeiro acesso em 5 etapas (COF-006): boas-vindas, senha, código, espaços e primeira conta.
// O cofre só é gravado depois de a pessoa confirmar que guardou o código (COF-001).
// Retomada: se o cofre já existe mas não tem espaço, começa direto em "espaços".
import type { SyntheticEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import type { PendingVault } from '@/application/app';
import { messageFor } from '@/application/errors';
import { readMoney } from '@/application/format';
import type { AccountKind, Workspace } from '@/application/model';
import type { VaultSession } from '@/application/session';
import { isSafariOutsideApp, looksLikeIos } from '@/application/vault-rules';
import { Alert, Button } from '../components/ds';
import { Icon } from '../components/Icon';
import { useRazao } from '../context';
import {
  AccountStep,
  CodeStep,
  DoneStep,
  PasswordStep,
  SafariNotice,
  SpacesStep,
  Welcome,
} from './OnboardingSteps';

type Etapa = 'boas-vindas' | 'safari' | 'senha' | 'codigo' | 'espacos' | 'conta' | 'pronto';

const NUMERO: Partial<Record<Etapa, number>> = {
  'boas-vindas': 1,
  senha: 2,
  codigo: 3,
  espacos: 4,
  conta: 5,
};
const CTA: Record<Etapa, string> = {
  'boas-vindas': 'Começar',
  safari: 'Continuar sem instalar',
  senha: 'Criar cofre',
  codigo: 'Continuar',
  espacos: 'Continuar',
  conta: 'Concluir',
  pronto: 'Ir para o Início',
};

function modoApp(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

export function Onboarding(props: {
  session?: VaultSession;
  onOpen: (session: VaultSession, workspaces: readonly Workspace[]) => void;
  onLock?: () => void;
  /** Primeiro acesso em aparelho novo: restaurar um backup em vez de começar do zero. */
  onRestore?: () => void;
}) {
  const app = useRazao();
  const safari = useMemo(() => isSafariOutsideApp(navigator.userAgent, modoApp()), []);
  const ios = useMemo(() => looksLikeIos(navigator.userAgent, navigator.maxTouchPoints), []);
  const [etapa, setEtapa] = useState<Etapa>(props.session ? 'espacos' : 'boas-vindas');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const [senha, setSenha] = useState('');
  const [repeticao, setRepeticao] = useState('');
  const [pendente, setPendente] = useState<PendingVault | null>(null);
  const [guardou, setGuardou] = useState(false);
  const [session, setSession] = useState<VaultSession | null>(props.session ?? null);
  const [comEmpresa, setComEmpresa] = useState(false);
  const [empresa, setEmpresa] = useState('');
  const [espacos, setEspacos] = useState<readonly Workspace[]>([]);
  const [alvo, setAlvo] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<AccountKind>('corrente');
  const [saldo, setSaldo] = useState('');
  const [errosConta, setErrosConta] = useState<{ nome?: string; saldo?: string }>({});
  const opConta = useRef<string | null>(null);
  const palco = useRef<HTMLDivElement>(null);

  const ir = (proxima: Etapa) => {
    setErro(undefined);
    setEtapa(proxima);
    palco.current?.scrollTo({ top: 0 });
  };

  const voltar: Partial<Record<Etapa, Etapa>> = session
    ? {}
    : { safari: 'boas-vindas', senha: safari ? 'safari' : 'boas-vindas', codigo: 'senha' };
  const anterior = voltar[etapa];

  async function avancar() {
    setErro(undefined);
    switch (etapa) {
      case 'boas-vindas':
        ir(safari ? 'safari' : 'senha');
        return;
      case 'safari':
        ir('senha');
        return;
      case 'senha':
        await ocupado(async () => {
          setPendente(await app.prepareVault(senha, repeticao));
          setGuardou(false);
          ir('codigo');
        });
        return;
      case 'codigo':
        if (!pendente) return;
        await ocupado(async () => {
          setSession(await pendente.confirm());
          // A senha não fica na memória da tela depois de criar o cofre.
          setSenha('');
          setRepeticao('');
          setPendente(null);
          ir('espacos');
        });
        return;
      case 'espacos':
        await criarEspacos();
        return;
      case 'conta':
        await criarConta();
        return;
      case 'pronto':
        if (session) {
          await ocupado(async () => {
            props.onOpen(session, await session.workspaces());
          });
        }
        return;
    }
  }

  async function ocupado(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErro(messageFor(e));
    } finally {
      setBusy(false);
    }
  }

  async function criarEspacos() {
    if (!session) return;
    if (comEmpresa && !empresa.trim()) {
      setErro('Digite o nome da empresa.');
      return;
    }
    await ocupado(async () => {
      // Quem volta e avança de novo não cria espaço repetido.
      const lista = [...(await session.workspaces())];
      if (!lista.some((w) => w.kind === 'PF'))
        lista.push(await session.createWorkspace({ kind: 'PF', name: 'Pessoal' }));
      if (comEmpresa && !lista.some((w) => w.kind === 'PJ')) {
        lista.push(await session.createWorkspace({ kind: 'PJ', name: empresa }));
      }
      setEspacos(lista);
      setAlvo(lista[0]?.id ?? '');
      ir('conta');
    });
  }

  async function criarConta() {
    if (!session) return;
    const erros: { nome?: string; saldo?: string } = {};
    if (!nome.trim()) erros.nome = 'Dê um nome à conta, como o do banco.';
    const valor = saldo.trim() === '' ? null : readMoney(saldo, true);
    if (!valor) erros.saldo = 'Digite o saldo de hoje. Pode ser R$ 0,00.';
    else if (!valor.ok) erros.saldo = valor.reason;
    setErrosConta(erros);
    if (erros.nome || erros.saldo || !valor?.ok) return;
    opConta.current ??= session.newOperationId();
    const operationId = opConta.current;
    await ocupado(async () => {
      await session.createAccount(alvo, { name: nome, kind: tipo, openingCents: valor.cents, operationId });
      ir('pronto');
    });
  }

  const bloqueado = busy || (etapa === 'codigo' && !guardou);
  const numero = NUMERO[etapa];
  const enviar = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!bloqueado) void avancar();
  };

  return (
    <main className="rz-auth">
      <form className="rz-auth-col" onSubmit={enviar} noValidate>
        <header className="rz-ob-head">
          <button
            type="button"
            className="rz-btn rz-ob-back"
            aria-label="Voltar"
            style={{ visibility: anterior ? 'visible' : 'hidden' }}
            onClick={() => {
              if (anterior) ir(anterior);
            }}
          >
            <Icon name="back" size={22} />
          </button>
          <div className="rz-ob-progress" style={{ visibility: numero ? 'visible' : 'hidden' }}>
            <span className="rz-ob-progress-label">Etapa {numero ?? 5} de 5</span>
            <div className="rz-ob-bar">
              <span style={{ width: `${String(((numero ?? 5) / 5) * 100)}%` }} />
            </div>
          </div>
          <span style={{ width: 44 }} />
        </header>

        <div ref={palco} key={etapa} className="rz-ob-stage rz-enter">
          {etapa === 'boas-vindas' ? <Welcome /> : null}
          {etapa === 'safari' ? <SafariNotice ios={ios} /> : null}
          {etapa === 'senha' ? (
            <PasswordStep
              senha={senha}
              repeticao={repeticao}
              erro={undefined}
              onSenha={setSenha}
              onRepeticao={setRepeticao}
            />
          ) : null}
          {etapa === 'codigo' && pendente ? (
            <CodeStep
              code={pendente.recoveryCode}
              guardou={guardou}
              onGuardou={() => {
                setGuardou(!guardou);
              }}
            />
          ) : null}
          {etapa === 'espacos' ? (
            <SpacesStep
              comEmpresa={comEmpresa}
              onModo={setComEmpresa}
              empresa={empresa}
              onEmpresa={setEmpresa}
              erro={undefined}
            />
          ) : null}
          {etapa === 'conta' ? (
            <AccountStep
              workspaces={espacos}
              alvo={alvo}
              onAlvo={setAlvo}
              nome={nome}
              onNome={setNome}
              tipo={tipo}
              onTipo={setTipo}
              saldo={saldo}
              onSaldo={setSaldo}
              erros={errosConta}
            />
          ) : null}
          {etapa === 'pronto' ? <DoneStep /> : null}
          {erro ? (
            <Alert tone="negative" title="Não deu certo">
              {erro}
            </Alert>
          ) : null}
        </div>

        <footer className="rz-ob-foot">
          <Button type="submit" variant="primary" size="lg" block busy={busy} disabled={bloqueado}>
            {busy && etapa === 'senha' ? 'Criando o cofre…' : CTA[etapa]}
          </Button>
          {props.onRestore && etapa === 'boas-vindas' ? (
            <button type="button" className="rz-link" onClick={props.onRestore}>
              Já tenho um backup · restaurar
            </button>
          ) : null}
          {props.onLock && etapa === 'espacos' ? (
            <button type="button" className="rz-link" onClick={props.onLock}>
              Bloquear e sair
            </button>
          ) : null}
        </footer>
      </form>
    </main>
  );
}
