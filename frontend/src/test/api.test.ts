import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers, simulateStatus } from '../mocks/handlers';
import { createSeed, store } from '../mocks/seed';
import { api, json, TOKEN_KEY } from '../lib/api';
import type {
  DetalheEstacionamento,
  EstacionamentoResumo,
  Sensor,
  StatusVagaAtual,
} from '../types';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  localStorage.clear();
  Object.assign(store, createSeed());
  store.sessoes.teste = 'unisagrado';
  localStorage.setItem(TOKEN_KEY, 'teste');
});
describe('fluxos HTTP da demonstração', () => {
  it('salva acesso e caminhada opcionais, valida e permite limpar os dados', async () => {
    const payload = {
      nome: 'Bolsão de teste',
      portao: 'Portão 4',
      caminhadaMinutos: 3,
      caminhadaDestino: 'o bloco D',
    };
    const lot = await api<DetalheEstacionamento>('/estacionamentos', {
      method: 'POST',
      body: json(payload),
    });
    expect(lot).toMatchObject(payload);
    await expect(
      api(`/estacionamentos/${lot.id}`, {
        method: 'PUT',
        body: json({ ...payload, caminhadaMinutos: -1 }),
      }),
    ).rejects.toMatchObject({ details: { status: 422 } });
    expect(store.estacionamentos.find((l) => l.id === lot.id)?.caminhadaMinutos).toBe(3);
    await expect(
      api(`/estacionamentos/${lot.id}`, {
        method: 'PUT',
        body: json({ ...payload, caminhadaDestino: '' }),
      }),
    ).rejects.toMatchObject({ details: { status: 422 } });
    const cleared = await api<DetalheEstacionamento>(`/estacionamentos/${lot.id}`, {
      method: 'PUT',
      body: json({ nome: payload.nome, portao: '', caminhadaMinutos: null, caminhadaDestino: '' }),
    });
    expect(cleared.portao).toBeUndefined();
    expect(cleared.caminhadaMinutos).toBeUndefined();
    expect(cleared.caminhadaDestino).toBeUndefined();
  });
  it('permite consulta sem token e bloqueia escrita e administração', async () => {
    Object.assign(store.empresas[0], { publicado: false });
    localStorage.removeItem(TOKEN_KEY);
    const lots = await api<EstacionamentoResumo[]>('/publico/campi/unisagrado/estacionamentos');
    expect(lots).toHaveLength(3);
    expect(await api('/publico/campi/unisagrado/estacionamentos/est-1/status')).toHaveLength(37);
    await expect(
      api('/estacionamentos', { method: 'POST', body: json({ nome: 'Indevido' }) }),
    ).rejects.toMatchObject({ details: { status: 401 } });
    await expect(api('/sensores')).rejects.toMatchObject({ details: { status: 401 } });
    await expect(
      api('/publico/campi/unisagrado/estacionamentos/est-1', {
        method: 'PUT',
        body: json({ nome: 'Indevido' }),
      }),
    ).rejects.toMatchObject({ details: { status: 405 } });
  });
  it('não envia token nem dados administrativos na consulta pública', async () => {
    const detail = await api<DetalheEstacionamento>(
      '/publico/campi/unisagrado/estacionamentos/est-1',
    );
    expect(detail.vagas[0]).not.toHaveProperty('sensorId');
    const lots = await api<EstacionamentoResumo[]>('/publico/campi/unisagrado/estacionamentos');
    expect(lots[0]).not.toHaveProperty('vagas');
    await expect(api('/publico/campi/unisagrado/sensores')).rejects.toMatchObject({
      details: { status: 404 },
    });
    await expect(
      api('/publico/campi/unisagrado/estacionamentos/est-1/ocupacao'),
    ).rejects.toMatchObject({ details: { status: 404 } });
    localStorage.setItem(TOKEN_KEY, 'token-antigo');
    expect(await api('/publico/campi')).toHaveLength(1);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-antigo');
  });
  it('empresa nova já tem consulta aberta sem login, mantendo a gestão protegida', async () => {
    const session = await api<import('../types').Sessao>('/auth/cadastro-empresa', {
      method: 'POST',
      body: json({
        nome: 'Campus novo',
        slug: 'campus-novo',
        email: 'novo@teste.com',
        senha: 'Teste123',
      }),
    });
    localStorage.setItem(TOKEN_KEY, session.token);
    const company = await api<import('../types').Empresa>('/empresa');
    expect(company).not.toHaveProperty('publicado');
    expect(session.empresa).not.toHaveProperty('role');
    await api('/estacionamentos', { method: 'POST', body: json({ nome: 'Bolsão novo' }) });
    localStorage.removeItem(TOKEN_KEY);
    expect(await api('/publico/campi')).toContainEqual({
      id: company.id,
      nome: company.nome,
      slug: company.slug,
    });
    expect(await api('/publico/campi/' + company.slug + '/estacionamentos')).toHaveLength(1);
    await expect(
      api('/publico/campi/' + company.slug + '/estacionamentos/est-1'),
    ).rejects.toMatchObject({ details: { status: 404 } });
    await expect(api('/empresa')).rejects.toMatchObject({ details: { status: 401 } });
    await expect(
      api('/estacionamentos', { method: 'POST', body: json({ nome: 'Indevido' }) }),
    ).rejects.toMatchObject({ details: { status: 401 } });
  });
  it('isola empresas nas consultas e nos IDs conhecidos', async () => {
    store.empresas.push({ id: 'outra', nome: 'Outra', slug: 'outra' });
    store.contas.outra = { email: 'outra@demo.com', senha: 'Senha123' };
    store.sessoes.teste = 'outra';
    expect(await api<EstacionamentoResumo[]>('/estacionamentos')).toEqual([]);
    await expect(api('/estacionamentos/est-1')).rejects.toMatchObject({ details: { status: 404 } });
  });
  it('vincula sensor a uma vaga existente e reflete suas leituras', async () => {
    const vaga = store.estacionamentos[0].vagas[0];
    store.sensores = store.sensores.filter((s) => s.vagaId !== vaga.id);
    vaga.sensorId = undefined;
    const sensor = await api<Sensor & { deviceKey: string }>('/sensores', {
      method: 'POST',
      body: json({ nome: 'Novo sensor', vagaId: vaga.id }),
    });
    expect(sensor.deviceKey).toMatch(/^demo_/);
    expect((await api<Sensor[]>('/sensores')).find((s) => s.id === sensor.id)).not.toHaveProperty(
      'deviceKey',
    );
    simulateStatus(vaga.id, 'LIVRE');
    expect((await api<StatusVagaAtual[]>('/estacionamentos/est-1/status'))[0].status).toBe('LIVRE');
    simulateStatus(vaga.id, 'SEM_SINAL');
    expect((await api<StatusVagaAtual[]>('/estacionamentos/est-1/status'))[0].status).toBe(
      'SEM_SINAL',
    );
  });
  it('os endpoints do editor livre não existem mais', async () => {
    await expect(
      api('/estacionamentos/est-1/layout-padrao', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({ details: { status: 404 } });
    await expect(
      api('/estacionamentos/est-1/layout', { method: 'PUT', body: '{}' }),
    ).rejects.toMatchObject({ details: { status: 404 } });
  });
});
