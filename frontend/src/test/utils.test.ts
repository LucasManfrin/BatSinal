import { describe, expect, it } from 'vitest';
import { ocupacao, tendencia } from '../lib/utils';
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
