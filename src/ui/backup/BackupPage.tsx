// Backup e segurança (PERS-02, PERS-04, BKP-003, PRIV-05): proteção do armazenamento, último backup,
// fazer e restaurar backup, pontos de volta, lembrete e apagar tudo.
import type { SyntheticEvent } from 'react';
import { useEffect, useState } from 'react';
import { WIPE_PHRASE } from '@/application/app';
import { messageFor } from '@/application/errors';
import type { Workspace } from '@/application/model';
import type { RestorePoint, StorageStatus } from '@/application/ports';
import { REMINDER_OPTIONS } from '@/application/reminder';
import type { VaultSession } from '@/application/session';
import { Alert, Badge, Button, TextField } from '../components/ds';
import { SelectField, Sheet } from '../components/Sheet';
import { useRazao } from '../context';
import { CreateBackupSheet, RestoreBackupSheet, quando } from './BackupSheets';
import { IntegrityCard } from './IntegrityCard';

const mb = (bytes: number) =>
  `${(bytes / 1_048_576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;

function ApagarTudoSheet(p: { onClose: () => void; onWiped: () => void }) {
  const app = useRazao();
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const enviar = async (e: SyntheticEvent) => {
    e.preventDefault();
    setBusy(true);
    setErro(undefined);
    try {
      await app.wipeAll(texto);
      p.onWiped();
    } catch (falha) {
      setErro(messageFor(falha));
      setBusy(false);
    }
  };
  return (
    <Sheet title="Apagar tudo deste aparelho" onClose={p.onClose}>
      <form className="rz-form" onSubmit={(e) => void enviar(e)} noValidate>
        <Alert tone="negative" title="Esta ação não tem volta">
          Apaga o cofre, todos os espaços, as cópias automáticas e as preferências do Razão neste navegador.
          Só um arquivo de backup traz os dados de volta.
        </Alert>
        <TextField
          label={`Digite ${WIPE_PHRASE} para confirmar`}
          value={texto}
          onChange={setTexto}
          maxLength={30}
          autoFocus
        />
        {erro ? (
          <Alert tone="negative" title="Não deu certo">
            {erro}
          </Alert>
        ) : null}
        <div className="rz-form-actions">
          <Button
            type="submit"
            variant="danger"
            size="lg"
            block
            busy={busy}
            disabled={texto.trim().toUpperCase() !== WIPE_PHRASE}
          >
            Apagar tudo
          </Button>
          <Button variant="ghost" block onClick={p.onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

type Painel = 'backup' | 'restaurar' | 'apagar' | { volta: RestorePoint } | null;

export function BackupPage(p: {
  session: VaultSession;
  workspaces: readonly Workspace[];
  storage: StorageStatus | null;
  onChanged: (m: string) => void;
  onWiped: () => void;
}) {
  const [painel, setPainel] = useState<Painel>(null);
  const [pontos, setPontos] = useState<RestorePoint[]>([]);
  const [versao, setVersao] = useState(0);
  const [dias, setDias] = useState(() => p.session.backupStatus(true).intervalDays);
  const [erro, setErro] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const status = p.session.backupStatus(p.storage?.persisted ?? false);

  useEffect(() => {
    let vivo = true;
    p.session.restorePoints().then(
      (lista) => {
        if (vivo) setPontos(lista);
      },
      () => undefined,
    );
    return () => {
      vivo = false;
    };
  }, [p.session, versao]);

  const fechar = () => {
    setPainel(null);
  };
  const feito = (m: string) => {
    setPainel(null);
    setVersao((v) => v + 1);
    p.onChanged(m);
  };
  const voltar = async (ponto: RestorePoint) => {
    setBusy(true);
    setErro(undefined);
    try {
      await p.session.undoRestore(ponto.id);
      feito(`O cofre voltou ao estado de ${quando(ponto.createdAt)}.`);
    } catch (falha) {
      setErro(messageFor(falha));
    } finally {
      setBusy(false);
    }
  };

  const protegido = p.storage?.persisted ?? false;
  return (
    <div className="rz-blocks rz-enter">
      {status.reminder ? (
        <Alert tone={status.reminder.tone} title="Hora de fazer backup">
          {status.reminder.text}
        </Alert>
      ) : null}
      <section className="rz-card rz-section" aria-labelledby="protecao">
        <h2 id="protecao" className="rz-section-title">
          Proteção dos dados
        </h2>
        <dl className="rz-facts">
          <div>
            <dt>Armazenamento</dt>
            <dd>
              {protegido ? (
                <Badge tone="positive">Protegido</Badge>
              ) : (
                <Badge tone="warning">Não protegido</Badge>
              )}{' '}
              {protegido
                ? 'O navegador não apaga os dados para liberar espaço.'
                : 'O navegador pode apagar os dados se faltar espaço. Faça backups com frequência.'}
            </dd>
          </div>
          <div>
            <dt>Espaço usado</dt>
            <dd>
              {p.storage?.usageBytes != null && p.storage.quotaBytes != null
                ? `${mb(p.storage.usageBytes)} de ${mb(p.storage.quotaBytes)} disponíveis`
                : 'O navegador não informa.'}
            </dd>
          </div>
          <div>
            <dt>Último backup</dt>
            <dd>{status.lastBackupAt ? quando(status.lastBackupAt) : 'Nenhum backup ainda.'}</dd>
          </div>
        </dl>
        <div className="rz-actions">
          <Button
            variant="primary"
            icon="download"
            onClick={() => {
              setPainel('backup');
            }}
          >
            Fazer backup
          </Button>
          <Button
            icon="share"
            onClick={() => {
              setPainel('restaurar');
            }}
          >
            Restaurar backup
          </Button>
        </div>
      </section>

      <section className="rz-card rz-section" aria-labelledby="lembrete">
        <h2 id="lembrete" className="rz-section-title">
          Lembrete
        </h2>
        <SelectField
          label="Lembrar de fazer backup, se houver dados novos, a cada"
          value={String(dias)}
          options={REMINDER_OPTIONS.map((d) => ({
            value: String(d),
            label: d === 1 ? '1 dia' : `${String(d)} dias`,
          }))}
          onChange={(v) => {
            p.session.setReminderDays(Number(v));
            setDias(Number(v));
          }}
        />
      </section>

      <IntegrityCard session={p.session} onChanged={p.onChanged} />

      {pontos.length ? (
        <section className="rz-card rz-section" aria-labelledby="pontos">
          <h2 id="pontos" className="rz-section-title">
            Pontos de volta
          </h2>
          <p className="rz-ob-lead">
            Criados antes de cada restauração. Voltar a um deles também guarda o estado atual antes.
          </p>
          {erro ? (
            <Alert tone="negative" title="Não deu certo">
              {erro}
            </Alert>
          ) : null}
          <ul
            className="rz-list"
            aria-label="Pontos de volta"
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {pontos.map((pt) => (
              <li key={pt.id} className="rz-space-row">
                <span>Antes da restauração de {quando(pt.createdAt)}</span>
                <Button
                  size="sm"
                  busy={busy}
                  onClick={() => {
                    setPainel({ volta: pt });
                  }}
                >
                  Voltar a este ponto
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rz-card rz-section" aria-labelledby="apagar">
        <h2 id="apagar" className="rz-section-title">
          Apagar tudo
        </h2>
        <p className="rz-ob-lead">
          Remove o Razão e todos os dados deste navegador. Use antes de vender ou emprestar o aparelho.
        </p>
        <div>
          <Button
            variant="danger"
            icon="trash"
            onClick={() => {
              setPainel('apagar');
            }}
          >
            Apagar tudo deste aparelho
          </Button>
        </div>
      </section>

      {painel === 'backup' ? (
        <CreateBackupSheet
          session={p.session}
          workspaces={p.workspaces.filter((w) => !w.archived)}
          onClose={fechar}
          onDone={feito}
        />
      ) : null}
      {painel === 'restaurar' ? (
        <RestoreBackupSheet session={p.session} onClose={fechar} onDone={feito} />
      ) : null}
      {painel === 'apagar' ? <ApagarTudoSheet onClose={fechar} onWiped={p.onWiped} /> : null}
      {painel !== null && typeof painel === 'object' ? (
        <Sheet title="Voltar a um ponto" onClose={fechar}>
          <Alert tone="warning" title={`Voltar ao estado de ${quando(painel.volta.createdAt)}`}>
            O cofre inteiro volta a como estava antes daquela restauração. O estado atual vira outro ponto de
            volta.
          </Alert>
          <div className="rz-form-actions">
            <Button variant="primary" size="lg" block busy={busy} onClick={() => void voltar(painel.volta)}>
              Voltar a este ponto
            </Button>
            <Button variant="ghost" block onClick={fechar}>
              Cancelar
            </Button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
