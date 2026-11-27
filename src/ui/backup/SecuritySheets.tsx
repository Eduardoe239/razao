// COF-003 e D-054: trocar a senha do cofre, gerar um código de recuperação novo e, depois de abrir pelo código,
// a oferta de trocar os dois. Tudo em painéis do design system; nada muda antes da última confirmação.
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import { messageFor } from '@/application/errors';
import type { PendingRecoveryCode } from '@/application/session-security';
import type { VaultSession } from '@/application/session';
import { checkPassword } from '@/application/vault-rules';
import { CodeBox } from '../components/CodeBox';
import { Alert, Button, StrengthMeter, TextField } from '../components/ds';
import { Sheet } from '../components/Sheet';

function Erro({ texto }: { texto: string | undefined }) {
  return texto ? (
    <Alert tone="negative" title="Não deu certo">
      {texto}
    </Alert>
  ) : null;
}

/** Senha nova duas vezes, com o medidor de força. */
function SenhaNova(p: {
  senha: string;
  repeticao: string;
  onSenha: (v: string) => void;
  onRepeticao: (v: string) => void;
  autoFocus?: boolean;
}) {
  const forca = checkPassword(p.senha);
  const diferentes = p.repeticao.length > 0 && p.repeticao !== p.senha;
  return (
    <>
      <TextField
        label="Senha nova"
        type="password"
        autoComplete="new-password"
        autoFocus={p.autoFocus ?? false}
        value={p.senha}
        onChange={p.onSenha}
        maxLength={256}
        help={p.senha ? forca.message : 'Use uma frase que só você saiba.'}
        below={<StrengthMeter score={forca.score} />}
      />
      <TextField
        label="Repita a senha nova"
        type="password"
        autoComplete="new-password"
        value={p.repeticao}
        onChange={p.onRepeticao}
        maxLength={256}
        error={diferentes ? 'As duas senhas não são iguais.' : undefined}
      />
    </>
  );
}

/** Mostra o código novo e só troca depois dos 4 últimos caracteres digitados. */
function ConfirmarCodigo(p: { pendente: PendingRecoveryCode; onDone: () => void; aviso: string }) {
  const [quatro, setQuatro] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const enviar = async (e: SyntheticEvent) => {
    e.preventDefault();
    setBusy(true);
    setErro(undefined);
    try {
      await p.pendente.confirm(quatro);
      p.onDone();
    } catch (falha) {
      setErro(messageFor(falha));
      setBusy(false);
    }
  };
  return (
    <form className="rz-form" onSubmit={(e) => void enviar(e)} noValidate>
      <p className="rz-ob-lead">Guarde fora deste aparelho. Ele aparece só desta vez.</p>
      <CodeBox code={p.pendente.code} />
      <TextField
        label="Digite os 4 últimos caracteres do código"
        value={quatro}
        onChange={(v) => {
          setQuatro(v.toUpperCase());
        }}
        maxLength={4}
        autoComplete="off"
        help="Assim o app confere que você guardou o código certo."
      />
      <Alert tone="warning" title="O código antigo para de funcionar">
        {p.aviso}
      </Alert>
      <Erro texto={erro} />
      <div className="rz-form-actions">
        <Button type="submit" variant="primary" size="lg" block busy={busy} disabled={quatro.length !== 4}>
          Guardei, trocar o código
        </Button>
      </div>
    </form>
  );
}

