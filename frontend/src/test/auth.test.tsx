import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import { createSeed, store } from '../mocks/seed';
import { AuthProvider, CompanyGuard } from '../features/auth/AuthContext';
import { AuthPage } from '../pages/auth/AuthPage';
import { TOKEN_KEY } from '../lib/api';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  localStorage.clear();
  Object.assign(store, createSeed());
});
function setup(path = '/login', register = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthPage register={register} />} />
            <Route element={<CompanyGuard />}>
              <Route path="/admin" element={<h1>Painel protegido</h1>} />
            </Route>
            <Route path="/estacionamentos" element={<h1>Consulta de vagas</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}
describe('login e guardas de rota', () => {
  it('valida e-mail e senha antes de enviar', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
  it('autentica ADMIN pelo mock e abre a rota protegida', async () => {
    const user = setup();
    await user.type(screen.getByLabelText('E-mail'), 'admin@unisagrado.demo');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'Demo@123');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));
    expect(await screen.findByRole('heading', { name: 'Painel protegido' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy();
  });
  it('exibe erro de credenciais incorretas', async () => {
    const user = setup();
    await user.type(screen.getByLabelText('E-mail'), 'admin@unisagrado.demo');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'SenhaErrada1');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });
  it('redireciona pessoa sem sessão para login', async () => {
    setup('/admin');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument(),
    );
  });
  it('cadastra empresa e primeiro ADMIN sem pertencer ao campus seed', async () => {
    const user = setup('/login', true);
    await user.type(screen.getByLabelText('Nome da empresa'), 'Campus Novo');
    await user.type(screen.getByLabelText('Nome do responsável'), 'Ana Silva');
    await user.type(screen.getByLabelText('E-mail'), 'ana@novo.demo');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'SenhaNova1');
    await user.click(screen.getByRole('button', { name: /cadastrar empresa/i }));
    expect(await screen.findByRole('heading', { name: 'Painel protegido' })).toBeInTheDocument();
    const created = store.administradores.find((u) => u.email === 'ana@novo.demo');
    expect(created).not.toHaveProperty('role');
    expect(created?.empresaId).not.toBe('unisagrado');
  });
});
