export type StatusVaga = 'LIVRE' | 'OCUPADA' | 'SEM_SINAL';
export type TipoVaga = 'COMUM' | 'PCD' | 'MOTO';
export interface Empresa {
  id: string;
  nome: string;
  slug: string;
}
export type CampusPublico = Pick<Empresa, 'id' | 'nome' | 'slug'>;
export interface ContaEmpresa extends Empresa {
  email: string;
}
export interface Estacionamento {
  id: string;
  empresaId: string;
  nome: string;
  descricao?: string;
  portao?: string;
  caminhadaMinutos?: number;
  caminhadaDestino?: string;
  latitude: number;
  longitude: number;
  largura: number;
  altura: number;
}
export interface EstacionamentoResumo extends Estacionamento {
  totalVagas: number;
  vagasLivres: number;
  tendencia: 'SUBINDO' | 'ESTAVEL' | 'CAINDO';
  livresPorTipo: Record<TipoVaga, number>;
}
export interface Vaga {
  id: string;
  estacionamentoId: string;
  rotulo: string;
  tipo: TipoVaga;
  areaId: string;
  ancoraId?: string;
  sensorId?: string;
}
export interface Ancora {
  id: string;
  areaId: string;
  x: number;
  z: number;
  rotacao: number;
  largura: number;
  profundidade: number;
  tiposAceitos: TipoVaga[];
  vagaPadraoId?: string;
}
export interface AreaEstacionamento {
  id: string;
  empresaId: string;
  estacionamentoId: string;
  nome: string;
  contorno: PontoCampus[];
  versao: number;
  progresso?: { posicionadas: number; total: number };
}
export interface StatusVagaAtual {
  vagaId: string;
  status: StatusVaga;
  atualizadoEm: string;
}
export interface Sensor {
  id: string;
  empresaId: string;
  nome: string;
  vagaId?: string;
  ultimoSinalEm?: string;
}
export interface DetalheEstacionamento extends Estacionamento {
  vagas: Vaga[];
}
export interface VagaComStatus extends Vaga {
  status: StatusVaga;
  atualizadoEm: string;
}
export interface DetalheArea {
  area: AreaEstacionamento;
  ancoras: Ancora[];
  vagas: VagaComStatus[];
  mapa: MapaCampus | null;
}
export interface Sessao {
  token: string;
  empresa: ContaEmpresa;
}
export interface ErroApi {
  status: number;
  mensagem: string;
  campos?: Record<string, string>;
}
export interface PontoOcupacao {
  instante: string;
  ocupacao: number;
  livres: number;
}
export interface CelulaHeatmap {
  dia: number;
  hora: number;
  ocupacao: number;
}
// Coordenadas locais da cena, sem pressupor escala ou georreferenciamento.
export type PontoCampus = [number, number];
export interface PredioCampus {
  id: string;
  nome: string;
  contorno: PontoCampus[];
  altura: number;
  entrada: PontoCampus;
}
export interface MapaCampus {
  versao: number;
  nome: string;
  aproximado: boolean;
  limite: PontoCampus[];
  predios: PredioCampus[];
  portoes: { id: string; nome: string; ponto: PontoCampus; veiculos: boolean }[];
  vias: { id: string; pontos: PontoCampus[]; largura: number }[];
  areas: { id: string; nome: string; contorno: PontoCampus[] }[];
  posicoes: { vagaId: string; areaId: string; ponto: PontoCampus; rotacao: number }[];
}
export interface VagaCampus {
  id: string;
  rotulo: string;
  tipo: TipoVaga;
  status: StatusVaga;
  atualizadoEm: string;
  areaId: string;
  ponto: PontoCampus;
  rotacao: number;
}
export interface ConsultaCampus {
  mapa: MapaCampus | null;
  vagas: VagaCampus[];
  vagasSemPosicao: number;
}
