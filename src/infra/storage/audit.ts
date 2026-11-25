// Trilha de auditoria encadeada por hash (Volume 05, seção 5.2; BKP-005; T-10).
// Cada evento leva o hash do anterior. Alterar, apagar, reordenar ou devolver uma versão antiga quebra a corrente.
// Isso detecta corrupção e adulteração por quem não tem a senha; não é prova contra quem tem a senha.
import type { AuditEvent } from './schema';

export const GENESIS = '0'.repeat(64);

export type AuditInput = Omit<AuditEvent, 'seq' | 'prev' | 'hash'>;

async function sha256Hex(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Texto canônico do evento: campos sempre na mesma ordem, para o hash ser estável. */
function canonical(e: Omit<AuditEvent, 'hash'>): string {
  return JSON.stringify([
    'razao-audit-v1',
    e.seq,
    e.prev,
    e.at,
    e.action,
    e.workspaceId,
    e.operationId ?? null,
    e.target,
    e.before ?? null,
    e.after ?? null,
    e.reason ?? null,
  ]);
}

/** Encadeia um evento novo depois do último. */
export async function chainEvent(
  input: AuditInput,
  last: { seq: number; hash: string } | null,
): Promise<AuditEvent> {
  const base = { ...input, seq: last ? last.seq + 1 : 0, prev: last ? last.hash : GENESIS };
  return { ...base, hash: await sha256Hex(canonical(base)) };
}

export type ChainCheck = { ok: true; count: number } | { ok: false; brokenAt: number; reason: string };

/** Confere a corrente inteira, em ordem. */
export async function verifyChain(events: readonly AuditEvent[]): Promise<ChainCheck> {
  let prev = GENESIS;
  for (let i = 0; i < events.length; i++) {
    const e = events[i] as AuditEvent;
    if (e.seq !== i) return { ok: false, brokenAt: i, reason: 'sequência fora de ordem ou com buraco' };
    if (e.prev !== prev) return { ok: false, brokenAt: i, reason: 'não aponta para o evento anterior' };
    const { hash, ...resto } = e;
    if ((await sha256Hex(canonical(resto))) !== hash) {
      return { ok: false, brokenAt: i, reason: 'conteúdo alterado' };
    }
    prev = hash;
  }
  return { ok: true, count: events.length };
}
