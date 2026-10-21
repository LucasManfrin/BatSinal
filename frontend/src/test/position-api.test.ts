import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import { createSeed, store, migrateStore } from '../mocks/seed';
import { api, json, TOKEN_KEY } from '../lib/api';
import type { DetalheArea, Vaga, AreaEstacionamento } from '../types';
const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  localStorage.clear();
  Object.assign(store, createSeed());
  store.sessoes.teste = 'unisagrado';
  localStorage.setItem(TOKEN_KEY, 'teste');
});
const move = (id: string, ancoraId: string | null, versao?: number) =>
  api<DetalheArea>(`/vagas/${id}/posicao`, { method: 'PUT', body: json({ ancoraId, versao }) });
describe('posicionamento via HTTP', () => {
  it('reverte a alteração se o aparelho recusar a persistência', async () => {
    const vaga = store.estacionamentos[0].vagas[0],
      anchor = store.ancoras.find((a) => a.vagaPadraoId === vaga.id)!;
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    try {
      await expect(move(vaga.id, anchor.id, 1)).rejects.toMatchObject({ details: { status: 507 } });
      expect(store.estacionamentos[0].vagas[0].ancoraId).toBeUndefined();
      expect(store.areas[0].versao).toBe(1);
    } finally {
      write.mockRestore();
    }
  });
  it('posiciona a peça da bandeja, atualiza o público e preserva ao recarregar o mock', async () => {
    const vaga = store.estacionamentos[0].vagas[0],
      anchor = store.ancoras.find((a) => a.vagaPadraoId === vaga.id)!;
    const next = await move(vaga.id, anchor.id, 1);
    expect(next.area.versao).toBe(2);
    expect(next.vagas.find((v) => v.id === vaga.id)?.ancoraId).toBe(anchor.id);
    const publicArea = await api<DetalheArea>(`/public/areas/${vaga.areaId}`);
    expect(publicArea.vagas.find((v) => v.id === vaga.id)).toHaveProperty('ancoraId', anchor.id);
    expect(publicArea.vagas[0]).not.toHaveProperty('sensorId');
    expect(
      migrateStore(JSON.parse(localStorage.getItem('batsinal.mock.v1')!)).estacionamentos[0]
        .vagas[0].ancoraId,
    ).toBe(anchor.id);
  });
  it('troca de forma atômica e desfaz com o lote de posições', async () => {
    const a = store.estacionamentos[0].vagas[3],
      b = store.estacionamentos[0].vagas[4];
    expect(a.areaId).toBe(b.areaId);
    const before = await api<DetalheArea>(`/areas/${a.areaId}`),
      source = a.ancoraId,
      target = b.ancoraId;
    const next = await move(a.id, target!, before.area.versao);
    expect(a.ancoraId).toBe(target);
    expect(b.ancoraId).toBe(source);
    const undo = await api<DetalheArea>(`/areas/${a.areaId}/posicoes`, {
      method: 'PUT',
      body: json({
        versao: next.area.versao,
        posicoes: before.vagas.map((v) => ({ vagaId: v.id, ancoraId: v.ancoraId ?? null })),
      }),
    });
    expect(a.ancoraId).toBe(source);
    expect(b.ancoraId).toBe(target);
    expect(undo.area.versao).toBe(3);
  });
  it('recusa posição incompatível, repetida, área alheia e versão desatualizada sem mutar', async () => {
    const vaga = store.estacionamentos[0].vagas[0],
      own = store.ancoras.find((a) => a.vagaPadraoId === vaga.id)!;
    const wrong = store.ancoras.find(
      (a) => a.areaId === vaga.areaId && !a.tiposAceitos.includes(vaga.tipo),
    )!;
    await expect(move(vaga.id, wrong.id, 1)).rejects.toMatchObject({ details: { status: 422 } });
    const before = await api<DetalheArea>(`/areas/${vaga.areaId}`);
    const positions = before.vagas.map((v) => ({ vagaId: v.id, ancoraId: own.id }));
    await expect(
      api(`/areas/${vaga.areaId}/posicoes`, {
        method: 'PUT',
        body: json({ posicoes: positions, versao: 1 }),
      }),
    ).rejects.toMatchObject({ details: { status: 422 } });
    expect(vaga.ancoraId).toBeUndefined();
    expect(store.areas[0].versao).toBe(1);
    await move(vaga.id, own.id, 1);
    await expect(move(vaga.id, null, 1)).rejects.toMatchObject({ details: { status: 409 } });
    expect(vaga.ancoraId).toBe(own.id);
    store.empresas.push({ id: 'outra', nome: 'Outra', slug: 'outra' });
    store.contas.outra = { email: 'outra@example.test', senha: 'Demo@123' };
    store.sessoes.teste = 'outra';
    await expect(move(vaga.id, null)).rejects.toMatchObject({ details: { status: 404 } });
    await expect(api(`/areas/${vaga.areaId}`)).rejects.toMatchObject({ details: { status: 404 } });
    expect(await api('/areas')).toEqual([]);
  });
  it('restaura apenas o padrão existente e retira as novas peças para a bandeja', async () => {
    const first = store.estacionamentos[0].vagas[0];
    const extra = await api<Vaga>('/vagas', {
      method: 'POST',
      body: json({ areaId: first.areaId, rotulo: 'Extra', tipo: 'PCD' }),
    });
    const anchor = store.ancoras.find((a) => a.vagaPadraoId === first.id)!;
    await move(extra.id, anchor.id);
    const next = await api<DetalheArea>(`/areas/${first.areaId}/restaurar-padrao`, {
      method: 'POST',
      body: json({}),
    });
    expect(next.vagas.find((v) => v.id === first.id)?.ancoraId).toBe(anchor.id);
    expect(next.vagas.find((v) => v.id === extra.id)?.ancoraId).toBeUndefined();
    expect(next.vagas.filter((v) => v.ancoraId)).toHaveLength(12);
  });
  it('cadastra área com levantamento, sem inventar grade, e faz CRUD de vagas', async () => {
    const area = await api<AreaEstacionamento>('/areas', {
      method: 'POST',
      body: json({
        nome: 'Área levantada',
        estacionamentoId: 'est-1',
        ancoras: [
          { x: 1, z: 2, largura: 1.2, profundidade: 2.8, rotacao: 30, tiposAceitos: ['COMUM'] },
        ],
      }),
    });
    const detail = await api<DetalheArea>(`/areas/${area.id}`);
    expect(detail.ancoras).toHaveLength(1);
    expect(detail.vagas).toEqual([]);
    const slot = await api<Vaga>('/vagas', {
      method: 'POST',
      body: json({ areaId: area.id, rotulo: 'Nova', tipo: 'COMUM' }),
    });
    await move(slot.id, detail.ancoras[0].id);
    await expect(api(`/areas/${area.id}`, { method: 'DELETE' })).rejects.toMatchObject({
      details: { status: 409 },
    });
    await api(`/vagas/${slot.id}`, {
      method: 'PUT',
      body: json({ rotulo: 'Nova 2', tipo: 'COMUM' }),
    });
    expect(await api(`/vagas/${slot.id}`)).toMatchObject({ rotulo: 'Nova 2' });
    await api(`/vagas/${slot.id}`, { method: 'DELETE' });
    await api(`/areas/${area.id}`, { method: 'DELETE' });
    expect(store.ancoras.some((a) => a.areaId === area.id)).toBe(false);
  });
});
