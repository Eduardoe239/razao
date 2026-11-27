// Leitura das entidades de um espaço: tudo passa pelo esquema; registro fora do formato é erro, nunca some.
import { AppError } from './errors';
import type { Account, AttachmentItem, Category, CategoryRuleItem, Workspace } from './model';
import {
  ENTITY,
  accountSchema,
  attachmentSchema,
  categoryRuleSchema,
  categorySchema,
  workspaceSchema,
} from './model';
import type { StoredItem, WorkspaceSnapshot } from './ports';

function parseItem<T>(
  item: StoredItem,
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
): T {
  const r = schema.safeParse(item.data);
  if (!r.success) {
    throw new AppError(
      'STORAGE',
      `Um registro (${item.type}) está fora do formato esperado. Nada foi alterado. Abra Backup e segurança.`,
    );
  }
  return r.data;
}

export function workspaceOf(snap: WorkspaceSnapshot): Workspace {
  const item = snap.items.find((i) => i.type === ENTITY.workspace && i.id === snap.workspaceId);
  if (!item) throw new AppError('STORAGE', 'O espaço não foi encontrado no cofre. Nada foi alterado.');
  return parseItem(item, workspaceSchema);
}

export function accountsOf(snap: WorkspaceSnapshot): Account[] {
  return snap.items.filter((i) => i.type === ENTITY.account).map((i) => parseItem(i, accountSchema));
}

export function categoriesOf(snap: WorkspaceSnapshot): Category[] {
  return snap.items.filter((i) => i.type === ENTITY.category).map((i) => parseItem(i, categorySchema));
}

/** Regras de categoria que existem (as apagadas ficam de fora). */
export function rulesOf(snap: WorkspaceSnapshot): CategoryRuleItem[] {
  return snap.items
    .filter((i) => i.type === ENTITY.categoryRule)
    .map((i) => parseItem(i, categoryRuleSchema))
    .filter((r) => !r.removed);
}

/** Comprovantes do espaço que existem (os removidos ficam de fora). */
export function attachmentsOf(snap: WorkspaceSnapshot): AttachmentItem[] {
  return snap.items
    .filter((i) => i.type === ENTITY.attachment)
    .map((i) => parseItem(i, attachmentSchema))
    .filter((a) => !a.removed);
}
