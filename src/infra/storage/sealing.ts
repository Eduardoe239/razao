// Ponte entre o armazenamento e a cifra: sela e abre registros com o contexto certo, e valida o que volta.
import type { z } from 'zod';
import { openJson, sealJson } from '../crypto/records';
import type { RecordContext } from '../crypto/records';
import { StorageError } from './errors';
import type { SealedValue } from './db';

export async function seal(dek: CryptoKey, ctx: RecordContext, value: unknown): Promise<SealedValue> {
  return sealJson(dek, ctx, value);
}

/** Abre e valida. Falha de cifra ou de esquema lança erro; quem chama decide pela quarentena. */
export async function openValid<T>(
  dek: CryptoKey,
  ctx: RecordContext,
  sealed: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  const s = sealed as SealedValue | null;
  if (!s || typeof s.iv !== 'string' || typeof s.ct !== 'string') {
    throw new StorageError('NOT_FOUND', 'Registro sem conteúdo cifrado.');
  }
  const valor = await openJson(dek, ctx, s);
  const r = schema.safeParse(valor);
  if (!r.success) {
    throw new StorageError(
      'NOT_FOUND',
      `Registro fora do formato esperado: ${r.error.issues[0]?.message ?? ''}`,
    );
  }
  return r.data;
}

export async function digest(sealed: SealedValue): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sealed.ct));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function monthOf(dateOrIso: string): string {
  return dateOrIso.slice(0, 7);
}
