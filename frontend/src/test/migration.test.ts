import { expect, it, vi } from 'vitest';
import { createSeed, STORAGE_KEY, migrateStore } from '../mocks/seed';

it('atualiza o seed antigo sem apagar cadastros, posições ou dados de acesso editados', async () => {
  const saved = createSeed();
  delete saved.navigationSchema;
  saved.estacionamentos[0].nome = 'Central editado';
  saved.estacionamentos[0].vagas[0].x = 123;
  saved.estacionamentos[0].portao = 'Acesso editado';
  delete saved.estacionamentos[0].caminhadaMinutos;
  delete saved.estacionamentos[0].caminhadaDestino;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  vi.resetModules();
  const { store } = await import('../mocks/seed');
  expect(store.estacionamentos[0]).toMatchObject({
    nome: 'Central editado',
    portao: 'Acesso editado',
    caminhadaMinutos: 2,
  });
  expect(store.estacionamentos[0].vagas[0].x).toBe(123);
  expect(store.navigationSchema).toBe(1);
});

it('preserva o armazenamento carregado quando não consegue persistir a migração', async () => {
  const saved = createSeed();
  delete saved.navigationSchema;
  saved.estacionamentos[0].nome = 'Dados preservados';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Sem espaço');
  });
  try {
    vi.resetModules();
    const { store } = await import('../mocks/seed');
    expect(store.estacionamentos[0].nome).toBe('Dados preservados');
    expect(store.navigationSchema).toBe(1);
  } finally {
    write.mockRestore();
  }
});

it('migra contas antigas de empresa e invalida sessões de visitantes', () => {
  const seed = createSeed();
  const legacy = { ...seed, contas: undefined };
  const migrated = migrateStore({
    ...legacy,
    accessSchema: 3,
    usuarios: [
      {
        id: 'admin',
        empresaId: 'unisagrado',
        email: 'admin@unisagrado.demo',
        senha: 'Demo@123',
        role: 'ADMIN',
      },
      {
        id: 'visitante',
        empresaId: 'unisagrado',
        email: 'visitante@demo.com',
        senha: 'Demo@123',
        role: 'USER',
      },
    ],
    sessoes: { empresa: 'admin', visitante: 'visitante' },
  });
  expect(Object.keys(migrated.contas)).toEqual(['unisagrado']);
  expect(migrated.sessoes).toEqual({ empresa: 'unisagrado' });
  expect(migrated.accessSchema).toBe(4);
  expect(migrated.estacionamentos).toEqual(seed.estacionamentos);
});
