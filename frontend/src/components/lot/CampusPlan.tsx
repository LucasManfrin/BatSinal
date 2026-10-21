import { ArrowRight, Compass, Navigation2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EstacionamentoResumo } from '../../types';
import { UrbanDrawing } from './UrbanDrawing';
import { LiveDot } from '../ui';

export function CampusPlan({
  lots,
  selectedId,
  onSelect,
  campus,
  lotOrder,
}: {
  lots: EstacionamentoResumo[];
  selectedId: string;
  onSelect: (id: string) => void;
  campus: string;
  lotOrder: string[];
}) {
  const selected = lots.find((l) => l.id === selectedId) ?? lots[0];
  const anchors = [
    [48, 51],
    [69, 27],
    [29, 75],
    [74, 74],
    [27, 27],
  ];
  return (
    <section className="campus-plan" aria-label="Esquema interativo dos estacionamentos">
      <UrbanDrawing />
      <div className="plan-heading">
        <span>
          <span className="plan-location-dot" />
          {campus}
        </span>
        <LiveDot />
      </div>
      <div className="plan-orientation">
        <Navigation2 size={15} />
        <span>N</span>
      </div>
      <div className="plan-markers">
        {lots.map((lot) => {
          const anchorIndex = Math.max(0, lotOrder.indexOf(lot.id));
          const [x, y] = anchors[anchorIndex % anchors.length];
          return (
            <button
              key={lot.id}
              className={`plan-marker ${selected?.id === lot.id ? 'selected' : ''} ${!lot.vagasLivres ? 'full' : ''}`}
              style={{ left: `${x + Math.floor(anchorIndex / anchors.length) * 3}%`, top: `${y}%` }}
              onClick={() => onSelect(lot.id)}
              aria-pressed={selected?.id === lot.id}
              aria-label={`${lot.nome}, ${lot.vagasLivres} vagas livres. Selecionar no esquema.`}
            >
              <span className="marker-count">
                {lot.vagasLivres}
                <small>livres</small>
              </span>
              <span className="marker-label">{lot.nome.replace('Estacionamento ', '')}</span>
            </button>
          );
        })}
      </div>
      <span className="plan-zone-label zone-label-one">Área acadêmica</span>
      <span className="plan-zone-label zone-label-two">Campus</span>
      <div className="plan-scale">
        <Compass size={15} />
        <span>Esquema ilustrativo · sem escala</span>
      </div>
      {selected && (
        <div className="plan-selected">
          <div>
            <small>Estacionamento selecionado</small>
            <strong>{selected.nome}</strong>
            <p>{selected.descricao || 'Consulte o layout para localizar as vagas.'}</p>
          </div>
          <Link to={`/estacionamentos/${selected.id}`} aria-label={`Ver vagas de ${selected.nome}`}>
            <ArrowRight size={21} />
          </Link>
        </div>
      )}
    </section>
  );
}
