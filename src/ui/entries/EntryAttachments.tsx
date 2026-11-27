// LAN-009: comprovantes no detalhe do lançamento. Anexar (foto ou PDF), ver a foto, baixar e remover.
// A foto é decifrada só quando a pessoa pede para ver, e a URL temporária some ao fechar.
import { useEffect, useRef, useState } from 'react';
import type { AttachmentInfo } from '@/application/attachment-ops';
import { messageFor } from '@/application/errors';
import type { VaultSession } from '@/application/session';
import { Alert, Button } from '../components/ds';
import { Icon } from '../components/Icon';
import { downloadBytes, readAttachmentFile } from './attachment-file';

const tamanho = (b: number) =>
  b < 1024 * 1024
    ? `${String(Math.max(1, Math.round(b / 1024)))} KB`
    : `${(b / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;

export function EntryAttachments(p: {
  session: VaultSession;
  workspaceId: string;
  entryId: string;
  /** Avisa a lista para mostrar (ou tirar) o clipe. */
  onChanged: () => void;
}) {
  const { session, workspaceId, entryId } = p;
  const [lista, setLista] = useState<readonly AttachmentInfo[] | null>(null);
  const [versao, setVersao] = useState(0);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const [aviso, setAviso] = useState(false);
  const [foto, setFoto] = useState<{ id: string; url: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      session.entries.attachments(workspaceId, entryId),
      session.entries.attachmentUsage(workspaceId),
    ])
      .then(([l, uso]) => {
        if (!vivo) return;
        setLista(l);
        setAviso(uso.warn);
      })
      .catch((e: unknown) => {
        if (vivo) setErro(messageFor(e));
      });
    return () => {
      vivo = false;
    };
  }, [session, workspaceId, entryId, versao]);

  useEffect(
    () => () => {
      if (foto) URL.revokeObjectURL(foto.url);
    },
    [foto],
  );

  const agir = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setErro(undefined);
    try {
      await fn();
    } catch (e) {
      setErro(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  const anexar = (file: File) =>
    agir(async () => {
      const bytes = await readAttachmentFile(file);
      await session.entries.attach(workspaceId, {
        entryId,
        name: file.name,
        bytes,
        operationId: session.newOperationId(),
      });
      setVersao((v) => v + 1);
      p.onChanged();
    });

  const abrir = (a: AttachmentInfo, baixar: boolean) =>
    agir(async () => {
      const { bytes } = await session.entries.openAttachment(workspaceId, a.id);
      if (baixar) {
        downloadBytes(bytes, a.name, a.mime);
        return;
      }
      setFoto({ id: a.id, url: URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: a.mime })) });
    });

  const remover = (a: AttachmentInfo) =>
    agir(async () => {
      await session.entries.removeAttachment(workspaceId, {
        attachmentId: a.id,
        operationId: session.newOperationId(),
      });
      if (foto?.id === a.id) setFoto(null);
      setVersao((v) => v + 1);
      p.onChanged();
    });

  return (
    <section className="rz-attach" aria-label="Comprovantes">
      <h3 className="rz-attach-title">Comprovantes</h3>
      {lista?.length ? (
        <ul className="rz-attach-list">
          {lista.map((a) => {
            const imagem = a.mime !== 'application/pdf';
            return (
              <li key={a.id}>
                <div className="rz-attach-item">
                  <span className="rz-attach-icon" aria-hidden="true">
                    <Icon name={imagem ? 'image' : 'file'} size={18} />
                  </span>
                  <span className="rz-attach-name">
                    <span>{a.name}</span>
                    <span className="rz-attach-meta">
                      {imagem ? 'Foto' : 'PDF'} · {tamanho(a.size)}
                    </span>
                  </span>
                  <span className="rz-attach-actions">
                    {imagem ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`${foto?.id === a.id ? 'Fechar' : 'Ver'} ${a.name}`}
                        onClick={() => {
                          if (foto?.id === a.id) setFoto(null);
                          else void abrir(a, false);
                        }}
                      >
                        {foto?.id === a.id ? 'Fechar' : 'Ver'}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="download"
                      disabled={busy}
                      aria-label={`Baixar ${a.name}`}
                      onClick={() => void abrir(a, true)}
                    >
                      Baixar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="trash"
                      disabled={busy}
                      aria-label={`Remover ${a.name}`}
                      onClick={() => void remover(a)}
                    />
                  </span>
                </div>
                {foto?.id === a.id ? (
                  <img className="rz-attach-preview" src={foto.url} alt={`Comprovante ${a.name}`} />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : lista ? (
        <p className="rz-attach-empty">Nenhum comprovante. Foto ou PDF de até 5 MB.</p>
      ) : null}
      {aviso ? (
        <Alert tone="warning" title="Muitos comprovantes">
          Os comprovantes deste espaço passam de 500 MB. O backup fica grande; faça um backup de cada espaço.
        </Alert>
      ) : null}
      {erro ? (
        <Alert tone="negative" title="Não deu certo">
          {erro}
        </Alert>
      ) : null}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="rz-attach-input"
        aria-label="Escolher comprovante"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          if (f) void anexar(f);
        }}
      />
      <Button icon="clip" block busy={busy} onClick={() => input.current?.click()}>
        Anexar comprovante
      </Button>
      <p className="rz-attach-hint">
        A foto é guardada sem localização e sem dados do aparelho. O PDF é guardado como veio.
      </p>
    </section>
  );
}
