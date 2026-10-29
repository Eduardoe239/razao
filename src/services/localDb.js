/**
 * Adaptador local-first do O Razão.
 * O estado financeiro canônico é persistido por services/storage.js. A fila
 * de sincronização é um armazenamento auxiliar separado em localStorage; ela
 * nunca deve fingir estar vazia quando sua leitura ou validação falha.
 */

import { loadStateAsync, saveState as persistAppState } from './storage.js';

export class RazaoLocalDatabase {
  constructor() {
    this.storageKey = 'razao_app_state_v3';
    this.outboxKey = 'razao_outbox_queue_v1';
  }

  // Carrega estado consolidado local
  async getState() {
    // Uma falha de leitura/corrupção precisa chegar ao chamador. Retornar null
    // confundiria erro de persistência com primeiro uso e poderia apagar dados.
    return loadStateAsync();
  }

  // Toda gravação do estado financeiro deve passar pela camada canônica, que
  // confirma a gravação e atualiza a cópia de recuperação quando possível.
  async saveState(state) {
    const saved = await persistAppState(state);
    if (!saved) throw new Error('[RazaoLocalDB] A persistência do estado financeiro não foi confirmada.');
    return true;
  }

  // Leitura da Fila de Outbox (eventos pendentes de sincronização).
  // Não converter corrupção/falha em []: isso poderia sobrescrever eventos
  // pendentes ao enfileirar uma nova operação.
  async getOutboxQueue() {
    if (typeof localStorage === 'undefined') {
      throw new Error('[RazaoLocalDB] Armazenamento local indisponível para a fila de sincronização.');
    }
    let raw;
    try {
      raw = localStorage.getItem(this.outboxKey);
    } catch (err) {
      throw new Error(`[RazaoLocalDB] Não foi possível ler a fila de sincronização: ${err?.message || 'erro desconhecido'}`);
    }
    if (raw === null) return [];
    let queue;
    try { queue = JSON.parse(raw); }
    catch (err) {
      throw new Error(`[RazaoLocalDB] A fila de sincronização está corrompida; nenhuma operação foi sobrescrita. ${err?.message || ''}`.trim());
    }
    if (!Array.isArray(queue) || queue.some(event => !event || typeof event !== 'object' || Array.isArray(event)
      || typeof event.eventId !== 'string' || typeof event.status !== 'string')) {
      throw new Error('[RazaoLocalDB] A fila de sincronização possui formato inválido; nenhuma operação foi sobrescrita.');
    }
    return queue;
  }

  // Gravação da fila com confirmação por leitura. O retorno false é mantido
  // para compatibilidade com enqueueOperation, que transforma a falha em erro.
  async saveOutboxQueue(queue) {
    if (!Array.isArray(queue) || queue.some(event => !event || typeof event !== 'object' || Array.isArray(event)
      || typeof event.eventId !== 'string' || typeof event.status !== 'string')) return false;
    if (typeof localStorage === 'undefined') return false;
    try {
      const serialized = JSON.stringify(queue);
      localStorage.setItem(this.outboxKey, serialized);
      if (localStorage.getItem(this.outboxKey) !== serialized) {
        throw new Error('A gravação não foi confirmada por leitura.');
      }
      return true;
    } catch (err) {
      console.error('[RazaoLocalDB] Erro ao salvar fila outbox:', err);
      return false;
    }
  }

  // Adiciona um novo evento mutacional à fila de sincronização
  async enqueueOperation(actionType, entityType, entityId, payload) {
    const queue = await this.getOutboxQueue();
    const event = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      actionType, // 'CREATE' | 'UPDATE' | 'DELETE'
      entityType, // 'transaction' | 'account' | 'card' | 'category' | 'budget'
      entityId,
      payload,
      timestampISO: new Date().toISOString(),
      vectorClock: { clientVersion: Date.now() },
      status: 'pending', // 'pending' | 'syncing' | 'failed'
      retryCount: 0
    };
    queue.push(event);
    const saved = await this.saveOutboxQueue(queue);
    if (!saved) {
      throw new Error('Não foi possível persistir a operação na fila local de sincronização.');
    }
    return event;
  }
}

export const localDb = new RazaoLocalDatabase();
