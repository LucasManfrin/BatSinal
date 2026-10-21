import type { ErroApi } from '../types';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(
  /\/$/,
  '',
);
export const TOKEN_KEY = 'batsinal.token';
export class ApiError extends Error {
  constructor(public details: ErroApi) {
    super(details.mensagem);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const publicRequest = path.startsWith('/publico/') || path.startsWith('/public/');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && !publicRequest ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401 && !publicRequest && !path.startsWith('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('batsinal:logout'));
    }
    const details: ErroApi = await response.json().catch(() => ({
      status: response.status,
      mensagem: 'Serviço indisponível. Tente novamente.',
    }));
    throw new ApiError(details);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const json = (value: unknown) => JSON.stringify(value);
