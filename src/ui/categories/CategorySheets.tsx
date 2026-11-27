// Nova categoria e as ações de uma categoria: renomear, arquivar ou reativar e mesclar com prévia (CAT-001, CAT-002).
import { useEffect, useState } from 'react';
import type { MovePreview } from '@/application/category-ops';
import { categoryName, monthLabel } from '@/application/entry-list';
import { messageFor } from '@/application/errors';
import type { Category } from '@/application/model';
import type { VaultSession } from '@/application/session';
import { Alert, Button, TextField } from '../components/ds';
import { SelectField } from '../components/Sheet';

/** Mesma operação em todas as tentativas do mesmo formulário: clique duplo não grava duas vezes (LAN-012). */
function useAcao(session: VaultSession) {
  const [op] = useState(() => session.newOperationId());
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const run = async (fn: (operationId: string) => Promise<unknown>, depois: () => void) => {
    if (busy) return;
    setBusy(true);
    setErro(undefined);
    try {
      await fn(op);
      depois();
    } catch (e) {
      setErro(messageFor(e));
      setBusy(false);
    }
  };
  return { busy, erro, run };
}

export function NewCategoryForm(p: {
  session: VaultSession;
  workspaceId: string;
  categories: readonly Category[];
  group: Category['group'];
  onDone: (m: string) => void;
}) {
  const [nome, setNome] = useState('');
  const [grupo, setGrupo] = useState<Category['group']>(p.group);
  const [pai, setPai] = useState('');
  const { busy, erro, run } = useAcao(p.session);
  const principais = p.categories.filter((c) => c.group === grupo && !c.archived && c.parentId === null);
  return (
    <form
      className="rz-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          (operationId) =>
            p.session.entries.createCategory(p.workspaceId, {
              name: nome,
              group: grupo,
              parentId: pai || undefined,
              operationId,
            }),
          () => {
            p.onDone(`Categoria ${nome.trim()} criada.`);
          },
        );
      }}
    >
      <div className="rz-seg rz-entry-type" role="group" aria-label="Tipo da categoria">
        {(
          [
            ['expense', 'Despesa'],
            ['income', 'Receita'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            className="rz-seg-btn"
            aria-pressed={grupo === id}
            onClick={() => {
              setGrupo(id);
              setPai('');
            }}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <TextField label="Nome" value={nome} onChange={setNome} maxLength={60} autoFocus />
      <SelectField
        label="Dentro de"
        value={pai}
        onChange={setPai}
        options={[
          { value: '', label: 'Nenhuma (categoria principal)' },
          ...principais.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      {erro ? <Alert tone="negative">{erro}</Alert> : null}
      <div className="rz-form-actions">
        <Button type="submit" variant="primary" size="lg" block busy={busy}>
          Criar categoria
        </Button>
      </div>
    </form>
  );
}

function Renomear(p: {
  session: VaultSession;
  workspaceId: string;
  cat: Category;
  onDone: (m: string) => void;
}) {
  const [nome, setNome] = useState(p.cat.name);
  const { busy, erro, run } = useAcao(p.session);
  return (
    <form
      className="rz-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void run(
          (operationId) =>
            p.session.entries.renameCategory(p.workspaceId, {
              categoryId: p.cat.id,
              name: nome,
              operationId,
            }),
          () => {
            p.onDone(`Categoria renomeada para ${nome.trim()}.`);
          },
        );
      }}
    >
      <TextField label="Nome" value={nome} onChange={setNome} maxLength={60} />
      {erro ? <Alert tone="negative">{erro}</Alert> : null}
      <Button type="submit" busy={busy}>
        Renomear
      </Button>
    </form>
  );
}

function Mesclar(p: {
  session: VaultSession;
  workspaceId: string;
  cat: Category;
  categories: readonly Category[];
  onDone: (m: string) => void;
}) {
  const destinos = p.categories.filter((c) => c.group === p.cat.group && !c.archived && c.id !== p.cat.id);
  const [para, setPara] = useState('');
  const [previa, setPrevia] = useState<MovePreview | null>(null);
  const [erroPrevia, setErroPrevia] = useState<string | undefined>();
  const { busy, erro, run } = useAcao(p.session);
  useEffect(() => {
    if (!para) return;
    let vivo = true;
    p.session.entries.previewMerge(p.workspaceId, { fromId: p.cat.id, toId: para }).then(
      (x) => {
        if (!vivo) return;
        setPrevia(x);
        setErroPrevia(undefined);
      },
      (e: unknown) => {
        if (!vivo) return;
        setPrevia(null);
        setErroPrevia(messageFor(e));
      },
    );
    return () => {
      vivo = false;
    };
  }, [p.session, p.workspaceId, p.cat.id, para]);
  const nomePara = para ? categoryName(p.categories, para) : '';
  const pronto = Boolean(para) && previa !== null && !erroPrevia;
  return (
    <div className="rz-form">
      <SelectField
        label="Mover tudo para"
        value={para}
        onChange={setPara}
        options={[
          { value: '', label: 'Escolha a categoria' },
          ...destinos.map((c) => ({ value: c.id, label: categoryName(p.categories, c.id) })),
        ]}
      />
      {pronto ? (
        <div className="rz-card rz-preview-card">
          <span className="rz-label">Antes de confirmar</span>
          <span>
            {previa.count === 0
              ? 'Nenhum lançamento para mover.'
              : `${previa.count === 1 ? '1 lançamento' : `${String(previa.count)} lançamentos`} de ${previa.months.map(monthLabel).join(', ')}${previa.pending ? `, ${String(previa.pending)} a vencer` : ''}, vão para ${nomePara}.`}
          </span>
          <span className="rz-help">
            "{p.cat.name}" fica arquivada e as regras dela passam a sugerir {nomePara}. O saldo das contas e o
            total de despesas e receitas não mudam.
          </span>
        </div>
      ) : null}
      {erroPrevia ? <Alert tone="info">{erroPrevia}</Alert> : null}
      {erro ? <Alert tone="negative">{erro}</Alert> : null}
      <Button
        variant="primary"
        busy={busy}
        disabled={!pronto}
        onClick={() =>
          void run(
            (operationId) =>
              p.session.entries.mergeCategory(p.workspaceId, { fromId: p.cat.id, toId: para, operationId }),
            () => {
              p.onDone(`${p.cat.name} mesclada em ${nomePara}.`);
            },
          )
        }
      >
        Mesclar
      </Button>
    </div>
  );
}

export function CategoryActions(p: {
  session: VaultSession;
  workspaceId: string;
  cat: Category;
  categories: readonly Category[];
  uses: number;
  onDone: (m: string) => void;
}) {
  const { cat } = p;
  const pai = cat.parentId ? p.categories.find((c) => c.id === cat.parentId) : undefined;
  const filhas = p.categories.filter((c) => c.parentId === cat.id && !c.archived).length;
  const { busy, erro, run } = useAcao(p.session);
  const arquivar = (archived: boolean) =>
    run(
      (operationId) =>
        p.session.entries.setCategoryArchived(p.workspaceId, { categoryId: cat.id, archived, operationId }),
      () => {
        p.onDone(archived ? `${cat.name} arquivada.` : `${cat.name} reativada.`);
      },
    );
  return (
    <div className="rz-form">
      <p className="rz-sheet-text">
        {cat.group === 'income' ? 'Receita' : 'Despesa'}
        {pai ? ` · dentro de ${pai.name}` : ''} ·{' '}
        {p.uses === 1 ? '1 lançamento' : `${String(p.uses)} lançamentos`}
      </p>
      {cat.archived ? (
        <>
          <Alert tone="info">
            Arquivada: não aparece para escolher, mas continua nos lançamentos antigos.
          </Alert>
          {erro ? <Alert tone="negative">{erro}</Alert> : null}
          <Button variant="primary" busy={busy} onClick={() => void arquivar(false)}>
            Reativar
          </Button>
        </>
      ) : (
        <>
          <Renomear session={p.session} workspaceId={p.workspaceId} cat={cat} onDone={p.onDone} />
          <section className="rz-form" aria-labelledby="mesclar-t">
            <h3 id="mesclar-t" className="rz-section-title">
              Mesclar em outra categoria
            </h3>
            {filhas ? (
              <Alert tone="info">
                {cat.name} tem subcategorias. Mescle ou arquive as subcategorias antes. Arquivar a principal
                arquiva as subcategorias junto.
              </Alert>
            ) : (
              <Mesclar
                session={p.session}
                workspaceId={p.workspaceId}
                cat={cat}
                categories={p.categories}
                onDone={p.onDone}
              />
            )}
          </section>
          <section className="rz-form" aria-labelledby="arquivar-t">
            <h3 id="arquivar-t" className="rz-section-title">
              Arquivar
            </h3>
            <p className="rz-help">
              Sai das escolhas e as regras dela são desligadas. Os lançamentos antigos continuam com ela e os
              totais não mudam.
            </p>
            {erro ? <Alert tone="negative">{erro}</Alert> : null}
            <Button busy={busy} icon="archive" onClick={() => void arquivar(true)}>
              Arquivar {cat.name}
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
