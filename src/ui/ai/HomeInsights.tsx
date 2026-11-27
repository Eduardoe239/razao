// Razão IA nível 1 no Início e nas contas: até 3 alertas (IA-006) e "Explicar" o saldo (IA-004).
import { useEffect, useState } from 'react';
import type { AiAlert } from '@/application/ai';
import { messageFor } from '@/application/errors';
import type { Explanation } from '@/application/explain';
import { monthToDate } from '@/application/explain';
import type { VaultSession, WorkspaceView } from '@/application/session';
import { Alert, Button } from '../components/ds';
import { Sheet } from '../components/Sheet';
import { ExplainSheet } from './ExplainSheet';

export function AlertsBlock(p: {
  session: VaultSession;
  view: WorkspaceView;
  onSee: (alert: AiAlert) => void;
}) {
  const { session, view } = p;
  const ws = view.workspace.id;
  const [alertas, setAlertas] = useState<readonly AiAlert[]>([]);
  const [versao, setVersao] = useState(0);
  const [erro, setErro] = useState<string | undefined>();
  useEffect(() => {
    let vivo = true;
    session.entries.alerts(ws).then(
      (a) => {
        if (vivo) setAlertas(a);
      },
      () => undefined,
    );
    return () => {
      vivo = false;
    };
  }, [session, ws, view, versao]);
  if (!alertas.length) return null;
  const dispensar = async (a: AiAlert) => {
    try {
      await session.entries.dismissAlert(ws, { alertId: a.id, operationId: session.newOperationId() });
      setVersao((v) => v + 1);
    } catch (e) {
      setErro(messageFor(e));
    }
  };
  return (
    <section className="rz-blocks rz-alerts" aria-label="Alertas da Razão IA">
      {alertas.map((a) => (
        <Alert key={a.id} tone={a.tone} title={a.title}>
          {a.text}
          <span className="rz-alert-actions">
            <Button
              size="sm"
              onClick={() => {
                p.onSee(a);
              }}
            >
              Ver
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void dispensar(a)}>
              Dispensar
            </Button>
          </span>
        </Alert>
      ))}
      {erro ? <Alert tone="negative">{erro}</Alert> : null}
    </section>
  );
}

/** "Por que o saldo mudou" no mês até hoje, de uma conta ou do total do espaço (J-06), sem painel em volta. */
export function ExplainBalance(p: {
  session: VaultSession;
  view: WorkspaceView;
  accountId?: string | undefined;
}) {
  const { session, view } = p;
  const [estado, setEstado] = useState<{ t: 'ok'; e: Explanation } | { t: 'erro'; msg: string } | null>(null);
  useEffect(() => {
    let vivo = true;
    session.entries
      .explainBalance(view.workspace.id, {
        ...(p.accountId ? { accountId: p.accountId } : {}),
        ...monthToDate(view.asOf),
      })
      .then(
        (e) => {
          if (vivo) setEstado({ t: 'ok', e });
        },
        (e: unknown) => {
          if (vivo) setEstado({ t: 'erro', msg: messageFor(e) });
        },
      );
    return () => {
      vivo = false;
    };
  }, [session, view, p.accountId]);
  if (estado?.t === 'ok') return <ExplainSheet explanation={estado.e} />;
  if (estado?.t === 'erro') return <Alert tone="negative">{estado.msg}</Alert>;
  return <div aria-busy="true" aria-label="Montando a explicação" style={{ minHeight: 120 }} />;
}

export function ExplainBalanceSheet(p: {
  session: VaultSession;
  view: WorkspaceView;
  accountId?: string | undefined;
  onClose: () => void;
}) {
  return (
    <Sheet title="Por que o saldo mudou" onClose={p.onClose}>
      <ExplainBalance session={p.session} view={p.view} accountId={p.accountId} />
    </Sheet>
  );
}
