// BKP-008 e D-054: importar o arquivo de backup da beta.20 como espaços novos, com prévia de contagens e saldos,
// a quarentena com o motivo de cada item e um relatório para baixar. Nada é gravado antes de "Importar".
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import type { Beta20Plan } from '@/application/beta20-build';
import { messageFor } from '@/application/errors';
import { formatBRL } from '@/application/format';
import type { VaultSession } from '@/application/session';
import { Alert, Badge, Button } from '../components/ds';
import { Sheet } from '../components/Sheet';
import { baixar, quando } from './BackupSheets';

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/** Relatório em texto simples: o que entrou, o que ficou na quarentena e por quê. */
export function beta20Report(plan: Beta20Plan): string {
  const linhas = [
    'O Razão: importação da beta.20',
    `Arquivo gerado em ${quando(plan.createdAt)} (esquema ${String(plan.schemaVersion)}).`,
    '',
  ];
  for (const e of plan.spaces) {
    linhas.push(`${e.name}: ${plural(e.entries, 'lançamento', 'lançamentos')}`);
    for (const c of e.accounts) {
      const ok =
        c.beta20Cents === c.razaoCents
          ? 'confere'
          : `diferença de ${formatBRL(c.razaoCents - c.beta20Cents)}`;
      linhas.push(
        `  ${c.name}: beta.20 ${formatBRL(c.beta20Cents)}, Razão ${formatBRL(c.razaoCents)} (${ok})`,
      );
    }
  }
  linhas.push(
    '',
    `Cancelados, não importados: ${String(plan.cancelled)}`,
    '',
    `Quarentena (${String(plan.quarantine.length)}):`,
  );
  for (const q of plan.quarantine) linhas.push(`  ${q.label}: ${q.reason}`);
  return `${linhas.join('\n')}\n`;
}

function Previa({ plan }: { plan: Beta20Plan }) {
  return (
    <>
      {plan.spaces.map((e) => (
        <section key={e.workspaceId} className="rz-card rz-section" aria-label={`Prévia de ${e.name}`}>
          <div className="rz-tx-meta">
            <Badge tone={e.kind === 'PJ' ? 'pj' : 'pf'}>{e.name}</Badge>{' '}
            {plural(e.entries, 'lançamento', 'lançamentos')}
            {e.pending ? ` · ${plural(e.pending, 'a vencer', 'a vencer')}` : ''}
            {e.transfers ? ` · ${plural(e.transfers, 'transferência', 'transferências')}` : ''}
          </div>
          <ul className="rz-preview" aria-label={`Contas de ${e.name}`}>
            {e.accounts.map((c) => (
              <li key={c.name}>
                <span className="rz-tx-title">{c.name}</span>
                <span className="rz-tx-meta">
                  beta.20 {formatBRL(c.beta20Cents)} · Razão {formatBRL(c.razaoCents)} ·{' '}
                  {c.beta20Cents === c.razaoCents
                    ? 'confere'
                    : `diferença de ${formatBRL(c.razaoCents - c.beta20Cents)}`}
                </span>
              </li>
            ))}
          </ul>
          {e.invoicePayments ? (
            <p className="rz-help">
              {plural(e.invoicePayments, 'pagamento de fatura entra', 'pagamentos de fatura entram')} como
              despesa em “Fatura de cartão (beta.20)”, para o saldo da conta bater.
            </p>
          ) : null}
          {e.categoriesCreated.length ? (
            <p className="rz-help">Categorias criadas: {e.categoriesCreated.join(', ')}.</p>
          ) : null}
        </section>
      ))}
      {plan.quarantine.length ? (
        <section className="rz-card rz-section" aria-labelledby="quarentena-b20">
          <h3 id="quarentena-b20" className="rz-section-title">
            Quarentena ({plan.quarantine.length})
          </h3>
          <p className="rz-help">Fica guardado e cifrado no espaço importado. Nada entra nos saldos.</p>
          <ul className="rz-preview" aria-label="Itens na quarentena">
            {plan.quarantine.map((q, i) => (
              <li key={`${String(i)}-${q.label}`}>
                <span className="rz-tx-title">{q.label}</span>
                <span className="rz-tx-meta">{q.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {plan.cancelled ? (
        <p className="rz-help">
          {plural(plan.cancelled, 'lançamento cancelado não entra', 'lançamentos cancelados não entram')}.
        </p>
      ) : null}
    </>
  );
}

export function Beta20Sheet(p: { session: VaultSession; onClose: () => void; onDone: (m: string) => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [plano, setPlano] = useState<Beta20Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const abrir = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setErro('Escolha o arquivo de backup da beta.20 (.json).');
      return;
    }
    setBusy(true);
    setErro(undefined);
    try {
      setPlano(p.session.previewBeta20(await arquivo.text()));
    } catch (falha) {
      setErro(messageFor(falha));
    } finally {
      setBusy(false);
    }
  };
  const importar = async () => {
    if (!plano) return;
    setBusy(true);
    setErro(undefined);
    try {
      await p.session.importBeta20(plano);
      p.onDone(
        `Importação concluída e conferida: ${plano.spaces.map((e) => e.name).join(' e ')} ${plano.spaces.length === 1 ? 'criado' : 'criados'}.`,
      );
    } catch (falha) {
      setErro(messageFor(falha));
      setBusy(false);
    }
  };
  return (
    <Sheet title="Importar da beta.20" onClose={p.onClose}>
      {!plano ? (
        <form className="rz-form" onSubmit={(e) => void abrir(e)} noValidate>
          <p className="rz-ob-lead">
            Use o arquivo de backup que a beta.20 exporta (.json). Os dados entram em espaços novos, ao lado
            dos atuais, e nada é gravado antes da prévia.
          </p>
          <div className="rz-field">
            <label className="rz-label" htmlFor="rz-arquivo-beta20">
              Arquivo da beta.20
            </label>
            <input
              id="rz-arquivo-beta20"
              className="rz-input rz-file"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                setArquivo(e.target.files?.[0] ?? null);
              }}
            />
          </div>
          {erro ? (
            <Alert tone="negative" title="Não deu certo">
              {erro}
            </Alert>
          ) : null}
          <div className="rz-form-actions">
            <Button type="submit" variant="primary" size="lg" block busy={busy}>
              {busy ? 'Lendo e conferindo…' : 'Ver prévia'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rz-form">
          <div className="rz-tx-meta">Arquivo gerado em {quando(plano.createdAt)}</div>
          <Previa plan={plano} />
          <Alert tone="info" title="Entra ao lado, sem mexer no que existe">
            Antes, o estado atual vira um ponto de volta. Depois de gravar, o app reconta tudo; se algo não
            bater, desfaz sozinho.
          </Alert>
          {erro ? (
            <Alert tone="negative" title="Não deu certo">
              {erro}
            </Alert>
          ) : null}
          <div className="rz-form-actions">
            <Button variant="primary" size="lg" block busy={busy} onClick={() => void importar()}>
              Importar
            </Button>
            <Button
              icon="download"
              block
              onClick={() => {
                baixar('razao-importacao-beta20.txt', beta20Report(plano));
              }}
            >
              Baixar relatório
            </Button>
            <Button variant="ghost" block onClick={p.onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
