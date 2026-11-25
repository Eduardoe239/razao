// Desbloquear o cofre (COF-002), com a senha ou com o código de recuperação.
// A mensagem de erro é a mesma para os dois e a espera cresce a partir da 5ª falha (SEC-11).
import type { SyntheticEvent } from 'react';
import { useEffect, useState } from 'react';
import { messageFor } from '@/application/errors';
import type { VaultSession } from '@/application/session';
import { Alert, Button, TextField } from '../components/ds';
import { Icon } from '../components/Icon';
import { useRazao } from '../context';

export function Unlock({
  notice,
  onUnlocked,
}: {
  notice: string | undefined;
  onUnlocked: (s: VaultSession) => void;
}) {
  const app = useRazao();
  const [modo, setModo] = useState<'senha' | 'codigo'>('senha');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [espera, setEspera] = useState(() => app.waitSeconds());

  useEffect(() => {
    if (espera <= 0) return;
    const t = window.setInterval(() => {
      setEspera(app.waitSeconds());
    }, 1000);
    return () => {
      window.clearInterval(t);
    };
  }, [app, espera]);

  async function enviar(e: SyntheticEvent) {
    e.preventDefault();
    if (busy || espera > 0 || !valor) return;
    setBusy(true);
    setErro(undefined);
    try {
      const s = await app.unlock(modo === 'senha' ? { password: valor } : { recoveryCode: valor });
      setValor('');
      onUnlocked(s);
    } catch (falha) {
      setErro(messageFor(falha));
      setEspera(app.waitSeconds());
      setBusy(false);
    }
  }

  const trocar = () => {
    setModo(modo === 'senha' ? 'codigo' : 'senha');
    setValor('');
    setErro(undefined);
  };

  return (
    <main className="rz-auth">
      <div className="rz-auth-col rz-unlock">
        <div className="rz-unlock-head">
          <img className="rz-logo" src="/favicon.png" alt="O Razão" width={72} height={72} />
          <div className="rz-ob-intro">
            <h1 className="rz-ob-title">Bem-vindo de volta</h1>
            <p className="rz-ob-lead">
              {modo === 'senha'
                ? 'Digite a senha do cofre para abrir seus dados.'
                : 'Digite o código de recuperação de 24 caracteres.'}
            </p>
          </div>
        </div>
        <form className="rz-unlock-form" onSubmit={(e) => void enviar(e)} noValidate>
          {notice ? <Alert tone="info">{notice}</Alert> : null}
          <TextField
            key={modo}
            label={modo === 'senha' ? 'Senha do cofre' : 'Código de recuperação'}
            type={modo === 'senha' ? 'password' : 'text'}
            autoComplete={modo === 'senha' ? 'current-password' : 'off'}
            autoFocus
            value={valor}
            onChange={setValor}
            maxLength={modo === 'senha' ? 256 : 40}
            error={espera > 0 ? `Muitas tentativas. Tente de novo em ${String(espera)} segundos.` : erro}
          />
          <Button type="submit" variant="primary" size="lg" block busy={busy} disabled={espera > 0 || !valor}>
            Desbloquear
          </Button>
          <button type="button" className="rz-link" onClick={trocar}>
            {modo === 'senha' ? 'Esqueci a senha · usar código de recuperação' : 'Usar a senha do cofre'}
          </button>
        </form>
        <div className="rz-note">
          <Icon name="lock" />
          <p>
            Seus dados ficam criptografados neste aparelho. A senha não sai daqui e ninguém consegue
            recuperá-la, nem o Razão. Sem a senha, só o código de recuperação abre o cofre.
          </p>
        </div>
      </div>
    </main>
  );
}
