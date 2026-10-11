/**
 * ALTIX shared visual primitives.
 * Presentation-only. No business logic, no queries, no handlers.
 * All interactive contracts are passed through via props.
 */
import React from 'react';
import { Loader2, RefreshCw, Search, X } from 'lucide-react';

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-[--altix-primary] text-white shadow-[0_1px_3px_rgb(37_99_235/0.28)] hover:bg-[--altix-primary-strong] hover:shadow-[0_2px_6px_rgb(37_99_235/0.34)]',
  secondary:
    'border border-[--altix-border-strong] bg-[--altix-surface] text-[--altix-text-secondary] hover:border-[#93c5fd] hover:bg-[--altix-primary-light] hover:text-[--altix-primary-text]',
  ghost:
    'text-[--altix-text-secondary] hover:bg-gray-100 hover:text-[--altix-text-primary]',
  danger:
    'bg-[--altix-danger] text-white hover:bg-red-700',
  success:
    'bg-[--altix-success] text-white hover:bg-green-700',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-md px-3 text-xs',
  md: 'h-10 rounded-[--altix-radius-sm] px-4 text-sm',
  lg: 'h-11 rounded-[--altix-radius-sm] px-5 text-sm',
};

export const Btn = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
  }
>(({ variant = 'secondary', size = 'md', loading, children, className = '', disabled, ...rest }, ref) => (
  <button
    ref={ref}
    className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    disabled={loading || disabled}
    {...rest}
  >
    {loading && <Loader2 size={14} className="animate-spin" />}
    {children}
  </button>
));
Btn.displayName = 'Btn';

// ─── Input ────────────────────────────────────────────────────────────────────

const inputBase =
  'w-full min-h-[2.5rem] rounded-[--altix-radius-xs] border border-[--altix-border-strong] bg-[--altix-surface] px-3 py-2 text-sm text-[--altix-text-primary] outline-none placeholder:text-[--altix-text-xmuted] transition-[border-color,box-shadow] duration-150 focus:border-[--altix-primary] focus:shadow-[0_0_0_3px_rgb(37_99_235/0.12)] disabled:bg-gray-50 disabled:opacity-60';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
>(({ className = '', ...rest }, ref) => (
  <input ref={ref} className={`${inputBase} ${className}`} {...rest} />
));
Input.displayName = 'Input';

// ─── Select ───────────────────────────────────────────────────────────────────

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }
>(({ className = '', ...rest }, ref) => (
  <select
    ref={ref}
    className={`${inputBase} cursor-pointer appearance-none pr-8 ${className}`}
    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.625rem center' }}
    {...rest}
  />
));
Select.displayName = 'Select';

// ─── Textarea ─────────────────────────────────────────────────────────────────

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>(({ className = '', ...rest }, ref) => (
  <textarea
    ref={ref}
    className={`${inputBase} resize-y ${className}`}
    {...rest}
  />
));
Textarea.displayName = 'Textarea';

// ─── Field ────────────────────────────────────────────────────────────────────

export const Field: React.FC<{ label: string; hint?: string; required?: boolean; children: React.ReactNode }> = ({
  label,
  hint,
  required,
  children,
}) => (
  <label className="block space-y-1.5">
    <span className="flex items-center gap-1 text-xs font-semibold text-[--altix-text-secondary]">
      {label}
      {required && <span className="text-[--altix-danger]">*</span>}
    </span>
    {children}
    {hint && <span className="block text-xs text-[--altix-text-muted]">{hint}</span>}
  </label>
);

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'blue';

const badgeStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: 'var(--altix-success-bg)', text: 'var(--altix-success)' },
  warning: { bg: 'var(--altix-warning-bg)', text: 'var(--altix-warning)' },
  danger:  { bg: 'var(--altix-danger-bg)',  text: 'var(--altix-danger)'  },
  info:    { bg: 'var(--altix-info-bg)',    text: 'var(--altix-info)'    },
  neutral: { bg: '#f3f4f6', text: '#374151' },
  blue:    { bg: '#eff6ff', text: '#1e40af' },
};

