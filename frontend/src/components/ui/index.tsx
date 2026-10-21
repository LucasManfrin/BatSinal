import {
  forwardRef,
  cloneElement,
  isValidElement,
  useId,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cva } from 'class-variance-authority';
import { Car, Check, WifiOff, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StatusVaga } from '../../types';

const button = cva('btn', {
  variants: {
    variant: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
    },
  },
  defaultVariants: { variant: 'primary' },
});
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  }
>(({ className, variant, ...props }, ref) => (
  <button ref={ref} className={cn(button({ variant }), className)} {...props} />
));
Button.displayName = 'Button';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('input', className)} {...props} />
  ),
);
Input.displayName = 'Input';
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('input select', className)} {...props} />;
}
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const labelId = useId();
  const control =
    isValidElement<{ 'aria-labelledby'?: string }>(children) &&
    (children.type === Input || children.type === Select)
      ? cloneElement(children, { 'aria-labelledby': labelId })
      : children;
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {control}
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={cn('card', className)}>{children}</section>;
}
export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={cn('badge', className)}>{children}</span>;
}
export function LiveDot({ label = 'Atualizado recentemente' }: { label?: string }) {
  return (
    <span className="live">
      <span />
      {label}
    </span>
  );
}
export function UpdatedAt({ at }: { at: number | string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const elapsed = Math.max(
    1,
    Math.floor((now - (typeof at === 'string' ? Date.parse(at) : at)) / 1000),
  );
  return (
    <LiveDot
      label={
        Number.isFinite(elapsed)
          ? `Atualizado há ${elapsed < 60 ? `${elapsed} s` : `${Math.floor(elapsed / 60)} min`}`
          : 'Ainda sem leitura'
      }
    />
  );
}
export function OccupancyBar({ total, livres }: { total: number; livres: number }) {
  return (
    <div
      className="occupancy-bar"
      role="meter"
      aria-label="Vagas livres"
      aria-valuenow={livres}
      aria-valuemin={0}
      aria-valuemax={total || 1}
    >
      <span
        style={{
          width: `${total ? (livres / total) * 100 : 0}%`,
          background:
            livres === 0
              ? 'var(--ocupada)'
              : livres / total < 0.2
                ? 'var(--accent)'
                : 'var(--livre)',
        }}
      />
    </div>
  );
}
export const statusLabels: Record<StatusVaga, string> = {
  LIVRE: 'Livre',
  OCUPADA: 'Ocupada',
  SEM_SINAL: 'Sem sinal',
};
export function SpotStatusBadge({ status }: { status: StatusVaga }) {
  const Icon = status === 'LIVRE' ? Check : status === 'OCUPADA' ? Car : WifiOff;
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <Icon size={13} />
      {statusLabels[status]}
    </span>
  );
}
export function Legend() {
  return (
    <div className="legend">
      <SpotStatusBadge status="LIVRE" />
      <SpotStatusBadge status="OCUPADA" />
      <SpotStatusBadge status="SEM_SINAL" />
    </div>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-label="Carregando" role="status" />;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <Loader2 className="spin" size={22} /> Carregando dados…
    </div>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <EmptyState
      title="Não conseguimos carregar os dados"
      description="Confira sua conexão com a API e tente novamente."
    >
      <Button onClick={retry}>Tentar novamente</Button>
    </EmptyState>
  );
}
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  sheet = false,
  wide = false,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  sheet?: boolean;
  wide?: boolean;
  destructive?: boolean;
}) {
  const panel = useRef<HTMLElement>(null);
  const change = useRef(onOpenChange);
  change.current = onOpenChange;
  useEffect(() => {
    if (!open || destructive) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('input,button,select')?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') change.current(false);
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
      previous?.focus();
    };
  }, [open, destructive]);
  if (!destructive)
    return open ? (
      <aside ref={panel} className={`inline-panel ${wide ? 'panel-wide' : ''}`} aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Fechar" onClick={() => onOpenChange(false)}>
            <X size={20} />
          </button>
        </header>
        {description && <p>{description}</p>}
        {children}
      </aside>
    ) : null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content
          className={cn('modal-content', sheet && 'sheet-content', wide && 'modal-wide')}
        >
          <DialogPrimitive.Title className="modal-title">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className={description ? 'modal-description' : 'sr-only'}>
            {description ?? 'Preencha ou revise os dados abaixo.'}
          </DialogPrimitive.Description>
          <DialogPrimitive.Close className="modal-close" aria-label="Fechar">
            <X size={20} />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export const Sheet = (props: Omit<Parameters<typeof Dialog>[0], 'sheet'>) => (
  <Dialog {...props} sheet />
);
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="switch-label">
      <SwitchPrimitive.Root
        className="switch"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      >
        <SwitchPrimitive.Thumb className="switch-thumb" />
      </SwitchPrimitive.Root>
      <span>{label}</span>
    </label>
  );
}
export function Tooltip({ children, text }: { children: ReactNode; text: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="tooltip" sideOffset={6}>
            {text}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="tabs" role="group" aria-label="Modo de visualização">
      {options.map((option) => (
        <button
          key={option.value}
          aria-pressed={value === option.value}
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
