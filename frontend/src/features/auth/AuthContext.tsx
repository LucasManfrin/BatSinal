import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api, json, TOKEN_KEY } from '../../lib/api';
import type { Role, Sessao, Usuario } from '../../types';
import { Loading } from '../../components/ui';

interface AuthState {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<Usuario>;
  register: (body: Record<string, string>) => Promise<Usuario>;
  logout: () => void;
}
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);
  useEffect(() => {
    let mounted = true;
    if (localStorage.getItem(TOKEN_KEY))
      api<Usuario>('/auth/me')
        .then((u) => {
          if (mounted) setUser(u);
        })
        .catch(() => {
          if (mounted) logout();
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    else setLoading(false);
    window.addEventListener('batsinal:logout', logout);
    return () => {
      mounted = false;
      window.removeEventListener('batsinal:logout', logout);
    };
  }, [logout]);
  async function authenticate(path: string, body: Record<string, string>) {
    const session = await api<Sessao>(path, { method: 'POST', body: json(body) });
    queryClient.clear();
    localStorage.setItem(TOKEN_KEY, session.token);
    setUser(session.usuario);
    return session.usuario;
  }
  return (
    <Context.Provider
      value={{
        user,
        loading,
        logout,
        login: (email, senha) => authenticate('/auth/login', { email, senha }),
        register: (body) => authenticate('/auth/cadastro-empresa', body),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider ausente.');
  return value;
}
export function canAccess(role: Role | undefined, required?: Role) {
  return Boolean(role && (!required || role === required));
}
export function RoleGuard({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!canAccess(user.role, role)) return <Navigate to="/estacionamentos" replace />;
  return <Outlet />;
}
