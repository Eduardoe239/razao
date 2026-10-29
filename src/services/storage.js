import { assertValidStateStructure } from '../domain/stateValidation.js';

/**
 * Persistência local-first do Razão. No Electron, o arquivo é protegido pelo
 * safeStorage do sistema operacional; na Web, usa localStorage sem alegar
 * criptografia em repouso. A inicialização deve ser aguardada antes de salvar.
 */
const STORAGE_KEY = 'razao_app_state_v3';
const PRE_RESTORE_BACKUP_KEY = 'razao_app_state_v3.pre-restore-backup';
const LAST_KNOWN_GOOD_KEY = 'razao_app_state_v3.last-known-good';
let writeBusy = false;
const queuedWrites = [];

function enqueueWrite(task) {
  return new Promise((resolve, reject) => {
    const run = () => {
      writeBusy = true;
      let result;
      try {
        // Execute the first operation immediately so browser localStorage keeps
        // its historical synchronous write-before-return behavior when idle.
        result = task();
      } catch (error) {
        reject(error);
        finishWrite();
        return;
      }
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).then(
          value => { resolve(value); finishWrite(); },
          error => { reject(error); finishWrite(); }
        );
      } else {
        resolve(result);
        finishWrite();
      }
    };
    if (writeBusy) queuedWrites.push(run);
    else run();
  });
}

function finishWrite() {
  const next = queuedWrites.shift();
  if (next) next();
  else writeBusy = false;
}


function notifyStorageHealth(message = '') {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent('razao:storage-health', { detail: { message } }));
}

function parseValidState(raw, label = 'estado salvo', validationOptions = {}) {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`O ${label} não é um objeto válido.`);
  }
  assertValidStateStructure(parsed, validationOptions);
  return parsed;
}

function readWebRecoverySnapshot(key, expectedFormat) {
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error('Cópia de recuperação ausente.');
  const snapshot = JSON.parse(raw);
  if (snapshot?.format !== expectedFormat || typeof snapshot.raw !== 'string') {
    throw new Error('Formato da cópia de recuperação inválido.');
  }
  return parseValidState(snapshot.raw, 'estado da cópia de recuperação', { allowProfileMigration: true });
}

function readWebState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null; // Não ressuscitar dados se a chave foi removida intencionalmente.
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null) return null; // Marcador legado de limpeza explícita.
    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('O estado salvo não é um objeto válido.');
    assertValidStateStructure(parsed, { allowProfileMigration: true });
    return parsed;
  } catch (primaryError) {
    // Preferir o último estado confirmado; a cópia pré-restauração é a segunda
    // opção porque pode representar um estado anterior ao último salvamento.
    const recoveryErrors = [];
    for (const [key, format] of [
      [LAST_KNOWN_GOOD_KEY, 'orazao-last-known-good-snapshot'],
      [PRE_RESTORE_BACKUP_KEY, 'orazao-pre-restore-snapshot']
    ]) {
      try {
        const recovered = readWebRecoverySnapshot(key, format);
        const snapshotRaw = localStorage.getItem(key);
        localStorage.setItem(STORAGE_KEY, snapshotRaw ? JSON.parse(snapshotRaw).raw : JSON.stringify(recovered));
        return recovered;
      } catch (recoveryError) {
        recoveryErrors.push(recoveryError?.message || 'erro desconhecido');
      }
    }
    throw new Error(`Falha ao carregar o estado local e recuperar cópias: ${primaryError?.message || 'estado inválido'}. ${recoveryErrors.join(' | ')}`);
  }
}

export async function loadStateAsync() {
  if (typeof window !== 'undefined' && window.electronAPI?.isDesktop) {
    if (typeof window.electronAPI.loadState !== 'function') throw new Error('A API nativa de leitura não está disponível; a persistência foi bloqueada para evitar sobrescrita.');
    // Never silently load browser storage when the native read fails.
    return await window.electronAPI.loadState();
  }
  return readWebState();
}

/** Compatibilidade síncrona para utilitários antigos; não usar no boot desktop. */
export function loadState() {
  return readWebState();
}

export function saveState(state) {
  return enqueueWrite(() => saveStateNow(state));
}

