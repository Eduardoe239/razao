/**
 * TESTES DO MOTOR DE SINCRONIZAÇÃO OUTBOX (O RAZÃO FASE 5)
 */

import { localDb } from './localDb.js';
import { syncEngine } from './syncQueue.js';

export async function runSyncQueueTests() {
  console.log('\n==================================================');
  console.log('   O RAZÃO FASE 5 — TESTES DE SINCRONIZAÇÃO OUTBOX   ');
  console.log('==================================================\n');

  let passes = 0;
  let fails = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passes++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      fails++;
    }
  }

  // Teste 1: Registro de mutação na fila local de outbox
  await localDb.saveOutboxQueue([]);
  const event = await syncEngine.trackMutation('CREATE', 'transaction', 'tx-101', {
    description: 'Teste Outbox',
    amountCents: 15000,
    type: 'despesa'
  });

  assert(event && event.eventId.startsWith('evt_'), 'Deve gerar identificador de evento válido para o Outbox');
  const queue = await localDb.getOutboxQueue();
  assert(queue.length === 1 && queue[0].entityId === 'tx-101', 'Deve salvar a operação na fila local IndexedDB/LocalStorage');

  // Teste 2: Sincronização offline retenção
  const offlineResult = await syncEngine.processQueue(false);
  assert(offlineResult.status === 'offline' && offlineResult.remaining === 1, 'Deve reter itens na fila quando o dispositivo estiver offline');

  // Teste 3: sem servidor conectado, não declarar sucesso falso
  const unconfiguredResult = await syncEngine.processQueue(true);
  const stillPending = await localDb.getOutboxQueue();
  assert(unconfiguredResult.status === 'unconfigured' && unconfiguredResult.remaining === 1, 'Deve informar sincronização não configurada sem simular sucesso');
  assert(stillPending.length === 1 && stillPending[0].status === 'pending', 'Deve preservar a fila quando não há servidor conectado');

  // Teste 4: Processamento online com sucesso via handler explícito de teste
  const onlineResult = await syncEngine.processQueue(true, async (evt) => {
    return { success: true, serverTimestamp: new Date().toISOString() };
  });
  assert(onlineResult.processed === 1 && onlineResult.remaining === 0, 'Deve sincronizar e esvaziar a fila quando online');

  // Teste 5: Resolução Determinística de Conflitos (Last-Write-Wins)
  const localRecord = { id: 'acc-1', name: 'Conta Local', updatedAtISO: '2026-10-28T10:00:00Z' };
  const remoteRecord = { id: 'acc-1', name: 'Conta Remota', updatedAtISO: '2026-10-28T12:00:00Z' };
  const winner = syncEngine.resolveConflict(localRecord, remoteRecord);
  assert(winner.name === 'Conta Remota' && winner._conflictResolved === 'remote_wins', 'Deve aplicar Last-Write-Wins corretamente no conflito');

  // Teste 6: falhas repetidas não podem apagar a operação nem retryar sem limite
  await localDb.saveOutboxQueue([]);
  await syncEngine.trackMutation('UPDATE', 'account', 'acc-fail', { name: 'Conta de teste' });
  for (let i = 0; i < syncEngine.maxRetries; i++) {
    await syncEngine.processQueue(true, async () => { throw new Error('servidor indisponível'); });
  }
  const failedQueue = await localDb.getOutboxQueue();
  assert(failedQueue.length === 1 && failedQueue[0].status === 'failed', 'Deve manter operação que atingiu o limite de tentativas para revisão');
  let retriedFailed = false;
  const failedRetryResult = await syncEngine.processQueue(true, async () => { retriedFailed = true; return { success: true }; });
  assert(!retriedFailed && failedRetryResult.remaining === 1, 'Não deve reenviar automaticamente operação marcada como falha definitiva');

  // Teste 7: falha ao persistir mutação deve ser explícita, nunca sucesso silencioso
  const originalSave = localDb.saveOutboxQueue.bind(localDb);
  localDb.saveOutboxQueue = async () => false;
  let persistenceRejected = false;
  try {
    await syncEngine.trackMutation('CREATE', 'transaction', 'tx-no-save', { amountCents: 100 });
  } catch (error) {
    persistenceRejected = /persistir a operação/.test(error.message);
  } finally {
    localDb.saveOutboxQueue = originalSave;
    await localDb.saveOutboxQueue([]);
  }
  assert(persistenceRejected, 'Deve rejeitar registro de mutação quando a persistência local falha');

  console.log(`\nRESULTADO DA FASE 5: ${passes} aprovados, ${fails} falhas\n`);
  return fails === 0;
}
