// Barra lateral do computador: as 5 áreas em sanfona, com as sub-abas abaixo da área ativa (Volume 08, seção 4).
import type { ReactNode } from 'react';
import type { WorkspaceKind } from '@/application/model';
import { Button } from '../components/ds';
import { Icon } from '../components/Icon';
import type { Route } from './nav';
import { AREAS, CONFIG } from './nav';

export function SideNav(p: {
  kind: WorkspaceKind;
  route: Route;
  seletor: ReactNode;
  navigate: (r: Route) => void;
  onLock: () => void;
}) {
  const { kind, route, navigate } = p;
  return (
    <aside className="rz-side" aria-label="Navegação principal">
      <div className="rz-brand">
        <img src="/favicon.png" alt="" width={28} height={28} />O Razão
      </div>
      {p.seletor}
      <nav className="rz-nav">
        {AREAS.map((a) => {
          const aberta = a.id === route.area;
          return (
            <div key={a.id}>
              <button
                type="button"
                className="rz-nav-item"
                aria-expanded={aberta}
                onClick={() => {
                  if (!aberta) navigate({ area: a.id, sub: a.subs(kind)[0]?.id ?? '' });
                }}
              >
                <Icon name={a.icon} />
                {a.label}
                <span className="rz-nav-chev">
                  <Icon name="chevron" size={16} />
                </span>
              </button>
              <div className="rz-nav-subs" data-open={aberta}>
                <div>
                  {a.subs(kind).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="rz-nav-sub"
                      tabIndex={aberta ? 0 : -1}
                      aria-current={aberta && s.id === route.sub ? 'page' : undefined}
                      onClick={() => {
                        navigate({ area: a.id, sub: s.id });
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      <div className="rz-side-foot">
        <Button
          variant="ghost"
          icon="sliders"
          block
          aria-current={route.area === 'config' ? 'page' : undefined}
          onClick={() => {
            navigate(CONFIG);
          }}
        >
          Espaços
        </Button>
        <Button variant="ghost" icon="lock" block onClick={p.onLock}>
          Bloquear o cofre
        </Button>
      </div>
    </aside>
  );
}