function saveStateNow(state) {
  let serialized;
  try {
    serialized = JSON.stringify(state);
    if (typeof serialized !== 'string') return false;
    // null é o marcador legado de limpeza explícita do armazenamento; não é
    // um estado financeiro e, por isso, também elimina o snapshot recuperável.
    if (state !== null) {
      const parsed = JSON.parse(serialized);
      if (Number(parsed?.version) >= 4) assertValidStateStructure(parsed);
      else parseValidState(serialized, 'novo estado');
    }
  } catch (err) {
    const message = `Gravação recusada para proteger os dados atuais: ${err?.message || 'estado inválido'}`;
    console.error(message, err);
    notifyStorageHealth(message);
    return false;
  }
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.isDesktop) {
      if (typeof window.electronAPI.saveState !== 'function') return false;
      return Promise.resolve(window.electronAPI.saveState(state)).then(
        result => {
          const success = result === true || result?.success === true;
          if (success && result?.recoverySnapshotUpdated === false) {
            const message = result?.recoveryWarning || 'Dados salvos, mas a cópia de recuperação não foi atualizada.';
            console.warn(message);
            notifyStorageHealth(message);
          } else if (success) {
            notifyStorageHealth();
          }
          return success;
        },
        err => { console.error('Erro ao salvar estado:', err); notifyStorageHealth('Não foi possível confirmar a gravação dos dados. Evite fechar o aplicativo e exporte um backup se os dados ainda estiverem acessíveis.'); return false; }
      );
    }

    // localStorage não oferece transações. A gravação principal é confirmada
    // por leitura antes de atualizar o snapshot. Se o snapshot falhar por quota,
    // o estado principal continua salvo e a limitação é comunicada sem falso erro.
    localStorage.setItem(STORAGE_KEY, serialized);
    if (localStorage.getItem(STORAGE_KEY) !== serialized) throw new Error('A gravação não pôde ser confirmada por leitura.');
    if (state === null) {
      try { localStorage.removeItem(LAST_KNOWN_GOOD_KEY); } catch (snapshotError) {
        console.warn('O estado foi limpo, mas não foi possível remover a cópia de recuperação. Verifique o armazenamento do navegador.', snapshotError);
      }
      notifyStorageHealth();
      return true;
    }
    try {
      localStorage.setItem(LAST_KNOWN_GOOD_KEY, JSON.stringify({
        format: 'orazao-last-known-good-snapshot',
        createdAt: new Date().toISOString(),
        raw: serialized
      }));
      notifyStorageHealth();
    } catch (snapshotError) {
      const message = 'Os dados principais foram salvos, mas a cópia de recuperação não foi atualizada. Exporte um backup e libere espaço no navegador.';
      console.warn(message, snapshotError);
      notifyStorageHealth(message);
    }
    return true;
  } catch (err) {
    console.error('Erro ao salvar estado:', err);
    notifyStorageHealth('Não foi possível confirmar a gravação dos dados. Evite fechar o aplicativo e exporte um backup se os dados ainda estiverem acessíveis.');
    return false;
  }
}


/**
 * Persist a restored state only after preserving the currently persisted state.
 * On desktop, the main process creates an encrypted recovery copy and performs
 * the replacement/rollback transaction. In the browser, localStorage keeps a
 * recovery snapshot first; if the replacement fails, the old value is restored.
 */
export function saveStateWithRecovery(state) {
  return enqueueWrite(() => saveStateWithRecoveryNow(state));
}