export function ChangePasswordSheet(p: {
  session: VaultSession;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const [atual, setAtual] = useState('');
  const [senha, setSenha] = useState('');
  const [repeticao, setRepeticao] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const enviar = async (e: SyntheticEvent) => {
    e.preventDefault();
    setBusy(true);
    setErro(undefined);
    try {
      await p.session.security.changePassword({ current: atual, next: senha, repeat: repeticao });
      p.onDone('Senha trocada. A senha antiga não abre mais o cofre.');
    } catch (falha) {
      setErro(messageFor(falha));
      setBusy(false);
    }
  };
  return (
    <Sheet title="Trocar a senha" onClose={p.onClose}>
      <form className="rz-form" onSubmit={(e) => void enviar(e)} noValidate>
        <TextField
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={atual}
          onChange={setAtual}
          maxLength={256}
        />
        <SenhaNova senha={senha} repeticao={repeticao} onSenha={setSenha} onRepeticao={setRepeticao} />
        <Alert tone="info" title="Os dados não mudam">
          Só a chave que protege o cofre é trocada. O código de recuperação continua o mesmo, e os backups
          antigos abrem com a senha de cada backup.
        </Alert>
        <Erro texto={erro} />
        <div className="rz-form-actions">
          <Button type="submit" variant="primary" size="lg" block busy={busy}>
            {busy ? 'Trocando…' : 'Trocar a senha'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

export function NewRecoveryCodeSheet(p: {
  session: VaultSession;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const [atual, setAtual] = useState('');
  const [pendente, setPendente] = useState<PendingRecoveryCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const gerar = async (e: SyntheticEvent) => {
    e.preventDefault();
    setBusy(true);
    setErro(undefined);
    try {
      setPendente(await p.session.security.newRecoveryCode(atual));
    } catch (falha) {
      setErro(messageFor(falha));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title="Gerar código novo" onClose={p.onClose}>
      {pendente ? (
        <ConfirmarCodigo
          pendente={pendente}
          aviso="Depois de confirmar, só este código novo abre o cofre quando a senha for esquecida."
          onDone={() => {
            p.onDone('Código de recuperação trocado. O antigo não abre mais o cofre.');
          }}
        />
      ) : (
        <form className="rz-form" onSubmit={(e) => void gerar(e)} noValidate>
          <p className="rz-ob-lead">
            Use quando o código atual se perdeu ou pode ter sido visto por alguém. A senha continua a mesma.
          </p>
          <TextField
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={atual}
            onChange={setAtual}
            maxLength={256}
          />
          <Erro texto={erro} />
          <div className="rz-form-actions">
            <Button type="submit" variant="primary" size="lg" block busy={busy}>
              {busy ? 'Conferindo…' : 'Gerar código novo'}
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}

/** D-042, item 6: o cofre foi aberto pelo código; o código usado pode ter ficado exposto. */
export function RecoveryOfferSheet(p: {
  session: VaultSession;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const [senha, setSenha] = useState('');
  const [repeticao, setRepeticao] = useState('');
  const [pendente, setPendente] = useState<PendingRecoveryCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const agoraNao = () => {
    p.session.security.dismissRecoveryOffer();
    p.onClose();
  };
  const seguir = async (e: SyntheticEvent) => {
    e.preventDefault();
    setBusy(true);
    setErro(undefined);
    try {
      setPendente(await p.session.security.secureAfterRecovery({ next: senha, repeat: repeticao }));
    } catch (falha) {
      setErro(messageFor(falha));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title="Crie uma senha nova" onClose={agoraNao}>
      {pendente ? (
        <ConfirmarCodigo
          pendente={pendente}
          aviso="Depois de confirmar, a senha nova e este código novo abrem o cofre. O código que você usou hoje deixa de abrir."
          onDone={() => {
            p.onDone('Senha nova criada e código de recuperação trocado.');
          }}
        />
      ) : (
        <form className="rz-form" onSubmit={(e) => void seguir(e)} noValidate>
          <p className="rz-ob-lead">
            Você abriu o cofre com o código de recuperação. Crie uma senha nova e guarde um código novo: o que
            você usou pode ter ficado exposto.
          </p>
          <SenhaNova
            senha={senha}
            repeticao={repeticao}
            onSenha={setSenha}
            onRepeticao={setRepeticao}
            autoFocus
          />
          <Erro texto={erro} />
          <div className="rz-form-actions">
            <Button type="submit" variant="primary" size="lg" block busy={busy}>
              Continuar
            </Button>
            <Button variant="ghost" block onClick={agoraNao}>
              Agora não
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
