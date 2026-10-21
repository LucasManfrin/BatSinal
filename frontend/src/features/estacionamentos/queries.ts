import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, json } from '../../lib/api';
import type {
  DetalheEstacionamento,
  EstacionamentoResumo,
  Sensor,
  StatusVagaAtual,
  Usuario,
} from '../../types';
import { toast } from 'sonner';
import { mensagemErro } from '../../lib/utils';

export const useLots = () =>
  useQuery({
    queryKey: ['estacionamentos'],
    queryFn: () => api<EstacionamentoResumo[]>('/estacionamentos'),
    refetchInterval: 3000,
  });
export const useLot = (id: string) =>
  useQuery({
    queryKey: ['estacionamento', id],
    queryFn: () => api<DetalheEstacionamento>(`/estacionamentos/${id}`),
    enabled: Boolean(id),
  });
export const useStatuses = (id: string) =>
  useQuery({
    queryKey: ['status', id],
    queryFn: () => api<StatusVagaAtual[]>(`/estacionamentos/${id}/status`),
    refetchInterval: 3000,
    enabled: Boolean(id),
  });
export const useSensors = () =>
  useQuery({
    queryKey: ['sensores'],
    queryFn: () => api<Sensor[]>('/sensores'),
    refetchInterval: 3000,
  });
export const useUsers = () =>
  useQuery({ queryKey: ['usuarios'], queryFn: () => api<Usuario[]>('/usuarios') });
export function useFavorites() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['favoritos'], queryFn: () => api<string[]>('/favoritos') });
  async function toggle(id: string) {
    try {
      const next = await api<string[]>('/favoritos', {
        method: query.data?.includes(id) ? 'DELETE' : 'POST',
        body: json({ estacionamentoId: id }),
      });
      client.setQueryData(['favoritos'], next);
    } catch (e) {
      toast.error(mensagemErro(e));
    }
  }
  return { ...query, toggle };
}
