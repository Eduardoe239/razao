// Quarentena (Volume 05, seção 5.3): guarda uma cópia intacta do registro problemático para análise.
// O original não é apagado nem sobrescrito; ele só deixa de ser usado até o usuário decidir.
import type { Db, QuarantineRow } from './db';

export async function quarantine(db: Db, row: Omit<QuarantineRow, 'id'>): Promise<void> {
  const id = `${row.store}:${JSON.stringify(row.key)}:${row.at}`;
  await db.put('quarantine', { ...row, id }, id);
}

export async function listQuarantine(db: Db): Promise<QuarantineRow[]> {
  return db.getAll('quarantine');
}
