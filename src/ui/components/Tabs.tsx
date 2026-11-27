// Abas e seletor de espaço com indicador que desliza até o item escolhido (Volume 08, seção 3).
// A posição do indicador é medida e aplicada direto no elemento, sem novo render.
import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/** Posiciona o indicador sobre o item escolhido. Recebe os elementos já resolvidos. */
function posicionar(box: HTMLElement | null, ink: HTMLElement | null, selector: string): void {
  const alvo = box?.querySelector<HTMLElement>(selector);
  if (!alvo || !ink) return;
  ink.style.width = `${String(alvo.offsetWidth)}px`;
  ink.style.transform = `translateX(${String(alvo.offsetLeft)}px)`;
  ink.style.opacity = '1';
}

/** Mede de novo quando a fonte termina de carregar ou a janela muda de tamanho. */
function useRemedir(medir: () => void, key: string): void {
  useLayoutEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    void document.fonts.ready.then(medir);
    return () => {
      window.removeEventListener('resize', medir);
    };
  }, [medir, key]);
}

export interface TabItem {
  readonly id: string;
  readonly label: string;
}

/** Faixa de sub-abas. Setas esquerda e direita trocam de aba (padrão WAI-ARIA). */
export function Tabs({
  items,
  value,
  onChange,
  label,
}: {
  items: readonly TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLSpanElement>(null);
  const medir = useCallback(() => {
    posicionar(box.current, ink.current, '[aria-selected="true"]');
  }, []);
  useRemedir(medir, value);
  const teclado = (e: KeyboardEvent) => {
    const i = items.findIndex((t) => t.id === value);
    const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const prox = items[(i + passo + items.length) % items.length];
    if (prox) {
      onChange(prox.id);
      box.current?.querySelector<HTMLElement>(`[data-tab="${prox.id}"]`)?.focus();
    }
  };
  return (
    <div ref={box} className="rz-tabs" role="tablist" aria-label={label} onKeyDown={teclado}>
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          data-tab={t.id}
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          className="rz-tab"
          onClick={() => {
            onChange(t.id);
          }}
        >
          {t.label}
        </button>
      ))}
      <span ref={ink} className="rz-tab-ink" aria-hidden="true" style={{ opacity: 0 }} />
    </div>
  );
}

export interface SwitchOption {
  readonly id: string;
  readonly label: string;
  readonly tone: 'pf' | 'pj';
}

/** COF-005: seletor PF/PJ. Troca o espaço inteiro; o ativo fica sempre visível. */
export function WorkspaceSwitch({
  options,
  value,
  onChange,
}: {
  options: readonly SwitchOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const medir = useCallback(() => {
    posicionar(box.current, thumb.current, '[aria-pressed="true"]');
  }, []);
  useRemedir(medir, value);
  // Sem salto na primeira medida: a transição só liga depois.
  useEffect(() => {
    thumb.current?.classList.add('rz-seg-ready');
  }, []);
  // Com espaços restaurados ou importados (D-054), a lista não cabe em botões: vira uma escolha compacta.
  if (options.length > 2) {
    const ativo = options.find((o) => o.id === value);
    return (
      <span className="rz-ws-select-wrap">
        <span className={`rz-dot rz-dot-${ativo?.tone ?? 'pf'}`} aria-hidden="true" />
        <select
          className="rz-ws-select"
          aria-label="Espaço"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    );
  }
  return (
    <div ref={box} className="rz-seg rz-seg-sliding" role="group" aria-label="Espaço">
      <span ref={thumb} className="rz-seg-thumb" aria-hidden="true" style={{ opacity: 0 }} />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="rz-seg-btn"
          aria-pressed={o.id === value}
          onClick={() => {
            if (o.id !== value) onChange(o.id);
          }}
        >
          <span className={`rz-dot rz-dot-${o.tone}`} aria-hidden="true" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