export const Badge: React.FC<{ variant?: BadgeVariant; children: React.ReactNode; className?: string }> = ({
  variant = 'neutral',
  children,
  className = '',
}) => {
  const { bg, text } = badgeStyles[variant];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold leading-5 tracking-wide ${className}`}
      style={{ background: bg, color: text }}
    >
      {children}
    </span>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────

export const Card: React.FC<{ children: React.ReactNode; className?: string; padding?: boolean }> = ({
  children,
  className = '',
  padding = true,
}) => (
  <div
    className={`rounded-[--altix-radius-md] border border-[--altix-border] bg-[--altix-surface] shadow-[--altix-shadow-sm] ${padding ? 'p-5' : ''} ${className}`}
  >
    {children}
  </div>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiColor = 'blue' | 'green' | 'amber' | 'red' | 'neutral';
const kpiAccent: Record<KpiColor, string> = {
  blue:    'var(--altix-primary)',
  green:   'var(--altix-accent)',
  amber:   '#f59e0b',
  red:     'var(--altix-danger)',
  neutral: 'var(--altix-border-strong)',
};

export const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color?: KpiColor;
  className?: string;
}> = ({ label, value, sub, color = 'neutral', className = '' }) => (
  <div
    className={`relative overflow-hidden rounded-[--altix-radius-md] border border-[--altix-border] bg-[--altix-surface] p-5 shadow-[--altix-shadow-sm] ${className}`}
  >
    <span
      className="absolute inset-y-0 left-0 w-[3px] rounded-r"
      style={{ background: kpiAccent[color] }}
    />
    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[--altix-text-muted]">{label}</p>
    <p className="mt-2 text-2xl font-bold tracking-tight text-[--altix-text-primary]">{value}</p>
    {sub && <p className="mt-1 text-xs text-[--altix-text-muted]">{sub}</p>}
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────

export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ title, onClose, children, maxWidth = 'max-w-lg' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgb(15 23 42 / 0.35)' }}>
    <div
      className={`w-full ${maxWidth} overflow-hidden rounded-[--altix-radius-lg] border border-[--altix-border] bg-[--altix-surface] shadow-[--altix-shadow-lg]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[--altix-border] px-5 py-4">
        <h2 className="text-base font-semibold text-[--altix-text-primary]">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[--altix-text-muted] transition-colors hover:bg-gray-100 hover:text-[--altix-text-primary]"
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
      {/* Body */}
      <div className="max-h-[80vh] overflow-y-auto px-5 py-5">{children}</div>
    </div>
  </div>
);

// ─── PageHeader ───────────────────────────────────────────────────────────────

export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, onRefresh, actions }) => (
  <header className="flex flex-col gap-4 border-b border-[--altix-border] pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow && (
        <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-[--altix-text-muted]">
          {eyebrow}
        </p>
      )}
      <h1 className="text-xl font-bold tracking-tight text-[--altix-text-primary] sm:text-2xl">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-[--altix-text-muted]">{description}</p>}
    </div>
    {(onRefresh || actions) && (
      <div className="flex flex-shrink-0 items-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Actualizar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[--altix-border] text-[--altix-text-muted] transition-colors hover:border-[--altix-border-strong] hover:bg-gray-50 hover:text-[--altix-text-primary]"
          >
            <RefreshCw size={15} />
          </button>
        )}
        {actions}
      </div>
    )}
  </header>
);

// ─── Table shell ──────────────────────────────────────────────────────────────

export const TableWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`overflow-x-auto rounded-[--altix-radius-md] border border-[--altix-border] bg-[--altix-surface] shadow-[--altix-shadow-xs] ${className}`}
  >
    {children}
  </div>
);

export const Table: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <table className={`w-full text-left text-sm ${className}`}>{children}</table>
);

export const Thead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="border-b border-[--altix-border] bg-[--altix-surface-subtle]">{children}</thead>
);

export const Th: React.FC<{ children?: React.ReactNode; className?: string; align?: 'left' | 'right' | 'center' }> = ({
  children,
  className = '',
  align = 'left',
}) => (
  <th
    className={`px-4 py-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[--altix-text-muted] ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''} ${className}`}
  >
    {children}
  </th>
);

export const Tbody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-[--altix-border]">{children}</tbody>
);

