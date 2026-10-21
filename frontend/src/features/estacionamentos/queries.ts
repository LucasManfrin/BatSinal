import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../auth/AuthContext';
import type {
  CampusPublico,
  DetalheEstacionamento,
  Empresa,
  EstacionamentoResumo,
  Sensor,
  StatusVagaAtual,
} from '../../types';

export function usePublicCampi() {
  return useQuery({
    queryKey: ['campi-publicos'],
    queryFn: () => api<CampusPublico[]>('/publico/campi'),
  });
}
export function useCompany() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['empresa', user?.empresaId],
    queryFn: () => api<Empresa>('/empresa'),
    enabled: Boolean(user),
  });
}
function useScope() {
  const { campusSlug } = useParams();
  const { user } = useAuth();
  return {
    key: campusSlug ? `publico:${campusSlug}` : `empresa:${user?.empresaId ?? ''}`,
    enabled: Boolean(campusSlug || user),
    prefix: campusSlug ? `/publico/campi/${encodeURIComponent(campusSlug)}` : '',
  };
}
export function useLots() {
  const scope = useScope();
  return useQuery({
    queryKey: ['estacionamentos', scope.key],
    queryFn: () => api<EstacionamentoResumo[]>(`${scope.prefix}/estacionamentos`),
    refetchInterval: 3000,
    enabled: scope.enabled,
  });
}
export function useLot(id: string) {
  const scope = useScope();
  return useQuery({
    queryKey: ['estacionamento', id, scope.key],
    queryFn: () => api<DetalheEstacionamento>(`${scope.prefix}/estacionamentos/${id}`),
    enabled: Boolean(id) && scope.enabled,
  });
}
export function useStatuses(id: string) {
  const scope = useScope();
  return useQuery({
    queryKey: ['status', id, scope.key],
    queryFn: () => api<StatusVagaAtual[]>(`${scope.prefix}/estacionamentos/${id}/status`),
    refetchInterval: 3000,
    enabled: Boolean(id) && scope.enabled,
  });
}
export const useSensors = () =>
  useQuery({
    queryKey: ['sensores'],
    queryFn: () => api<Sensor[]>('/sensores'),
    refetchInterval: 3000,
  });
