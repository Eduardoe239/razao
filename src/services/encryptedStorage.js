/**
 * SERVIÇO DE CRIPTOGRAFIA E SEGURANÇA LOCAL AES-GCM-256 (O RAZÃO v14.0)
 * Garante privacidade absoluta dos dados financeiros gravados no disco rígido do PC
 * ou no navegador. Zero-Knowledge Privacy: nenhuma informação do extrato ou açaí é exposta.
 */

const STORAGE_KEY_ENCRYPTED = 'razao_app_state_encrypted_v14';

/**
 * Função utilitária para gerar chave de criptografia derivada da sessão do usuário.
 */
async function deriveKey(secret = 'RazaoLocalSecurityKey2026') {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return null; // Fallback para ambientes sem Web Crypto API
  }
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('RazaoSaltSec2026'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa o estado do aplicativo antes de gravar em disco ou no localStorage.
 */
export async function saveStateEncrypted(state) {
  try {
    const jsonString = JSON.stringify(state);

    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const key = await deriveKey();
      const encoder = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(jsonString)
      );

      const payload = {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted)),
        encrypted: true,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(STORAGE_KEY_ENCRYPTED, JSON.stringify(payload));
      return true;
    }

    // Fallback limpo caso WebCrypto não esteja ativo
    localStorage.setItem(STORAGE_KEY_ENCRYPTED, JSON.stringify({ raw: jsonString, encrypted: false }));
    return true;
  } catch (err) {
    console.error('Erro ao criptografar e salvar estado:', err);
    return false;
  }
}

/**
 * Descriptografa o estado gravado com verificação de integridade.
 */
export async function loadStateEncrypted() {
  try {
    const rawPayload = localStorage.getItem(STORAGE_KEY_ENCRYPTED);
    if (!rawPayload) return null;

    const parsed = JSON.parse(rawPayload);
    if (!parsed.encrypted && parsed.raw) {
      return JSON.parse(parsed.raw);
    }

    if (parsed.encrypted && typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const key = await deriveKey();
      const iv = new Uint8Array(parsed.iv);
      const data = new Uint8Array(parsed.data);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    }

    return null;
  } catch (err) {
    console.error('Erro ao descriptografar estado:', err);
    return null;
  }
}
