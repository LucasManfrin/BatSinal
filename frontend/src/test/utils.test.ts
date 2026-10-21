import { describe, expect, it } from 'vitest';
import { gerarGrid, ocupacao, snapToGrid, sobrepoe, tendencia } from '../lib/utils';
import type { Vaga } from '../types';

const vaga = (changes: Partial<Vaga> = {}): Vaga => ({
  id: 'a',
  estacionamentoId: 'lot',
  rotulo: 'A1',
  tipo: 'COMUM',
  x: 0,
  y: 0,
  largura: 50,
  altura: 80,
  rotacao: 0,
  ...changes,
});
describe('ocupação e tendência', () => {
  it('calcula porcentagem e protege lista vazia e contagens fora da capacidade', () => {
    expect(ocupacao(40, 12)).toBe(70);
    expect(ocupacao(0, 0)).toBe(0);
    expect(ocupacao(10, 20)).toBe(0);
    expect(ocupacao(10, -1)).toBe(100);
  });
  it('compara livres atuais com a leitura anterior', () => {
    expect(tendencia(10, 12)).toBe('SUBINDO');
    expect(tendencia(12, 10)).toBe('CAINDO');
    expect(tendencia(12, 12)).toBe('ESTAVEL');
  });
});
describe('gerador de grid', () => {
  it('gera posições espaçadas, IDs únicos e rótulos por linha', () => {
    const result = gerarGrid('lot', {
      linhas: 2,
      colunas: 3,
      largura: 50,
      altura: 80,
      espacamento: 10,
    });
    expect(result).toHaveLength(6);
    expect(result.map((v) => v.rotulo)).toEqual(['A1', 'A2', 'A3', 'B1', 'B2', 'B3']);
    expect(new Set(result.map((v) => v.id)).size).toBe(6);
    expect(result[1].x - result[0].x).toBe(60);
    expect(result[3].y - result[0].y).toBe(132);
    expect(result.some((v, i) => result.some((other, j) => i !== j && sobrepoe(v, other)))).toBe(
      false,
    );
  });
  it('rejeita dimensões e contagens inválidas', () => {
    expect(() =>
      gerarGrid('lot', { linhas: 0, colunas: 3, largura: 50, altura: 80, espacamento: 10 }),
    ).toThrow();
    expect(() =>
      gerarGrid('lot', { linhas: 2.5, colunas: 3, largura: 50, altura: 80, espacamento: 10 }),
    ).toThrow();
  });
});
describe('geometria do editor', () => {
  it('ajusta posições à grade inclusive negativas', () => {
    expect(snapToGrid(14)).toBe(10);
    expect(snapToGrid(16)).toBe(20);
    expect(snapToGrid(-17)).toBe(-20);
    expect(snapToGrid(23, 5)).toBe(25);
  });
  it('distingue sobreposição, bordas encostadas e retângulos distantes', () => {
    expect(sobrepoe(vaga(), vaga({ x: 20, y: 10 }))).toBe(true);
    expect(sobrepoe(vaga(), vaga({ x: 50 }))).toBe(false);
    expect(sobrepoe(vaga(), vaga({ x: 100 }))).toBe(false);
  });
  it('considera a rotação real em vez de caixas sem rotação', () => {
    expect(sobrepoe(vaga(), vaga({ x: 100, y: 0, rotacao: 90 }))).toBe(true);
    expect(sobrepoe(vaga(), vaga({ x: 160, rotacao: 90 }))).toBe(false);
  });
});
