import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { handlers, simulateStatus } from '../mocks/handlers';
import { createSeed, store } from '../mocks/seed';
import { TOKEN_KEY } from '../lib/api';
import { CompanyPage } from '../pages/empresa/CompanyPage';
import { LotsPage } from '../pages/estacionamentos/LotsPage';
import type { Administrador } from '../types';
import { AppLayout } from '../components/layout/AppLayout';

const auth = vi.hoisted(() => ({ user: null as Administrador | null, logout: vi.fn() }));
vi.mock('../features/auth/AuthContext', () => ({ useAuth: () => ({ ...auth, loading: false }) }));
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  localStorage.clear();
  Object.assign(store, createSeed());
  auth.user = null;
});
function show(content: ReactNode, path = '/c/unisagrado') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/c/:campusSlug" element={content} />
          <Route path="/empresa" element={content} />
        </Routes>
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
  it('oferece cadastro somente para empresas e consulta pública sem conta', async () => {
    const user = userEvent.setup();
    show(<AppLayout />);
    await waitFor(() =>
      expect(
        screen.getByRole('status', { name: 'Total de vagas livres no campus' }),
      ).toHaveTextContent('26'),
    );
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: 'Cadastrar empresa' })).toHaveAttribute(
      'href',
      '/cadastro',
    );
    expect(within(dialog).getByRole('link', { name: 'Acesso para empresas' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(
      within(dialog).queryByRole('link', { name: /perfil|favoritos/i }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
  it('mostra o endereço público da empresa sem controle de visibilidade', async () => {
    auth.user = {
      id: 'admin',
      empresaId: 'unisagrado',
      nome: 'Lucas Oliveira',
      email: 'admin@unisagrado.demo',
    };
    store.sessoes['teste-ui'] = 'admin';
    localStorage.setItem(TOKEN_KEY, 'teste-ui');
    show(<CompanyPage />, '/empresa');
    expect(await screen.findByRole('link', { name: '/c/unisagrado' })).toHaveAttribute(
      'href',
      '/c/unisagrado',
    );
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByText('Consulta fechada')).not.toBeInTheDocument();
  });
});
