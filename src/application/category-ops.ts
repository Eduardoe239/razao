// Categorias como contas internas (CAT-001). Criar já fica aqui; renomear, mesclar e arquivar vêm no I-02.
import type { LedgerAccount } from '@/domain/ledger';
import type { OpsContext } from './account-ops';
import { writable } from './account-ops';
import { AppError } from './errors';
import type { Category } from './model';
import { ENTITY, categorySchema } from './model';
import { categoriesOf } from './session-read';

export interface NewCategory {
  readonly name: string;
  readonly group: Category['group'];
  readonly parentId?: string | undefined;
  readonly categoryId: string;
  readonly ledgerAccountId: string;
  readonly operationId: string;
}

const mesmoNome = (a: string, b: string) => a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');

/** CAT-001: cria a categoria e a conta interna dela numa operação só. */
export async function createCategory(
  c: OpsContext,
  workspaceId: string,
  input: NewCategory,
): Promise<'gravada' | 'repetida'> {
  writable(c.port);
  const snap = await c.port.load(workspaceId);
  const todas = categoriesOf(snap);
  const nome = input.name.trim();
  const pai = input.parentId ? todas.find((x) => x.id === input.parentId) : undefined;
  if (input.parentId) {
    if (!pai)
      throw new AppError('INVALID', 'A categoria principal não existe neste espaço. Nada foi criado.');
    if (pai.archived) throw new AppError('INVALID', 'A categoria principal está arquivada. Reative-a antes.');
    if (pai.group !== input.group) {
      throw new AppError('INVALID', 'A subcategoria precisa ser do mesmo tipo da principal.');
    }
    if (pai.parentId !== null)
      throw new AppError('INVALID', 'Subcategoria não tem outra subcategoria dentro.');
  }
  const parentId = pai?.id ?? null;
  const repetida = todas.some(
    (x) => !x.archived && x.group === input.group && x.parentId === parentId && mesmoNome(x.name, nome),
  );
  if (repetida) throw new AppError('INVALID', `Já existe a categoria "${nome}" aqui.`);
  const categoria: Category = {
    id: input.categoryId,
    name: nome,
    group: input.group,
    parentId,
    ledgerAccountId: input.ledgerAccountId,
    archived: false,
    createdAt: c.clock.nowIso(),
  };
  const valida = categorySchema.safeParse(categoria);
  if (!valida.success) throw new AppError('INVALID', 'Dê um nome à categoria, com até 60 caracteres.');
  const ledger: LedgerAccount = { id: input.ledgerAccountId, workspaceId, group: input.group };
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: [],
    items: [
      { type: ENTITY.ledgerAccount, id: ledger.id, data: { ...ledger, name: nome } },
      { type: ENTITY.category, id: categoria.id, data: valida.data },
    ],
    audit: {
      action: 'categoria.criar',
      target: `category/${categoria.id}`,
      after: { name: nome, group: input.group, parentId },
    },
  });
}
