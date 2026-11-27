// Painel lateral (computador) e tela própria (celular) do design system, com <dialog> nativo:
// o navegador prende o foco, fecha com Esc e devolve o foco a quem abriu (Volume 08, seção 5).
import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { Icon } from './Icon';

export function Sheet({
  title,
  onClose,
  children,
  bottom,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** No celular sobe de baixo e ocupa só o que precisa (detalhe do lançamento, D-050). */
  bottom?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialogo = ref.current;
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialogo && !dialogo.open) {
      dialogo.showModal();
      // O navegador põe o foco no primeiro botão (Fechar); num formulário, o foco vai para o primeiro campo.
      dialogo.querySelector<HTMLElement>('.rz-sheet-body :is(input, select, textarea)')?.focus();
    }
    return () => {
      dialogo?.close();
      antes?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={bottom ? 'rz-sheet rz-sheet-bottom' : 'rz-sheet'}
      aria-labelledby={id}
      onCancel={(e) => {
        // O seletor de arquivo fechado sem escolha também dispara "cancel", e ele sobe até aqui; só o Esc
        // do próprio painel fecha o painel.
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onClose();
      }}
    >
      <div className="rz-sheet-head">
        <h2 id={id} className="rz-sheet-title">
          {title}
        </h2>
        <button type="button" className="rz-input-btn rz-sheet-close" aria-label="Fechar" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="rz-sheet-body">{children}</div>
    </dialog>
  );
}

/** Aviso curto depois de gravar de verdade (Volume 02, 7.3). Some sozinho; leitor de tela anuncia. */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, 4000);
    return () => {
      window.clearTimeout(t);
    };
  }, [message, onDone]);
  return (
    <div className="rz-toast-area" role="status" aria-live="polite">
      {message ? (
        <div className="rz-toast">
          <Icon name="check" size={18} />
          {message}
        </div>
      ) : null}
    </div>
  );
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

/** Lista de escolha nativa: funciona com teclado, leitor de tela e no celular sem código extra. */
export function SelectField(p: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly SelectOption[];
  error?: string | undefined;
}) {
  const id = useId();
  return (
    <div className={p.error ? 'rz-field rz-field-error' : 'rz-field'}>
      <label className="rz-label" htmlFor={id}>
        {p.label}
      </label>
      <select
        id={id}
        className="rz-input rz-select"
        value={p.value}
        aria-invalid={p.error ? 'true' : undefined}
        aria-describedby={p.error ? `${id}-erro` : undefined}
        onChange={(e) => {
          p.onChange(e.target.value);
        }}
      >
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {p.error ? (
        <span id={`${id}-erro`} className="rz-help" role="alert">
          {p.error}
        </span>
      ) : null}
    </div>
  );
}

/** Data com o seletor nativo do navegador; o valor é aaaa-mm-dd e a tela mostra no formato local. */
export function DateField(p: {
  label: string;
  value: string;
  max?: string;
  onChange: (v: string) => void;
  error?: string | undefined;
}) {
  const id = useId();
  return (
    <div className={p.error ? 'rz-field rz-field-error' : 'rz-field'}>
      <label className="rz-label" htmlFor={id}>
        {p.label}
      </label>
      <input
        id={id}
        type="date"
        className="rz-input"
        value={p.value}
        max={p.max}
        aria-invalid={p.error ? 'true' : undefined}
        onChange={(e) => {
          p.onChange(e.target.value);
        }}
      />
      {p.error ? (
        <span className="rz-help" role="alert">
          {p.error}
        </span>
      ) : null}
    </div>
  );
}
