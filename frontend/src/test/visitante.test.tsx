import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useFavoritos, useAlertaDeVaga, useUltimoDestino } from '../features/visitante/hooks';
beforeEach(() => localStorage.clear());
it('guarda favoritos e destino no aparelho, separados por campus', () => {
  const first = renderHook(() => useFavoritos('unisagrado'));
  act(() => first.result.current.alternar('j'));
  expect(localStorage.getItem('batsinal:favoritos:unisagrado')).toBe('["j"]');
  const other = renderHook(() => useFavoritos('outra'));
  expect(other.result.current.favoritos).toEqual([]);
  const destination = renderHook(() => useUltimoDestino('unisagrado'));
  act(() => destination.result.current[1]('j'));
  expect(localStorage.getItem('batsinal:destino:unisagrado')).toBe('"j"');
  act(() => first.result.current.alternar('j'));
  expect(first.result.current.favoritos).toEqual([]);
});
it('avisa uma vez na transição de lotado para livre e persiste a desativação', () => {
  const notify = vi.fn();
  const hook = renderHook(({ livres }) => useAlertaDeVaga('unisagrado', 'j', livres, notify), {
    initialProps: { livres: 0 as number | null },
  });
  act(() => hook.result.current.alternar());
  expect(hook.result.current.ativo).toBe(true);
  hook.rerender({ livres: null });
  hook.rerender({ livres: 0 });
  hook.rerender({ livres: 2 });
  expect(notify).toHaveBeenCalledTimes(1);
  expect(hook.result.current.ativo).toBe(false);
  hook.rerender({ livres: 3 });
  expect(notify).toHaveBeenCalledTimes(1);
});
it('não avisa ao abrir uma página com vagas, nem aproveita a contagem de outro destino', () => {
  localStorage.setItem('batsinal:alertas:unisagrado', '{"j":true,"k":true}');
  const notify = vi.fn();
  const hook = renderHook(
    ({ alvo, livres }) => useAlertaDeVaga('unisagrado', alvo, livres, notify),
    { initialProps: { alvo: 'j', livres: 0 } },
  );
  hook.rerender({ alvo: 'k', livres: 4 });
  expect(notify).not.toHaveBeenCalled();
});
