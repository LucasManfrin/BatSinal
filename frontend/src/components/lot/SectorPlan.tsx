import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Car, Check, Navigation, WifiOff } from 'lucide-react';
import { useLot, useStatuses } from '../../features/estacionamentos/queries';
import { useAuth } from '../../features/auth/AuthContext';
import { recordVisit } from '../../features/profile/preferences';
import { Button, EmptyState, ErrorState, Loading } from '../ui';
import type { StatusVaga } from '../../types';

const labels: Record<StatusVaga, string> = {
  LIVRE: 'Livre',
  OCUPADA: 'Ocupada',
  SEM_SINAL: 'Sem sinal',
};

export function SectorPlan({ id }: { id: string }) {
  const lot = useLot(id);
  const statuses = useStatuses(id);
  const { user } = useAuth();
  const [selected, setSelected] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  useEffect(() => {
    if (user && lot.data) recordVisit(user.id, lot.data.id, lot.data.nome);
  }, [user, lot.data]);
  if (lot.isPending || statuses.isPending)
    return (
      <div className="sector-placeholder">
        <Loading />
      </div>
    );
  if (lot.isError || statuses.isError)
    return (
      <div className="sector-placeholder">
        <ErrorState
          retry={() => {
            void lot.refetch();
            void statuses.refetch();
          }}
        />
      </div>
    );
  const data = lot.data;
  const stateById = new Map(statuses.data.map((s) => [s.vagaId, s.status]));
  const stateOf = (spotId: string) => stateById.get(spotId) ?? 'SEM_SINAL';
  const counts = { LIVRE: 0, OCUPADA: 0, SEM_SINAL: 0 };
  data.vagas.forEach((spot) => counts[stateOf(spot.id)]++);
  const spot = data.vagas.find((v) => v.id === selected);
  const description = spot
    ? `Vaga ${spot.rotulo} · ${labels[stateOf(spot.id)]} · ${spot.tipo === 'COMUM' ? 'Carro' : spot.tipo === 'MOTO' ? 'Moto' : 'PCD'}`
    : 'Selecione uma vaga para consultar o status.';
  return (
    <section className="sector-plan" aria-label={`Planta de ${data.nome}`}>
      <header className="sector-heading">
        <div>
          <span>Planta do bolsão</span>
          <h2>{data.nome}</h2>
        </div>
        <Link to={`/estacionamentos/${id}`} aria-label={`Detalhes de ${data.nome}`}>
          Detalhes <ArrowRight size={14} />
        </Link>
      </header>
      <div className="sector-tools">
        <div className="sector-legend" aria-label="Legenda de status">
          <span className="legend-free">
            <Check size={14} />
            <b>{counts.LIVRE}</b> livres
          </span>
          <span>
            <Car size={14} />
            <b>{counts.OCUPADA}</b> ocupadas
          </span>
          <span>
            <WifiOff size={14} />
            <b>{counts.SEM_SINAL}</b> sem sinal
          </span>
        </div>
        <Button variant="ghost" aria-pressed={onlyFree} onClick={() => setOnlyFree(!onlyFree)}>
          Só livres
        </Button>
      </div>
      {data.vagas.length ? (
        <div className="sector-drawing">
          <svg
            viewBox={`0 0 ${data.largura} ${data.altura}`}
            aria-label={`Vagas de ${data.nome}`}
            role="group"
          >
            <defs>
              <pattern id={`no-signal-${id}`} width="8" height="8" patternUnits="userSpaceOnUse">
                <path
                  d="M-2 2L2-2M0 8L8 0M6 10L10 6"
                  stroke="currentColor"
                  strokeOpacity=".22"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            {data.elementos.map((element) => (
              <g
                key={element.id}
                transform={`translate(${element.x} ${element.y}) rotate(${element.rotacao})`}
                className="plan-layout-element"
                aria-hidden="true"
              >
                {element.tipo === 'VIA' ? (
                  <rect width={element.largura} height={element.altura} />
                ) : (
                  <>
                    <path d={`M0 0H${element.largura}`} />
                    <text y={18} x={element.largura / 2} textAnchor="middle">
                      {element.texto?.replace(/[→↗]/g, '').trim() || element.tipo}
                    </text>
                    {(element.tipo === 'ENTRADA' || element.tipo === 'SAIDA') && (
                      <Navigation x={element.largura - 18} y={5} width={14} height={14} />
                    )}
                  </>
                )}
              </g>
            ))}
            {data.vagas.map((vaga) => {
              const status = stateOf(vaga.id);
              const free = status === 'LIVRE';
              const Icon = free ? Check : status === 'OCUPADA' ? Car : WifiOff;
              const active = selected === vaga.id;
              return (
                <g
                  key={vaga.id}
                  transform={`translate(${vaga.x} ${vaga.y}) rotate(${vaga.rotacao})`}
                  className={`technical-spot spot-${status.toLowerCase()} ${active ? 'spot-selected' : ''} ${onlyFree && !free ? 'spot-dimmed' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`Vaga ${vaga.rotulo}, ${labels[status]}, ${vaga.tipo === 'COMUM' ? 'Carro' : vaga.tipo === 'MOTO' ? 'Moto' : 'PCD'}`}
                  onClick={() => setSelected(vaga.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelected(vaga.id);
                    }
                  }}
                >
                  <rect width={vaga.largura} height={vaga.altura} rx={3} />
                  {status === 'SEM_SINAL' && (
                    <rect
                      className="spot-hatch"
                      width={vaga.largura}
                      height={vaga.altura}
                      fill={`url(#no-signal-${id})`}
                      rx={3}
                    />
                  )}
                  <Icon
                    x={vaga.largura / 2 - 10}
                    y={vaga.altura * 0.22}
                    width={20}
                    height={20}
                    strokeWidth={1.5}
                  />
                  <text x={vaga.largura / 2} y={vaga.altura * 0.72} textAnchor="middle">
                    {vaga.rotulo}
                  </text>
                  {vaga.tipo !== 'COMUM' && (
                    <text
                      className="technical-spot-type"
                      x={vaga.largura / 2}
                      y={vaga.altura - 5}
                      textAnchor="middle"
                    >
                      {vaga.tipo}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <EmptyState
          title="Layout não cadastrado"
          description="O administrador precisa configurar as vagas deste bolsão."
        />
      )}
      {data.vagas.length > 0 && (
        <details className="sector-spot-list">
          <summary>Consultar vagas em lista</summary>
          <div>
            {data.vagas.map((vaga) => (
              <button
                key={vaga.id}
                aria-pressed={selected === vaga.id}
                aria-label={`Selecionar vaga ${vaga.rotulo} (${labels[stateOf(vaga.id)]})`}
                onClick={() => setSelected(vaga.id)}
              >
                <span>{vaga.rotulo}</span>
                <span>{labels[stateOf(vaga.id)]}</span>
              </button>
            ))}
          </div>
        </details>
      )}
      <footer className="sector-footer">
        <span role="status">{description}</span>
        <span>Atualização a cada 3 s</span>
      </footer>
    </section>
  );
}
