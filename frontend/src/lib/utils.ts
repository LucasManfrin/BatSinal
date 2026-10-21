import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { GridOptions, Vaga } from '../types';

export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}
export function ocupacao(total: number, livres: number) {
  return total > 0 ? Math.round(((total - Math.min(total, Math.max(0, livres))) / total) * 100) : 0;
}
export function tendencia(antes: number, agora: number) {
  return agora > antes ? 'SUBINDO' : agora < antes ? 'CAINDO' : 'ESTAVEL';
}
export function snapToGrid(value: number, grid = 10) {
  return Math.round(value / grid) * grid;
}
export function gerarGrid(estacionamentoId: string, options: GridOptions): Vaga[] {
  const { linhas, colunas, largura, altura, espacamento } = options;
  if (
    ![linhas, colunas, largura, altura, espacamento].every(Number.isFinite) ||
    linhas < 1 ||
    colunas < 1 ||
    linhas > 20 ||
    colunas > 30 ||
    !Number.isInteger(linhas) ||
    !Number.isInteger(colunas) ||
    largura < 20 ||
    altura < 20 ||
    espacamento < 0
  )
    throw new Error('Use até 20 linhas e 30 colunas; dimensões ≥ 20 e espaçamento ≥ 0.');
  return Array.from({ length: linhas * colunas }, (_, index) => {
    const linha = Math.floor(index / colunas);
    return {
      id: crypto.randomUUID(),
      estacionamentoId,
      rotulo: `${String.fromCharCode(65 + linha)}${(index % colunas) + 1}`,
      tipo: 'COMUM',
      x: 48 + (index % colunas) * (largura + espacamento),
      y: 48 + linha * (altura + espacamento + 42),
      largura,
      altura,
      rotacao: 0,
    };
  });
}

// SAT: projeta os quatro cantos nos eixos dos dois retângulos, inclusive rotacionados.
export function sobrepoe(a: Vaga, b: Vaga): boolean {
  const corners = (v: Vaga) => {
    const r = (v.rotacao * Math.PI) / 180;
    return [
      [0, 0],
      [v.largura, 0],
      [v.largura, v.altura],
      [0, v.altura],
    ].map(([x, y]) => ({
      x: v.x + x * Math.cos(r) - y * Math.sin(r),
      y: v.y + x * Math.sin(r) + y * Math.cos(r),
    }));
  };
  const ca = corners(a);
  const cb = corners(b);
  for (const v of [a, b]) {
    const r = (v.rotacao * Math.PI) / 180;
    for (const [x, y] of [
      [Math.cos(r), Math.sin(r)],
      [-Math.sin(r), Math.cos(r)],
    ]) {
      const pa = ca.map((p) => p.x * x + p.y * y);
      const pb = cb.map((p) => p.x * x + p.y * y);
      if (Math.max(...pa) <= Math.min(...pb) + 0.01 || Math.max(...pb) <= Math.min(...pa) + 0.01)
        return false;
    }
  }
  return true;
}
export function tempoDesde(date?: string) {
  if (!date) return 'Nunca';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  return seconds < 60
    ? `há ${seconds} s`
    : seconds < 3600
      ? `há ${Math.floor(seconds / 60)} min`
      : `há ${Math.floor(seconds / 3600)} h`;
}
export function mensagemErro(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.';
}
