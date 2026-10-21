import { create } from 'zustand';
import type { Layout } from '../../types';

interface EditorState {
  layout: Layout;
  baseline: string;
  past: Layout[];
  future: Layout[];
  selected: string[];
  snap: boolean;
  load: (layout: Layout) => void;
  commit: (layout: Layout) => void;
  select: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  discard: () => void;
  setSnap: (value: boolean) => void;
}
const empty: Layout = { vagas: [], elementos: [] };
export const useEditor = create<EditorState>((set, get) => ({
  layout: empty,
  baseline: JSON.stringify(empty),
  past: [],
  future: [],
  selected: [],
  snap: true,
  load: (layout) =>
    set({ layout, baseline: JSON.stringify(layout), past: [], future: [], selected: [] }),
  commit: (layout) => {
    if (JSON.stringify(layout) !== JSON.stringify(get().layout))
      set((state) => ({ layout, past: [...state.past.slice(-49), state.layout], future: [] }));
  },
  select: (selected) => set({ selected }),
  undo: () =>
    set((state) =>
      state.past.length
        ? {
            layout: state.past.at(-1)!,
            past: state.past.slice(0, -1),
            future: [state.layout, ...state.future],
            selected: [],
          }
        : state,
    ),
  redo: () =>
    set((state) =>
      state.future.length
        ? {
            layout: state.future[0],
            past: [...state.past, state.layout],
            future: state.future.slice(1),
            selected: [],
          }
        : state,
    ),
  markSaved: () => set((state) => ({ baseline: JSON.stringify(state.layout) })),
  discard: () =>
    set((state) => ({
      layout: JSON.parse(state.baseline) as Layout,
      selected: [],
      past: [],
      future: [],
    })),
  setSnap: (snap) => set({ snap }),
}));
