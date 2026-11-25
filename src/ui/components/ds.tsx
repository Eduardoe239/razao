// Componentes do design system em TypeScript (Volume 08, seção 5), com os nomes e estados do bundle aprovado.
// Dinheiro entra sempre em centavos inteiros e a formatação vem da aplicação.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useId, useState } from 'react';
import { formatBRL } from '@/application/format';
import type { IconName } from './Icon';
import { Icon } from './Icon';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm' | 'lg';
  icon?: IconName;
  /** Ação em andamento: o botão fica ocupado e não aceita outro clique. */
  busy?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  busy,
  block,
  className,
  children,
  disabled,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type === 'submit' ? 'submit' : 'button'}
      {...rest}
      disabled={disabled === true || busy === true}
      aria-busy={busy ? 'true' : undefined}
      className={cx(
        'rz-btn',
        `rz-btn-${variant}`,
        size === 'sm' && 'rz-btn-sm',
        size === 'lg' && 'rz-btn-lg',
        block && 'rz-btn-block',
        className,
      )}
    >
      {busy ? (
        <span className="rz-spinner" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={18} />
      ) : null}
      {children}
    </button>
  );
}

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password';
  help?: string | undefined;
  error?: string | undefined;
  money?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'decimal' | 'numeric';
  placeholder?: string;
  autoFocus?: boolean;
  maxLength?: number;
  name?: string;
  /** Conteúdo abaixo do campo e antes da ajuda (ex.: medidor de força). */
  below?: ReactNode;
}

export function TextField(p: TextFieldProps) {
  const id = useId();
  const helpId = `${id}-ajuda`;
  const [ver, setVer] = useState(false);
  const msg = p.error ?? p.help;
  const senha = p.type === 'password';
  return (
    <div className={cx('rz-field', p.error && 'rz-field-error')}>
      <label className="rz-label" htmlFor={id}>
        {p.label}
      </label>
      <div className="rz-input-wrap">
        <input
          id={id}
          name={p.name}
          className={cx('rz-input', p.money && 'rz-input-money', senha && 'rz-input-with-btn')}
          type={senha && !ver ? 'password' : 'text'}
          inputMode={p.money ? 'decimal' : p.inputMode}
          autoComplete={p.autoComplete ?? 'off'}
          autoCapitalize={senha ? 'none' : undefined}
          spellCheck={senha || p.money ? false : undefined}
          placeholder={p.placeholder ?? (p.money ? 'R$ 0,00' : undefined)}
          value={p.value}
          maxLength={p.maxLength}
          autoFocus={p.autoFocus}
          aria-invalid={p.error ? 'true' : undefined}
          aria-describedby={msg ? helpId : undefined}
          onChange={(e) => {
            p.onChange(e.target.value);
          }}
        />
        {senha ? (
          <button
            type="button"
            className="rz-input-btn"
            aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}
            aria-pressed={ver}
            onClick={() => {
              setVer(!ver);
            }}
          >
            <Icon name={ver ? 'eyeOff' : 'eye'} size={20} />
          </button>
        ) : null}
      </div>
      {p.below}
      {msg ? (
        <span id={helpId} className="rz-help" role={p.error ? 'alert' : undefined}>
          {msg}
        </span>
      ) : null}
    </div>
  );
}

export function MoneyField(p: Omit<TextFieldProps, 'money' | 'type'>) {
  return <TextField {...p} money />;
}

export function Amount({
  cents,
  kind,
  size,
}: {
  cents: number;
  kind?: 'in' | 'out' | 'balance';
  size?: 'md' | 'lg' | 'hero';
}) {
  const k = kind ?? (cents < 0 ? 'out' : 'in');
  const tom = k === 'in' ? 'rz-amount-in' : k === 'balance' && cents < 0 ? 'rz-amount-neg' : 'rz-amount-out';
  const texto =
    k === 'balance'
      ? formatBRL(cents)
      : formatBRL(k === 'in' ? Math.abs(cents) : -Math.abs(cents), { signed: k === 'in' });
  return (
    <span
      className={cx('rz-amount', tom, size === 'hero' && 'rz-amount-hero', size === 'lg' && 'rz-amount-lg')}
    >
      {texto}
    </span>
  );
}

export type BadgeTone = 'neutral' | 'pf' | 'pj' | 'positive' | 'negative' | 'warning';

export function Badge({ tone, children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cx('rz-badge', tone && tone !== 'neutral' && `rz-badge-${tone}`)}>{children}</span>;
}

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'positive' | 'warning' | 'negative';
  title?: string;
  children?: ReactNode;
}) {
  const icon: IconName = tone === 'positive' ? 'check' : tone === 'info' ? 'info' : 'alert';
  return (
    <div className={`rz-alert rz-alert-${tone}`} role={tone === 'negative' ? 'alert' : 'status'}>
      <Icon name={icon} />
      <div>
        {title ? <div className="rz-alert-title">{title}</div> : null}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rz-empty">
      <h2 className="rz-empty-title">{title}</h2>
      <p className="rz-empty-text">{text}</p>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  cents,
  hero,
  foot,
}: {
  label: string;
  cents: number;
  hero?: boolean;
  foot?: string;
}) {
  return (
    <div className="rz-card rz-stat">
      <span className="rz-stat-label">{label}</span>
      <Amount cents={cents} kind="balance" size={hero ? 'hero' : 'lg'} />
      {foot ? <span className="rz-stat-foot">{foot}</span> : null}
    </div>
  );
}

/** Cartão de escolha única (role="radio") usado no onboarding e em formulários curtos. */
export function ChoiceCard({
  checked,
  onSelect,
  title,
  text,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  text?: string;
}) {
  return (
    <button type="button" role="radio" aria-checked={checked} className="rz-choice" onClick={onSelect}>
      <span className="rz-radio" aria-hidden="true" />
      <span className="rz-choice-text">
        <span className="rz-choice-title">{title}</span>
        {text ? <span className="rz-choice-sub">{text}</span> : null}
      </span>
    </button>
  );
}

export function CheckCard({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className="rz-choice rz-check-card"
      onClick={onToggle}
    >
      <span className="rz-checkbox" aria-hidden="true">
        <Icon name="check" size={14} />
      </span>
      <span className="rz-choice-title">{children}</span>
    </button>
  );
}

/** Medidor de força: 4 barras, só visual; o texto vai na ajuda do campo. */
export function StrengthMeter({ score }: { score: number }) {
  const cor = score >= 3 ? 'var(--positive)' : score === 2 ? 'var(--warning)' : 'var(--negative)';
  return (
    <div className="rz-meter" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} style={{ background: i <= score ? cor : 'var(--surface-subtle)' }} />
      ))}
    </div>
  );
}
