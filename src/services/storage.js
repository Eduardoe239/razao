/**
 * SERVIÇO DE ARMAZENAMENTO MULTIPLATAFORMA (DESKTOP .EXE + WEB)
 * Suporta armazenamento nativo seguro em userData no Windows/Mac/Linux e localStorage na Web.
 */

const STORAGE_KEY = 'razao_app_state_v3';

export function loadState() {
  try {
    // 1. Tenta carregar do ambiente Desktop via Electron IPC (.exe)
    if (typeof window !== 'undefined' && window.electronAPI?.loadState) {
      window.electronAPI.loadState().then(desktopData => {
        if (desktopData) return desktopData;
      }).catch(err => console.warn('Aviso no armazenamento nativo Desktop:', err));
    }

    // 2. Fallback para localStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao carregar estado do armazenamento:', err);
    return null;
  }
}

export function saveState(state) {
  try {
    // 1. Salva no localStorage Web
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // 2. Salva no arquivo de dados do Desktop (.exe) se disponível
    if (typeof window !== 'undefined' && window.electronAPI?.saveState) {
      window.electronAPI.saveState(state).catch(err => {
        console.warn('Erro ao persisitir no arquivo nativo Desktop:', err);
      });
    }

    return true;
  } catch (err) {
    console.error('Erro ao salvar estado:', err);
    return false;
  }
}
