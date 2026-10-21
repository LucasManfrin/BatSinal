import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpotStatusBadge } from '../components/ui';
import type { StatusVaga } from '../types';

describe('status não depende só da cor', () => {
  it.each<[StatusVaga, string]>([
    ['LIVRE', 'Livre'],
    ['OCUPADA', 'Ocupada'],
    ['SEM_SINAL', 'Sem sinal'],
  ])('representa %s com texto e ícone', (status, label) => {
    const { container } = render(<SpotStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(`status-${status.toLowerCase()}`);
  });
});
