import { useCallback, useEffect, useRef, useState } from 'react';

export function useLocalValue<T>(key: string, initial: T) {
  const read = useCallback((): T => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? initial : (JSON.parse(value) as T);
    } catch {
      return initial;
    }
  }, [key, initial]);
  const [stored, setStored] = useState<{ key: string; value: T }>(() => ({ key, value: read() }));
  const value = stored.key === key ? stored.value : read();
  useEffect(() => {
    const refresh = () => setStored({ key, value: read() });
    window.addEventListener('storage', refresh);
    window.addEventListener('batsinal:local', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('batsinal:local', refresh);
    };
  }, [key, read]);
  const write = (next: T) => {
    setStored({ key, value: next });
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event('batsinal:local'));
    } catch {
      /* A preferência continua nesta aba. */
    }
  };
  return [value, write] as const;
}
const emptyIds: string[] = [];
const emptyAlerts: Record<string, boolean> = {};
export function useFavoritos(slug: string) {
  const [stored, write] = useLocalValue(`batsinal:favoritos:${slug}`, emptyIds);
  const favoritos = Array.isArray(stored)
    ? stored.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    favoritos,
    alternar: (id: string) =>
      write(favoritos.includes(id) ? favoritos.filter((item) => item !== id) : [...favoritos, id]),
  };
}
export const useUltimoDestino = (slug: string) => useLocalValue(`batsinal:destino:${slug}`, '');
export function useAlertaDeVaga(
  slug: string,
  alvo: string,
  livres: number | null,
  avisar: () => void,
) {
  const [alerts, write] = useLocalValue(`batsinal:alertas:${slug}`, emptyAlerts);
  const ativo = Boolean(alerts && typeof alerts === 'object' && alerts[alvo]);
  const previous = useRef<{ alvo: string; livres: number | null }>({ alvo, livres: null });
  const callback = useRef(avisar);
  callback.current = avisar;
  useEffect(() => {
    if (
      ativo &&
      previous.current.alvo === alvo &&
      previous.current.livres === 0 &&
      livres !== null &&
      livres > 0
    ) {
      callback.current();
      write({ ...alerts, [alvo]: false });
    }
    previous.current = { alvo, livres };
  }, [livres, alvo, ativo, alerts, write]);
  return { ativo, alternar: () => write({ ...alerts, [alvo]: !ativo }) };
}
