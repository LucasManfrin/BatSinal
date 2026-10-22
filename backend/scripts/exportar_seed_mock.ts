// Exporta a geometria do seed do mock para backend/database/seed-unisagrado.json.
// Executar na raiz do repositório: node backend/scripts/exportar_seed_mock.ts
// Reaproveita campus.ts/positions.ts sem redesenhar nada; IDs continuam legíveis e
// o importador Python (app/seed.py) os converte em UUID.
import { writeFileSync } from 'node:fs';
import { createCampusMap } from '../../frontend/src/mocks/campus.ts';
import { mappedPositions } from '../../frontend/src/mocks/positions.ts';

const nomes = ['Estacionamento Central', 'Bloco Acadêmico', 'Complexo Esportivo'];
const descricoes = [
  'Acesso principal · Rua Irmã Arminda',
  'Próximo aos blocos de salas de aula',
  'Acesso às quadras e ao ginásio',
];
const acessos = [
  { portao: 'Portão 1 · Rua Irmã Arminda', caminhadaMinutos: 2, caminhadaDestino: 'os blocos A e B' },
  { portao: 'Portão 2 · Acesso acadêmico', caminhadaMinutos: 1, caminhadaDestino: 'o bloco C' },
  { portao: 'Portão 3 · Acesso esportivo', caminhadaMinutos: 4, caminhadaDestino: 'o ginásio' },
];
// Mesma geração de createSeed() em frontend/src/mocks/seed.ts.
const lots = nomes.map((nome, index) => {
  const id = `est-${index + 1}`;
  const porLinha = index === 1 ? 8 : 10;
  const vagas = Array.from({ length: index === 0 ? 40 : index === 1 ? 32 : 20 }, (_, i) => ({
    id: `${id}-vaga-${i + 1}`,
    estacionamentoId: id,
    rotulo: `${String.fromCharCode(65 + Math.floor(i / porLinha))}${(i % porLinha) + 1}`,
    tipo: i % 15 === 0 ? 'PCD' : i % 13 === 0 ? 'MOTO' : 'COMUM',
    sensorId: `${id}-sensor-${i + 1}`,
  }));
  return {
    id,
    empresaId: 'unisagrado',
    nome,
    descricao: descricoes[index],
    ...acessos[index],
    latitude: -22.327 + index * 0.0014,
    longitude: -49.054 + index * 0.0011,
    largura: 780,
    altura: 680,
    vagas,
  };
});
const mapa = createCampusMap();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { estacionamentos, areas, ancoras } = mappedPositions(lots as any, { unisagrado: mapa });
// A demonstração nova deixa três peças na bandeja.
estacionamentos
  .flatMap((l) => l.vagas)
  .slice(0, 3)
  .forEach((v) => {
    v.ancoraId = undefined;
  });
const sensores = estacionamentos.flatMap((lot) =>
  lot.vagas.map((v) => ({
    id: v.sensorId,
    nome: `Sensor ${v.rotulo} · ${lot.nome.replace('Estacionamento ', '')}`,
    vagaId: v.id,
  })),
);
const saida = {
  geradoDe: 'frontend/src/mocks/{campus,positions,seed}.ts',
  empresa: { id: 'unisagrado', nome: 'Unisagrado', slug: 'unisagrado', email: 'admin@unisagrado.demo' },
  mapa,
  estacionamentos: estacionamentos.map(({ vagas, ...lot }) => ({
    ...lot,
    vagas: vagas.map(({ sensorId: _s, ...v }) => v),
  })),
  areas,
  ancoras,
  sensores,
};
writeFileSync(
  new URL('../database/seed-unisagrado.json', import.meta.url),
  JSON.stringify(saida, null, 1) + '\n',
);
console.log(
  `${estacionamentos.length} estacionamentos, ${areas.length} áreas, ${ancoras.length} âncoras, ${sensores.length} sensores`,
);
