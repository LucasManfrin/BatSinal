import type { Ancora, AreaEstacionamento, DetalheEstacionamento, MapaCampus, Vaga } from '../types';
export function mappedPositions(lots: DetalheEstacionamento[], mapas: Record<string, MapaCampus>) {
  const areas: AreaEstacionamento[] = [];
  const ancoras: Ancora[] = [];
  for (const [empresaId, mapa] of Object.entries(mapas)) {
    for (const area of mapa.areas) {
      const positions = mapa.posicoes.filter((p) => p.areaId === area.id);
      const lot = lots.find(
        (l) =>
          l.empresaId === empresaId &&
          positions.some(
            (p) => l.vagas.some((v) => v.id === p.vagaId) || p.vagaId.startsWith(l.id + '-'),
          ),
      );
      if (!lot) continue;
      areas.push({
        ...area,
        empresaId,
        estacionamentoId: lot.id,
        versao: 1,
        contorno: area.contorno.map(([x, z]) => [x / 10, z / 10]),
      });
      positions.forEach((p) => {
        const vaga = lot.vagas.find((v) => v.id === p.vagaId);
        ancoras.push({
          id: 'ancora-' + p.vagaId,
          areaId: area.id,
          x: p.ponto[0] / 10,
          z: p.ponto[1] / 10,
          rotacao: p.rotacao,
          largura: 1.2,
          profundidade: 2.8,
          tiposAceitos: [vaga?.tipo ?? 'COMUM'],
          vagaPadraoId: p.vagaId,
        });
      });
    }
  }
  const estacionamentos = lots.map((lot) => ({
    id: lot.id,
    empresaId: lot.empresaId,
    nome: lot.nome,
    descricao: lot.descricao,
    portao: lot.portao,
    caminhadaMinutos: lot.caminhadaMinutos,
    caminhadaDestino: lot.caminhadaDestino,
    latitude: lot.latitude,
    longitude: lot.longitude,
    largura: lot.largura,
    altura: lot.altura,
    vagas: lot.vagas.map((vaga): Vaga => {
      const anchor = ancoras.find((a) => a.vagaPadraoId === vaga.id);
      const areaId = anchor?.areaId ?? `${lot.id}-sem-mapa`;
      if (!areas.some((a) => a.id === areaId))
        areas.push({
          id: areaId,
          empresaId: lot.empresaId,
          estacionamentoId: lot.id,
          nome: `${lot.nome} · a mapear`,
          contorno: [],
          versao: 1,
        });
      return {
        id: vaga.id,
        estacionamentoId: lot.id,
        areaId,
        rotulo: vaga.rotulo,
        tipo: vaga.tipo,
        ancoraId: anchor?.id,
        sensorId: vaga.sensorId,
      };
    }),
  }));
  return { areas, ancoras, estacionamentos };
}
