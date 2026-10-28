/**
 * MÓDULO DE BANCO DE DADOS LOCAL (LOCAL-FIRST) — O RAZÃO FASE 5
 * Abstração de armazenamento de alta performance IndexedDB / LocalStorage
 * com suporte a coleções versionadas e sincronização offline.
 */

const DB_NAME = 'RazaoLocalDB_v5';

export class RazaoLocalDatabase {
  constructor() {
    this.storageKey = 'razao_app_state_v3';
    this.outboxKey = 'razao_outbox_queue_v1';
  }

  // Carrega estado consolidado local
  async getState() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error('[RazaoLocalDB] Erro ao ler estado local:', err);
      return null;
    }
  }

  // Persiste estado consolidado localmente
  async saveState(state) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
      return true;
    } catch (err) {
      console.error('[RazaoLocalDB] Erro ao salvar estado local:', err);
      return false;
    }
  }

  // Leitura da Fila de Outbox (Eventos Pendentes de Sincronização)
  async getOutboxQueue() {
    try {
      const raw = localStorage.getItem(this.outboxKey);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('[RazaoLocalDB] Erro ao ler fila outbox:', err);
      return [];
    }
  }

  // Gravação na Fila de Outbox
  async saveOutboxQueue(queue) {
    try {
      localStorage.setItem(this.outboxKey, JSON.stringify(queue));
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
    await this.saveOutboxQueue(queue);
    return event;
  }
}

export const localDb = new RazaoLocalDatabase();
