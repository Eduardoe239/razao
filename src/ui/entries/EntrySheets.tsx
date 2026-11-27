// Exportar a lista em CSV (REL-006) e recategorizar em lote com prévia (CAT-004).
import { useEffect, useState } from 'react';
import type { MovePreview } from '@/application/category-ops';
import { csvFileName, flowsToCsv } from '@/application/csv';
import { categoryOptions, monthLabel } from '@/application/entry-list';
import type { FlowRow } from '@/application/entry-ops';
import { messageFor } from '@/application/errors';
import type { Category, Workspace } from '@/application/model';
import type { VaultSession } from '@/application/session';
import { baixar } from '../backup/BackupSheets';
import { Alert, Button } from '../components/ds';
import { SelectField } from '../components/Sheet';

export function ExportSheet(p: {
  workspace: Workspace;
  rows: readonly FlowRow[];
  categories: readonly Category[];
  accountNames: ReadonlyMap<string, string>;
  /** aaaa-mm, ou "a-vencer" na aba A vencer. */
  period: string;
  onDone: (m: string) => void;
}) {
  const n = p.rows.length;
  const nome = csvFileName(p.workspace.kind, p.period);
  return (
    <div className="rz-form">
      <p className="rz-sheet-text">
        {n === 1 ? '1 lançamento' : `${String(n)} lançamentos`} de{' '}
        {p.period === 'a-vencer' ? 'A vencer' : monthLabel(p.period)}, com os filtros que estão na tela.
        Lançamento dividido sai com uma linha por categoria.
      </p>
      <Alert tone="warning" title="O arquivo sai sem criptografia">
        Ele é para você abrir numa planilha. Quem tiver o arquivo consegue ler os valores, então guarde-o com
        cuidado.
      </Alert>
      <div className="rz-form-actions">
        <Button
          variant="primary"
          size="lg"
          block
          icon="download"
          disabled={n === 0}
          onClick={() => {
            baixar(nome, flowsToCsv(p.rows, p.categories, p.accountNames));
            p.onDone(`Arquivo ${nome} pronto.`);
          }}
        >
          Baixar CSV
        </Button>
      </div>
    </div>
  );
}

export function RecategorizeSheet(p: {
  session: VaultSession;
  workspaceId: string;
  rows: readonly FlowRow[];
  categories: readonly Category[];
  onDone: (m: string) => void;
}) {
  const tipos = new Set(p.rows.map((r) => r.kind));
  const kind = p.rows[0]?.kind ?? 'despesa';
  const opcoes = categoryOptions(p.categories, kind);
  const [destino, setDestino] = useState('');
  const [previa, setPrevia] = useState<MovePreview | null>(null);
  const [erro, setErro] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [op] = useState(() => p.session.newOperationId());
  const ids = p.rows.map((r) => r.entryId);
  const chave = ids.join(',');

  useEffect(() => {
    if (!destino) return;
    let vivo = true;
    p.session.entries.previewRecategorize(p.workspaceId, { entryIds: chave.split(','), toId: destino }).then(
      (x) => {
        if (!vivo) return;
        setPrevia(x);
        setErro(undefined);
      },
      (e: unknown) => {
        if (!vivo) return;
        setPrevia(null);
        setErro(messageFor(e));
      },
    );
    return () => {
      vivo = false;
    };
  }, [p.session, p.workspaceId, chave, destino]);

  if (tipos.size > 1) {
    return (
      <Alert tone="info" title="Escolha só entradas ou só saídas">
        Categoria de receita só recebe entradas, e de despesa só recebe saídas. Desmarque os lançamentos do
        outro tipo.
      </Alert>
    );
  }
  const mover = async () => {
    if (busy || !previa || !destino) return;
    setBusy(true);
    try {
      await p.session.entries.recategorize(p.workspaceId, { entryIds: ids, toId: destino, operationId: op });
      p.onDone(
        `${previa.count === 1 ? '1 lançamento movido' : `${String(previa.count)} lançamentos movidos`}.`,
      );
    } catch (e) {
      setErro(messageFor(e));
      setBusy(false);
    }
  };
  return (
    <div className="rz-form">
      <SelectField
        label="Mover para a categoria"
        value={destino}
        onChange={setDestino}
        options={[{ value: '', label: 'Escolha a categoria' }, ...opcoes]}
      />
      {previa && destino ? (
        <div className="rz-card rz-preview-card">
          <span className="rz-label">Antes de confirmar</span>
          <span>
            {previa.count === 1 ? '1 lançamento' : `${String(previa.count)} lançamentos`} de{' '}
            {previa.months.map(monthLabel).join(', ')}
            {previa.pending ? `, ${String(previa.pending)} a vencer` : ''}.
          </span>
          <span className="rz-help">O saldo das contas não muda. Só a divisão entre as categorias.</span>
        </div>
      ) : null}
      {erro ? <Alert tone="negative">{erro}</Alert> : null}
      <div className="rz-form-actions">
        <Button
          variant="primary"
          size="lg"
          block
          busy={busy}
          disabled={!previa || !destino}
          onClick={() => void mover()}
        >
          Mover
        </Button>
      </div>
    </div>
  );
}
