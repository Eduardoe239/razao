// PERS-06: o navegador tinha um cofre e ele sumiu. A tela pede o backup e nunca cria cofre vazio por cima:
// o cofre novo só nasce junto com a restauração do arquivo, com senha e código de recuperação novos.
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import type { PendingVault } from '@/application/app';
import type { BackupPreview } from '@/application/backup';
import { messageFor } from '@/application/errors';
import type { Workspace } from '@/application/model';
import type { VaultSession } from '@/application/session';
import { OpenBackupForm, PreviewCard } from '../backup/BackupSheets';
import { Alert, Button } from '../components/ds';
import { useRazao } from '../context';
import { CodeStep, PasswordStep } from './OnboardingSteps';

type Etapa = 'inicio' | 'abrir' | 'previa' | 'senha' | 'codigo';

export function VaultMissing({
  onOpen,
  onBack,
}: {
  onOpen: (s: VaultSession, ws: readonly Workspace[]) => void;
  /** Vindo do primeiro acesso ("Restaurar um backup"): começa direto no arquivo e pode voltar. */
  onBack?: () => void;
}) {
  const app = useRazao();
  const [etapa, setEtapa] = useState<Etapa>(onBack ? 'abrir' : 'inicio');
  const [previa, setPrevia] = useState<BackupPreview | null>(null);
  const [senha, setSenha] = useState('');
  const [repeticao, setRepeticao] = useState('');
  const [pendente, setPendente] = useState<PendingVault | null>(null);
  const [guardou, setGuardou] = useState(false);
  const [sessao, setSessao] = useState<VaultSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const ocupado = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErro(undefined);
    try {
      await fn();
    } catch (e) {
      setErro(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  const criarSenha = (e: SyntheticEvent) => {
    e.preventDefault();
    void ocupado(async () => {
      setPendente(await app.prepareVault(senha, repeticao));
      setEtapa('codigo');
    });
  };

  const restaurar = () => {
    if (!pendente || !previa) return;
    void ocupado(async () => {
      // Se a restauração falhar depois de o cofre nascer, a nova tentativa usa o mesmo cofre.
      const s = sessao ?? (await pendente.confirm());
      setSessao(s);
      await s.restoreBackup(previa);
      setSenha('');
      setRepeticao('');
      onOpen(s, await s.workspaces());
    });
  };

  return (
    <main className="rz-auth">
      <div className="rz-auth-col rz-auth-center">
        {etapa === 'inicio' ? (
          <>
            <img className="rz-logo" src="/favicon.png" alt="O Razão" width={64} height={64} />
            <div className="rz-ob-intro">
              <h1 className="rz-ob-title">Não encontramos o seu cofre</h1>
              <p className="rz-ob-lead">
                Este navegador já teve um cofre do Razão, mas os dados não estão mais aqui. Isso acontece
                quando o navegador limpa o armazenamento do site. Para recuperar, use o seu arquivo de backup
                (.razao).
              </p>
            </div>
            <Alert tone="warning" title="Nenhum cofre novo foi criado">
              O Razão não cria um cofre vazio por cima, para não esconder o problema. O cofre novo só nasce
              junto com a restauração do backup.
            </Alert>
            <Button
              variant="primary"
              size="lg"
              block
              onClick={() => {
                setEtapa('abrir');
              }}
            >
              Restaurar pelo backup
            </Button>
          </>
        ) : null}
        {etapa === 'abrir' ? (
          <>
            <h1 className="rz-ob-title">Abrir o backup</h1>
            <OpenBackupForm
              open={(t, s) => app.openBackupFile(t, s)}
              onPreview={(p) => {
                setPrevia(p);
                setEtapa('previa');
              }}
            />
          </>
        ) : null}
        {etapa === 'previa' && previa ? (
          <>
            <h1 className="rz-ob-title">Confira o backup</h1>
            <PreviewCard preview={previa} />
            <p className="rz-ob-lead">Agora crie a senha do cofre novo. Ela pode ser igual à antiga.</p>
            <Button
              variant="primary"
              size="lg"
              block
              onClick={() => {
                setEtapa('senha');
              }}
            >
              Continuar
            </Button>
          </>
        ) : null}
        {etapa === 'senha' ? (
          <form className="rz-form" onSubmit={criarSenha} noValidate>
            <PasswordStep
              senha={senha}
              repeticao={repeticao}
              erro={undefined}
              onSenha={setSenha}
              onRepeticao={setRepeticao}
            />
            <Button type="submit" variant="primary" size="lg" block busy={busy}>
              {busy ? 'Criando o cofre…' : 'Criar cofre'}
            </Button>
          </form>
        ) : null}
        {etapa === 'codigo' && pendente ? (
          <>
            <CodeStep
              code={pendente.recoveryCode}
              guardou={guardou}
              onGuardou={() => {
                setGuardou(!guardou);
              }}
            />
            <Button variant="primary" size="lg" block busy={busy} disabled={!guardou} onClick={restaurar}>
              {busy ? 'Restaurando e conferindo…' : 'Restaurar o backup'}
            </Button>
          </>
        ) : null}
        {erro ? (
          <Alert tone="negative" title="Não deu certo">
            {erro}
          </Alert>
        ) : null}
        {onBack && (etapa === 'abrir' || etapa === 'previa') ? (
          <button type="button" className="rz-link" onClick={onBack}>
            Voltar e criar um cofre novo
          </button>
        ) : null}
      </div>
    </main>
  );
}
