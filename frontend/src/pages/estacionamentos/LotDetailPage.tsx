import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, MapPin, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useFavorites, useLot, useStatuses } from '../../features/estacionamentos/queries';
import { LotCanvas } from '../../components/lot/LotCanvas';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Legend,
  LiveDot,
  Loading,
  Sheet,
  SpotStatusBadge,
} from '../../components/ui';
import { tempoDesde } from '../../lib/utils';
import type { Vaga } from '../../types';

export function LotDetailPage() {
  const { id = '' } = useParams();
  const lot = useLot(id);
  const statuses = useStatuses(id);
  const favorites = useFavorites();
  const [selected, setSelected] = useState<Vaga | null>(null);
  const [alert, setAlert] = useState(false);
  const previousFree = useRef<number | null>(null);
  const free = statuses.data?.filter((s) => s.status === 'LIVRE').length ?? 0;
  useEffect(() => {
    if (alert && previousFree.current === 0 && free > 0) {
      toast.success('Abriu uma vaga!', {
        description: `${lot.data?.nome}: ${free} vaga(s) livre(s) agora.`,
        duration: 10000,
      });
      setAlert(false);
    }
    if (statuses.data) previousFree.current = free;
  }, [free, alert, lot.data?.nome, statuses.data]);
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
      <Link className="back-link" to="/estacionamentos">
        <ArrowLeft size={16} />
        Estacionamentos
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEU LUGAR, EM TEMPO REAL</div>
          <h1>{lot.data.nome}</h1>
          <p>
            <MapPin size={15} />
            {lot.data.descricao}
          </p>
        </div>
        <div className="heading-actions">
          <Button variant="secondary" onClick={() => void favorites.toggle(id)}>
            <Star size={16} fill={favorites.data?.includes(id) ? 'currentColor' : 'none'} />
            Favorito
          </Button>
          <LiveDot />
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
              setAlert(!alert);
              if (!alert) toast.info('Alerta ativado. Mantenha esta página aberta.');
            }}
          >
            <Bell size={16} />
            {alert ? 'Cancelar aviso' : 'Avisar quando abrir vaga'}
          </Button>
        </div>
        {lot.data.vagas.length ? (
          <LotCanvas mode="view" {...lot.data} statuses={statuses.data} onSpotClick={setSelected} />
        ) : (
          <EmptyState
            title="Este espaço ainda está sendo preparado"
            description="O administrador está configurando o layout do estacionamento."
          />
        )}
        <div className="canvas-caption">
          <span>Clique em uma vaga para ver os detalhes.</span>
          <span>Arraste para mover · role para ampliar</span>
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
