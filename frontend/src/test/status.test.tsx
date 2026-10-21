import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field, Select, SpotStatusBadge } from '../components/ui';
import type { StatusVaga } from '../types';

describe('status não depende só da cor', () => {
  it('nomeia selects apenas com o label, sem misturar os textos das opções', () => {
    render(
      <Field label="Vaga vinculada">
        <Select>
          <option>Não vincular agora</option>
          <option>Estacionamento · A1</option>
        </Select>
      </Field>,
    );
    expect(screen.getByRole('combobox', { name: 'Vaga vinculada' })).toBeInTheDocument();
  });
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
