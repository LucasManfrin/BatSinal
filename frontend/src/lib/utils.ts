import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}
export function ocupacao(total: number, livres: number) {
  return total > 0 ? Math.round(((total - Math.min(total, Math.max(0, livres))) / total) * 100) : 0;
}
export function tendencia(antes: number, agora: number) {
  return agora > antes ? 'SUBINDO' : agora < antes ? 'CAINDO' : 'ESTAVEL';
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
