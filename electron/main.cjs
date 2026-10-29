const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

let mainWindow;
const MAX_STATE_BYTES = 20 * 1024 * 1024;
const DEV_ORIGIN = 'http://127.0.0.1:5173';
const PACKAGED_ENTRY_URL = pathToFileURL(path.resolve(__dirname, '..', 'dist', 'index.html')).href;

function isTrustedSender(event) {
  try {
    const rawUrl = event?.senderFrame?.url;
    if (typeof rawUrl !== 'string') return false;
    const url = new URL(rawUrl);
    if (app.isPackaged) {
      // Exact URL match: suffix checks such as pathname.endsWith('/dist/index.html')
      // can trust a different local HTML file with the same path suffix.
      return url.href === PACKAGED_ENTRY_URL;
    }
    return url.origin === DEV_ORIGIN && url.pathname === '/' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validatePersistableState(value, context = 'estado financeiro') {
  const isRecord = candidate => Boolean(candidate) && typeof candidate === 'object' && !Array.isArray(candidate);
  const validDate = candidate => {
    if (typeof candidate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return false;
    const date = new Date(`${candidate}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === candidate;
  };
  if (!isRecord(value)) throw new Error(`Formato de ${context} inválido.`);
  for (const field of ['version', 'schemaVersion']) {
    if (value[field] === undefined || value[field] === null) continue;
    if (!Number.isInteger(value[field]) || value[field] < 1 || value[field] > 4) {
      throw new Error(`${context}: propriedade ${field} contém versão de schema não suportada.`);
    }
  }
  if (value.version !== undefined && value.version !== null
      && value.schemaVersion !== undefined && value.schemaVersion !== null
      && value.version !== value.schemaVersion) {
    throw new Error(`${context}: propriedades version e schemaVersion estão divergentes.`);
  }
  if (!Array.isArray(value.accounts) || !Array.isArray(value.transactions)) {
    throw new Error(`O ${context} deve conter listas de contas e lançamentos. Nenhum dado foi gravado.`);
  }
  // Legacy schemas are allowed through the migration path. Current schema 4 is
  // checked before any atomic write, so malformed financial records cannot
  // replace the last confirmed state just because the renderer sent an object.
  if (Number(value.version) >= 4) {
    const checkIds = (items, label) => {
      const ids = new Set();
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) throw new Error(`${context}: ${label} ${index + 1} sem identificador válido.`);
        if (ids.has(item.id)) throw new Error(`${context}: identificador duplicado em ${label.toLowerCase()}: ${item.id}.`);
        ids.add(item.id);
      }
      return ids;
    };
    if (!Array.isArray(value.cards) || !Array.isArray(value.categories)) throw new Error(`${context}: cartões e categorias precisam ser listas válidas.`);
    const accountIds = checkIds(value.accounts, 'conta');
    const cardIds = checkIds(value.cards, 'cartão');
    const categoryIds = checkIds(value.categories, 'categoria');
    const accountById = new Map(value.accounts.map(item => [item.id, item]));
    const cardById = new Map(value.cards.map(item => [item.id, item]));
    const categoryById = new Map(value.categories.map(item => [item.id, item]));
    for (const account of value.accounts) {
      if (account.initialBalanceCents !== undefined && !Number.isSafeInteger(account.initialBalanceCents)) throw new Error(`${context}: saldo inicial de conta precisa ser inteiro em centavos.`);
      if (account.profileType !== undefined && !['PF', 'PJ'].includes(account.profileType)) throw new Error(`${context}: conta possui perfil inválido.`);
    }
    for (const card of value.cards) {
      if (card.limitCents !== undefined && (!Number.isSafeInteger(card.limitCents) || card.limitCents < 0)) throw new Error(`${context}: cartão possui limite inválido em centavos.`);
      if (card.closingDay !== undefined && (!Number.isInteger(card.closingDay) || card.closingDay < 1 || card.closingDay > 31)) throw new Error(`${context}: cartão possui dia de fechamento inválido.`);
      if (card.dueDay !== undefined && (!Number.isInteger(card.dueDay) || card.dueDay < 1 || card.dueDay > 31)) throw new Error(`${context}: cartão possui dia de vencimento inválido.`);
      if (card.profileType !== undefined && !['PF', 'PJ'].includes(card.profileType)) throw new Error(`${context}: cartão possui perfil inválido.`);
    }
    for (const category of value.categories) {
      if (category.profileType !== undefined && !['PF', 'PJ'].includes(category.profileType)) throw new Error(`${context}: categoria possui perfil inválido.`);
      if (category.type !== undefined && !['receita', 'despesa'].includes(category.type)) throw new Error(`${context}: categoria possui tipo inválido.`);
    }
    checkIds(value.transactions, 'lançamento');
    if (value.recurring !== undefined && !Array.isArray(value.recurring)) throw new Error(`${context}: lista de recorrências inválida.`);
    if (value.budgets !== undefined && (!isRecord(value.budgets))) throw new Error(`${context}: mapa de orçamentos inválido.`);
    for (const tx of value.transactions) {
      if (!Number.isSafeInteger(tx.amountCents) || tx.amountCents < 0) throw new Error(`${context}: lançamento ${tx.id} possui valor inválido em centavos.`);
      if (!['receita', 'despesa', 'transferencia'].includes(tx.type)) throw new Error(`${context}: lançamento ${tx.id} possui tipo inválido.`);
      if (!['pago', 'pendente', 'cancelado'].includes(tx.status)) throw new Error(`${context}: lançamento ${tx.id} possui situação inválida.`);
      if (!validDate(tx.date)) throw new Error(`${context}: lançamento ${tx.id} possui data inválida.`);
      if (typeof tx.accountId !== 'string' || !tx.accountId.trim() || (!accountIds.has(tx.accountId) && !cardIds.has(tx.accountId))) throw new Error(`${context}: lançamento ${tx.id} referencia uma conta/cartão inexistente.`);
      if (tx.profileType !== undefined && !['PF', 'PJ'].includes(tx.profileType)) throw new Error(`${context}: lançamento ${tx.id} possui perfil financeiro inválido.`);
      const source = accountById.get(tx.accountId) || cardById.get(tx.accountId);
      if (tx.profileType && source?.profileType && source.profileType !== tx.profileType) throw new Error(`${context}: lançamento ${tx.id} cruza perfis financeiros na origem.`);
      if (tx.categoryId && !categoryIds.has(tx.categoryId)) throw new Error(`${context}: lançamento ${tx.id} referencia categoria inexistente.`);
      if (tx.profileType && tx.categoryId && categoryById.get(tx.categoryId)?.profileType && categoryById.get(tx.categoryId).profileType !== tx.profileType) throw new Error(`${context}: lançamento ${tx.id} cruza perfis financeiros na categoria.`);
      if (tx.linkedCardId && !cardIds.has(tx.linkedCardId)) throw new Error(`${context}: lançamento ${tx.id} referencia cartão vinculado inexistente.`);
      if (tx.profileType && tx.linkedCardId && cardById.get(tx.linkedCardId)?.profileType && cardById.get(tx.linkedCardId).profileType !== tx.profileType) throw new Error(`${context}: lançamento ${tx.id} cruza perfis financeiros no cartão vinculado.`);
      if (tx.type === 'transferencia') {
        if (typeof tx.toAccountId !== 'string' || !tx.toAccountId.trim() || tx.toAccountId === tx.accountId) throw new Error(`${context}: lançamento ${tx.id} possui destino de transferência inválido.`);
        const isInvoicePayment = typeof tx.linkedInvoiceKey === 'string' && /^\d{4}-\d{2}$/.test(tx.linkedInvoiceKey);
        const destination = isInvoicePayment ? cardById.get(tx.toAccountId) : accountById.get(tx.toAccountId);
        if (!destination) throw new Error(isInvoicePayment
          ? `${context}: lançamento ${tx.id} possui cartão de destino da fatura inexistente.`
          : `${context}: lançamento ${tx.id} possui conta de destino inexistente.`);
        if (tx.profileType && destination.profileType && destination.profileType !== tx.profileType) throw new Error(`${context}: lançamento ${tx.id} cruza perfis financeiros no destino.`);
      }
    }
    if (Array.isArray(value.recurring)) {
      const recurringIds = new Set();
      for (const rule of value.recurring) {
        if (!isRecord(rule) || typeof rule.id !== 'string' || !rule.id.trim() || recurringIds.has(rule.id)) throw new Error(`${context}: regra recorrente sem ID válido ou duplicado.`);
        recurringIds.add(rule.id);
        if (rule.amountCents !== undefined && (!Number.isSafeInteger(rule.amountCents) || rule.amountCents <= 0)) throw new Error(`${context}: regra recorrente ${rule.id} tem valor inválido em centavos.`);
        if (rule.type !== undefined && !['receita', 'despesa'].includes(rule.type)) throw new Error(`${context}: regra recorrente ${rule.id} tem tipo inválido.`);
        if (rule.dayOfMonth !== undefined && (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth < 1 || rule.dayOfMonth > 31)) throw new Error(`${context}: regra recorrente ${rule.id} tem dia do mês inválido.`);
        if (rule.active !== undefined && typeof rule.active !== 'boolean') throw new Error(`${context}: regra recorrente ${rule.id} tem estado inválido.`);
        if (rule.profileType !== undefined && !['PF', 'PJ'].includes(rule.profileType)) throw new Error(`${context}: regra recorrente ${rule.id} tem perfil inválido.`);
        if (rule.accountId !== undefined && (typeof rule.accountId !== 'string' || !accountIds.has(rule.accountId))) throw new Error(`${context}: regra recorrente ${rule.id} referencia conta inexistente.`);
        if (rule.categoryId !== undefined && (typeof rule.categoryId !== 'string' || !categoryIds.has(rule.categoryId))) throw new Error(`${context}: regra recorrente ${rule.id} referencia categoria inexistente.`);
        if (rule.profileType && rule.accountId && accountById.get(rule.accountId)?.profileType && accountById.get(rule.accountId).profileType !== rule.profileType) throw new Error(`${context}: regra recorrente ${rule.id} cruza perfis na conta.`);
        if (rule.profileType && rule.categoryId && categoryById.get(rule.categoryId)?.profileType && categoryById.get(rule.categoryId).profileType !== rule.profileType) throw new Error(`${context}: regra recorrente ${rule.id} cruza perfis na categoria.`);
        if (rule.startDate !== undefined && !validDate(rule.startDate)) throw new Error(`${context}: regra recorrente ${rule.id} tem data inicial inválida.`);
        if (rule.endDate !== undefined && !validDate(rule.endDate)) throw new Error(`${context}: regra recorrente ${rule.id} tem data final inválida.`);
        if (validDate(rule.startDate) && validDate(rule.endDate) && rule.endDate < rule.startDate) throw new Error(`${context}: regra recorrente ${rule.id} termina antes de começar.`);
      }
    }
    if (isRecord(value.budgets)) {
      for (const [key, amountCents] of Object.entries(value.budgets)) {
        if (!key.trim() || (amountCents !== null && (!Number.isSafeInteger(amountCents) || amountCents < 0))) throw new Error(`${context}: orçamento ${key} precisa ser inteiro não negativo em centavos.`);
      }
    }
  }
  return value;
}

function assertCurrentPersistableState(value, context = 'estado financeiro') {
  // Escritas vindas do renderer devem sempre usar o schema corrente. A leitura
  // aceita schemas históricos para que a camada de migração da aplicação possa
  // convertê-los; salvar/restaurar formatos antigos diretamente seria um bypass.
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.version !== 4 || value.schemaVersion !== 4) {
    throw new Error(`${context}: gravação/restauração exige version e schemaVersion iguais a 4. Nenhum dado foi gravado.`);
  }
  return value;
}

function assertTrusted(event) {
  if (!isTrustedSender(event)) throw new Error('Origem IPC não autorizada.');
}

function getAppIconPath() {
  const icoPath = path.join(__dirname, 'assets', 'icon.ico');
  const pngPath = path.join(__dirname, 'assets', 'icon.png');
  return fs.existsSync(icoPath) ? icoPath : (fs.existsSync(pngPath) ? pngPath : undefined);
}

function getUserDataPath() {
  // Ambiente de desenvolvimento pode usar um perfil de teste isolado. Isso só
  // é aceito no processo não empacotado; o aplicativo instalado sempre usa
  // o userData nativo do sistema operacional.
  const testRoot = !app.isPackaged && typeof process.env.RAZAO_TEST_USER_DATA === 'string'
    && process.env.RAZAO_TEST_USER_DATA.trim()
    ? path.resolve(process.env.RAZAO_TEST_USER_DATA)
    : app.getPath('userData');
  const dir = path.join(testRoot, 'RazaoData');
  fs.mkdirSync(dir, { recursive: true });
  return { dir, encrypted: path.join(dir, 'razao_app_db.enc'), legacy: path.join(dir, 'razao_app_db.json'), lastKnownGood: path.join(dir, 'razao_app_db.last-known-good.enc') };
}

function encryptState(serialized) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('A proteção de dados do sistema operacional não está disponível. Os dados não foram salvos em texto puro.');
  }
  return safeStorage.encryptString(serialized).toString('base64');
}

function decryptState(encoded) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('A proteção de dados do sistema operacional não está disponível para abrir os dados protegidos.');
  }
  return safeStorage.decryptString(Buffer.from(encoded, 'base64'));
}

function atomicWrite(filePath, contents) {
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tempPath, contents, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
    throw error;
  }
}

function pruneRecoverySnapshots(dir, keep = 5) {
  try {
    const snapshots = fs.readdirSync(dir)
      .filter(name => /^razao_app_db\.pre-restore-.*\.enc$/.test(name))
      .map(name => ({ name, fullPath: path.join(dir, name), mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const old of snapshots.slice(Math.max(1, keep))) {
      try { fs.unlinkSync(old.fullPath); } catch {}
    }
  } catch {}
}

function registerIpc() {
  ipcMain.handle('desktop:saveState', async (event, stateData) => {
    assertTrusted(event);
    const serialized = JSON.stringify(stateData);
    if (typeof serialized !== 'string' || Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) {
      throw new Error('Os dados excedem o limite permitido de 20 MB.');
    }
    const parsed = assertCurrentPersistableState(validatePersistableState(JSON.parse(serialized), 'estado financeiro'), 'estado financeiro');
    const paths = getUserDataPath();
    const envelope = JSON.stringify({ schemaVersion: 2, savedAt: new Date().toISOString(), state: parsed });
    const encryptedState = encryptState(envelope);
    atomicWrite(paths.encrypted, encryptedState);
    // Update the last-known-good copy after the primary commit. If this secondary
    // copy fails, the financial save remains successful, but callers can surface
    // the missing recovery refresh instead of reporting a false save failure.
    let recoverySnapshotUpdated = false;
    let recoveryWarning = '';
    try {
      atomicWrite(paths.lastKnownGood, encryptedState);
      recoverySnapshotUpdated = true;
    } catch (snapshotError) {
      recoveryWarning = 'Os dados foram salvos, mas a cópia de recuperação não pôde ser atualizada.';
    }
    // Remove legacy plaintext only after encrypted primary write succeeds.
    // Cleanup of an obsolete plaintext file is best-effort after the encrypted
    // commit; cleanup failure must not make the caller retry a successful save.
    try { if (fs.existsSync(paths.legacy)) fs.unlinkSync(paths.legacy); } catch {}
    return { success: true, encrypted: true, recoverySnapshotUpdated, recoveryWarning };
  });

  ipcMain.handle('desktop:restoreStateWithRecovery', async (event, stateData) => {
    assertTrusted(event);
    const serialized = JSON.stringify(stateData);
    if (typeof serialized !== 'string' || Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) {
      return { success: false, rolledBack: false, recoverySnapshotCreated: false, message: 'O estado restaurado excede o limite permitido de 20 MB.' };
    }
    let parsed;
    try { parsed = assertCurrentPersistableState(validatePersistableState(JSON.parse(serialized), 'estado restaurado'), 'estado restaurado'); }
    catch (error) {
      return { success: false, rolledBack: false, recoverySnapshotCreated: false, message: `${error?.message || 'Formato de dados restaurados inválido.'} Nenhum dado foi alterado.` };
    }

    const paths = getUserDataPath();
    let oldEncrypted = null;
    let oldLegacy = null;
    let recoveryPath = null;
    let recoverySnapshotCreated = false;
    try {
      if (fs.existsSync(paths.encrypted)) {
        oldEncrypted = fs.readFileSync(paths.encrypted, 'utf8');
      } else if (fs.existsSync(paths.legacy)) {
        oldLegacy = fs.readFileSync(paths.legacy, 'utf8');
        if (Buffer.byteLength(oldLegacy, 'utf8') > MAX_STATE_BYTES) throw new Error('O estado anterior excede o limite permitido e não pode ser copiado com segurança.');
        const legacyParsed = JSON.parse(oldLegacy);
        const legacyState = legacyParsed && legacyParsed.schemaVersion === 1 && legacyParsed.state ? legacyParsed.state : legacyParsed;
        if (!legacyState || typeof legacyState !== 'object' || Array.isArray(legacyState)) throw new Error('O estado anterior não pôde ser validado para a cópia de segurança.');
        oldEncrypted = encryptState(JSON.stringify({ schemaVersion: 2, savedAt: new Date().toISOString(), state: legacyState }));
      }

      if (oldEncrypted !== null) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        recoveryPath = path.join(paths.dir, `razao_app_db.pre-restore-${stamp}-${crypto.randomUUID()}.enc`);
        atomicWrite(recoveryPath, oldEncrypted);
        recoverySnapshotCreated = true;
      }

      const envelope = JSON.stringify({ schemaVersion: 2, savedAt: new Date().toISOString(), state: parsed });
      const encryptedRestoredState = encryptState(envelope);
      atomicWrite(paths.encrypted, encryptedRestoredState);
      let lastKnownGoodUpdated = false;
      try {
        atomicWrite(paths.lastKnownGood, encryptedRestoredState);
        lastKnownGoodUpdated = true;
      } catch {
        // The restore itself is already atomically committed; keep its result
        // truthful while exposing that the secondary recovery copy is stale.
      }
      // Encrypted state has been atomically committed; stale legacy cleanup is best-effort.
      try { if (fs.existsSync(paths.legacy)) fs.unlinkSync(paths.legacy); } catch {}
      pruneRecoverySnapshots(paths.dir, 5);
      return {
        success: true,
        rolledBack: false,
        recoverySnapshotCreated,
        recoverySnapshotUpdated: lastKnownGoodUpdated,
        message: lastKnownGoodUpdated
          ? (recoverySnapshotCreated ? 'Restauração gravada; a cópia anterior foi preservada e a cópia do último estado confirmado foi atualizada.' : 'Restauração gravada e cópia do último estado confirmado atualizada.')
          : 'Restauração gravada, mas a cópia do último estado confirmado não pôde ser atualizada. Exporte um backup externo antes de continuar.'
      };
    } catch (error) {
      let rolledBack = false;
      try {
        if (oldEncrypted !== null && fs.existsSync(paths.encrypted)) {
          atomicWrite(paths.encrypted, oldEncrypted);
          rolledBack = fs.readFileSync(paths.encrypted, 'utf8') === oldEncrypted;
        } else if (oldEncrypted !== null && !fs.existsSync(paths.encrypted)) {
          atomicWrite(paths.encrypted, oldEncrypted);
          rolledBack = fs.readFileSync(paths.encrypted, 'utf8') === oldEncrypted;
        } else if (oldLegacy !== null) {
          if (fs.existsSync(paths.encrypted)) fs.unlinkSync(paths.encrypted);
          rolledBack = fs.readFileSync(paths.legacy, 'utf8') === oldLegacy;
        } else {
          if (fs.existsSync(paths.encrypted)) fs.unlinkSync(paths.encrypted);
          rolledBack = !fs.existsSync(paths.encrypted);
        }
      } catch {
        rolledBack = false;
      }
      return {
        success: false,
        rolledBack,
        recoverySnapshotCreated,
        recoverySnapshot: recoveryPath ? path.basename(recoveryPath) : null,
        message: rolledBack
          ? `A restauração falhou e o estado anterior foi recuperado. ${error?.message || ''}`.trim()
          : `A restauração falhou; a recuperação automática não pôde ser confirmada. ${recoveryPath ? `Cópia preservada: ${path.basename(recoveryPath)}. ` : ''}${error?.message || ''}`.trim()
      };
    }
  });

  ipcMain.handle('desktop:loadState', async (event) => {
    assertTrusted(event);
    const paths = getUserDataPath();
    const parseEncryptedState = (encoded) => {
      if (Buffer.byteLength(encoded, 'utf8') > MAX_STATE_BYTES * 2) throw new Error('Arquivo de dados protegidos excede o limite permitido.');
      const raw = decryptState(encoded);
      if (Buffer.byteLength(raw, 'utf8') > MAX_STATE_BYTES) throw new Error('Dados descriptografados excedem o limite permitido.');
      const parsed = JSON.parse(raw);
      const state = parsed && parsed.state && parsed.schemaVersion ? parsed.state : parsed;
      return validatePersistableState(state, 'estado financeiro persistido');
    };
    const recoverLastKnownGood = () => {
      if (!fs.existsSync(paths.lastKnownGood)) throw new Error('Cópia do último estado confirmado não encontrada.');
      const recoveryEncoded = fs.readFileSync(paths.lastKnownGood, 'utf8');
      const recoveredState = parseEncryptedState(recoveryEncoded);
      atomicWrite(paths.encrypted, recoveryEncoded);
      return recoveredState;
    };
    if (fs.existsSync(paths.encrypted)) {
      const encoded = fs.readFileSync(paths.encrypted, 'utf8');
      try {
        return parseEncryptedState(encoded);
      } catch (primaryError) {
        // Prefer the newest confirmed save over older snapshots made before a restore.
        try { return recoverLastKnownGood(); } catch {}
        // Legacy recovery snapshots remain a secondary fallback for older versions.
        const recoveryFiles = fs.readdirSync(paths.dir)
          .filter(name => /^razao_app_db\.pre-restore-.*\.enc$/.test(name))
          .map(name => ({ name, fullPath: path.join(paths.dir, name), mtime: fs.statSync(path.join(paths.dir, name)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime);
        for (const recovery of recoveryFiles) {
          try {
            const recoveryEncoded = fs.readFileSync(recovery.fullPath, 'utf8');
            const recoveredState = parseEncryptedState(recoveryEncoded);
            atomicWrite(paths.encrypted, recoveryEncoded);
            return recoveredState;
          } catch {}
        }
        throw new Error(`Não foi possível carregar os dados protegidos nem recuperar uma cópia válida: ${primaryError?.message || 'erro desconhecido'}`);
      }
    }
    // If the primary file was deleted, recover the latest confirmed save before
    // treating this installation as a fresh profile.
    try { return recoverLastKnownGood(); } catch {}
    // One-time migration path for prior versions that stored plaintext JSON.
    if (fs.existsSync(paths.legacy)) {
      const raw = fs.readFileSync(paths.legacy, 'utf8');
      if (Buffer.byteLength(raw, 'utf8') > MAX_STATE_BYTES) throw new Error('Arquivo de dados legado excede o limite permitido.');
      const parsed = JSON.parse(raw);
      const candidate = parsed && parsed.schemaVersion === 1 && parsed.state ? parsed.state : parsed;
      const state = validatePersistableState(candidate, 'estado legado');
      const envelope = JSON.stringify({ schemaVersion: 2, savedAt: new Date().toISOString(), state });
      const encryptedLegacy = encryptState(envelope);
      atomicWrite(paths.encrypted, encryptedLegacy);
      // Preserve/refresh the recovery copy before attempting to remove the sole
      // historical plaintext file. Keep that file if secondary durability fails.
      let snapshotStored = false;
      try { atomicWrite(paths.lastKnownGood, encryptedLegacy); snapshotStored = true; } catch {}
      if (snapshotStored) { try { fs.unlinkSync(paths.legacy); } catch {} }
      return state;
    }
    return null;
  });

  ipcMain.handle('desktop:listRecoveryBackups', (event) => {
    assertTrusted(event);
    const paths = getUserDataPath();
    const files = fs.readdirSync(paths.dir)
      .filter(name => name === path.basename(paths.lastKnownGood) || /^razao_app_db\.pre-restore-.*\.enc$/.test(name))
      .map(name => {
        const fullPath = path.join(paths.dir, name);
        try {
          const stat = fs.statSync(fullPath);
          const raw = decryptState(fs.readFileSync(fullPath, 'utf8'));
          if (Buffer.byteLength(raw, 'utf8') > MAX_STATE_BYTES) throw new Error('Backup grande demais.');
          const envelope = JSON.parse(raw);
          const state = envelope?.state || envelope;
          const valid = Boolean(state && typeof state === 'object' && !Array.isArray(state) && Array.isArray(state.accounts) && Array.isArray(state.transactions));
          return {
            id: name,
            label: name === path.basename(paths.lastKnownGood) ? 'Último estado salvo confirmado' : 'Cópia anterior à restauração',
            createdAt: stat.mtime.toISOString(), valid,
            accounts: valid ? state.accounts.length : 0,
            transactions: valid ? state.transactions.length : 0,
            sizeBytes: stat.size, issue: valid ? '' : 'Estrutura do estado inválida.'
          };
        } catch (error) {
          let stat;
          try { stat = fs.statSync(fullPath); } catch {}
          return { id: name, createdAt: stat ? stat.mtime.toISOString() : null, valid: false, accounts: 0, transactions: 0, sizeBytes: stat?.size || 0, issue: error?.message || 'Não foi possível validar o arquivo criptografado.' };
        }
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 5);
    return files;
  });

  ipcMain.handle('desktop:loadRecoveryBackup', (event, backupId) => {
    assertTrusted(event);
    const paths = getUserDataPath();
    const isLastKnownGood = backupId === path.basename(paths.lastKnownGood);
    const isPreRestore = typeof backupId === 'string' && /^razao_app_db\.pre-restore-[A-Za-z0-9T_-]+\.enc$/.test(backupId);
    if (!isLastKnownGood && !isPreRestore) throw new Error('Identificador de backup inválido.');
    const fullPath = path.join(paths.dir, path.basename(backupId));
    if (!fs.existsSync(fullPath)) throw new Error('O backup selecionado não existe mais.');
    const encoded = fs.readFileSync(fullPath, 'utf8');
    const raw = decryptState(encoded);
    if (Buffer.byteLength(raw, 'utf8') > MAX_STATE_BYTES) throw new Error('O backup excede o limite permitido.');
    const envelope = JSON.parse(raw);
    const state = envelope?.state || envelope;
    if (!state || typeof state !== 'object' || Array.isArray(state) || !Array.isArray(state.accounts) || !Array.isArray(state.transactions)) {
      throw new Error('O backup selecionado não passou na validação estrutural.');
    }
    return { state, createdAt: fs.statSync(fullPath).mtime.toISOString(), accounts: state.accounts.length, transactions: state.transactions.length };
  });

  ipcMain.handle('desktop:getAppInfo', (event) => {
    assertTrusted(event);
    return { version: app.getVersion(), name: app.getName(), isDesktop: true };
  });

  ipcMain.handle('desktop:openFileDialog', async (event, filters) => {
    assertTrusted(event);
    const safeFilters = Array.isArray(filters) ? filters.slice(0, 10).map((f) => ({
      name: String(f?.name || 'Arquivos').slice(0, 80),
      extensions: Array.isArray(f?.extensions) ? f.extensions.filter(x => /^[a-z0-9]{1,10}$/i.test(String(x))).slice(0, 20) : []
    })) : [];
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: safeFilters });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('desktop:saveFileDialog', async (event, opts) => {
    assertTrusted(event);
    const options = opts && typeof opts === 'object' ? opts : {};
    const content = options.content;
    if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > 25 * 1024 * 1024) {
      throw new Error('Conteúdo de exportação ausente ou maior que 25 MB.');
    }
    const result = await dialog.showSaveDialog(mainWindow, {
      title: String(options.title || 'Salvar arquivo').slice(0, 100),
      defaultPath: path.basename(String(options.defaultName || options.defaultPath || 'exportacao.json')),
      filters: Array.isArray(options.filters) ? options.filters.slice(0, 10) : [{ name: 'Arquivo JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await fs.promises.writeFile(result.filePath, content, { encoding: 'utf8', flag: 'w' });
    return { saved: true, path: result.filePath };
  });

  ipcMain.on('window:minimize', (event) => { if (isTrustedSender(event)) BrowserWindow.fromWebContents(event.sender)?.minimize(); });
  ipcMain.on('window:maximize', (event) => {
    if (!isTrustedSender(event)) return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize(); else win.maximize();
  });
  ipcMain.on('window:close', (event) => { if (isTrustedSender(event)) BrowserWindow.fromWebContents(event.sender)?.close(); });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 832, minWidth: 380, minHeight: 600,
    title: 'O Razão — Suas Finanças. Com Lógica.', icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false, contextIsolation: true, sandbox: true
    },
    autoHideMenuBar: true, backgroundColor: '#07101f'
  });
  // The beta has no feature that needs external windows. Deny all popups so
  // imported/user-controlled URLs cannot launch phishing pages or side effects.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, rawUrl) => {
    let allowed = false;
    try {
      const target = new URL(rawUrl);
      allowed = app.isPackaged
        ? target.href === PACKAGED_ENTRY_URL
        : target.origin === DEV_ORIGIN && target.pathname === '/' && !target.username && !target.password;
    } catch { allowed = false; }
    if (!allowed) event.preventDefault();
  });
  if (!app.isPackaged && process.env.NODE_ENV === 'development') mainWindow.loadURL(DEV_ORIGIN);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

registerIpc();
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
