import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { handlers, simulateStatus } from '../mocks/handlers';
import { createSeed, store } from '../mocks/seed';
import { TOKEN_KEY } from '../lib/api';
import { ProfilePage } from '../pages/perfil/ProfilePage';
import { LotsPage } from '../pages/estacionamentos/LotsPage';
import { readPreferences, recordVisit } from '../features/profile/preferences';
import { AppLayout } from '../components/layout/AppLayout';

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
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {content}
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, client };
}

describe('consulta e perfil redesenhados', () => {
  it('filtra a lista e carrega as vagas reais do bolsão selecionado', async () => {
    const user = userEvent.setup();
    show(<LotsPage />);
    await user.type(await screen.findByLabelText('Buscar estacionamento'), 'Complexo');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Complexo Esportivo', level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ver planta de Complexo Esportivo' }),
    ).toHaveAttribute('aria-pressed', 'true');
    const plan = await screen.findByRole('region', { name: 'Planta de Complexo Esportivo' });
    expect(within(plan).getAllByRole('button', { name: /^Vaga / })).toHaveLength(20);
    expect(
      screen.queryByRole('heading', { name: 'Estacionamento Central' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });
  it('troca o setor e consulta uma vaga pelo teclado, sem sobrepor a planta', async () => {
    const user = userEvent.setup();
    show(<LotsPage />);
    await user.click(await screen.findByRole('button', { name: 'Ver planta de Bloco Acadêmico' }));
    const plan = await screen.findByRole('region', { name: 'Planta de Bloco Acadêmico' });
    expect(within(plan).getAllByRole('button', { name: /^Vaga / })).toHaveLength(32);
    const spot = within(plan).getAllByRole('button', { name: /Vaga .*Livre/ })[0];
    spot.focus();
    await user.keyboard('{Enter}');
    expect(spot).toHaveAttribute('aria-pressed', 'true');
    expect(within(plan).getByRole('status')).toHaveTextContent(/Vaga .*Livre/);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('atualiza a planta com leituras HTTP e gera navegação pelas coordenadas', async () => {
    const { client } = show(<LotsPage />);
    const plan = await screen.findByRole('region', { name: 'Planta de Estacionamento Central' });
    const spot = store.estacionamentos[0].vagas[0];
    expect(
      within(plan).getByRole('button', { name: `Vaga ${spot.rotulo}, Livre, PCD` }),
    ).toBeInTheDocument();
    act(() => simulateStatus(spot.id, 'OCUPADA'));
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['status', 'est-1'] });
    });
    expect(
      await within(plan).findByRole('button', { name: `Vaga ${spot.rotulo}, Ocupada, PCD` }),
    ).toBeInTheDocument();
    const url = new URL(
      screen
        .getByRole('link', {
          name: 'Navegar até o bolsão Estacionamento Central (Google Maps, nova aba)',
        })
        .getAttribute('href')!,
    );
    expect(url.searchParams.get('destination')).toBe('-22.327,-49.054');
    expect(url.searchParams.get('travelmode')).toBe('driving');
  });
  it('informa quando acesso e caminhada não estão disponíveis', async () => {
    store.estacionamentos[0].portao = undefined;
    store.estacionamentos[0].caminhadaMinutos = undefined;
    store.estacionamentos[0].caminhadaDestino = undefined;
    show(<LotsPage />);
    expect(await screen.findByText('Acesso não informado')).toBeInTheDocument();
    expect(screen.getByText('Tempo a pé não informado')).toBeInTheDocument();
  });
  it('mantém apenas contexto, contador e conta no cabeçalho e abre os acessos pelo avatar', async () => {
    const user = userEvent.setup();
    show(<AppLayout />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    const total = screen.getByRole('status', { name: 'Total de vagas livres no campus' });
    await waitFor(() => expect(total).toHaveTextContent('26'));
    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta' }));
    expect(
      within(screen.getByRole('dialog')).getByRole('link', { name: 'Perfil e preferências' }),
    ).toHaveAttribute('href', '/perfil');
    expect(
      within(screen.getByRole('dialog')).getByRole('link', { name: 'Favoritos' }),
    ).toHaveAttribute('href', '/favoritos');
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
