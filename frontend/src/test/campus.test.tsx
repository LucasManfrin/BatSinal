import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { handlers, simulateStatus } from '../mocks/handlers';
import { createSeed, migrateStore, store } from '../mocks/seed';
import { LotsPage } from '../pages/estacionamentos/LotsPage';
import { API_URL, api, TOKEN_KEY } from '../lib/api';
import type { ConsultaCampus } from '../types';

vi.mock('../features/auth/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  server.resetHandlers();
  localStorage.clear();
  Object.assign(store, createSeed());
});
function show(path = '/c/unisagrado') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/c/:campusSlug" element={<LotsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
describe('consulta do campus inteiro', () => {
  it('expõe apenas vagas existentes da empresa e reflete as mesmas leituras da administração', async () => {
    const response = await api<ConsultaCampus>('/publico/campi/unisagrado/mapa');
    expect(response.vagas).toHaveLength(92);
    expect(response.vagasSemPosicao).toBe(0);
    expect(new Set(response.vagas.map((v) => v.id)).size).toBe(92);
    expect(JSON.stringify(response)).not.toMatch(/sensorId|senha|email|deviceKey/);
    simulateStatus('est-2-vaga-17', 'OCUPADA');
    expect(
      (await api<ConsultaCampus>('/publico/campi/unisagrado/mapa')).vagas.find(
        (v) => v.id === 'est-2-vaga-17',
      )?.status,
    ).toBe('OCUPADA');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    await expect(
      api('/publico/campi/unisagrado/mapa', { method: 'PUT', body: '{}' }),
    ).rejects.toMatchObject({ details: { status: 405 } });
  });
  it('não desenha vagas excluídas, não inventa posições novas e não empresta o mapa a outra empresa', async () => {
    const lot = store.estacionamentos[0];
    lot.vagas.shift();
    lot.vagas.push({ ...lot.vagas[0], id: 'nova-sem-posicao' });
    const response = await api<ConsultaCampus>('/publico/campi/unisagrado/mapa');
    expect(response.vagas).toHaveLength(91);
    expect(response.vagas.some((v) => v.id === 'est-1-vaga-1')).toBe(false);
    expect(response.vagasSemPosicao).toBe(1);
    store.empresas.push({ id: 'outra', nome: 'Outra', slug: 'outra' });
    expect(await api('/publico/campi/outra/mapa')).toEqual({
      mapa: null,
      vagas: [],
      vagasSemPosicao: 0,
    });
  });
  it('acrescenta a cena ao armazenamento antigo preservando layouts e mapas já salvos', () => {
    const legacy = createSeed();
    delete legacy.mapas;
    delete legacy.campusSchema;
    legacy.estacionamentos[0].vagas[0].x = 321;
    legacy.sessoes['sessao-existente'] = 'admin';
    const migrated = migrateStore(legacy);
    expect(migrated.mapas?.unisagrado.predios.find((b) => b.id === 'j')).toBeDefined();
    expect(migrated.estacionamentos).toEqual(legacy.estacionamentos);
    expect(migrated.sensores).toEqual(legacy.sensores);
    expect(migrated.historico).toEqual(legacy.historico);
    expect(migrated.sessoes).toEqual(legacy.sessoes);
    migrated.mapas!.unisagrado.predios[0].nome = 'Nome revisado';
    expect(migrateStore(migrated).mapas!.unisagrado.predios[0].nome).toBe('Nome revisado');
  });
  it('localiza o J por teclado, filtra suas vagas próximas e destaca a entrada escolhida', async () => {
    const user = userEvent.setup();
    show();
    const scene = await screen.findByRole('region', { name: 'Mapa interativo do campus' });
    expect(within(scene).getAllByRole('button', { name: /^Vaga / })).toHaveLength(92);
    const building = within(scene).getByRole('button', { name: 'Localizar Bloco J' });
    building.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Bloco de destino')).toHaveValue('j');
    const list = screen.getByRole('complementary', { name: 'Vagas próximas ao destino' });
    expect(within(list).getAllByRole('button', { name: /^Destacar vaga / })).toHaveLength(6);
    expect(within(list).getByRole('button', { name: /Ao lado do Bloco J/ })).toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: /blocos A e B/ })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Entrada de veículos'), 'p1');
    expect(screen.getByText('Portão 1 destacado no mapa')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Entrada de veículos')).queryByRole('option', {
        name: /Portão 2/,
      }),
    ).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Tipo de vaga'), 'PCD');
    expect(within(list).getAllByRole('button', { name: /^Destacar vaga / })).toHaveLength(1);
  });
  it('seleciona vaga, atualiza o status HTTP e permite vista 2D e zoom', async () => {
    const user = userEvent.setup();
    const client = show('/c/unisagrado?bloco=j&entrada=p3');
    const spot = await screen.findByRole('button', {
      name: 'Vaga C1, Livre, Em frente ao Bloco J',
    });
    spot.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('C1 · Livre');
    await user.click(screen.getByRole('button', { name: '2D' }));
    expect(screen.getByLabelText('Campus Unisagrado, vista 2D')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aproximar mapa' }));
    expect(screen.getByText('260%')).toBeInTheDocument();
    act(() => simulateStatus('est-2-vaga-17', 'OCUPADA'));
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['mapa-campus', 'unisagrado'] });
    });
    expect(
      await screen.findByRole('button', { name: 'Vaga C1, Ocupada, Em frente ao Bloco J' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('C1 · Ocupada');
  });
  it('retira a indicação de vagas livres quando a atualização falha', async () => {
    const client = show();
    await screen.findByRole('region', { name: 'Mapa interativo do campus' });
    server.use(
      http.get(`${API_URL}/publico/campi/unisagrado/mapa`, () =>
        HttpResponse.json({}, { status: 503 }),
      ),
    );
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['mapa-campus', 'unisagrado'] });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Leituras indisponíveis');
    expect(screen.queryByRole('button', { name: /^Vaga .*Livre/ })).not.toBeInTheDocument();
    expect(screen.getByText('Nenhuma vaga neste filtro')).toBeInTheDocument();
  });
  it('mantém a consulta existente quando o campus ainda não tem cena', async () => {
    store.mapas = {};
    show();
    expect(await screen.findByRole('heading', { name: 'Estacionamentos' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });
});
