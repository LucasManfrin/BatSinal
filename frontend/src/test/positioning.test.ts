import { expect, it } from 'vitest';
import { createSeed, migrateStore } from '../mocks/seed';
import { progressoArea } from '../lib/positioning';
import { nearbySlots } from '../lib/campus';
it('transforma as posições existentes em âncoras e calcula o progresso da área', () => {
  const seed = createSeed();
  const area = seed.areas[0];
  const anchors = seed.ancoras.filter((a) => a.areaId === area.id);
  const slots = seed.estacionamentos.flatMap((l) => l.vagas).filter((v) => v.areaId === area.id);
  expect(anchors).toHaveLength(12);
  expect(progressoArea(slots, anchors)).toEqual({ posicionadas: 9, total: 12 });
  const migrated = migrateStore(seed);
  expect(migrated.ancoras).toEqual(
    anchors.concat(seed.ancoras.filter((a) => a.areaId !== area.id)),
  );
  expect(migrated.estacionamentos).toEqual(seed.estacionamentos);
});
it('ordena por distância relativa ao destino sem alterar o array original', () => {
  const base = {
    id: 'a',
    rotulo: 'A',
    tipo: 'COMUM' as const,
    status: 'LIVRE' as const,
    atualizadoEm: '',
    areaId: 'area',
    rotacao: 0,
  };
  const slots = [
    { ...base, id: 'longe', ponto: [100, 100] as [number, number] },
    { ...base, id: 'perto', ponto: [2, 3] as [number, number] },
  ];
  expect(nearbySlots(slots, [0, 0]).map((v) => v.id)).toEqual(['perto', 'longe']);
  expect(slots[0].id).toBe('longe');
});
