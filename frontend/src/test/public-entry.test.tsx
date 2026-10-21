import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import { store, createSeed } from '../mocks/seed';
import { TOKEN_KEY } from '../lib/api';
import { publicCampusPath } from '../lib/routes';
import { AppLayout } from '../components/layout/AppLayout';
import { CanonicalCampus } from '../components/lot/CanonicalCampus';
import { CompanyChecklist } from '../components/company/CompanyChecklist';
import { LotsPage } from '../pages/estacionamentos/LotsPage';
import type { ContaEmpresa } from '../types';

const auth = vi.hoisted(() => ({ user: null as ContaEmpresa | null, logout: vi.fn() }));
vi.mock('../features/auth/AuthContext', () => ({ useAuth: () => auth }));
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  localStorage.clear();
  Object.assign(store, createSeed());
  auth.user = null;
});

function RouteState() {
  const location = useLocation();
  return (
    <>
      <output aria-label="Endereço atual">
        {location.pathname}
        {location.search}
        {location.hash}
      </output>
      <Outlet />
    </>
  );
}
function show(path = '/', checklist = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {checklist ? (
          <CompanyChecklist />
        ) : (
          <Routes>
            <Route element={<RouteState />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<LotsPage />} />
                <Route
                  path="/c/:campusSlug"
                  element={
                    <CanonicalCampus>
                      <LotsPage />
                    </CanonicalCampus>
                  }
                />
              </Route>
            </Route>
          </Routes>
        )}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function company() {
  auth.user = { ...store.empresas[0], email: 'admin@unisagrado.demo' };
  store.sessoes.teste = 'unisagrado';
  localStorage.setItem(TOKEN_KEY, 'teste');
}

it('abre o mapa no endereço principal sem conta e consulta a área pública', async () => {
  const user = userEvent.setup();
  show('/?bloco=j');
  expect(
    await screen.findByRole('heading', { name: 'Mapa do campus Unisagrado' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/?bloco=j');
  expect(screen.queryByRole('navigation', { name: 'Administração' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Ver de perto' }));
  expect(await screen.findByRole('button', { name: 'Voltar ao campus' })).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
});
it('mantém a raiz pública mesmo com uma empresa autenticada', async () => {
  company();
  show();
  expect(
    await screen.findByRole('heading', { name: 'Mapa do campus Unisagrado' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Administração' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Simulador' })).not.toBeInTheDocument();
});
it('redireciona o link anterior para a raiz sem perder destino, área ou fragmento', async () => {
  show('/c/unisagrado?bloco=j&area=frente-j#vaga');
  expect(await screen.findByRole('button', { name: 'Voltar ao campus' })).toBeInTheDocument();
  expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/?bloco=j&area=frente-j#vaga');
  expect(publicCampusPath('campus-novo')).toBe('/c/campus-novo');
});
it('mostra progresso real e copia o endereço principal no checklist', async () => {
  company();
  const user = userEvent.setup();
  const copy = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: copy }, configurable: true });
  show('/admin', true);
  expect(await screen.findByText('89 de 92 posicionadas')).toBeInTheDocument();
  expect(screen.getByText('2 de 4 etapas concluídas')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Abrir consulta pública de Unisagrado' }),
  ).toHaveAttribute('href', '/');
  await user.click(screen.getByRole('button', { name: 'Copiar link público' }));
  expect(copy).toHaveBeenCalledWith(`${window.location.origin}/`);
  expect(screen.getByText('3 de 4 etapas concluídas')).toBeInTheDocument();
});
it('oculta o checklist apenas depois de posicionar e copiar o link', async () => {
  company();
  store.estacionamentos
    .flatMap((l) => l.vagas)
    .forEach((v) => {
      v.ancoraId = store.ancoras.find((a) => a.vagaPadraoId === v.id)?.id;
    });
  const user = userEvent.setup();
  show('/admin', true);
  await user.click(await screen.findByRole('button', { name: 'Copiar link público' }));
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Unisagrado' })).not.toBeInTheDocument(),
  );
});
it('mantém o endereço visível se a cópia falhar', async () => {
  company();
  const user = userEvent.setup();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) },
    configurable: true,
  });
  show('/admin', true);
  await user.click(await screen.findByRole('button', { name: 'Copiar link público' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Não consegui copiar.');
  expect(
    screen.getByRole('link', { name: 'Abrir consulta pública de Unisagrado' }),
  ).toHaveAttribute('href', '/');
});
