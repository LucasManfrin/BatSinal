import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { handlers } from '../mocks/handlers';
import { createSeed, store } from '../mocks/seed';
import { TOKEN_KEY } from '../lib/api';
import { ProfilePage } from '../pages/perfil/ProfilePage';
import { LotsPage } from '../pages/estacionamentos/LotsPage';
import { readPreferences, recordVisit } from '../features/profile/preferences';

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user',
      nome: 'Marina Santos',
      email: 'usuario@unisagrado.demo',
      empresaId: 'unisagrado',
      role: 'USER',
    },
    logout: vi.fn(),
  }),
}));
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  localStorage.clear();
  Object.assign(store, createSeed());
  store.sessoes['teste-ui'] = 'user';
  localStorage.setItem(TOKEN_KEY, 'teste-ui');
});
function show(content: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {content}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('consulta e perfil redesenhados', () => {
  it('filtra a lista e mantém o esquema consistente com os resultados', async () => {
    const user = userEvent.setup();
    show(<LotsPage />);
    await user.type(await screen.findByLabelText('Buscar estacionamento'), 'Complexo');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Complexo Esportivo' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Complexo Esportivo, 5 vagas livres/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.queryByRole('heading', { name: 'Estacionamento Central' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });
  it('remove favorito por HTTP e atualiza o resultado do filtro', async () => {
    const user = userEvent.setup();
    show(<LotsPage />);
    await user.click(await screen.findByRole('button', { name: 'Favoritos' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await user.click(
      screen.getByRole('button', { name: 'Remover Estacionamento Central dos favoritos' }),
    );
    expect(await screen.findByRole('heading', { name: 'Nenhum resultado' })).toBeInTheDocument();
    expect(store.favoritos.user).toEqual([]);
  });
  it('salva e remove veículo com confirmação e isola os dados por conta', async () => {
    const user = userEvent.setup();
    show(<ProfilePage />);
    await user.click(screen.getByRole('button', { name: 'Adicionar veículo' }));
    await user.type(screen.getByLabelText('Nome do veículo'), 'Moto do campus');
    await user.selectOptions(screen.getByLabelText('Tipo de veículo'), 'MOTO');
    await user.click(screen.getByRole('button', { name: 'Salvar veículo' }));
    expect(await screen.findByText('Moto do campus')).toBeInTheDocument();
    expect(readPreferences('user').veiculos[0].tipo).toBe('MOTO');
    expect(readPreferences('admin').veiculos).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Remover veículo Moto do campus' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Moto do campus')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remover veículo Moto do campus' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover veículo' }),
    );
    await waitFor(() => expect(screen.queryByText('Moto do campus')).not.toBeInTheDocument());
  });
  it('aplica a preferência na próxima consulta e registra histórico sem duplicatas', async () => {
    const user = userEvent.setup();
    const profile = show(<ProfilePage />);
    await user.selectOptions(screen.getByLabelText('Tipo de vaga preferido'), 'MOTO');
    profile.unmount();
    show(<LotsPage />);
    expect(await screen.findByLabelText('Tipo de vaga')).toHaveValue('MOTO');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    act(() => {
      recordVisit('user', 'est-1', 'Estacionamento Central');
      recordVisit('user', 'est-1', 'Estacionamento Central');
      recordVisit('user', 'est-2', 'Bloco Acadêmico');
    });
    expect(readPreferences('user').recentes.map((r) => r.id)).toEqual(['est-2', 'est-1']);
    expect(readPreferences('admin').recentes).toEqual([]);
  });
});
