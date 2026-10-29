// ============================================================================
// CLIENTE DE SERVIÇOS DEMONSTRATIVOS — NÃO É UM BACKEND DE PRODUÇÃO
// ============================================================================

import { UserAuthService } from '../../api/src/routes/userAuth.js';
import { BankingService } from '../../api/src/routes/openFinanceApi.js';
import { OcrService } from '../../api/src/routes/ocrService.js';
import { OutboxSyncService } from '../../api/src/routes/outboxSync.js';

class ApiClient {
  constructor() {
    this.authService = new UserAuthService();
    this.bankingService = new BankingService();
    this.ocrService = new OcrService();
    this.syncService = new OutboxSyncService();
    this.currentToken = null;
  }

  // Autenticação desativada até existir backend de identidade validado
  async register(userData) {
    const res = await this.authService.register(userData);
    if (res.token) this.currentToken = res.token;
    return res;
  }

  async login(credentials) {
    const res = await this.authService.login(credentials);
    if (res.token) this.currentToken = res.token;
    return res;
  }

  // Simulação bancária; não inicia conexão Open Finance real
  async startOpenFinanceSession(userId, bankName) {
    return await this.bankingService.createConnectSession(userId, bankName);
  }

  async syncBankPayload(sessionId, transactions) {
    return await this.bankingService.processBankPayload(sessionId, transactions);
  }

  // Extração demonstrativa por texto; não executa OCR de imagem
  async processReceiptOCR(imageUrl, textContent) {
    return await this.ocrService.processReceiptImage({ imageUrl, textContent });
  }

  // Serviço de outbox em memória; não confirma sincronização remota durável
  async syncOutboxQueue(userId, queue) {
    return await this.syncService.processSyncQueue(userId, queue);
  }
}

export const apiClient = new ApiClient();
