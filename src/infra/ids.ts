// Identificadores UUID v7 (RFC 9562): 48 bits de tempo em ms e 74 bits aleatórios do crypto.getRandomValues.
// Ordenados no tempo, sem revelar nada além do instante de criação (Volume 05, seção 2).
export function uuidv7(
  nowMs: number,
  random: Uint8Array = crypto.getRandomValues(new Uint8Array(10)),
): string {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('Instante inválido para o UUID v7.');
  if (random.length < 10) throw new Error('São precisos 10 bytes aleatórios.');
  const b = new Uint8Array(16);
  let t = nowMs;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b.set(random.subarray(0, 10), 6);
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x70; // versão 7
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80; // variante RFC
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
