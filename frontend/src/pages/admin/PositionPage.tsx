import { useState } from 'react';
import { useLots } from '../../features/estacionamentos/queries';
import { SectorPlan } from '../../components/lot/SectorPlan';
import { Select, Loading, EmptyState } from '../../components/ui';
export function PositionPage() {
  const lots = useLots();
  const [id, setId] = useState('');
  if (lots.isPending) return <Loading />;
  return (
    <>
      <h1>Posicionar vagas</h1>
      <p>Posições mapeadas dos estacionamentos da empresa.</p>
      {!lots.data?.length ? (
        <EmptyState title="Cadastre o primeiro estacionamento antes de posicionar as vagas." />
      ) : (
        <>
          <Select
            aria-label="Estacionamento"
            value={id || lots.data[0].id}
            onChange={(e) => setId(e.target.value)}
          >
            {lots.data.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.nome}
              </option>
            ))}
          </Select>
          <SectorPlan id={id || lots.data[0].id} />
        </>
      )}
    </>
  );
}
