// BKP-007: verificação de integridade sob demanda. Mostra o que foi conferido em cada espaço e, quando
// algo diverge, diz o que fazer. O app nunca corrige sozinho.
import { useState } from 'react';
import { messageFor } from '@/application/errors';
import type { IntegrityReport } from '@/application/integrity';
import type { VaultSession } from '@/application/session';
import { Alert, Button } from '../components/ds';
import { Icon } from '../components/Icon';
import { quando } from './BackupSheets';

export function IntegrityCard(p: { session: VaultSession; onChanged: (m: string) => void }) {
  const [rel, setRel] = useState<IntegrityReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  const verificar = async () => {
    setBusy(true);
    setErro(undefined);
    try {
      const r = await p.session.checkIntegrity();
      setRel(r);
      p.onChanged(
        r.ok
          ? 'Verificação concluída: tudo certo.'
          : 'A verificação achou divergência. Nada foi corrigido; veja o resultado.',
      );
    } catch (e) {
      setErro(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rz-card rz-section" aria-labelledby="integridade">
      <h2 id="integridade" className="rz-section-title">
        Verificação de integridade
      </h2>
      <p className="rz-ob-lead">
        Relê tudo o que está guardado, refaz os saldos do zero e confere a trilha de auditoria e os
        comprovantes. Se algo não bater, o app mostra e não mexe em nada.
      </p>
      {erro ? (
        <Alert tone="negative" title="Não deu para verificar">
          {erro}
        </Alert>
      ) : null}
      {rel && !rel.ok ? (
        <Alert tone="negative" title="Encontramos divergência">
          Nada foi corrigido. O cofre ficou só para leitura, para não gravar por cima. Restaure o backup mais
          recente{rel.safeMode ? ' ou volte a um ponto de volta, se houver' : ''}, e verifique de novo.
        </Alert>
      ) : null}
      {rel ? (
        <div className="rz-integrity" aria-live="polite">
          <p className="rz-integrity-when">Verificado {quando(rel.checkedAt)}</p>
          {rel.workspaces.map((w) => (
            <div key={w.workspaceId} className="rz-integrity-ws">
              <h3 className="rz-integrity-ws-title">{w.label}</h3>
              <ul className="rz-integrity-list" aria-label={`Resultado de ${w.label}`}>
                {w.items.map((i) => (
                  <li
                    key={i.id}
                    className={i.ok ? 'rz-integrity-item' : 'rz-integrity-item rz-integrity-bad'}
                  >
                    <span className="rz-integrity-mark" aria-hidden="true">
                      <Icon name={i.ok ? 'check' : 'alert'} size={16} />
                    </span>
                    <span>
                      <span className="rz-integrity-label">
                        {i.label}
                        <span className="rz-visually-hidden">{i.ok ? ': confere' : ': divergência'}</span>
                      </span>
                      <span className="rz-integrity-detail">{i.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
      <div>
        <Button icon="shield" busy={busy} onClick={() => void verificar()}>
          {rel ? 'Verificar de novo' : 'Verificar agora'}
        </Button>
      </div>
    </section>
  );
}