export const Tr: React.FC<{ children: React.ReactNode; onClick?: () => void; highlight?: boolean; className?: string }> = ({
  children,
  onClick,
  highlight,
  className = '',
}) => (
  <tr
    onClick={onClick}
    className={`transition-colors ${onClick ? 'cursor-pointer' : ''} ${highlight ? 'bg-amber-50/40' : 'hover:bg-[--altix-surface-subtle]'} ${className}`}
  >
    {children}
  </tr>
);

export const Td: React.FC<{ children?: React.ReactNode; className?: string; align?: 'left' | 'right' | 'center' }> = ({
  children,
  className = '',
  align = 'left',
}) => (
  <td
    className={`px-4 py-3 text-[--altix-text-secondary] ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''} ${className}`}
  >
    {children}
  </td>
);

// ─── Empty / Loading / Error States ──────────────────────────────────────────

export const EmptyState: React.FC<{ message: string; icon?: React.ReactNode }> = ({ message, icon }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-[--altix-radius-md] border border-[--altix-border] bg-[--altix-surface] px-6 py-12 text-center">
    {icon && <span className="text-[--altix-text-muted]">{icon}</span>}
    <p className="text-sm text-[--altix-text-muted]">{message}</p>
  </div>
);

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Cargando...' }) => (
  <div className="flex items-center justify-center gap-3 rounded-[--altix-radius-md] border border-[--altix-border] bg-[--altix-surface] px-6 py-12 text-sm text-[--altix-text-muted]">
    <Loader2 size={18} className="animate-spin text-[--altix-primary]" />
    {message}
  </div>
);

export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div
    className="flex items-center justify-between gap-4 rounded-[--altix-radius-sm] border px-4 py-3 text-sm"
    style={{ borderColor: '#fecaca', background: 'var(--altix-danger-bg)', color: 'var(--altix-danger)' }}
  >
    <span>{message}</span>
    {onRetry && (
      <button type="button" onClick={onRetry} className="shrink-0 font-semibold underline underline-offset-2">
        Reintentar
      </button>
    )}
  </div>
);

export const SuccessBanner: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="rounded-[--altix-radius-sm] border px-4 py-3 text-sm"
    style={{ borderColor: '#bbf7d0', background: 'var(--altix-success-bg)', color: 'var(--altix-success)' }}
  >
    {message}
  </div>
);

// ─── InfoBox ──────────────────────────────────────────────────────────────────

export const InfoBox: React.FC<{ children: React.ReactNode; variant?: 'blue' | 'amber' | 'neutral' }> = ({
  children,
  variant = 'blue',
}) => {
  const styles = {
    blue:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    amber:   { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    neutral: { bg: 'var(--altix-surface-subtle)', border: 'var(--altix-border)', text: 'var(--altix-text-secondary)' },
  };
  const s = styles[variant];
  return (
    <div
      className="rounded-[--altix-radius-sm] border p-3 text-sm leading-relaxed"
      style={{ background: s.bg, borderColor: s.border, color: s.text }}
    >
      {children}
    </div>
  );
};

// ─── SearchBar ────────────────────────────────────────────────────────────────

export const SearchBar: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { containerClass?: string }
> = ({ containerClass = '', ...rest }) => (
  <div className={`relative ${containerClass}`}>
    <Search
      size={15}
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--altix-text-muted]"
    />
    <input
      className="h-10 w-full rounded-[--altix-radius-xs] border border-[--altix-border-strong] bg-[--altix-surface] py-2 pl-9 pr-3 text-sm text-[--altix-text-primary] outline-none placeholder:text-[--altix-text-xmuted] transition-[border-color,box-shadow] duration-150 focus:border-[--altix-primary] focus:shadow-[0_0_0_3px_rgb(37_99_235/0.12)]"
      {...rest}
    />
  </div>
);

// ─── FilterBar ────────────────────────────────────────────────────────────────

export const FilterBar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`flex flex-wrap items-center gap-2 rounded-[--altix-radius-md] border border-[--altix-border] bg-[--altix-surface] px-4 py-3 ${className}`}
  >
    {children}
  </div>
);

// ─── Divider ──────────────────────────────────────────────────────────────────

export const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <hr className={`border-[--altix-border] ${className}`} />
);
