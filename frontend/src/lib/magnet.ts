import type { Ancora, TipoVaga } from '../types';

export const IMA = { RAIO_ATRACAO: 1.2, RAIO_ENCAIXE: 0.5, RAIO_SOLTAR: 1.6 };
export function calcularIma(args: {
  ponteiro: { x: number; z: number };
  vaga: { tipo: TipoVaga };
  ancoras: Ancora[];
  ocupadas: Record<string, string>;
  ancoraTravada?: string | null;
  permitirTroca?: boolean;
}) {
  const { ponteiro, vaga, ocupadas } = args;
  const compatible = args.ancoras.filter(
    (a) =>
      a.tiposAceitos.includes(vaga.tipo) &&
      a.largura > 0 &&
      (args.permitirTroca !== false || !ocupadas[a.id]),
  );
  const distance = (a: Ancora) => Math.hypot(ponteiro.x - a.x, ponteiro.z - a.z);
  const locked = compatible.find((a) => a.id === args.ancoraTravada);
  // Histerese: a peça já encaixada resiste até o raio de soltura.
  if (locked && distance(locked) <= IMA.RAIO_SOLTAR * locked.largura)
    return {
      posicao: { x: locked.x, z: locked.z },
      ancoraAlvo: locked.id,
      travada: true,
      forca: 1,
    };
  const anchor = compatible.reduce<Ancora | undefined>(
    (best, a) => (!best || distance(a) < distance(best) ? a : best),
    undefined,
  );
  if (!anchor || distance(anchor) > IMA.RAIO_ATRACAO * anchor.largura)
    return { posicao: { ...ponteiro }, ancoraAlvo: null, travada: false, forca: 0 };
  const relative = distance(anchor) / anchor.largura;
  const t = Math.max(
    0,
    Math.min(1, (IMA.RAIO_ATRACAO - relative) / (IMA.RAIO_ATRACAO - IMA.RAIO_ENCAIXE)),
  );
  const forca = t * t * (3 - 2 * t);
  return {
    posicao: {
      x: ponteiro.x + (anchor.x - ponteiro.x) * forca,
      z: ponteiro.z + (anchor.z - ponteiro.z) * forca,
    },
    ancoraAlvo: anchor.id,
    travada: relative <= IMA.RAIO_ENCAIXE,
    forca,
  };
}
