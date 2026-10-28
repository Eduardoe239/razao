/**
 * MÓDULO DE IDENTIFICADORES ÚNICOS (O RAZÃO 3.0)
 * Utiliza crypto.randomUUID() garantindo padrão RFC 4122.
 */

export function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}
