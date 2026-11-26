// Receitas, despesas e categorias, ligadas à sessão aberta. Fica fora do session.ts para ele não crescer.
import type { OpsContext } from './account-ops';
import type { NewCategory } from './category-ops';
import { createCategory } from './category-ops';
import type { FlowEntryInput, FlowRow, UndoToken } from './entry-ops';
import { confirmEntry, createEntry, deleteEntry, editEntry, listFlows, undoDeleteEntry } from './entry-ops';
import type { IdSource } from './ports';
import { categoriesOf } from './session-read';
import type { Category } from './model';

type Gravacao = Promise<'gravada' | 'repetida'>;

export interface EntryOps {
  categories(workspaceId: string): Promise<Category[]>;
  createCategory(
    workspaceId: string,
    input: Omit<NewCategory, 'categoryId' | 'ledgerAccountId'>,
  ): Promise<{ result: 'gravada' | 'repetida'; categoryId: string }>;
  list(workspaceId: string): Promise<FlowRow[]>;
  create(workspaceId: string, input: FlowEntryInput): Gravacao;
  edit(workspaceId: string, entryId: string, input: FlowEntryInput): Gravacao;
  remove(
    workspaceId: string,
    input: { entryId: string; operationId: string },
  ): Promise<{ result: 'gravada' | 'repetida'; undo: UndoToken }>;
  undoRemove(workspaceId: string, input: { undo: UndoToken; operationId: string }): Gravacao;
  confirm(workspaceId: string, input: { entryId: string; date: string; operationId: string }): Gravacao;
}

export function entryOps(c: OpsContext, ids: IdSource): EntryOps {
  return {
    categories: async (ws) => categoriesOf(await c.port.load(ws)),
    createCategory: async (ws, input) => {
      const categoryId = ids.newId();
      const result = await createCategory(c, ws, { ...input, categoryId, ledgerAccountId: ids.newId() });
      return { result, categoryId };
    },
    list: (ws) => listFlows(c, ws),
    create: (ws, input) => createEntry(c, ws, input),
    edit: (ws, id, input) => editEntry(c, ws, id, input),
    remove: (ws, input) => deleteEntry(c, ws, input),
    undoRemove: (ws, input) => undoDeleteEntry(c, ws, input),
    confirm: (ws, input) => confirmEntry(c, ws, input),
  };
}
