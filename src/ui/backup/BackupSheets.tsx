// Fazer backup e restaurar (BKP-001 a BKP-003, PERS-05), em painéis do design system.
import type { SyntheticEvent } from 'react';
import { useState } from 'react';
import type { BackupPreview } from '@/application/backup';
import { describePreview } from '@/application/backup';
import { messageFor } from '@/application/errors';
import { formatBRL } from '@/application/format';
import type { Workspace } from '@/application/model';
import type { BackupScope } from '@/application/ports';
import type { VaultSession } from '@/application/session';
import { Alert, Badge, Button, TextField } from '../components/ds';
import { Sheet } from '../components/Sheet';

/** Entrega o arquivo pelo navegador; nada sai do aparelho por outro caminho (PRIV-02). */
export function baixar(nome: string, texto: string): void {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 2000);
}

const quando = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear())} às ${p(d.getHours())}:${p(d.getMinutes())}`;
};
export { quando };

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

export function CreateBackupSheet(p: {
  session: VaultSession;
  workspaces: readonly Workspace[];
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const ativos = p.workspaces;
  const opcoes: { id: string; label: string; scope: BackupScope }[] = [
    { id: 'cofre', label: 'Cofre inteiro', scope: { kind: 'cofre' } },
    ...ativos.map((w) => ({
      id: w.id,
      label: w.origin ? `Só ${w.name}` : w.kind === 'PF' ? 'Só o Pessoal' : `Só o Negócio`,
      scope: { kind: 'espaco' as const, workspaceId: w.id },
    })),
  ];
  const [escolha, setEscolha] = useState('cofre');
  const [senha, setSenha] = useState('');
  const [repeticao, setRepeticao] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const enviar = async (e: SyntheticEvent) => {
    e.preventDefault();
    const alvo = opcoes.find((o) => o.id === escolha) ?? opcoes[0];
    if (!alvo) return;
    setBusy(true);
    setErro(undefined);
    try {
      const b = await p.session.createBackup(alvo.scope, senha, repeticao);
      baixar(b.fileName, b.text);
      const contas = b.manifest.workspaces.reduce((s, w) => s + w.counts.entries, 0);
      p.onDone(
        `Backup concluído e conferido: ${plural(contas, 'lançamento', 'lançamentos')} no arquivo ${b.fileName}.`,
      );
    } catch (falha) {
      setErro(messageFor(falha));
      setBusy(false);
    }
  };
  return (
    <Sheet title="Fazer backup" onClose={p.onClose}>
      <form className="rz-form" onSubmit={(e) => void enviar(e)} noValidate>
        <fieldset className="rz-fieldset">
          <legend className="rz-label">O que entra no backup</legend>
          <div role="radiogroup" aria-label="O que entra no backup" className="rz-chips">
            {opcoes.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={escolha === o.id}
                className="rz-chip"
                onClick={() => {
                  setEscolha(o.id);
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
        <TextField
          label="Senha do backup"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={setSenha}
          maxLength={256}
          help="Pode ser a mesma senha do cofre ou outra. Sem ela, o arquivo não abre."
        />
        <TextField
          label="Repita a senha do backup"
          type="password"
          autoComplete="new-password"
          value={repeticao}
          onChange={setRepeticao}
          maxLength={256}
        />
        <Alert tone="info" title="Guarde fora deste aparelho">
          Depois de baixar, guarde uma cópia num pendrive, no seu e-mail ou na sua nuvem pessoal. O arquivo é
          ilegível sem a senha.
        </Alert>
        {erro ? (
          <Alert tone="negative" title="Não deu certo">
            {erro}
          </Alert>
        ) : null}
        <div className="rz-form-actions">
          <Button type="submit" variant="primary" size="lg" block busy={busy}>
            {busy ? 'Gerando e conferindo…' : 'Gerar backup'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/** Primeira metade da restauração: arquivo e senha. Usada também na tela de cofre sumido. */
export function OpenBackupForm(p: {
  open: (text: string, password: string) => Promise<BackupPreview>;
  onPreview: (b: BackupPreview) => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const enviar = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setErro('Escolha o arquivo de backup (.razao).');
      return;
    }
    setBusy(true);
    setErro(undefined);
    try {
      p.onPreview(await p.open(await arquivo.text(), senha));
    } catch (falha) {
      setErro(messageFor(falha));
      setBusy(false);
    }
  };
  return (
    <form className="rz-form" onSubmit={(e) => void enviar(e)} noValidate>
      <div className="rz-field">
        <label className="rz-label" htmlFor="rz-arquivo-backup">
          Arquivo de backup
        </label>
        <input
          id="rz-arquivo-backup"
          className="rz-input rz-file"
          type="file"
          accept=".razao,application/octet-stream,application/json"
          onChange={(e) => {
            setArquivo(e.target.files?.[0] ?? null);
          }}
        />
      </div>
      <TextField
        label="Senha do backup"
        type="password"
        autoComplete="off"
        value={senha}
        onChange={setSenha}
        maxLength={256}
      />
      {erro ? (
        <Alert tone="negative" title="Não deu certo">
          {erro}
        </Alert>
      ) : null}
      <div className="rz-form-actions">
        <Button type="submit" variant="primary" size="lg" block busy={busy}>
          {busy ? 'Abrindo e conferindo…' : 'Abrir backup'}
        </Button>
      </div>
    </form>
  );
}

/** BKP-002: data, escopo, espaços, contagens e totais, antes de qualquer mudança. */
export function PreviewCard({ preview }: { preview: BackupPreview }) {
  const escopo = preview.header.scope.kind === 'cofre' ? 'Cofre inteiro' : 'Um espaço';
  return (
    <section className="rz-card rz-section" aria-label="Prévia do backup">
      <div className="rz-tx-meta">
        <Badge>{escopo}</Badge> Feito em {quando(preview.header.createdAt)}
      </div>
      <ul className="rz-preview" aria-label="Espaços no backup">
        {describePreview(preview).map((l) => (
          <li key={l.workspaceId}>
            <span className="rz-tx-title">{l.label}</span>
            <span className="rz-tx-meta">
              {plural(l.accounts, 'conta', 'contas')} · {plural(l.entries, 'lançamento', 'lançamentos')} ·
              total {formatBRL(l.total)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RestoreBackupSheet(p: {
  session: VaultSession;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const [previa, setPrevia] = useState<BackupPreview | null>(null);
  const [modo, setModo] = useState<'substituir' | 'novo'>('substituir');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const restaurar = async () => {
    if (!previa) return;
    setBusy(true);
    setErro(undefined);
    try {
      if (modo === 'novo') {
        const novos = await p.session.restoreAsNew(previa);
        p.onDone(
          `${novos.length === 1 ? 'Espaço novo criado' : 'Espaços novos criados'} a partir do backup e conferidos: contagens e saldos batem com a prévia.`,
        );
        return;
      }
      await p.session.restoreBackup(previa);
      p.onDone('Backup restaurado e conferido: contagens e saldos batem com a prévia.');
    } catch (falha) {
      setErro(messageFor(falha));
      setBusy(false);
    }
  };
  const tudo = previa?.header.scope.kind === 'cofre';
  return (
    <Sheet title="Restaurar backup" onClose={p.onClose}>
      {!previa ? (
        <OpenBackupForm open={(t, s) => p.session.openBackup(t, s)} onPreview={setPrevia} />
      ) : (
        <>
          <PreviewCard preview={previa} />
          <fieldset className="rz-fieldset">
            <legend className="rz-label">Como restaurar</legend>
            <div role="radiogroup" aria-label="Como restaurar" className="rz-chips">
              {(
                [
                  ['substituir', 'Substituir pelo backup'],
                  ['novo', 'Como espaço novo'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={modo === id}
                  className="rz-chip"
                  onClick={() => {
                    setModo(id);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {modo === 'novo' ? (
            <Alert tone="info" title="Entra ao lado, sem mexer no que existe">
              Cada espaço do backup vira um espaço novo, com “(restaurado em …)” no nome e trilha de auditoria
              própria. Os espaços atuais não mudam. Antes, o estado atual vira um ponto de volta.
            </Alert>
          ) : (
            <Alert tone="warning" title={tudo ? 'Substitui o cofre inteiro' : 'Substitui este espaço'}>
              {tudo
                ? 'Todos os espaços deste aparelho ficam iguais ao backup.'
                : 'O espaço do backup fica igual ao arquivo; o outro espaço não muda.'}{' '}
              Antes, o estado atual vira um ponto de volta, e você pode voltar a ele depois.
            </Alert>
          )}
          {erro ? (
            <Alert tone="negative" title="Não deu certo">
              {erro}
            </Alert>
          ) : null}
          <div className="rz-form-actions">
            <Button variant="primary" size="lg" block busy={busy} onClick={() => void restaurar()}>
              {modo === 'novo' ? 'Restaurar como espaço novo' : 'Restaurar'}
            </Button>
            <Button variant="ghost" block onClick={p.onClose}>
              Cancelar
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
