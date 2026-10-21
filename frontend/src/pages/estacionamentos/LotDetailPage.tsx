import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useLot, useStatuses } from '../../features/estacionamentos/queries';
import { SectorPlan } from '../../components/lot/SectorPlan';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Legend,
  UpdatedAt,
  Loading,
  Sheet,
  SpotStatusBadge,
} from '../../components/ui';
import { tempoDesde } from '../../lib/utils';
import type { Vaga } from '../../types';
import { useAlertaDeVaga } from '../../features/visitante/hooks';

export function LotDetailPage() {
  const { id = '', campusSlug } = useParams();
  const lot = useLot(id);
  const statuses = useStatuses(id);
  const [selected, setSelected] = useState<Vaga | null>(null);
  const free = statuses.data?.filter((s) => s.status === 'LIVRE').length ?? 0;
  const { ativo: alert, alternar: toggleAlert } = useAlertaDeVaga(
    campusSlug ?? 'empresa',
    `estacionamento:${id}`,
    statuses.isError || !statuses.data ? null : free,
    () => {
      toast.success('Abriu uma vaga!', {
        description: `${lot.data?.nome}: ${free} vaga(s) livre(s) agora.`,
        duration: 10000,
      });
    },
  );
  if (lot.isPending || statuses.isPending) return <Loading />;
  if (lot.isError || statuses.isError)
    return (
      <ErrorState
        retry={() => {
          void lot.refetch();
          void statuses.refetch();
        }}
      />
    );
  const status = statuses.data.find((s) => s.vagaId === selected?.id);
  return (
    <>
      <Link className="back-link" to={campusSlug ? `/c/${campusSlug}` : '/admin'}>
        <ArrowLeft size={16} />
        Estacionamentos
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Disponibilidade por vaga</div>
          <h1>{lot.data.nome}</h1>
          <p>
            <MapPin size={15} />
            {lot.data.descricao}
          </p>
        </div>
        <div className="heading-actions">
          <UpdatedAt at={statuses.dataUpdatedAt} />
        </div>
      </div>
      <Card className="detail-card">
        <div className="detail-stats">
          <div className="detail-count" aria-live="polite">
            <strong>{free}</strong>
            <span>
              vagas livres <small>de {lot.data.vagas.length} no total</small>
            </span>
          </div>
          <Legend />
          <Button
            variant={alert ? 'primary' : 'secondary'}
            disabled={free > 0 && !alert}
            onClick={() => {
              toggleAlert();
              if (!alert) toast.info('Alerta ativado. Mantenha esta página aberta.');
            }}
          >
            <Bell size={16} />
            {alert ? 'Cancelar aviso' : 'Avisar quando abrir vaga'}
          </Button>
        </div>
        {lot.data.vagas.length ? (
          <SectorPlan id={id} />
        ) : (
          <EmptyState
            title="Nenhuma vaga posicionada"
            description="A empresa ainda precisa posicionar as vagas deste bolsão."
          />
        )}
        <div className="canvas-caption">
          <span>Clique em uma vaga para ver os detalhes.</span>
          <span>Use Tab e Enter para consultar pelo teclado.</span>
        </div>
      </Card>
      <details className="accessible-spots">
        <summary>Consultar vagas em lista (acessível por teclado)</summary>
        <div className="spot-list">
          {lot.data.vagas.map((vaga) => (
            <button key={vaga.id} onClick={() => setSelected(vaga)}>
              <strong>{vaga.rotulo}</strong>
              <span>{vaga.tipo}</span>
              <SpotStatusBadge
                status={statuses.data.find((s) => s.vagaId === vaga.id)?.status ?? 'SEM_SINAL'}
              />
            </button>
          ))}
        </div>
      </details>
      <p className="small-note">
        Vagas livres são detectadas automaticamente. A disponibilidade pode mudar durante o trajeto.
      </p>
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={`Vaga ${selected?.rotulo ?? ''}`}
        description="Informações recebidas do sensor"
      >
        {selected && (
          <div className="spot-sheet">
            <SpotStatusBadge status={status?.status ?? 'SEM_SINAL'} />
            <dl>
              <div>
                <dt>Tipo de vaga</dt>
                <dd>
                  {selected.tipo === 'PCD'
                    ? 'Pessoa com deficiência'
                    : selected.tipo === 'MOTO'
                      ? 'Motocicleta'
                      : 'Comum'}
                </dd>
              </div>
              <div>
                <dt>Estacionamento</dt>
                <dd>{lot.data.nome}</dd>
              </div>
              <div>
                <dt>Última leitura</dt>
                <dd>{tempoDesde(status?.atualizadoEm)}</dd>
              </div>
            </dl>
            <Badge>Detecção automática por sensor</Badge>
          </div>
        )}
      </Sheet>
    </>
  );
}
