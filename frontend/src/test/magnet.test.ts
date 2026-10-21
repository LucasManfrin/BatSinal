import { describe, expect, it } from 'vitest';
import { calcularIma, IMA } from '../lib/magnet';
import type { Ancora } from '../types';
const a: Ancora = {
  id: 'a',
  areaId: 'area',
  x: 0,
  z: 0,
  rotacao: 0,
  largura: 2,
  profundidade: 4,
  tiposAceitos: ['COMUM'],
};
const run = (x: number, extra: Partial<Parameters<typeof calcularIma>[0]> = {}) =>
  calcularIma({
    ponteiro: { x, z: 0 },
    vaga: { tipo: 'COMUM' },
    ancoras: [a],
    ocupadas: {},
    ...extra,
  });
describe('ímã em unidades da largura da vaga', () => {
  it('escolhe a mais próxima e ignora incompatíveis', () => {
    const b = { ...a, id: 'b', x: 3 };
    expect(run(2.8, { ancoras: [a, b] }).ancoraAlvo).toBe('b');
    expect(run(0, { ancoras: [{ ...a, tiposAceitos: ['MOTO'] }] }).ancoraAlvo).toBeNull();
  });
  it('não atrai fora do raio, cresce suavemente e encaixa no limite', () => {
    expect(run(2 * IMA.RAIO_ATRACAO + 0.01)).toMatchObject({
      ancoraAlvo: null,
      forca: 0,
      travada: false,
    });
    expect(run(2 * IMA.RAIO_ATRACAO).forca).toBe(0);
    expect(run(2 * IMA.RAIO_ENCAIXE)).toMatchObject({
      posicao: { x: 0, z: 0 },
      forca: 1,
      travada: true,
    });
    const middle = run(1.7);
    expect(middle.forca).toBeCloseTo(0.5);
    expect(middle.posicao.x).toBeCloseTo(0.85);
    for (let x = 0; x < 4; x += 0.01) {
      expect(run(x).forca).toBeGreaterThanOrEqual(0);
      expect(run(x).forca).toBeLessThanOrEqual(1);
    }
  });
  it('mantém a trava até o raio de soltura, mesmo com outra âncora mais perto', () => {
    expect(run(3.2, { ancoraTravada: 'a', ancoras: [a, { ...a, id: 'b', x: 3 }] })).toMatchObject({
      ancoraAlvo: 'a',
      travada: true,
    });
    expect(run(3.21, { ancoraTravada: 'a' }).travada).toBe(false);
  });
  it('permite troca ou ignora a ocupada quando solicitado', () => {
    expect(run(0, { ocupadas: { a: 'vaga' } }).travada).toBe(true);
    expect(run(0, { ocupadas: { a: 'vaga' }, permitirTroca: false }).ancoraAlvo).toBeNull();
    expect(run(0, { ancoras: [] }).forca).toBe(0);
  });
});
