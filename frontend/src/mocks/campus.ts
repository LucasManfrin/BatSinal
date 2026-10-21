import type { MapaCampus, PontoCampus } from '../types';

const rect = (x: number, y: number, w: number, h: number): PontoCampus[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

// Interpretação aproximada da imagem marcada pelo grupo. Não é um levantamento topográfico.
// Os IDs apontam para as 92 vagas demonstrativas existentes; nenhum layout é substituído.
export function createCampusMap(): MapaCampus {
  const rows: {
    id: string;
    nome: string;
    lot: number;
    start: number;
    count: number;
    from: PontoCampus;
    to: PontoCampus;
    rotacao: number;
  }[] = [
    {
      id: 'frente-ab',
      nome: 'Em frente aos blocos A e B',
      lot: 1,
      start: 1,
      count: 12,
      from: [105, 310],
      to: [310, 310],
      rotacao: -16,
    },
    {
      id: 'frente-cde',
      nome: 'Em frente aos blocos C, D e E',
      lot: 1,
      start: 13,
      count: 12,
      from: [355, 310],
      to: [560, 310],
      rotacao: -16,
    },
    {
      id: 'canteiro-1',
      nome: 'Canteiro próximo ao Portão 1',
      lot: 1,
      start: 25,
      count: 8,
      from: [130, 414],
      to: [285, 390],
      rotacao: 18,
    },
    {
      id: 'canteiro-2',
      nome: 'Canteiro próximo ao IDEA',
      lot: 1,
      start: 33,
      count: 8,
      from: [440, 410],
      to: [600, 386],
      rotacao: 18,
    },
    {
      id: 'lateral-afg',
      nome: 'Lateral dos blocos A a G',
      lot: 2,
      start: 1,
      count: 16,
      from: [80, 40],
      to: [560, 40],
      rotacao: 0,
    },
    {
      id: 'frente-j',
      nome: 'Em frente ao Bloco J',
      lot: 2,
      start: 17,
      count: 10,
      from: [685, 306],
      to: [885, 306],
      rotacao: -16,
    },
    {
      id: 'lado-j',
      nome: 'Ao lado do Bloco J',
      lot: 2,
      start: 27,
      count: 6,
      from: [644, 130],
      to: [644, 245],
      rotacao: 90,
    },
    {
      id: 'canteiro-j',
      nome: 'Canteiro em frente ao Bloco J',
      lot: 3,
      start: 1,
      count: 5,
      from: [747, 414],
      to: [853, 400],
      rotacao: 18,
    },
    {
      id: 'frente-l',
      nome: 'Em frente ao Bloco L',
      lot: 3,
      start: 6,
      count: 6,
      from: [1088, 300],
      to: [1215, 300],
      rotacao: -16,
    },
    {
      id: 'lado-l',
      nome: 'Lateral do Bloco L',
      lot: 3,
      start: 12,
      count: 6,
      from: [1270, 128],
      to: [1270, 251],
      rotacao: 90,
    },
    {
      id: 'portao-4',
      nome: 'Próximo ao Portão 4',
      lot: 3,
      start: 18,
      count: 3,
      from: [1110, 38],
      to: [1180, 38],
      rotacao: 0,
    },
  ];
  return {
    versao: 1,
    nome: 'Unisagrado',
    aproximado: true,
    limite: [
      [20, 0],
      [1300, 0],
      [1325, 90],
      [1325, 420],
      [1280, 465],
      [60, 465],
      [0, 410],
      [0, 60],
    ],
    predios: [
      {
        id: 'ab',
        nome: 'Blocos A e B',
        contorno: rect(90, 105, 200, 160),
        altura: 50,
        entrada: [185, 275],
      },
      {
        id: 'cde',
        nome: 'Blocos C, D e E',
        contorno: rect(320, 105, 135, 160),
        altura: 58,
        entrada: [388, 275],
      },
      {
        id: 'fg',
        nome: 'Blocos F e G',
        contorno: rect(475, 105, 135, 160),
        altura: 62,
        entrada: [540, 275],
      },
      {
        id: 'j',
        nome: 'Bloco J',
        contorno: [
          [700, 110],
          [940, 110],
          [940, 262],
          [855, 262],
          [855, 248],
          [700, 248],
        ],
        altura: 78,
        entrada: [820, 276],
      },
      {
        id: 'k',
        nome: 'Bloco K',
        contorno: rect(700, 65, 240, 35),
        altura: 64,
        entrada: [965, 92],
      },
      {
        id: 'o',
        nome: 'Bloco O',
        contorno: rect(978, 110, 77, 145),
        altura: 60,
        entrada: [1018, 272],
      },
      {
        id: 'l',
        nome: 'Bloco L',
        contorno: rect(1090, 100, 135, 145),
        altura: 54,
        entrada: [1155, 267],
      },
      {
        id: 'quadra',
        nome: 'Quadra',
        contorno: rect(1090, 59, 135, 32),
        altura: 33,
        entrada: [1239, 77],
      },
      {
        id: 'idea',
        nome: 'IDEA',
        contorno: rect(435, 440, 180, 18),
        altura: 22,
        entrada: [525, 430],
      },
    ],
    portoes: [
      { id: 'p1', nome: 'Portão 1', ponto: [70, 465], veiculos: true },
      { id: 'p2', nome: 'Portão 2 · pedestres', ponto: [0, 310], veiculos: false },
      { id: 'p3', nome: 'Portão 3', ponto: [1325, 355], veiculos: true },
      { id: 'p4', nome: 'Portão 4', ponto: [1280, 0], veiculos: true },
    ],
    vias: [
      {
        id: 'frontal',
        pontos: [
          [40, 465],
          [40, 355],
          [635, 355],
          [680, 350],
          [1285, 350],
          [1325, 355],
        ],
        largura: 44,
      },
      {
        id: 'lateral',
        pontos: [
          [40, 355],
          [40, 65],
          [640, 65],
          [660, 85],
        ],
        largura: 29,
      },
      {
        id: 'central',
        pontos: [
          [635, 355],
          [655, 280],
          [674, 70],
          [1058, 70],
          [1280, 25],
          [1280, 0],
        ],
        largura: 27,
      },
      {
        id: 'retorno',
        pontos: [
          [40, 435],
          [315, 435],
          [345, 380],
          [630, 435],
          [910, 435],
          [960, 355],
        ],
        largura: 26,
      },
      {
        id: 'leste',
        pontos: [
          [1285, 350],
          [1305, 275],
          [1305, 92],
          [1280, 25],
        ],
        largura: 28,
      },
    ],
    areas: rows.map((row) => {
      const [x, y] = row.from;
      const [tx, ty] = row.to;
      return {
        id: row.id,
        nome: row.nome,
        contorno:
          row.rotacao === 90
            ? [
                [x - 19, y - 14],
                [x + 19, y - 9],
                [tx + 19, ty + 14],
                [tx - 19, ty + 19],
              ]
            : [
                [x - 13, y - 24],
                [tx + 15, ty - 24],
                [tx + 23, ty + 25],
                [x - 20, y + 25],
              ],
      };
    }),
    posicoes: rows.flatMap((row) =>
      Array.from({ length: row.count }, (_, i) => ({
        vagaId: `est-${row.lot}-vaga-${row.start + i}`,
        areaId: row.id,
        ponto: [
          row.from[0] + ((row.to[0] - row.from[0]) * i) / (row.count - 1),
          row.from[1] + ((row.to[1] - row.from[1]) * i) / (row.count - 1),
        ] as PontoCampus,
        rotacao: row.rotacao,
      })),
    ),
  };
}
