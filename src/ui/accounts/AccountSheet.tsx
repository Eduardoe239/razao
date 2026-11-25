// Detalhe de uma conta: saldo e ações (transferir, ajustar, editar, arquivar ou reativar).
import { useState } from 'react';
import { messageFor } from '@/application/errors';
import { ACCOUNT_KIND_LABELS } from '@/application/model';
import type { AccountView, VaultSession, WorkspaceView } from '@/application/session';
import { Alert, Amount, Badge, Button } from '../components/ds';
import { Sheet } from '../components/Sheet';
import { AdjustForm, EditAccountForm, TransferForm } from './AccountForms';

type Modo = 'detalhe' | 'editar' | 'transferir' | 'ajustar';

const TITULO: Record<Modo, string> = {
  detalhe: '',
  editar: 'Editar conta',
  transferir: 'Transferir',
  ajustar: 'Ajustar saldo',
};

export function AccountSheet(p: {
  session: VaultSession;
  view: WorkspaceView;
  item: AccountView;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { account, balance } = p.item;
  const [modo, setModo] = useState<Modo>('detalhe');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const voltar = () => {
    setModo('detalhe');
  };
  const comum = { session: p.session, view: p.view, onDone: p.onDone };

  const arquivar = async () => {
    setBusy(true);
    setErro(undefined);
    try {
      await p.session.setAccountArchived(p.view.workspace.id, {
        accountId: account.id,
        archived: !account.archived,
        operationId: p.session.newOperationId(),
      });
      p.onDone(
        account.archived
          ? `Conta ${account.name} reativada.`
          : `Conta ${account.name} arquivada. O histórico continua guardado.`,
      );
    } catch (e) {
      setErro(messageFor(e));
      setBusy(false);
    }
  };

  return (
    <Sheet title={modo === 'detalhe' ? account.name : TITULO[modo]} onClose={p.onClose}>
      {modo === 'detalhe' ? (
        <>
          <div className="rz-ob-intro">
            <span className="rz-stat-label">
              {ACCOUNT_KIND_LABELS[account.kind]} {account.archived ? <Badge>Arquivada</Badge> : null}
            </span>
            <Amount cents={balance} kind="balance" size="hero" />
          </div>
          {erro ? (
            <Alert tone="negative" title="Não deu certo">
              {erro}
            </Alert>
          ) : null}
          <div className="rz-form-actions">
            {!account.archived ? (
              <>
                <Button
                  variant="primary"
                  icon="transfer"
                  block
                  size="lg"
                  disabled={p.view.accounts.filter((a) => !a.account.archived).length < 2}
                  onClick={() => {
                    setModo('transferir');
                  }}
                >
                  Transferir
                </Button>
                <Button
                  icon="sliders"
                  block
                  onClick={() => {
                    setModo('ajustar');
                  }}
                >
                  Ajustar saldo
                </Button>
              </>
            ) : null}
            <Button
              icon="edit"
              block
              onClick={() => {
                setModo('editar');
              }}
            >
              Editar nome e tipo
            </Button>
            <Button variant="ghost" icon="archive" block busy={busy} onClick={() => void arquivar()}>
              {account.archived ? 'Reativar conta' : 'Arquivar conta'}
            </Button>
          </div>
        </>
      ) : null}
      {modo === 'editar' ? <EditAccountForm {...comum} account={account} onCancel={voltar} /> : null}
      {modo === 'transferir' ? <TransferForm {...comum} fromId={account.id} onCancel={voltar} /> : null}
      {modo === 'ajustar' ? (
        <AdjustForm {...comum} account={account} balance={balance} onCancel={voltar} />
      ) : null}
    </Sheet>
  );
}
