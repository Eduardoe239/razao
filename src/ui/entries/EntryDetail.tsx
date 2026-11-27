// Detalhe de um lançamento: conta, categorias, situação, tags e as partidas recolhidas (Volume 08, seção 6).
import { categoryName } from '@/application/entry-list';
import type { FlowRow } from '@/application/entry-ops';
import { formatBRL, formatDate } from '@/application/format';
import type { Category } from '@/application/model';
import type { ReactNode } from 'react';
import type { WorkspaceView } from '@/application/session';
import { Alert, Amount, Badge, Button } from '../components/ds';

export function EntryDetail(p: {
  row: FlowRow;
  view: WorkspaceView;
  categories: readonly Category[];
  today: string;
  busy: boolean;
  erro: string | undefined;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConfirm: () => void;
  /** LAN-009: o bloco de comprovantes, montado por quem tem a sessão. */
  attachments?: ReactNode;
}) {
  const { row, categories } = p;
  const conta = p.view.accounts.find((a) => a.account.id === row.accountId)?.account.name ?? 'Conta removida';
  const pendente = row.status === 'pendente';
  const atrasado = pendente && row.date < p.today;
  const receita = row.kind === 'receita';
  const situacao = pendente ? (atrasado ? 'Atrasado' : 'A vencer') : 'Realizado';
  return (
    <div className="rz-detail">
      <div className="rz-detail-head">
        <Amount cents={receita ? row.amountCents : -row.amountCents} size="lg" />
        <Badge tone={pendente ? 'warning' : 'neutral'}>{situacao}</Badge>
      </div>
      <span className="rz-detail-when">
        {pendente ? 'Vence em ' : 'Em '}
        {formatDate(row.date)}
        {pendente ? ' · não entra no saldo até ser confirmado' : ''}
      </span>
      <dl className="rz-facts">
        <div>
          <dt>{receita ? 'Recebido em' : 'Pago com'}</dt>
          <dd>{conta}</dd>
        </div>
        {row.parts.map((x) => (
          <div key={x.categoryId}>
            <dt>Categoria</dt>
            <dd>
              {categoryName(categories, x.categoryId)}
              {row.parts.length > 1 ? <span className="rz-num"> · {formatBRL(x.amountCents)}</span> : null}
            </dd>
          </div>
        ))}
        {row.tags.length ? (
          <div>
            <dt>Tags</dt>
            <dd>{row.tags.join(', ')}</dd>
          </div>
        ) : null}
      </dl>
      {row.note ? <p className="rz-detail-note">{row.note}</p> : null}
      {row.edited ? (
        <p className="rz-detail-note">
          Editado. O histórico guarda a versão anterior, e o saldo foi recalculado.
        </p>
      ) : null}
      {p.attachments}
      <details className="rz-more">
        <summary>Partidas contábeis</summary>
        <div className="rz-ledger">
          {receita ? (
            <div className="rz-ledger-pair">
              <span>{conta}</span>
              <span className="rz-num">D {formatBRL(row.amountCents)}</span>
            </div>
          ) : null}
          {row.parts.map((x) => (
            <div key={x.categoryId} className="rz-ledger-pair">
              <span>
                {receita ? 'Receita' : 'Despesa'} · {categoryName(categories, x.categoryId)}
              </span>
              <span className="rz-num">
                {receita ? 'C' : 'D'} {formatBRL(x.amountCents)}
              </span>
            </div>
          ))}
          {!receita ? (
            <div className="rz-ledger-pair">
              <span>{conta}</span>
              <span className="rz-num">C {formatBRL(row.amountCents)}</span>
            </div>
          ) : null}
        </div>
      </details>
      {p.erro ? (
        <Alert tone="negative" title="Não deu certo">
          {p.erro}
        </Alert>
      ) : null}
      {pendente ? (
        <Button variant="primary" size="lg" block busy={p.busy} onClick={p.onConfirm}>
          Confirmar pagamento
        </Button>
      ) : null}
      <div className="rz-detail-actions">
        <Button icon="edit" onClick={p.onEdit} disabled={p.busy}>
          Editar
        </Button>
        <Button icon="copy" onClick={p.onDuplicate} disabled={p.busy}>
          Duplicar
        </Button>
        <Button variant="danger" icon="trash" onClick={p.onDelete} disabled={p.busy}>
          Excluir
        </Button>
      </div>
    </div>
  );
}
