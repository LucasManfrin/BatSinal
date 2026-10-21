import { useState } from 'react';
import { useArea } from '../../features/estacionamentos/queries';
import { AreaScene } from '../../components/area/AreaScene';
import { Button, ErrorState, Loading, SpotStatusBadge, UpdatedAt } from '../../components/ui';
import { tempoDesde } from '../../lib/utils';
export function AreaView({ id, onBack }: { id: string; onBack: () => void }) {
  const query = useArea(id);
  const [selected, setSelected] = useState('');
  if (query.isPending) return <Loading />;
  if (!query.data) return <ErrorState retry={() => void query.refetch()} />;
  const data = query.isError
    ? {
        ...query.data,
        vagas: query.data.vagas.map((v) => ({ ...v, status: 'SEM_SINAL' as const })),
      }
    : query.data;
  const slot = data.vagas.find((v) => v.id === selected);
  return (
    <div className="area-view">
      <header className="area-view-heading">
        <Button variant="secondary" onClick={onBack}>
          Voltar ao campus
        </Button>
        <h1>{data.area.nome}</h1>
        <UpdatedAt at={query.dataUpdatedAt} />
      </header>
      {query.isError && (
        <p role="alert">
          Não consegui atualizar as vagas desta área. As peças estão indicadas sem sinal.
        </p>
      )}
      <AreaScene data={data} modo="ver" selectedId={selected} onSelect={setSelected} />
      <section className="area-inline-detail" aria-live="polite">
        {slot ? (
          <>
            <h2>Vaga {slot.rotulo}</h2>
            <SpotStatusBadge status={slot.status} />
            <span>
              {slot.tipo === 'COMUM' ? 'Carro' : slot.tipo} · {tempoDesde(slot.atualizadoEm)}
            </span>
          </>
        ) : (
          <p>Escolha uma peça para conferir o tipo e a última leitura.</p>
        )}
      </section>
      <details>
        <summary>Consultar vagas por lista</summary>
        <div className="spot-list">
          {data.vagas.map((v) => (
            <button key={v.id} onClick={() => setSelected(v.id)}>
              <strong>{v.rotulo}</strong>
              <SpotStatusBadge status={v.status} />
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
