import assert from 'node:assert/strict';
import { filterTransactions, parseTransactionAmountFilter, transactionsToCSV } from '../src/domain/transactionSearch.js';

const accounts = [{ id: 'checking', name: 'Conta Corrente' }, { id: 'card', name: 'Cartão Azul' }, { id: 'savings', name: 'Poupança' }];
const categories = [{ id: 'food', name: 'Alimentação' }, { id: 'home', name: 'Moradia' }];
const transactions = [
  { id: 't1', description: 'Supermercado São João', type: 'despesa', status: 'pago', date: '2026-10-03', amountCents: 15500, accountId: 'checking', categoryId: 'food' },
  { id: 't2', description: 'Aluguel', type: 'despesa', status: 'pendente', date: '2026-10-05', amountCents: 90000, accountId: 'checking', categoryId: 'home' },
  { id: 't3', description: 'Salário', type: 'receita', status: 'pago', date: '2026-10-10', amountCents: 350000, accountId: 'checking', categoryId: 'home' },
  { id: 't4', description: 'Compra no cartão', type: 'despesa', status: 'pago', date: '2026-09-28', amountCents: 3500, accountId: 'card', categoryId: 'food' },
  { id: 't5', description: 'Transferência para poupança', type: 'transferencia', status: 'pago', date: '2026-10-08', amountCents: 10000, accountId: 'checking', toAccountId: 'savings' },
  { id: 't6', description: '=HYPERLINK("bad")', type: 'despesa', status: 'cancelado', date: '2026-10-15', amountCents: 100, accountId: 'checking', categoryId: 'food' }
];
const catalogs = { accounts, categories };

assert.deepEqual(filterTransactions(transactions, { search: 'alimentacao' }, catalogs).map(t => t.id), ['t6', 't1', 't4'], 'busca também encontra o nome da categoria');
assert.deepEqual(filterTransactions(transactions, { search: 'supermercado sao' }, catalogs).map(t => t.id), ['t1'], 'busca ignora diferenças de acentuação');
assert.deepEqual(filterTransactions(transactions, { accountId: 'savings' }, catalogs).map(t => t.id), ['t5'], 'filtro de conta inclui transferências recebidas');
assert.deepEqual(filterTransactions(transactions, { categoryId: 'food' }, catalogs).map(t => t.id), ['t6', 't1', 't4'], 'filtro de categoria ordena pela data mais recente');
assert.deepEqual(filterTransactions(transactions, { startDate: '2026-10-01', endDate: '2026-10-10' }, catalogs).map(t => t.id), ['t3', 't5', 't2', 't1'], 'intervalo de datas é inclusivo e remove meses fora dele');
assert.deepEqual(filterTransactions(transactions, { minAmount: '100,00', maxAmount: '1.000,00' }, catalogs).map(t => t.id), ['t5', 't2', 't1'], 'faixa de valor em formato brasileiro compara centavos absolutos');
assert.deepEqual(filterTransactions(transactions, { type: 'despesa', status: 'pago', sortBy: 'amount_asc' }, catalogs).map(t => t.id), ['t4', 't1'], 'combina tipo, status e ordenação por valor ascendente');
assert.deepEqual(filterTransactions(transactions, { sortBy: 'date_asc' }, catalogs).map(t => t.id), ['t4', 't1', 't2', 't5', 't3', 't6'], 'ordenação cronológica ascendente é determinística');
assert.equal(parseTransactionAmountFilter('1.234,56'), 123456, 'parser entende milhares e decimais brasileiros');
assert.equal(parseTransactionAmountFilter('12.50'), 1250, 'parser entende ponto decimal');
assert.equal(Number.isNaN(parseTransactionAmountFilter('12,345')), true, 'parser rejeita mais de duas casas decimais');
const csv = transactionsToCSV([transactions[5]], catalogs);
assert.ok(csv.startsWith('\uFEFF'), 'CSV inclui BOM para abrir corretamente em planilhas comuns');
assert.ok(csv.includes("'=HYPERLINK("), 'CSV neutraliza textos que poderiam virar fórmulas em planilhas');
assert.ok(csv.includes('10,00') === false, 'exportação não inventa um valor para outros lançamentos');
assert.ok(csv.includes('1,00'), 'CSV usa vírgula decimal brasileira');
assert.ok(csv.includes('Conta Corrente') && csv.includes('Alimentação'), 'CSV substitui IDs por nomes de contas e categorias');
assert.ok(csv.includes('"Descrição";"Tipo"'), 'CSV usa colunas separadas por ponto e vírgula e protege campos com aspas');
console.log('Transaction search/export tests: 17 assertions passed, 0 failed');
