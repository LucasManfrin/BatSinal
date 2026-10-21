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
  x: number;
  y: number;
  largura: number;
  altura: number;
  rotacao: number;
  sensorId?: string;
}
export interface ElementoLayout {
  id: string;
  estacionamentoId: string;
  tipo: 'VIA' | 'ENTRADA' | 'SAIDA' | 'TEXTO';
  x: number;
  y: number;
  largura: number;
  altura: number;
  rotacao: number;
  texto?: string;
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
export interface Layout {
  vagas: Vaga[];
  elementos: ElementoLayout[];
}
export interface DetalheEstacionamento extends Estacionamento, Layout {}
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
export interface GridOptions {
  linhas: number;
  colunas: number;
  largura: number;
  altura: number;
  espacamento: number;
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
