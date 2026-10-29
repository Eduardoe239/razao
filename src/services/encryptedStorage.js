/**
 * API legada desativada. A antiga implementação derivava uma chave de um
 * segredo fixo embutido no bundle e fazia fallback para texto puro, portanto
 * não oferecia proteção real. O desktop agora usa safeStorage no processo main.
 * A Web usa localStorage e não deve anunciar criptografia em repouso.
 */
export async function saveStateEncrypted() {
  console.warn('saveStateEncrypted foi desativado: a implementação legada não era segura.');
  return false;
}

export async function loadStateEncrypted() {
  console.warn('loadStateEncrypted foi desativado: não é possível confiar na proteção legada.');
  return null;
}
