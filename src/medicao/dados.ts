// Dados sintéticos para a medição de desempenho (Volume 09): 24 meses e 10 mil lançamentos num espaço,
// montados direto no formato do backup, sem passar pela tela. Nomes e valores são inventados.
import { ENTITY } from '@/application/model';
import type { BackupWorkspace, StoredItem } from '@/application/ports';
import { addMonths, parseCivilDate } from '@/domain/civil-date';
import type { CivilDate } from '@/domain/civil-date';
import type { JournalEntry, LedgerAccount } from '@/domain/ledger';
import { money } from '@/domain/money';
import { openingBalance, transfer } from '@/domain/operations';

export const MEDICAO_WS = 'medicao-espaco-pf';

/** Gerador determinístico: a mesma medição em qualquer aparelho. */
function gerador(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function montarEspaco(hoje: CivilDate, lancamentos: number): BackupWorkspace {
  const ws = MEDICAO_WS;
  const sorte = gerador(20261125);
  const agora = `${hoje}T12:00:00.000Z`;
  const conta = (
    id: string,
    group: LedgerAccount['group'],
    name: string,
  ): { l: LedgerAccount; item: StoredItem } => ({
    l: { id, workspaceId: ws, group },
    item: { type: ENTITY.ledgerAccount, id, data: { id, workspaceId: ws, group, name } },
  });
  const abertura = conta('l-abertura', 'equity', 'Saldos de abertura');
  const ajuste = conta('l-ajuste', 'equity', 'Ajustes de saldo');
  const tarifa = conta('l-tarifa', 'expense', 'Tarifas bancárias');
  const contas = Array.from({ length: 10 }, (_, i) =>
    conta(`l-conta-${String(i)}`, 'asset', `Conta ${String(i + 1)}`),
  );
  const entities: StoredItem[] = [
    {
      type: ENTITY.workspace,
      id: ws,
      data: {
        id: ws,
        kind: 'PF',
        name: 'Pessoal',
        currency: 'BRL',
        timeZone: 'America/Fortaleza',
        monthStartDay: 1,
        openingEquityId: abertura.l.id,
        adjustmentEquityId: ajuste.l.id,
        feeExpenseId: tarifa.l.id,
        archived: false,
        createdAt: agora,
      },
    },
    abertura.item,
    ajuste.item,
    tarifa.item,
    ...contas.flatMap((c, i) => [
      c.item,
      {
        type: ENTITY.account,
        id: `conta-${String(i)}`,
        data: {
          id: `conta-${String(i)}`,
          name: `Conta ${String(i + 1)}`,
          kind: 'corrente',
          ledgerAccountId: c.l.id,
          archived: false,
          createdAt: agora,
        },
      },
    ]),
  ];

  const inicio = addMonths(parseCivilDate(`${hoje.slice(0, 7)}-01`), -23);
  const entradas: JournalEntry[] = [];
  contas.forEach((c, i) => {
    entradas.push(
      ...openingBalance(
        { operationId: `abertura-${String(i)}`, workspaceId: ws, date: inicio },
        { account: c.l, openingEquity: abertura.l, amount: money(10_000_000) },
      ),
    );
  });
  for (let i = entradas.length; i < lancamentos; i++) {
    const mes = Math.floor((i / lancamentos) * 24);
    const dia = 1 + Math.floor(sorte() * 28);
    const data = parseCivilDate(`${addMonths(inicio, mes).slice(0, 7)}-${String(dia).padStart(2, '0')}`);
    const de = Math.floor(sorte() * 10);
    const para = (de + 1 + Math.floor(sorte() * 9)) % 10;
    const fee = sorte() < 0.2 ? 1 + Math.floor(sorte() * 500) : 0;
    entradas.push(
      ...transfer(
        { operationId: `op-${String(i)}`, workspaceId: ws, date: data <= hoje ? data : hoje },
        {
          from: contas[de]?.l ?? abertura.l,
          to: contas[para]?.l ?? abertura.l,
          amount: money(100 + Math.floor(sorte() * 50_000)),
          ...(fee ? { fee: money(fee), feeAccount: tarifa.l } : {}),
        },
      ),
    );
  }
  const porMes = new Map<string, JournalEntry[]>();
  for (const e of entradas) {
    const mes = e.date.slice(0, 7);
    const lista = porMes.get(mes) ?? [];
    lista.push(e);
    porMes.set(mes, lista);
  }
  return {
    workspaceId: ws,
    entities,
    journal: [...porMes].map(([month, entries]) => ({ month, entries })),
    audit: [],
    operations: entradas.map((e) => ({ operationId: e.operationId, at: agora, entryIds: [e.entryId] })),
  };
}
