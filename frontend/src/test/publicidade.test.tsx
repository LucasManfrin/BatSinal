import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import { AdvertisingBanner } from '../features/publicidade/AdvertisingBanner';
import {
  campanhaAtiva,
  contatoComercial,
  publicidade,
  type Campanha,
} from '../features/publicidade/config';
import { AdvertisingPage } from '../pages/publicidade/AdvertisingPage';

const original = structuredClone(publicidade);
const server = setupServer(...handlers);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterAll(() => {
  server.close();
  vi.restoreAllMocks();
});
afterEach(() => {
  Object.assign(publicidade, structuredClone(original));
  vi.useRealTimers();
  server.resetHandlers();
});

function campaign(overrides: Partial<Campanha> = {}) {
  const value: Campanha = {
    ativa: true,
    anunciante: 'Marca de teste',
    texto: 'Uma oferta para o campus.',
    botao: 'Ver oferta',
    destino: 'https://example.com/oferta',
    inicio: '2026-10-01T00:00:00-03:00',
    fim: '2026-10-31T00:00:00-03:00',
    ...overrides,
  };
  publicidade.instituicoes.unisagrado = { campanha: value };
  return value;
}

function banner(slug = 'unisagrado') {
  return render(
    <MemoryRouter initialEntries={['/?bloco=j&entrada=principal#mapa']}>
      <AdvertisingBanner campusSlug={slug} />
    </MemoryRouter>,
  );
}

it('inicia disponível, com uma única cota e link que preserva filtros', () => {
  banner();
  expect(screen.getAllByRole('complementary')).toHaveLength(1);
  expect(screen.getByText('Espaço publicitário')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Sua marca pode estar aqui' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Anuncie aqui' })).toHaveAttribute(
    'href',
    '/anunciar?bloco=j&entrada=principal#mapa',
  );
});

it('vincula a oferta à instituição, sem reutilizar a campanha de outro campus', () => {
  campaign();
  expect(campanhaAtiva('unisagrado', Date.parse('2026-10-15T12:00:00Z'))?.anunciante).toBe(
    'Marca de teste',
  );
  expect(campanhaAtiva('outro-campus', Date.parse('2026-10-15T12:00:00Z'))).toBeNull();
  banner('outro-campus');
  expect(screen.getByRole('link', { name: 'Anuncie aqui' })).toHaveAttribute(
    'href',
    '/c/outro-campus/anunciar?bloco=j&entrada=principal#mapa',
  );
});

it('respeita início inclusivo, fim exclusivo, fuso e desativação', () => {
  const value = campaign();
  const inicio = Date.parse(value.inicio);
  const fim = Date.parse(value.fim);
  expect(campanhaAtiva('unisagrado', inicio - 1)).toBeNull();
  expect(campanhaAtiva('unisagrado', inicio)).toEqual(value);
  expect(campanhaAtiva('unisagrado', fim - 1)).toEqual(value);
  expect(campanhaAtiva('unisagrado', fim)).toBeNull();
  value.ativa = false;
  expect(campanhaAtiva('unisagrado', inicio)).toBeNull();
});

it.each([
  { destino: 'javascript:alert(1)' },
  { destino: 'https://usuario:senha@example.com' },
  { destino: '' },
  { anunciante: ' ' },
  { texto: '' },
  { botao: '' },
  { inicio: 'inválido' },
  { inicio: '2026-10-01T00:00:00' },
  { fim: '2026-09-01T00:00:00Z' },
])('mantém disponível uma configuração incompleta ou inválida: %j', (overrides) => {
  campaign(overrides);
  expect(campanhaAtiva('unisagrado', Date.parse('2026-10-15T12:00:00Z'))).toBeNull();
});

it('ativa e encerra a oferta com a consulta aberta, sem precisar recarregar', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T02:59:59Z'));
  campaign({ fim: '2026-10-01T00:00:02-03:00' });
  banner();
  expect(screen.getByRole('link', { name: 'Anuncie aqui' })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText('Publicidade')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver oferta' })).toHaveAttribute(
    'href',
    'https://example.com/oferta',
  );
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.getByRole('link', { name: 'Anuncie aqui' })).toBeInTheDocument();
});

it('mantém identidade e oferta acessíveis se a imagem falha', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
  campaign({ imagem: '/imagem-ausente.png' });
  const view = banner();
  fireEvent.error(view.container.querySelector('img')!);
  expect(view.container.querySelector('img')).toBeNull();
  expect(screen.getByText('MA')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Marca de teste' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver oferta' })).toHaveAttribute('rel', 'sponsored');
});

it('usa contato central ou específico e rejeita protocolos não previstos', () => {
  publicidade.contato = 'mailto:comercial@example.com';
  expect(contatoComercial('outro')).toBe('mailto:comercial@example.com');
  publicidade.instituicoes.outro = { campanha: null, contato: 'https://example.com/contato' };
  expect(contatoComercial('outro')).toBe('https://example.com/contato');
  publicidade.instituicoes.outro.contato = 'javascript:alert(1)';
  expect(contatoComercial('outro')).toBeUndefined();
});

it('abre a área comercial por teclado sem conta e retorna aos mesmos filtros', async () => {
  const user = userEvent.setup();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/?bloco=j#mapa']}>
        <Routes>
          <Route path="/" element={<AdvertisingBanner campusSlug="unisagrado" />} />
          <Route path="/anunciar" element={<AdvertisingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await user.tab();
  expect(screen.getByRole('link', { name: 'Anuncie aqui' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('heading', { name: 'Sua marca no caminho do campus.' })).toHaveFocus();
  expect(
    screen.getByRole('heading', { name: 'Uma cota. 30 dias de destaque.' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Ainda não é possível enviar propostas/)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Envie sua proposta' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Voltar à consulta de vagas' })).toHaveAttribute(
    'href',
    '/?bloco=j#mapa',
  );
  await user.click(screen.getByRole('link', { name: 'Voltar à consulta de vagas' }));
  expect(screen.getByRole('link', { name: 'Anuncie aqui' })).toHaveAttribute(
    'href',
    '/anunciar?bloco=j#mapa',
  );
});

it('oferece apenas o canal real configurado para enviar a proposta', async () => {
  publicidade.instituicoes.outro = { campanha: null, contato: 'mailto:comercial@example.com' };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/c/outro/anunciar']}>
        <Routes>
          <Route path="/c/:campusSlug/anunciar" element={<AdvertisingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(screen.getByRole('link', { name: 'Envie sua proposta' })).toHaveAttribute(
    'href',
    'mailto:comercial@example.com',
  );
  expect(screen.getByRole('link', { name: 'Voltar à consulta de vagas' })).toHaveAttribute(
    'href',
    '/c/outro',
  );
});
