// Conversões de bytes usadas pelo cofre. Sem dependências externas.

export function utf8(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

export function fromUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function toBase64(bytes: Uint8Array): string {
  // Em blocos, para um comprovante de 5 MB não virar 5 milhões de concatenações.
  const partes: string[] = [];
  for (let i = 0; i < bytes.length; i += 0x8000)
    partes.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
  return btoa(partes.join(''));
}

export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** Apaga um buffer com segredo assim que ele não for mais necessário. */
export function wipe(bytes: Uint8Array): void {
  bytes.fill(0);
}

/** Caractere do alfabeto base64 (sem o "="). */
function base64Char(c: number): boolean {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 43 || c === 47;
}

/**
 * Base64 conferido antes de decodificar; texto inválido vira null, nunca exceção genérica.
 * A conferência é um laço simples: uma expressão regular estourava a pilha do Chrome com textos de
 * vários megabytes, como o conteúdo de um backup (achado na medição da I-08).
 */
export function fromBase64Strict(text: string): Uint8Array<ArrayBuffer> | null {
  if (text.length % 4 !== 0) return null;
  let fim = text.length;
  if (text.endsWith('==')) fim -= 2;
  else if (text.endsWith('=')) fim -= 1;
  for (let i = 0; i < fim; i++) if (!base64Char(text.charCodeAt(i))) return null;
  return fromBase64(text);
}
