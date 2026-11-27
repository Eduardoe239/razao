// Receitas, despesas, categorias e regras, ligadas à sessão aberta. Fica fora do session.ts para ele não crescer.
import type { OpsContext } from './account-ops';
import { ensureDefaultCategories } from './category-defaults';
import type { MovePreview, NewCategory } from './category-ops';
import {
  createCategory,
  mergeCategory,
  previewMerge,
  previewRecategorize,
  recategorizeEntries,
  renameCategory,
  setCategoryArchived,
} from './category-ops';
import type { RuleInput } from './category-rule-ops';
import {
  createRule,
  listRules,
  removeRule,
  reorderRules,
  suggestCategory,
  updateRule,
} from './category-rule-ops';
import type { FlowEntryInput, FlowRow, UndoToken } from './entry-ops';
import { confirmEntry, createEntry, deleteEntry, editEntry, listFlows, undoDeleteEntry } from './entry-ops';
import type { Category, CategoryRuleItem } from './model';
import type { IdSource } from './ports';
import { categoriesOf } from './session-read';

type Resultado = 'gravada' | 'repetida';
type Gravacao = Promise<Resultado>;
type Op = { readonly operationId: string };

export interface EntryOps {
  categories(workspaceId: string): Promise<Category[]>;
  /** Cria as categorias padrão que faltam, uma vez por espaço (D-049). */
  ensureDefaults(workspaceId: string): Promise<Resultado | 'nada'>;
  createCategory(
    workspaceId: string,
    input: Omit<NewCategory, 'categoryId' | 'ledgerAccountId'>,
  ): Promise<{ result: Resultado; categoryId: string }>;
  renameCategory(workspaceId: string, input: { categoryId: string; name: string } & Op): Gravacao;
  setCategoryArchived(workspaceId: string, input: { categoryId: string; archived: boolean } & Op): Gravacao;
  previewMerge(workspaceId: string, input: { fromId: string; toId: string }): Promise<MovePreview>;
  mergeCategory(workspaceId: string, input: { fromId: string; toId: string } & Op): Gravacao;
  previewRecategorize(
    workspaceId: string,
    input: { entryIds: readonly string[]; toId: string },
  ): Promise<MovePreview>;
  recategorize(workspaceId: string, input: { entryIds: readonly string[]; toId: string } & Op): Gravacao;
  rules(workspaceId: string): Promise<CategoryRuleItem[]>;
  createRule(workspaceId: string, input: RuleInput & Op): Promise<{ result: Resultado; ruleId: string }>;
  updateRule(workspaceId: string, input: RuleInput & { ruleId: string; active: boolean } & Op): Gravacao;
  removeRule(workspaceId: string, input: { ruleId: string } & Op): Gravacao;
  reorderRules(workspaceId: string, input: { ruleIds: readonly string[] } & Op): Gravacao;
  suggest(
    workspaceId: string,
    input: { description: string; kind: 'receita' | 'despesa' },
  ): Promise<{ categoryId: string; ruleId: string } | undefined>;
  list(workspaceId: string): Promise<FlowRow[]>;
  create(workspaceId: string, input: FlowEntryInput): Gravacao;
  edit(workspaceId: string, entryId: string, input: FlowEntryInput): Gravacao;
  remove(
    workspaceId: string,
    input: { entryId: string } & Op,
  ): Promise<{ result: Resultado; undo: UndoToken | null }>;
  undoRemove(workspaceId: string, input: { undo: UndoToken } & Op): Gravacao;
  confirm(workspaceId: string, input: { entryId: string; date: string } & Op): Gravacao;
}

export function entryOps(c: OpsContext, ids: IdSource): EntryOps {
  return {
    categories: async (ws) => categoriesOf(await c.port.load(ws)),
    ensureDefaults: (ws) => ensureDefaultCategories(c, ids, ws),
    createCategory: async (ws, input) => {
      const categoryId = ids.newId();
      const result = await createCategory(c, ws, { ...input, categoryId, ledgerAccountId: ids.newId() });
      return { result, categoryId };
    },
    renameCategory: (ws, input) => renameCategory(c, ws, input),
    setCategoryArchived: (ws, input) => setCategoryArchived(c, ws, input),
    previewMerge: (ws, input) => previewMerge(c, ws, input),
    mergeCategory: (ws, input) => mergeCategory(c, ws, input),
    previewRecategorize: (ws, input) => previewRecategorize(c, ws, input),
    recategorize: (ws, input) => recategorizeEntries(c, ws, input),
    rules: (ws) => listRules(c, ws),
    createRule: async (ws, input) => {
      const ruleId = ids.newId();
      return { result: await createRule(c, ws, { ...input, ruleId }), ruleId };
    },
    updateRule: (ws, input) => updateRule(c, ws, input),
    removeRule: (ws, input) => removeRule(c, ws, input),
    reorderRules: (ws, input) => reorderRules(c, ws, input),
    suggest: (ws, input) => suggestCategory(c, ws, input),
    list: (ws) => listFlows(c, ws),
    create: (ws, input) => createEntry(c, ws, input),
    edit: (ws, id, input) => editEntry(c, ws, id, input),
    remove: (ws, input) => deleteEntry(c, ws, input),
    undoRemove: (ws, input) => undoDeleteEntry(c, ws, input),
    confirm: (ws, input) => confirmEntry(c, ws, input),
  };
}
