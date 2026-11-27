// Gravações da Razão IA nível 1: dispensar um alerta (IA-006). O dispensado fica cifrado no cofre, no espaço.
import type { OpsContext } from './account-ops';
import { alreadyDone, writable } from './account-ops';
import { ENTITY, alertDismissalSchema } from './model';
import type { WorkspaceSnapshot } from './ports';

/** O id do item é derivado do id do alerta, então dispensar de novo só regrava o mesmo item. */
const itemId = (alertId: string) => `alerta:${alertId}`.slice(0, 200);

export function dismissedAlerts(snap: WorkspaceSnapshot): Set<string> {
  const ids = new Set<string>();
  for (const i of snap.items) {
    if (i.type !== ENTITY.alertDismissal) continue;
    const r = alertDismissalSchema.safeParse(i.data);
    if (r.success) ids.add(r.data.id);
  }
  return ids;
}

export async function dismissAlert(
  c: OpsContext,
  workspaceId: string,
  input: { alertId: string; operationId: string },
): Promise<'gravada' | 'repetida'> {
  writable(c.port);
  if (await alreadyDone(c, workspaceId, input.operationId)) return 'repetida';
  return c.port.commit(workspaceId, {
    operationId: input.operationId,
    entries: [],
    items: [
      {
        type: ENTITY.alertDismissal,
        id: itemId(input.alertId),
        data: { id: input.alertId, at: c.clock.nowIso() },
      },
    ],
    audit: { action: 'ia.dispensar-alerta', target: `alert/${input.alertId.split(':')[0] ?? ''}` },
  });
}
