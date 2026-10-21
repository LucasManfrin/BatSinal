import type {
  CelulaHeatmap,
  DetalheEstacionamento,
  Empresa,
  PontoOcupacao,
  Sensor,
  StatusVagaAtual,
  MapaCampus,
  AreaEstacionamento,
  Ancora,
} from '../types';
import { createCampusMap } from './campus';
import { mappedPositions } from './positions';

export interface MockStore {
  positionSchema?: number;
  areas: AreaEstacionamento[];
  ancoras: Ancora[];
  layoutsLegados?: Record<string, unknown>;
  navigationSchema?: number;
  empresas: Empresa[];
  accessSchema?: number;
  campusSchema?: number;
  mapas?: Record<string, MapaCampus>;
  contas: Record<string, { email: string; senha: string }>;
  estacionamentos: DetalheEstacionamento[];
  sensores: Sensor[];
  status: StatusVagaAtual[];
  sessoes: Record<string, string>;
  historico: Record<string, PontoOcupacao[]>;
}
export const DEMO_PASSWORD = 'Demo@123';
// Exemplos para a demonstração; não representam acessos ou percursos reais do campus.
const demoAccess = [
  {
    portao: 'Portão 1 · Rua Irmã Arminda',
    caminhadaMinutos: 2,
    caminhadaDestino: 'os blocos A e B',
  },
  { portao: 'Portão 2 · Acesso acadêmico', caminhadaMinutos: 1, caminhadaDestino: 'o bloco C' },
  { portao: 'Portão 3 · Acesso esportivo', caminhadaMinutos: 4, caminhadaDestino: 'o ginásio' },
];
export function createSeed(): MockStore {
  const names = ['Estacionamento Central', 'Bloco Acadêmico', 'Complexo Esportivo'];
  const initialLots = names.map((nome, index) => {
    const id = `est-${index + 1}`;
    const vagas = Array.from({ length: index === 0 ? 40 : index === 1 ? 32 : 20 }, (_, i) => ({
      estacionamentoId: id,
      rotulo: `${String.fromCharCode(65 + Math.floor(i / (index === 1 ? 8 : 10)))}${(i % (index === 1 ? 8 : 10)) + 1}`,
    })).map((vaga, i) => ({
      ...vaga,
      id: `${id}-vaga-${i + 1}`,
      tipo: i % 15 === 0 ? ('PCD' as const) : i % 13 === 0 ? ('MOTO' as const) : ('COMUM' as const),
      sensorId: `${id}-sensor-${i + 1}`,
    }));
    return {
      id,
      empresaId: 'unisagrado',
      nome,
      descricao: [
        'Acesso principal · Rua Irmã Arminda',
        'Próximo aos blocos de salas de aula',
        'Acesso às quadras e ao ginásio',
      ][index],
      ...demoAccess[index],
      latitude: -22.327 + index * 0.0014,
      longitude: -49.054 + index * 0.0011,
      largura: 780,
      altura: 680,
      vagas,
    };
  });
  const mapa = createCampusMap();
  const { estacionamentos, areas, ancoras } = mappedPositions(
    initialLots as unknown as DetalheEstacionamento[],
    { unisagrado: mapa },
  );
  // A demonstração nova tem três peças na bandeja; migrações não removem posições existentes.
  estacionamentos
    .flatMap((l) => l.vagas)
    .slice(0, 3)
    .forEach((v) => {
      v.ancoraId = undefined;
    });
  const status = estacionamentos.flatMap((lot, li) =>
    lot.vagas.map((vaga, i): StatusVagaAtual => ({
      vagaId: vaga.id,
      status: i === 18 ? 'SEM_SINAL' : i % (li === 0 ? 3 : 4) === 0 ? 'LIVRE' : 'OCUPADA',
      atualizadoEm: new Date(
        Date.now() - (i === 18 ? 120000 : (2 + (i % 23)) * 1000),
      ).toISOString(),
    })),
  );
  const sensores = estacionamentos.flatMap((lot) =>
    lot.vagas.map((vaga) => ({
      id: vaga.sensorId!,
      empresaId: 'unisagrado',
      nome: `Sensor ${vaga.rotulo} · ${lot.nome.replace('Estacionamento ', '')}`,
      vagaId: vaga.id,
      ultimoSinalEm: status.find((s) => s.vagaId === vaga.id)!.atualizadoEm,
    })),
  );
  const historico = Object.fromEntries(
    estacionamentos.map((lot, li) => [
      lot.id,
      Array.from({ length: 14 * 48 + 1 }, (_, i) => {
        const date = new Date(Date.now() - (14 * 48 - i) * 30 * 60000);
        const hour = date.getHours() + date.getMinutes() / 60;
        const peak = [7.5, 12, 18.5].reduce(
          (sum, center) => sum + Math.exp(-((hour - center) ** 2) / 6) * 48,
          0,
        );
        const ocupacao = Math.min(
          98,
          Math.round(
            (22 + peak + Math.sin(i * 1.7 + li) * 5) * ([0, 6].includes(date.getDay()) ? 0.5 : 1),
          ),
        );
        return {
          instante: date.toISOString(),
          ocupacao,
          livres: Math.round(lot.vagas.length * (1 - ocupacao / 100)),
        };
      }),
    ]),
  );
  return {
    positionSchema: 1,
    areas,
    ancoras,
    navigationSchema: 1,
    accessSchema: 4,
    campusSchema: 1,
    mapas: { unisagrado: createCampusMap() },
    empresas: [{ id: 'unisagrado', nome: 'Unisagrado', slug: 'unisagrado' }],
    contas: { unisagrado: { email: 'admin@unisagrado.demo', senha: DEMO_PASSWORD } },
    estacionamentos,
    status,
    sensores,
    historico,
    sessoes: {},
  };
}
export const STORAGE_KEY = 'batsinal.mock.v1';
interface LegacyStore extends Omit<MockStore, 'empresas' | 'contas' | 'areas' | 'ancoras'> {
  empresas: (Pick<Empresa, 'id' | 'nome'> & Partial<Empresa>)[];
  contas?: MockStore['contas'];
  areas?: AreaEstacionamento[];
  ancoras?: Ancora[];
  administradores?: { id: string; empresaId: string; email: string; senha: string }[];
  usuarios?: { id: string; empresaId: string; email: string; senha: string; role?: string }[];
}
export function migrateStore(saved: LegacyStore): MockStore {
  const antigos = saved.administradores ?? (saved.usuarios ?? []).filter((u) => u.role === 'ADMIN');
  const contas =
    saved.contas ??
    Object.fromEntries(antigos.map((u) => [u.empresaId, { email: u.email, senha: u.senha }]));
  const empresas = saved.empresas.map((e) => ({
    id: e.id,
    nome: e.nome,
    slug: e.slug ?? (e.id === 'unisagrado' ? 'unisagrado' : 'campus-' + e.id),
  }));
  const sessoes = Object.fromEntries(
    Object.entries(saved.sessoes).flatMap(([token, id]) => {
      const empresaId = saved.contas ? id : antigos.find((u) => u.id === id)?.empresaId;
      return empresaId && contas[empresaId] && empresas.some((e) => e.id === empresaId)
        ? [[token, empresaId]]
        : [];
    }),
  );
  const mapas =
    saved.mapas ??
    (empresas.some((e) => e.id === 'unisagrado') ? { unisagrado: createCampusMap() } : {});
  const positions =
    saved.positionSchema === 1 && saved.areas && saved.ancoras
      ? { areas: saved.areas, ancoras: saved.ancoras, estacionamentos: saved.estacionamentos }
      : mappedPositions(saved.estacionamentos, mapas);
  return {
    positionSchema: 1,
    areas: positions.areas,
    ancoras: positions.ancoras,
    layoutsLegados:
      saved.layoutsLegados ??
      (saved.positionSchema !== 1
        ? Object.fromEntries(
            saved.estacionamentos.map((lot) => [lot.id, JSON.parse(JSON.stringify(lot))]),
          )
        : undefined),
    navigationSchema: saved.navigationSchema,
    accessSchema: 4,
    campusSchema: 1,
    mapas:
      saved.mapas ??
      (empresas.some((e) => e.id === 'unisagrado') ? { unisagrado: createCampusMap() } : {}),
    empresas,
    contas,
    sessoes,
    estacionamentos: positions.estacionamentos,
    sensores: saved.sensores,
    status: saved.status,
    historico: saved.historico,
  };
}
function loadStore(): MockStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const legacy = JSON.parse(raw) as LegacyStore;
      const saved = migrateStore(legacy);
      if (saved.navigationSchema !== 1) {
        // Acrescenta só os campos novos do seed, preservando cadastros, layouts e leituras.
        saved.estacionamentos.forEach((lot) => {
          const index = ['est-1', 'est-2', 'est-3'].indexOf(lot.id);
          if (lot.empresaId === 'unisagrado' && index >= 0) {
            lot.portao ??= demoAccess[index].portao;
            lot.caminhadaMinutos ??= demoAccess[index].caminhadaMinutos;
            lot.caminhadaDestino ??= demoAccess[index].caminhadaDestino;
          }
        });
        saved.navigationSchema = 1;
      }
      if (
        legacy.accessSchema !== 4 ||
        legacy.navigationSchema !== 1 ||
        legacy.campusSchema !== 1 ||
        legacy.positionSchema !== 1
      ) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        } catch {
          /* Preserva os dados carregados em memória se não houver espaço para gravar a migração. */
        }
      }
      return saved;
    }
  } catch {
    /* Inicia com seed se o armazenamento não estiver disponível. */
  }
  return createSeed();
}
export const store = loadStore();
export function persist(strict = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    if (strict)
      throw new Error(
        'O armazenamento local está cheio ou bloqueado. Libere espaço e tente salvar novamente.',
      );
    /* Leituras do simulador podem continuar em memória. */
  }
}
export function heatmap(id: string): CelulaHeatmap[] {
  const history = store.historico[id] ?? [];
  return Array.from({ length: 7 * 24 }, (_, index) => {
    const dia = Math.floor(index / 24);
    const hora = index % 24;
    const points = history.filter((p) => {
      const d = new Date(p.instante);
      return (d.getDay() + 6) % 7 === dia && d.getHours() === hora;
    });
    return {
      dia,
      hora,
      ocupacao: points.length
        ? Math.round(points.reduce((sum, p) => sum + p.ocupacao, 0) / points.length)
        : 0,
    };
  });
}
