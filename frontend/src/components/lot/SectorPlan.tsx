import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLot, useStatuses } from '../../features/estacionamentos/queries';
import { Loading, ErrorState, SpotStatusBadge } from '../ui';
import { campusStatus } from '../../lib/campus';
export function SectorPlan({ id }: { id: string }) {
  const lot = useLot(id);
  const statuses = useStatuses(id);
  const [selected, setSelected] = useState('');
  const { campusSlug } = useParams();
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
  const statusOf = (id: string) =>
    statuses.data.find((s) => s.vagaId === id)?.status ?? 'SEM_SINAL';
  const slot = lot.data.vagas.find((v) => v.id === selected);
  return (
    <section aria-label={`Planta de ${lot.data.nome}`} className="sector-plan">
      <header className="sector-heading">
        <h2>{lot.data.nome}</h2>
        <Link
          className="text-link"
          to={campusSlug ? `/c/${campusSlug}/${id}` : `/admin/posicionar/${id}`}
        >
          Ver área
        </Link>
      </header>
      <div className="spot-list">
        {lot.data.vagas.map((v) => (
          <button
            key={v.id}
            aria-pressed={selected === v.id}
            aria-label={`Vaga ${v.rotulo}, ${campusStatus[statusOf(v.id)]}, ${v.tipo === 'COMUM' ? 'Carro' : v.tipo}`}
            onClick={() => setSelected(v.id)}
          >
            <strong>{v.rotulo}</strong>
            <SpotStatusBadge status={statusOf(v.id)} />
            {!v.ancoraId && <small>Na bandeja</small>}
          </button>
        ))}
      </div>
      <footer className="sector-footer">
        <span role="status">
          {slot
            ? `Vaga ${slot.rotulo} · ${campusStatus[statusOf(slot.id)]}`
            : 'Escolha uma vaga para conferir a leitura.'}
        </span>
      </footer>
    </section>
  );
}
