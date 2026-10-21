import { useId, type ButtonHTMLAttributes } from 'react';
import { Check, WifiOff } from 'lucide-react';
import type { Vaga, StatusVaga } from '../../types';
import { campusStatus } from '../../lib/campus';
export function VagaTile({
  vaga,
  status,
  compact = false,
  selected = false,
  ...props
}: {
  vaga: Pick<Vaga, 'rotulo' | 'tipo'>;
  status: StatusVaga;
  compact?: boolean;
  selected?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const hatch = useId().replace(/:/g, '');
  return (
    <button
      type="button"
      {...props}
      data-tipo={vaga.tipo}
      className={`vaga-tile ${compact ? 'tile-label' : ''} tile-${status.toLowerCase()} ${selected ? 'tile-selected' : ''} ${props.className ?? ''}`}
      aria-label={props['aria-label'] ?? `Vaga ${vaga.rotulo}, ${campusStatus[status]}`}
    >
      {status === 'SEM_SINAL' && (
        <svg className="tile-hatch" aria-hidden="true" width="100%" height="100%">
          <defs>
            <pattern id={hatch} width="7" height="7" patternUnits="userSpaceOnUse">
              <path d="M0 7L7 0" stroke="currentColor" opacity=".2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${hatch})`} />
        </svg>
      )}
      <strong>{vaga.rotulo}</strong>
      <span>
        {status === 'LIVRE' ? (
          <Check size={13} />
        ) : status === 'SEM_SINAL' ? (
          <WifiOff size={13} />
        ) : null}
        {vaga.tipo === 'COMUM' ? '' : vaga.tipo}
      </span>
    </button>
  );
}