async function saveStateWithRecoveryNow(state) {
  let serialized;
  try {
    serialized = JSON.stringify(state);
    if (typeof serialized !== 'string') {
      return { success: false, rolledBack: false, recoverySnapshotCreated: false, message: 'O estado não pôde ser serializado.' };
    }
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      return { success: false, rolledBack: false, recoverySnapshotCreated: false, message: 'A restauração exige um objeto de estado válido; nenhum dado foi alterado.' };
    }
    try { assertValidStateStructure(state); }
    catch (validationError) { return { success: false, rolledBack: false, recoverySnapshotCreated: false, message: `${validationError?.message || 'Estado restaurado inválido.'} Nenhum dado foi alterado.` }; }

    if (typeof window !== 'undefined' && window.electronAPI?.isDesktop) {
      if (typeof window.electronAPI.restoreStateWithRecovery !== 'function') {
        return { success: false, rolledBack: false, recoverySnapshotCreated: false, message: 'Esta versão do aplicativo desktop não oferece restauração transacional. Nenhum dado foi alterado.' };
      }
      const result = await window.electronAPI.restoreStateWithRecovery(state);
      if (result && typeof result === 'object') return result;
      return { success: false, rolledBack: false, recoverySnapshotCreated: false, message: 'O processo desktop não confirmou o resultado da restauração.' };
    }

    if (typeof localStorage === 'undefined') {
      return { success: false, rolledBack: false, recoverySnapshotCreated: false, message: 'Armazenamento local indisponível.' };
    }

    const previousRaw = localStorage.getItem(STORAGE_KEY);
    if (previousRaw !== null) {
      try {
        const previousState = JSON.parse(previousRaw);
        if (previousState && typeof previousState === 'object' && Array.isArray(previousState.accounts) && Array.isArray(previousState.transactions)) {
          // The history catalog is best-effort; the recovery snapshot below remains mandatory.
          recordLocalBackup(previousState, 'Cópia automática antes da restauração');
        }
      } catch { /* The mandatory raw recovery snapshot below still protects the current bytes. */ }
    }
    const snapshot = JSON.stringify({
      format: 'orazao-pre-restore-snapshot',
      createdAt: new Date().toISOString(),
      existed: previousRaw !== null,
      raw: previousRaw
    });

    // If the old state cannot be backed up, abort before touching the live key.
    try {
      localStorage.setItem(PRE_RESTORE_BACKUP_KEY, snapshot);
    } catch {
      return { success: false, rolledBack: true, recoverySnapshotCreated: false, message: 'Não foi possível criar a cópia de segurança prévia. Os dados atuais foram mantidos; exporte um backup e libere espaço antes de tentar novamente.' };
    }

    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      if (localStorage.getItem(STORAGE_KEY) !== serialized) throw new Error('A gravação não pôde ser confirmada por leitura.');

      // A restauração passa a ser o novo estado confirmado. Sem atualizar o
      // last-known-good, uma corrupção futura poderia reverter o usuário ao
      // estado anterior à restauração.
      let recoverySnapshotUpdated = true;
      let recoveryWarning = '';
      try {
        const lastKnownGood = JSON.stringify({
          format: 'orazao-last-known-good-snapshot',
          createdAt: new Date().toISOString(),
          raw: serialized
        });
        localStorage.setItem(LAST_KNOWN_GOOD_KEY, lastKnownGood);
        if (localStorage.getItem(LAST_KNOWN_GOOD_KEY) !== lastKnownGood) {
          throw new Error('A cópia de recuperação não pôde ser confirmada por leitura.');
        }
      } catch (snapshotError) {
        recoverySnapshotUpdated = false;
        recoveryWarning = 'A restauração foi gravada, mas a cópia do último estado confirmado não foi atualizada. Exporte um backup e libere espaço no navegador.';
        console.warn(recoveryWarning, snapshotError);
        notifyStorageHealth(recoveryWarning);
      }
      if (recoverySnapshotUpdated) notifyStorageHealth();
      return {
        success: true,
        rolledBack: false,
        recoverySnapshotCreated: previousRaw !== null,
        recoverySnapshotUpdated,
        recoveryWarning,
        message: recoverySnapshotUpdated
          ? 'Restauração gravada; a cópia anterior foi preservada e o último estado confirmado foi atualizado.'
          : 'Restauração gravada e cópia anterior preservada, mas a cópia do último estado confirmado está desatualizada.'
      };
    } catch (error) {
      let rolledBack = false;
      try {
        if (previousRaw !== null) localStorage.setItem(STORAGE_KEY, previousRaw);
        else localStorage.removeItem(STORAGE_KEY);
        rolledBack = localStorage.getItem(STORAGE_KEY) === previousRaw;
      } catch {
        rolledBack = false;
      }
      return {
        success: false,
        rolledBack,
        recoverySnapshotCreated: true,
        message: rolledBack
          ? `A gravação da restauração falhou; os dados anteriores foram recuperados. ${error?.message || ''}`.trim()
          : 'A gravação falhou e a recuperação automática não pôde ser confirmada. A cópia prévia continua preservada, se o armazenamento permitir.'
      };
    }
  } catch (error) {
    return { success: false, rolledBack: false, recoverySnapshotCreated: false, message: error?.message || 'Falha inesperada ao restaurar o backup.' };
  }
}

export function getPreRestoreBackupKey() {
  return PRE_RESTORE_BACKUP_KEY;
}

export function getLastKnownGoodKey() {
  return LAST_KNOWN_GOOD_KEY;
}
