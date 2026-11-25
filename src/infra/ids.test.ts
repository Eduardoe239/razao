import { describe, expect, it } from 'vitest';
import { uuidv7 } from './ids';

describe('identificadores', () => {
  it('[COF-004] UUID v7 com versão, variante e ordem no tempo', () => {
    const a = uuidv7(Date.UTC(2027, 2, 10), new Uint8Array(10).fill(255));
    const b = uuidv7(Date.UTC(2027, 2, 10) + 1, new Uint8Array(10));
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(b).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
    expect(uuidv7(1)).not.toBe(uuidv7(1));
  });

  it('[COF-004] recusa instante inválido e aleatoriedade curta', () => {
    expect(() => uuidv7(-1)).toThrow();
    expect(() => uuidv7(1, new Uint8Array(4))).toThrow();
  });
});
