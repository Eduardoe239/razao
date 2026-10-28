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

  // Teste 3: Processamento online com sucesso
  const onlineResult = await syncEngine.processQueue(true, async (evt) => {
    return { success: true, serverTimestamp: new Date().toISOString() };
  });
  assert(onlineResult.processed === 1 && onlineResult.remaining === 0, 'Deve sincronizar e esvaziar a fila quando online');

  // Teste 4: Resolução Determinística de Conflitos (Last-Write-Wins)
  const localRecord = { id: 'acc-1', name: 'Conta Local', updatedAtISO: '2026-10-28T10:00:00Z' };
  const remoteRecord = { id: 'acc-1', name: 'Conta Remota', updatedAtISO: '2026-10-28T12:00:00Z' };
  const winner = syncEngine.resolveConflict(localRecord, remoteRecord);
  assert(winner.name === 'Conta Remota' && winner._conflictResolved === 'remote_wins', 'Deve aplicar Last-Write-Wins corretamente no conflito');

  console.log(`\nRESULTADO DA FASE 5: ${passes} aprovados, ${fails} falhas\n`);
  return fails === 0;
}
