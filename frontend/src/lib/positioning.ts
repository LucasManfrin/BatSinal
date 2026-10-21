import type { Ancora, Vaga } from '../types';
export function progressoArea(vagas: Vaga[], ancoras: Ancora[]) {
  const valid = new Set(ancoras.map((a) => a.id));
  return {
    posicionadas: vagas.filter((v) => v.ancoraId && valid.has(v.ancoraId)).length,
    total: vagas.length,
  };
}
