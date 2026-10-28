/**
 * SERVIÇO DE ARMAZENAMENTO E PERSISTÊNCIA (O RAZÃO 3.0)
 * Gerencia persistência local com tratamento de falhas e fallback limpo.
 */

const STORAGE_KEY = 'razao_app_state_v3';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao carregar estado do localStorage:', err);
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Erro ao salvar estado no localStorage:', err);
    return false;
  }
}
