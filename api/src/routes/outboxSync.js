// ============================================================================
// SERVIÇO DE SINCRONIZAÇÃO OUTBOX & RESOLUÇÃO DE CONFLITOS LWW (BACKEND API)
// ============================================================================

export class OutboxSyncService {
  constructor() {
    this.store = new Map();
  }

  // Processa lote de eventos assíncronos enviados pelo frontend Local-First
  async processSyncQueue(userId, events = []) {
    if (!userId) {
      throw new Error("userId é obrigatório para processar sincronização.");
    }

    const processedEvents = [];
    const serverTimestamp = Date.now();

    for (const event of events) {
      const { eventId, entity, action, data, clientTimestamp } = event;
      const key = `${userId}:${entity}:${data.id}`;

      const existing = this.store.get(key);

      // Algoritmo Last-Write-Wins (LWW): compara timestamp do cliente
      if (!existing || clientTimestamp >= existing.clientTimestamp) {
        this.store.set(key, {
          data,
          action,
          clientTimestamp,
          serverTimestamp,
          version: (existing ? existing.version : 0) + 1
        });

        processedEvents.push({
          eventId,
          status: "ACCEPTED",
          serverTimestamp
        });
      } else {
        // Conflito detectado - manteve a versão mais recente do servidor
        processedEvents.push({
          eventId,
          status: "CONFLICT_RESOLVED_SERVER_WIN",
          serverData: existing.data,
          serverTimestamp
        });
      }
    }

    return {
      success: true,
      processedCount: processedEvents.length,
      events: processedEvents,
      serverTimestamp
    };
  }

  // Retorna os dados consolidados do usuário no servidor
  async getUserState(userId) {
    const userItems = [];
    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(`${userId}:`)) {
        userItems.push(value.data);
      }
    }
    return userItems;
  }
}
