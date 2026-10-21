import type { PontoCampus, VagaCampus } from '../types';

export function projectCampus([x, y]: PontoCampus, altura = 0, flat = false): PontoCampus {
  return flat ? [x, y] : [x * 0.84 + y * 0.55, -x * 0.28 + y * 0.65 - altura * 0.55];
}
export function distanceCampus(a: PontoCampus, b: PontoCampus) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
export function nearbySlots(vagas: VagaCampus[], destino?: PontoCampus) {
  return [...vagas].sort((a, b) =>
    destino
      ? distanceCampus(a.ponto, destino) - distanceCampus(b.ponto, destino)
      : a.areaId.localeCompare(b.areaId) || a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
}
export const campusStatus = { LIVRE: 'Livre', OCUPADA: 'Ocupada', SEM_SINAL: 'Sem sinal' };
