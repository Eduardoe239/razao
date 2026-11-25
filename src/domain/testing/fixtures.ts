// Plano de contas sintético para os testes do domínio. Nenhum dado real (CLAUDE.md, seção 7).
import type { CivilDate } from '../civil-date';
import { parseCivilDate } from '../civil-date';
import type { AccountLookup, LedgerAccount } from '../ledger';
import type { OperationContext } from '../operations';

export const PF = 'espaco-pf';
export const PJ = 'espaco-pj';

function conta(id: string, workspaceId: string, group: LedgerAccount['group']): LedgerAccount {
  return { id, workspaceId, group };
}

export function planoDeContas(workspaceId: string) {
  const p = (nome: string) => `${workspaceId}:${nome}`;
  return {
    banco: conta(p('banco'), workspaceId, 'asset'),
    digital: conta(p('digital'), workspaceId, 'asset'),
    carteira: conta(p('carteira'), workspaceId, 'asset'),
    cartao: conta(p('cartao'), workspaceId, 'liability'),
    abertura: conta(p('saldo-abertura'), workspaceId, 'equity'),
    ajustes: conta(p('ajustes'), workspaceId, 'equity'),
    tarifas: conta(p('despesa-tarifas'), workspaceId, 'expense'),
    salario: conta(p('receita-salario'), workspaceId, 'income'),
  };
}

export function lookup(...listas: Record<string, LedgerAccount>[]): AccountLookup {
  const m = new Map<string, LedgerAccount>();
  for (const l of listas) for (const a of Object.values(l)) m.set(a.id, a);
  return m;
}

let contador = 0;
export function ctx(workspaceId: string, date: string, operationId?: string): OperationContext {
  contador++;
  return { workspaceId, date: parseCivilDate(date), operationId: operationId ?? `op-${String(contador)}` };
}

export const FUTURO: CivilDate = parseCivilDate('2999-12-31');
