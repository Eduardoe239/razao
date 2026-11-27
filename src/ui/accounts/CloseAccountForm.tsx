// CON-007: encerrar conta. Com saldo zero encerra direto; com saldo, a pessoa escolhe para onde vai o
// dinheiro (ou de onde vem, se o saldo é negativo) e tudo acontece numa operação só. O bloqueio é explicado.
import { useEffect, useState } from 'react';
import type { ClosePreview } from '@/application/account-ops';
import { messageFor } from '@/application/errors';
import { formatBRL } from '@/application/format';
import type { Account } from '@/application/model';
import type { VaultSession, WorkspaceView } from '@/application/session';
import { Alert, Button } from '../components/ds';
import { SelectField } from '../components/Sheet';
import { Rodape, parar, useEnvio } from './AccountForms';

export function CloseAccountForm(p: {
  session: VaultSession;
  view: WorkspaceView;
  account: Account;
  onDone: (m: string) => void;
  onCancel: () => void;
}) {
  const { session, view, account } = p;
  const [prev, setPrev] = useState<ClosePreview | null>(null);
  const [falha, setFalha] = useState<string | undefined>();
  const [para, setPara] = useState('');
  const { busy, erro, run } = useEnvio(session);

  useEffect(() => {
    let vivo = true;
    session
      .previewClose(view.workspace.id, account.id)
      .then((r) => {
        if (!vivo) return;
        setPrev(r);
        setPara(r.targets[0]?.id ?? '');
      })
      .catch((e: unknown) => {
        if (vivo) setFalha(messageFor(e));
      });
    return () => {
      vivo = false;
    };
  }, [session, view, account.id]);

  if (falha) {
    return (
      <Alert tone="negative" title="Não deu para conferir a conta">
        {falha}
      </Alert>
    );
  }
  if (!prev)
    return (
      <div className="rz-card" aria-busy="true" aria-label="Conferindo a conta" style={{ minHeight: 120 }} />
    );

  const voltar = (
    <Button variant="ghost" block onClick={p.onCancel}>
      Voltar
    </Button>
  );
  if (prev.pending > 0) {
    return (
      <div className="rz-form">
        <Alert tone="warning" title="Ainda não dá para encerrar">
          {prev.pending === 1
            ? 'Esta conta tem 1 lançamento a vencer.'
            : `Esta conta tem ${String(prev.pending)} lançamentos a vencer.`}{' '}
          Confirme ou exclua em Lançamentos e volte aqui.
        </Alert>
        {voltar}
      </div>
    );
  }
  const saldo = prev.balanceCents;
  if (saldo !== 0 && prev.targets.length === 0) {
    return (
      <div className="rz-form">
        <Alert tone="warning" title="Ainda não dá para encerrar">
          A conta tem {formatBRL(saldo)} e não há outra conta ativa para receber a transferência final. Crie
          outra conta ou ajuste o saldo para zero.
        </Alert>
        {voltar}
      </div>
    );
  }
  const destino = prev.targets.find((t) => t.id === para)?.name ?? '';
  const enviar = () => {
    void run(
      (operationId) =>
        session.closeAccount(view.workspace.id, {
          accountId: account.id,
          ...(saldo !== 0 ? { toAccountId: para } : {}),
          operationId,
        }),
      () => {
        p.onDone(
          saldo === 0
            ? `Conta ${account.name} encerrada. O histórico continua guardado.`
            : `${formatBRL(Math.abs(saldo))} ${saldo > 0 ? `foram para ${destino}` : `saíram de ${destino}`} e a conta ${account.name} foi encerrada.`,
        );
      },
    );
  };
  return (
    <form className="rz-form" onSubmit={parar(enviar)} noValidate>
      {saldo === 0 ? (
        <p className="rz-sheet-text">
          A conta está com saldo zero. Ela sai das escolhas do dia a dia, o histórico continua guardado e dá
          para reativar depois.
        </p>
      ) : (
        <>
          <p className="rz-sheet-text">
            {saldo > 0
              ? `A conta ainda tem ${formatBRL(saldo)}. Para encerrar, o dinheiro vai para outra conta numa transferência final, hoje.`
              : `A conta está negativa em ${formatBRL(-saldo)}. Para encerrar, a outra conta cobre esse valor numa transferência final, hoje.`}
          </p>
          <SelectField
            label={saldo > 0 ? 'Transferir para' : 'Cobrir com'}
            value={para}
            onChange={setPara}
            options={prev.targets.map((t) => ({ value: t.id, label: t.name }))}
          />
        </>
      )}
      <Rodape
        busy={busy}
        label={saldo === 0 ? 'Encerrar conta' : 'Transferir e encerrar'}
        erro={erro}
        onCancel={p.onCancel}
      />
    </form>
  );
}
