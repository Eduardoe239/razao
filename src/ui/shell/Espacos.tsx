// Espaços do cofre (COF-004, COF-007): criar o que falta, arquivar, reativar e excluir com confirmação digitada.
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import type { WorkspaceFootprint } from '@/application/account-ops';
import { DELETE_WORD } from '@/application/account-ops';
import { messageFor } from '@/application/errors';
import type { Workspace, WorkspaceKind } from '@/application/model';
import { workspaceLabel } from '@/application/model';
import type { VaultSession } from '@/application/session';
import { Alert, Badge, Button, TextField } from '../components/ds';
import { Sheet } from '../components/Sheet';

const rotulo = (w: Workspace) => workspaceLabel(w);

function plural(n: number, um: string, varios: string) {
  return `${String(n)} ${n === 1 ? um : varios}`;
}

function ExcluirSheet(p: {
  session: VaultSession;
  ws: Workspace;
  footprint: WorkspaceFootprint;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const enviar = async (e: SyntheticEvent) => {
    e.preventDefault();
    setBusy(true);
    setErro(undefined);
    try {
      await p.session.deleteWorkspace(p.ws.id, texto);
      p.onDone(`Espaço ${rotulo(p.ws)} excluído deste aparelho.`);
    } catch (falha) {
      setErro(messageFor(falha));
      setBusy(false);
    }
  };
  const nome = workspaceLabel(p.ws, true);
  return (
    <Sheet title={`Excluir o espaço ${nome}`} onClose={p.onClose}>
      <form className="rz-form" onSubmit={(e) => void enviar(e)} noValidate>
        <Alert tone="negative" title="Esta ação não tem volta">
          Excluir o espaço {nome} apaga {plural(p.footprint.entries, 'movimento', 'movimentos')} e{' '}
          {plural(p.footprint.accounts, 'conta', 'contas')} deste aparelho, inclusive das cópias de segurança
          automáticas.
        </Alert>
        <Alert tone="warning" title="Ainda não há backup nesta versão de teste">
          O backup em arquivo chega na próxima etapa. Se tiver dúvida, arquive o espaço em vez de excluir:
          arquivar não apaga nada.
        </Alert>
        <TextField
          label={`Digite ${DELETE_WORD} para confirmar`}
          value={texto}
          onChange={setTexto}
          autoFocus
          maxLength={20}
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
            disabled={texto.trim().toUpperCase() !== DELETE_WORD}
          >
            Excluir o espaço
          </Button>
          <Button variant="ghost" block onClick={p.onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function CriarSheet(p: {
  session: VaultSession;
  kind: WorkspaceKind;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const [nome, setNome] = useState(p.kind === 'PF' ? 'Pessoal' : '');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const enviar = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Digite o nome.');
      return;
    }
    setBusy(true);
    try {
      await p.session.createWorkspace({ kind: p.kind, name: nome });
      p.onDone(`Espaço ${p.kind === 'PF' ? 'Pessoal' : nome.trim()} criado.`);
    } catch (falha) {
      setErro(messageFor(falha));
      setBusy(false);
    }
  };
  return (
    <Sheet title={p.kind === 'PF' ? 'Criar o espaço Pessoal' : 'Criar o espaço Negócio'} onClose={p.onClose}>
      <form className="rz-form" onSubmit={(e) => void enviar(e)} noValidate>
        <p className="rz-ob-lead">Cada espaço tem as suas contas. Nada de um aparece no outro.</p>
        <TextField
          label={p.kind === 'PF' ? 'Nome do espaço' : 'Nome da empresa'}
          value={nome}
          onChange={setNome}
          autoFocus
          maxLength={80}
        />
        {erro ? (
          <Alert tone="negative" title="Não deu certo">
            {erro}
          </Alert>
        ) : null}
        <div className="rz-form-actions">
          <Button type="submit" variant="primary" size="lg" block busy={busy}>
            Criar espaço
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

export function Espacos({
  session,
  workspaces,
  onChanged,
}: {
  session: VaultSession;
  workspaces: readonly Workspace[];
  onChanged: (m: string) => void;
}) {
  const [aberto, setAberto] = useState<
    { t: 'excluir'; ws: Workspace; fp: WorkspaceFootprint } | { t: 'criar'; kind: WorkspaceKind } | null
  >(null);
  const [erro, setErro] = useState<string | undefined>();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const falta = (['PF', 'PJ'] as const).filter((k) => !workspaces.some((w) => w.kind === k));
  const fechar = () => {
    setAberto(null);
  };
  const feito = (m: string) => {
    setAberto(null);
    onChanged(m);
  };

  const acao = async (id: string, fn: () => Promise<unknown>, msg: string) => {
    setOcupado(id);
    setErro(undefined);
    try {
      await fn();
      onChanged(msg);
    } catch (e) {
      setErro(messageFor(e));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="rz-blocks rz-enter">
      {erro ? (
        <Alert tone="negative" title="Não deu certo">
          {erro}
        </Alert>
      ) : null}
      <ul className="rz-list" aria-label="Espaços" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {workspaces.map((w) => (
          <li key={w.id} className="rz-space-row">
            <div className="rz-space-info">
              <span className="rz-tx-title">
                <span className={`rz-dot rz-dot-${w.kind === 'PJ' ? 'pj' : 'pf'}`} aria-hidden="true" />{' '}
                {rotulo(w)}
              </span>
              <span className="rz-tx-meta">
                <Badge tone={w.kind === 'PJ' ? 'pj' : 'pf'}>
                  {w.kind === 'PJ' ? 'Negócio (PJ)' : 'Pessoal (PF)'}
                </Badge>
                {w.archived ? <Badge>Arquivado</Badge> : null}
              </span>
            </div>
            <div className="rz-space-actions">
              <Button
                size="sm"
                icon="archive"
                busy={ocupado === w.id}
                onClick={() =>
                  void acao(
                    w.id,
                    () => session.setWorkspaceArchived(w.id, !w.archived),
                    w.archived
                      ? `Espaço ${rotulo(w)} reativado.`
                      : `Espaço ${rotulo(w)} arquivado. Nada foi apagado.`,
                  )
                }
              >
                {w.archived ? 'Reativar' : 'Arquivar'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon="trash"
                onClick={() =>
                  void session.workspaceFootprint(w.id).then(
                    (fp) => {
                      setAberto({ t: 'excluir', ws: w, fp });
                    },
                    (e: unknown) => {
                      setErro(messageFor(e));
                    },
                  )
                }
              >
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {falta.map((k) => (
        <Button
          key={k}
          icon="plus"
          onClick={() => {
            setAberto({ t: 'criar', kind: k });
          }}
        >
          {k === 'PF' ? 'Criar o espaço Pessoal' : 'Criar o espaço Negócio'}
        </Button>
      ))}
      {aberto?.t === 'excluir' ? (
        <ExcluirSheet
          session={session}
          ws={aberto.ws}
          footprint={aberto.fp}
          onClose={fechar}
          onDone={feito}
        />
      ) : null}
      {aberto?.t === 'criar' ? (
        <CriarSheet session={session} kind={aberto.kind} onClose={fechar} onDone={feito} />
      ) : null}
    </div>
  );
}
