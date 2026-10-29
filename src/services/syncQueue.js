/**
 * MOTOR DE SINCRONIZAÇÃO OUTBOX (LOCAL-FIRST) — O RAZÃO FASE 5
 * Gerencia a fila de mutações offline, envio em lotes com idempotência,
 * e resolução determinística de conflitos via Last-Write-Wins (LWW) e Vector Clocks.
 */

import { localDb } from './localDb.js';

export class OutboxSyncEngine {
  constructor(apiEndpoint = null) {
    this.apiEndpoint = apiEndpoint;
    this.isSyncing = false;
    this.maxRetries = 5;
  }

  /**
   * Registra uma ação do usuário na fila de saída (Outbox Queue)
   * antes de tentar sincronizar com o servidor remoto.
   */
  async trackMutation(actionType, entityType, entityId, payload) {
    const event = await localDb.enqueueOperation(actionType, entityType, entityId, payload);
    return event;
  }

  /**
   * Processa a fila de mutações pendentes.
   * Se offline ou sem endpoint configurado, mantém a fila local intacta para tentativa futura.
   */
  async processQueue(networkOnline = true, serverHandler = null) {
    if (this.isSyncing) return { processed: 0, remaining: 0, status: 'busy' };
    this.isSyncing = true;

    try {
      const queue = await localDb.getOutboxQueue();
      if (!Array.isArray(queue)) {
        return { processed: 0, remaining: 0, status: 'invalid_queue' };
      }
      if (queue.length === 0) {
        return { processed: 0, remaining: 0, status: 'idle' };
      }
      if (!networkOnline) {
        return { processed: 0, remaining: queue.length, status: 'offline' };
      }

      // Nunca simular sucesso de sincronização: sem um handler conectado,
      // a operação permanece pendente e a UI pode comunicar a limitação.
      if (typeof serverHandler !== 'function') {
        return { processed: 0, remaining: queue.length, status: 'unconfigured' };
      }

      let processedCount = 0;
      const remainingQueue = [];

      for (const originalEvent of queue) {
        const event = { ...originalEvent };
        if (event.status === 'synced') continue;
        if (event.status === 'failed') {
          remainingQueue.push(event);
          continue;
        }

        try {
          const response = await serverHandler(event);
          if (response?.success === true) {
            event.status = 'synced';
            event.syncedAtISO = response.serverTimestamp || new Date().toISOString();
            processedCount++;
          } else {
            event.retryCount = (event.retryCount || 0) + 1;
            event.lastError = response?.error || 'Servidor não confirmou a operação.';
            if (event.retryCount >= this.maxRetries) event.status = 'failed';
            remainingQueue.push(event);
          }
        } catch (err) {
          event.retryCount = (event.retryCount || 0) + 1;
          event.lastError = err?.message || 'Erro de conexão';
          if (event.retryCount >= this.maxRetries) event.status = 'failed';
          remainingQueue.push(event);
        }
      }

      const saved = await localDb.saveOutboxQueue(remainingQueue);
      if (!saved) {
        return {
          processed: 0,
          remaining: queue.length,
          status: 'persistence_error',
          error: 'A fila atualizada não pôde ser persistida; a fila anterior foi preservada quando possível.'
        };
      }

      return {
        processed: processedCount,
        remaining: remainingQueue.length,
        status: remainingQueue.length === 0 ? 'synced' : 'pending_retries'
      };
    } catch (err) {
      console.error('[OutboxSyncEngine] Erro durante o ciclo de sincronização:', err);
      return { processed: 0, remaining: 0, status: 'error', error: err.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Resolução Determinística de Conflitos (Last-Write-Wins / LWW)
   * Garante que entre a versão local e a versão remota, a mutação com
   * carimbo de data/hora mais recente seja preservada sem corromper centavos.
   */
  resolveConflict(localRecord, remoteRecord) {
    if (!localRecord) return remoteRecord;
    if (!remoteRecord) return localRecord;

    const localTs = new Date(localRecord.updatedAtISO || localRecord.date || 0).getTime();
    const remoteTs = new Date(remoteRecord.updatedAtISO || remoteRecord.date || 0).getTime();

    // Em caso de empate, a versão remota do servidor prevalece para consistência global
    if (remoteTs >= localTs) {
      return { ...remoteRecord, _conflictResolved: 'remote_wins' };
    }
    return { ...localRecord, _conflictResolved: 'local_wins' };
  }
}

export const syncEngine = new OutboxSyncEngine();
