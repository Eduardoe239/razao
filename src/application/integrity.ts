// BKP-007: verificação de integridade sob demanda. Relê tudo do disco, refaz as contas e compara com o que
// está guardado. Divergência é mostrada com o que fazer; nada é corrigido em silêncio.
import { checkJournal } from '@/domain/integrity';
import type { OpsContext } from './account-ops';
import { attachmentsOf, workspaceOf } from './session-read';
import { workspaceLabel } from './model';
import type { StorageIssue, WorkspaceStorageCheck } from './ports';

export interface IntegrityItem {
  readonly id: 'trilha' | 'paginas' | 'registros' | 'lancamentos' | 'diario' | 'comprovantes';
  readonly label: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface WorkspaceIntegrity {
  readonly workspaceId: string;
  readonly label: string;
  readonly ok: boolean;
  readonly items: readonly IntegrityItem[];
}

export interface IntegrityReport {
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly workspaces: readonly WorkspaceIntegrity[];
  /** Com divergência, o cofre fica só para leitura até a pessoa restaurar um backup ou ponto de volta. */
  readonly safeMode: boolean;
}

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

function problemas(lista: readonly StorageIssue[], store: string): StorageIssue[] {
  return lista.filter((p) => p.store === store);
}

async function doEspaco(c: OpsContext, w: WorkspaceStorageCheck): Promise<WorkspaceIntegrity> {
  const snap = await c.port.load(w.workspaceId);
  let label = 'Espaço';
  try {
    const ws = workspaceOf(snap);
    label = workspaceLabel(ws);
  } catch {
    // O registro do espaço não abriu: o item "Registros" já mostra o problema.
  }
  const trilha = problemas(w.problems, 'audit');
  const paginas = problemas(w.problems, 'journal');
  const registros = problemas(w.problems, 'entities');
  const j = checkJournal(snap.entries, snap.ledger, w.workspaceId);
  const ruins = new Set([...j.unbalanced, ...j.unknownAccount, ...j.otherWorkspace]);

  const anexos = attachmentsOf(snap);
  const usados = new Set(anexos.map((a) => a.id));
  const faltando = anexos.filter((a) => !(a.id in w.blobs)).length;
  const danificados = anexos.filter((a) => a.id in w.blobs && w.blobs[a.id] !== a.sha256).length;
  const soltos = Object.keys(w.blobs).filter((id) => !usados.has(id)).length;
  const detalheAnexos = [
    faltando ? plural(faltando, 'arquivo faltando', 'arquivos faltando') : '',
    danificados
      ? plural(danificados, 'arquivo diferente do guardado', 'arquivos diferentes do guardado')
      : '',
    soltos ? plural(soltos, 'arquivo sem lançamento', 'arquivos sem lançamento') : '',
  ].filter(Boolean);

  const items: IntegrityItem[] = [
    {
      id: 'trilha',
      label: 'Trilha de auditoria',
      ok: trilha.length === 0,
      detail: trilha.length
        ? (trilha[0]?.reason ?? 'A trilha não confere.')
        : `${plural(w.auditEvents, 'evento encadeado', 'eventos encadeados')}, sem quebra.`,
    },
    {
      id: 'paginas',
      label: 'Páginas do diário',
      ok: paginas.length === 0,
      detail: paginas.length
        ? `${plural(paginas.length, 'página não confere', 'páginas não conferem')} com o que a auditoria registrou: adulterada, danificada ou devolvida de uma versão antiga.`
        : `${plural(w.journalPages, 'página igual', 'páginas iguais')} à registrada na auditoria.`,
    },
    {
      id: 'registros',
      label: 'Contas, categorias e outros registros',
      ok: registros.length === 0,
      detail: registros.length
        ? `${plural(registros.length, 'registro não abriu', 'registros não abriram')} ou está fora do formato.`
        : `${plural(snap.items.length, 'registro abriu', 'registros abriram')} e está no formato.`,
    },
    {
      id: 'lancamentos',
      label: 'Cada lançamento fecha',
      ok: ruins.size === 0,
      detail: ruins.size
        ? `${plural(ruins.size, 'lançamento tem', 'lançamentos têm')} débito diferente do crédito ou conta que não existe neste espaço.`
        : `${plural(j.entries, 'lançamento com', 'lançamentos com')} débito igual ao crédito, em contas deste espaço.`,
    },
    {
      id: 'diario',
      label: 'Saldos recalculados',
      ok: j.difference === 0n && j.activeMatchesFull,
      detail:
        j.difference === 0n && j.activeMatchesFull
          ? 'Os saldos refeitos do zero batem com os do diário inteiro, estornos incluídos.'
          : 'Os saldos refeitos do zero não batem com os do diário inteiro.',
    },
    {
      id: 'comprovantes',
      label: 'Comprovantes',
      ok: detalheAnexos.length === 0,
      detail: detalheAnexos.length
        ? `${detalheAnexos.join('; ')}.`
        : anexos.length
          ? `${plural(anexos.length, 'arquivo abriu', 'arquivos abriram')} e confere com a impressão digital guardada.`
          : 'Nenhum comprovante anexado.',
    },
  ];
  return { workspaceId: w.workspaceId, label, ok: items.every((i) => i.ok), items };
}

export async function runIntegrityCheck(c: OpsContext): Promise<IntegrityReport> {
  const check = await c.port.verifyStorage();
  const workspaces: WorkspaceIntegrity[] = [];
  for (const w of check.workspaces) workspaces.push(await doEspaco(c, w));
  workspaces.sort((a, b) =>
    a.label === 'Pessoal' ? -1 : b.label === 'Pessoal' ? 1 : a.label.localeCompare(b.label),
  );
  return {
    ok: workspaces.every((w) => w.ok) && !c.port.safeMode,
    checkedAt: c.clock.nowIso(),
    workspaces,
    safeMode: c.port.safeMode,
  };
}
