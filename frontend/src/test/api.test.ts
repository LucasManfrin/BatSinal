import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers, simulateStatus } from '../mocks/handlers';
import { createSeed, store } from '../mocks/seed';
import { api, ApiError, json, TOKEN_KEY } from '../lib/api';
import type {
  DetalheEstacionamento,
  EstacionamentoResumo,
  Sensor,
  StatusVagaAtual,
  Usuario,
} from '../types';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  localStorage.clear();
  Object.assign(store, createSeed());
  store.sessoes.teste = 'admin';
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
  it('adiciona e remove favorito com corpo DELETE', async () => {
    expect(
      await api('/favoritos', { method: 'POST', body: json({ estacionamentoId: 'est-1' }) }),
    ).toEqual(['est-1']);
    expect(
      await api('/favoritos', { method: 'DELETE', body: json({ estacionamentoId: 'est-1' }) }),
    ).toEqual([]);
  });
  it('impede escrita de USER também no mock', async () => {
    store.sessoes.teste = 'user';
    await expect(api('/usuarios')).rejects.toMatchObject({ details: { status: 403 } });
    await expect(
      api('/estacionamentos', { method: 'POST', body: json({ nome: 'Indevido' }) }),
    ).rejects.toBeInstanceOf(ApiError);
  });
  it('isola empresas nas consultas e nos IDs conhecidos', async () => {
    store.usuarios.push({
      id: 'outra',
      empresaId: 'outra',
      nome: 'Outro Admin',
      email: 'outro@demo.com',
      role: 'ADMIN',
      senha: 'Senha123',
    });
    store.sessoes.teste = 'outra';
    expect(await api<EstacionamentoResumo[]>('/estacionamentos')).toEqual([]);
    await expect(api('/estacionamentos/est-1')).rejects.toMatchObject({ details: { status: 404 } });
  });
  it('cria sensor, vincula à vaga, simula leitura e reflete no status', async () => {
    const lot = await api<DetalheEstacionamento>('/estacionamentos', {
      method: 'POST',
      body: json({ nome: 'Novo espaço' }),
    });
    const generated = await api<DetalheEstacionamento>(`/estacionamentos/${lot.id}/layout-padrao`, {
      method: 'POST',
      body: json({ linhas: 1, colunas: 2 }),
    });
    const sensor = await api<Sensor & { deviceKey: string }>('/sensores', {
      method: 'POST',
      body: json({ nome: 'Novo sensor', vagaId: generated.vagas[0].id }),
    });
    expect(sensor.deviceKey).toMatch(/^demo_/);
    expect((await api<Sensor[]>('/sensores')).find((s) => s.id === sensor.id)).not.toHaveProperty(
      'deviceKey',
    );
    simulateStatus(generated.vagas[0].id, 'LIVRE');
    const statuses = await api<StatusVagaAtual[]>(`/estacionamentos/${lot.id}/status`);
    expect(statuses[0].status).toBe('LIVRE');
    expect(statuses[1].status).toBe('SEM_SINAL');
    simulateStatus(generated.vagas[0].id, 'SEM_SINAL');
    expect((await api<StatusVagaAtual[]>(`/estacionamentos/${lot.id}/status`))[0].status).toBe(
      'SEM_SINAL',
    );
  });
  it('valida layout atomicamente e não grava rótulos duplicados', async () => {
    const lot = await api<DetalheEstacionamento>('/estacionamentos/est-1');
    const invalid = structuredClone(lot);
    invalid.vagas[1].rotulo = invalid.vagas[0].rotulo;
    await expect(
      api('/estacionamentos/est-1/layout', { method: 'PUT', body: json(invalid) }),
    ).rejects.toMatchObject({ details: { status: 422 } });
    expect((await api<DetalheEstacionamento>('/estacionamentos/est-1')).vagas[1].rotulo).toBe('A2');
  });
  it('protege o próprio admin contra exclusão e rebaixamento', async () => {
    await expect(api('/usuarios/admin', { method: 'DELETE' })).rejects.toMatchObject({
      details: { status: 422 },
    });
    const user = await api<Usuario>('/auth/me');
    await expect(
      api('/usuarios/admin', { method: 'PUT', body: json({ ...user, role: 'USER' }) }),
    ).rejects.toMatchObject({ details: { status: 422 } });
  });
});
