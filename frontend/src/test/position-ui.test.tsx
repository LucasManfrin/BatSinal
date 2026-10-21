import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import { createSeed, store } from '../mocks/seed';
import { API_URL, TOKEN_KEY } from '../lib/api';
import { PositionPage } from '../pages/admin/PositionPage';
vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'unisagrado' } }),
}));
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  server.resetHandlers();
  localStorage.clear();
  Object.assign(store, createSeed());
  store.sessoes.teste = 'unisagrado';
  localStorage.setItem(TOKEN_KEY, 'teste');
});
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={['/admin/posicionar']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <PositionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it('posiciona pelo teclado sem WebGL e permite desfazer e refazer', async () => {
  const user = userEvent.setup();
  show();
  const tray = await screen.findByRole('complementary', { name: 'Bandeja de vagas' });
  await user.click(within(tray).getByRole('button', { name: 'Pegar vaga A1, PCD' }));
  const target = screen.getByRole('button', { name: 'Posição 1, vazia' });
  target.focus();
  await user.keyboard('{Enter}');
  await screen.findByText('Vaga A1 posicionada.');
  expect(store.estacionamentos[0].vagas[0].ancoraId).toBeDefined();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Desfazer' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Desfazer' }));
  await screen.findByText('Última alteração desfeita.');
  expect(store.estacionamentos[0].vagas[0].ancoraId).toBeUndefined();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refazer' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Refazer' }));
  await screen.findByText('Alteração refeita.');
  expect(store.estacionamentos[0].vagas[0].ancoraId).toBeDefined();
});
it('falha de gravação mantém a vaga na bandeja e mostra o erro', async () => {
  server.use(
    http.put(`${API_URL}/vagas/:id/posicao`, () =>
      HttpResponse.json({ status: 503, mensagem: 'Gravação indisponível.' }, { status: 503 }),
    ),
  );
  const user = userEvent.setup();
  show();
  await user.click(await screen.findByRole('button', { name: 'Pegar vaga A1, PCD' }));
  await user.click(screen.getByRole('button', { name: 'Posição 1, vazia' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Gravação indisponível.');
  expect(store.estacionamentos[0].vagas[0].ancoraId).toBeUndefined();
  expect(screen.getByRole('button', { name: 'Desfazer' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Pegar vaga A1, PCD' })).toBeInTheDocument();
});
