import { useCallback, useEffect, useState } from 'react';
import type { TipoVaga } from '../../types';

export interface Vehicle {
  id: string;
  nome: string;
  tipo: 'COMUM' | 'MOTO';
}
export interface RecentVisit {
  id: string;
  nome: string;
  instante: string;
}
export interface Preferences {
  tipo: TipoVaga | '';
  favoritosPrimeiro: boolean;
  veiculos: Vehicle[];
  recentes: RecentVisit[];
}
const empty: Preferences = { tipo: '', favoritosPrimeiro: false, veiculos: [], recentes: [] };
const key = (userId: string) => `batsinal.preferences.${userId}`;
export function readPreferences(userId: string): Preferences {
  try {
    const stored = localStorage.getItem(key(userId));
    return stored ? { ...empty, ...(JSON.parse(stored) as Partial<Preferences>) } : { ...empty };
  } catch {
    return { ...empty };
  }
}
function writePreferences(userId: string, preferences: Preferences) {
  localStorage.setItem(key(userId), JSON.stringify(preferences));
  window.dispatchEvent(new Event('batsinal:preferences'));
}
export function recordVisit(userId: string, id: string, nome: string) {
  const current = readPreferences(userId);
  // StrictMode remonta efeitos em desenvolvimento; uma visita não deve ser duplicada.
  if (
    current.recentes[0]?.id === id &&
    Date.now() - Date.parse(current.recentes[0].instante) < 60000
  )
    return;
  writePreferences(userId, {
    ...current,
    recentes: [
      { id, nome, instante: new Date().toISOString() },
      ...current.recentes.filter((r) => r.id !== id),
    ].slice(0, 5),
  });
}
export function usePreferences(userId: string) {
  const [value, setValue] = useState(() => readPreferences(userId));
  useEffect(() => {
    const refresh = () => setValue(readPreferences(userId));
    refresh();
    window.addEventListener('batsinal:preferences', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('batsinal:preferences', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [userId]);
  const update = useCallback(
    (changes: Partial<Preferences>) => {
      const next = { ...readPreferences(userId), ...changes };
      writePreferences(userId, next);
      setValue(next);
    },
    [userId],
  );
  return { preferences: value, update };
}
