import assert from 'node:assert/strict';
import { localDb } from '../src/services/localDb.js';

class MemoryStorage {
  constructor(initial = {}) { this.data = new Map(Object.entries(initial)); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

const previousStorage = globalThis.localStorage;
try {
  // A malformed queue must not be silently treated as empty or overwritten.
  const corruptRaw = '{broken-json';
  globalThis.localStorage = new MemoryStorage({ razao_outbox_queue_v1: corruptRaw });
  await assert.rejects(() => localDb.getOutboxQueue(), /corrompida/);
  assert.equal(globalThis.localStorage.getItem('razao_outbox_queue_v1'), corruptRaw);
  await assert.rejects(() => localDb.enqueueOperation('CREATE', 'transaction', 'tx-1', { amount: 100 }), /corrompida/);
  assert.equal(globalThis.localStorage.getItem('razao_outbox_queue_v1'), corruptRaw);
  console.log('✓ Corrupção da outbox falha de forma explícita sem sobrescrever dados');

  globalThis.localStorage = new MemoryStorage({ razao_outbox_queue_v1: JSON.stringify({ eventId: 'wrong-shape' }) });
  await assert.rejects(() => localDb.getOutboxQueue(), /formato inválido/);
  console.log('✓ Estrutura inválida da outbox não é tratada como fila vazia');

  globalThis.localStorage = new MemoryStorage();
  const created = await localDb.enqueueOperation('CREATE', 'transaction', 'tx-2', { amount: 200 });
  const queue = await localDb.getOutboxQueue();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].eventId, created.eventId);
  assert.equal(queue[0].entityId, 'tx-2');
  console.log('✓ Enfileiramento normal é persistido e confirmado por leitura');

  assert.equal(await localDb.saveOutboxQueue({ not: 'an array' }), false);
  assert.equal(await localDb.saveOutboxQueue([{ status: 'pending' }]), false);
  console.log('✓ Gravação recusa payloads de fila com formato inválido');
} finally {
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
}
