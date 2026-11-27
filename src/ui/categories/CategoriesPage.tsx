// Categorias e regras do espaço ativo, em Configurações (CAT-001 a CAT-003, D-050 e D-051).
import { useEffect, useState } from 'react';
import { messageFor } from '@/application/errors';
import type { FlowRow } from '@/application/entry-ops';
import type { Category, CategoryRuleItem, Workspace } from '@/application/model';
import type { VaultSession } from '@/application/session';
import { Alert, Badge, Button } from '../components/ds';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { Tabs } from '../components/Tabs';
import { CategoryActions, NewCategoryForm } from './CategorySheets';
import { RulesSheet } from './RulesSheet';

type Dados = { categories: Category[]; rules: CategoryRuleItem[]; rows: FlowRow[] };
type Estado = { t: 'carregando' } | { t: 'erro'; msg: string } | { t: 'ok'; dados: Dados };
type Painel = { t: 'nova' } | { t: 'regras' } | { t: 'categoria'; id: string } | null;

export function CategoriesPage(p: {
  session: VaultSession;
  workspace: Workspace;
  onChanged: (m: string) => void;
}) {
  const { session } = p;
  const ws = p.workspace.id;
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState<Estado>({ t: 'carregando' });
  const [grupo, setGrupo] = useState<Category['group']>('expense');
  const [painel, setPainel] = useState<Painel>(null);

  useEffect(() => {
    let vivo = true;
    const ler = async () => {
      if (!(await session.entries.categories(ws)).length && !session.safeMode)
        await session.entries.ensureDefaults(ws);
      const [categories, rules, rows] = await Promise.all([
        session.entries.categories(ws),
        session.entries.rules(ws),
        session.entries.list(ws),
      ]);
      if (vivo) setEstado({ t: 'ok', dados: { categories, rules, rows } });
    };
    ler().catch((e: unknown) => {
      if (vivo) setEstado({ t: 'erro', msg: messageFor(e) });
    });
    return () => {
      vivo = false;
    };
  }, [session, ws, versao]);

  if (estado.t === 'carregando')
    return (
      <div
        className="rz-card"
        aria-busy="true"
        aria-label="Carregando categorias"
        style={{ minHeight: 160 }}
      />
    );
  if (estado.t === 'erro') {
    return (
      <Alert tone="negative" title="Não foi possível ler as categorias">
        {estado.msg}
      </Alert>
    );
  }
  const { categories, rules, rows } = estado.dados;
  const usos = new Map<string, number>();
  for (const r of rows) for (const x of r.parts) usos.set(x.categoryId, (usos.get(x.categoryId) ?? 0) + 1);
  const doGrupo = categories.filter((c) => c.group === grupo);
  const ativas = doGrupo.filter((c) => !c.archived);
  const arquivadas = doGrupo.filter((c) => c.archived);
  const ordem: Category[] = [];
  for (const pai of ativas.filter((c) => c.parentId === null)) {
    ordem.push(pai, ...ativas.filter((c) => c.parentId === pai.id));
  }
  const ligadas = rules.filter((r) => r.active).length;
  /** Grava, avisa e relê; painéis de regras ficam abertos para a próxima mudança. */
  const mudou = (m: string, fecharPainel = true) => {
    if (fecharPainel) setPainel(null);
    setVersao((v) => v + 1);
    p.onChanged(m);
  };
  const usoTexto = (id: string) => {
    const n = usos.get(id) ?? 0;
    return n === 0 ? 'Sem lançamentos' : n === 1 ? '1 lançamento' : `${String(n)} lançamentos`;
  };
  const aberta = painel?.t === 'categoria' ? categories.find((c) => c.id === painel.id) : undefined;
  const linha = (c: Category) => (
    <li key={c.id}>
      <button
        type="button"
        className={c.parentId ? 'rz-row-btn rz-cat-row rz-cat-sub' : 'rz-row-btn rz-cat-row'}
        onClick={() => {
          setPainel({ t: 'categoria', id: c.id });
        }}
      >
        <span className="rz-cat-text">
          <span className={c.parentId ? 'rz-cat-name' : 'rz-cat-name rz-cat-main'}>{c.name}</span>
          <span className="rz-help">{usoTexto(c.id)}</span>
        </span>
        <Icon name="forward" size={18} />
      </button>
    </li>
  );

  return (
    <div className="rz-blocks rz-enter">
      <div className="rz-actions rz-entries-actions">
        <Button
          variant="primary"
          icon="plus"
          onClick={() => {
            setPainel({ t: 'nova' });
          }}
        >
          Nova categoria
        </Button>
      </div>
      <button
        type="button"
        className="rz-card rz-row-btn rz-rules-card"
        onClick={() => {
          setPainel({ t: 'regras' });
        }}
      >
        <span className="rz-cat-text">
          <span className="rz-cat-name rz-cat-main">Regras automáticas</span>
          <span className="rz-help">
            {rules.length === 0
              ? 'Nenhuma regra ainda. Crie uma para a categoria já vir escolhida.'
              : `${String(ligadas)} de ${String(rules.length)} ${rules.length === 1 ? 'regra ligada' : 'regras ligadas'}`}
          </span>
        </span>
        <Icon name="forward" size={18} />
      </button>
      <Tabs
        label="Tipo de categoria"
        items={[
          { id: 'expense', label: 'Despesas' },
          { id: 'income', label: 'Receitas' },
        ]}
        value={grupo}
        onChange={(id) => {
          setGrupo(id === 'income' ? 'income' : 'expense');
        }}
      />
      <ul
        className="rz-list rz-flow-rows"
        aria-label={grupo === 'income' ? 'Categorias de receita' : 'Categorias de despesa'}
      >
        {ordem.map(linha)}
      </ul>
      {arquivadas.length ? (
        <details className="rz-archived">
          <summary>
            Arquivadas <Badge>{arquivadas.length}</Badge>
          </summary>
          <ul className="rz-list rz-flow-rows" aria-label="Categorias arquivadas">
            {arquivadas.map(linha)}
          </ul>
        </details>
      ) : null}

      {painel?.t === 'nova' ? (
        <Sheet
          title="Nova categoria"
          onClose={() => {
            setPainel(null);
          }}
        >
          <NewCategoryForm
            session={session}
            workspaceId={ws}
            categories={categories}
            group={grupo}
            onDone={mudou}
          />
        </Sheet>
      ) : null}
      {painel?.t === 'regras' ? (
        <Sheet
          title="Regras automáticas"
          onClose={() => {
            setPainel(null);
          }}
        >
          <RulesSheet
            session={session}
            workspaceId={ws}
            rules={rules}
            categories={categories}
            rows={rows}
            onChanged={(m) => {
              mudou(m, false);
            }}
          />
        </Sheet>
      ) : null}
      {aberta ? (
        <Sheet
          title={aberta.name}
          onClose={() => {
            setPainel(null);
          }}
        >
          <CategoryActions
            session={session}
            workspaceId={ws}
            cat={aberta}
            categories={categories}
            uses={usos.get(aberta.id) ?? 0}
            onDone={mudou}
          />
        </Sheet>
      ) : null}
    </div>
  );
}
