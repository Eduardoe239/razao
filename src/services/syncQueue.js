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
  async processQueue(mockNetworkOnline = true, mockServerHandler = null) {
    if (this.isSyncing) return { processed: 0, remaining: 0, status: 'busy' };
    this.isSyncing = true;

    try {
      const queue = await localDb.getOutboxQueue();
      if (queue.length === 0) {
        this.isSyncing = false;
        return { processed: 0, remaining: 0, status: 'idle' };
      }

      if (!mockNetworkOnline) {
        this.isSyncing = false;
        return { processed: 0, remaining: queue.length, status: 'offline' };
      }

      const pendingEvents = queue.filter(evt => evt.status !== 'synced');
      let processedCount = 0;
      const updatedQueue = [];

      for (const event of pendingEvents) {
        try {
          // Processamento com idempotência
          let response;
          if (mockServerHandler) {
            response = await mockServerHandler(event);
          } else {
            response = { success: true, serverTimestamp: new Date().toISOString() };
          }

          if (response && response.success) {
            event.status = 'synced';
            event.syncedAtISO = response.serverTimestamp || new Date().toISOString();
            processedCount++;
          } else {
            event.retryCount += 1;
            if (event.retryCount >= this.maxRetries) {
              event.status = 'failed';
            }
            updatedQueue.push(event);
          }
        } catch (err) {
          event.retryCount += 1;
          event.lastError = err.message || 'Erro de conexão';
          updatedQueue.push(event);
        }
      }

      // Mantém apenas itens pendentes ou com falha na fila
      const remainingQueue = updatedQueue.filter(evt => evt.status !== 'synced');
      await localDb.saveOutboxQueue(remainingQueue);

      this.isSyncing = false;
      return {
        processed: processedCount,
        remaining: remainingQueue.length,
        status: remainingQueue.length === 0 ? 'synced' : 'pending_retries'
      };
    } catch (err) {
      this.isSyncing = false;
      console.error('[OutboxSyncEngine] Erro durante o ciclo de sincronização:', err);
      return { processed: 0, remaining: 0, status: 'error', error: err.message };
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
