import { beforeEach, describe, expect, it } from 'vitest';
import { useEditor } from '../features/editor/store';
import { gerarGrid } from '../lib/utils';

beforeEach(() =>
  useEditor.getState().load({
    vagas: gerarGrid('lot', { linhas: 1, colunas: 2, largura: 50, altura: 80, espacamento: 10 }),
    elementos: [],
  }),
);
describe('histórico do editor', () => {
  it('desfaz e refaz uma edição sem alterar a versão salva', () => {
    const state = useEditor.getState();
    const baseline = state.baseline;
    state.commit({
      ...state.layout,
      vagas: state.layout.vagas.map((v, i) => (i === 0 ? { ...v, rotulo: 'NOVA' } : v)),
    });
    expect(useEditor.getState().layout.vagas[0].rotulo).toBe('NOVA');
    expect(useEditor.getState().baseline).toBe(baseline);
    useEditor.getState().undo();
    expect(useEditor.getState().layout.vagas[0].rotulo).toBe('A1');
    useEditor.getState().redo();
    expect(useEditor.getState().layout.vagas[0].rotulo).toBe('NOVA');
    useEditor.getState().discard();
    expect(JSON.stringify(useEditor.getState().layout)).toBe(baseline);
  });
  it('uma nova edição após desfazer limpa o futuro e salvar atualiza a referência', () => {
    const state = useEditor.getState();
    state.commit({
      ...state.layout,
      elementos: [
        {
          id: 'entrada',
          estacionamentoId: 'lot',
          tipo: 'ENTRADA',
          x: 10,
          y: 10,
          largura: 100,
          altura: 30,
          rotacao: 0,
        },
      ],
    });
    useEditor.getState().undo();
    useEditor.getState().commit({ vagas: [], elementos: [] });
    expect(useEditor.getState().future).toHaveLength(0);
    useEditor.getState().markSaved();
    expect(useEditor.getState().baseline).toBe(JSON.stringify({ vagas: [], elementos: [] }));
  });
});
