import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, MapPin, Navigation, Search, X } from 'lucide-react';
import { useLots } from '../../features/estacionamentos/queries';
import { Button, EmptyState, ErrorState, Input, Loading, Select } from '../../components/ui';
import { SectorPlan } from '../../components/lot/SectorPlan';
import { directionsUrl } from '../../lib/navigation';
import { ApiError, USE_MOCK } from '../../lib/api';
import type { EstacionamentoResumo, TipoVaga } from '../../types';

export function SectorLotsPage() {
  const query = useLots();
  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [type, setType] = useState<TipoVaga | ''>('');
  const [selectedId, setSelectedId] = useState('');
  const sectorRef = useRef<HTMLDivElement>(null);
  if (query.isPending) return <Loading />;
  if (query.error instanceof ApiError && query.error.details.status === 404)
    return (
      <EmptyState
        title="Campus não disponível"
        description="O endereço informado não corresponde a um campus cadastrado."
      >
        <Link className="btn btn-secondary" to="/">
          Escolher campus
        </Link>
      </EmptyState>
    );
  if (query.isError)
    return (
      <ErrorState
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const lots = query.data
    .filter(
      (lot) =>
        lot.nome.toLowerCase().includes(search.toLowerCase()) &&
        (!freeOnly || lot.vagasLivres > 0) &&
        (!type || lot.livresPorTipo[type] > 0),
    )
    .sort((a, b) => {
      return b.vagasLivres - a.vagasLivres;
    });
  const currentId = lots.some((lot) => lot.id === selectedId) ? selectedId : lots[0]?.id;
  const hasFilters = search || freeOnly || type;
  function clear() {
    setSearch('');
    setFreeOnly(false);
    setType('');
  }
  return (
    <div className="mobility-page">
      <div className="mobility-page-title">
        <h1>Estacionamentos</h1>
        <span>{query.data.length} estacionamentos</span>
      </div>
      <div className="mobility-workspace">
        <section className="lot-results" id="bolsoes" aria-label="Bolsões de estacionamento">
          <div className="lot-filters">
            <div className="search-input">
              <Search size={17} />
              <Input
                aria-label="Buscar estacionamento"
                placeholder="Buscar bolsão"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  className="icon-button"
                  aria-label="Limpar busca"
                  onClick={() => setSearch('')}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="lot-filter-row">
              <Button
                variant="secondary"
                aria-pressed={freeOnly}
                onClick={() => setFreeOnly(!freeOnly)}
              >
                <Car size={14} />
                Com vagas
              </Button>
              <Select
                aria-label="Tipo de vaga"
                value={type}
                onChange={(event) => setType(event.target.value as TipoVaga | '')}
              >
                <option value="">Todos os tipos</option>
                <option value="COMUM">Carro</option>
                <option value="PCD">PCD</option>
                <option value="MOTO">Moto</option>
              </Select>
            </div>
          </div>
          <div className="lot-results-summary">
            <span>
              {lots.length} {lots.length === 1 ? 'bolsão' : 'bolsões'}
            </span>
            {hasFilters ? (
              <button onClick={clear}>
                Limpar filtros <X size={12} />
              </button>
            ) : (
              <span>Mais vagas primeiro</span>
            )}
          </div>
          <div className="lot-result-list">
            {lots.map((lot) => (
              <ParkingRow
                key={lot.id}
                lot={lot}
                selected={currentId === lot.id}
                onSelect={() => {
                  setSelectedId(lot.id);
                  if (window.matchMedia?.('(max-width: 760px)').matches) {
                    requestAnimationFrame(() =>
                      sectorRef.current?.scrollIntoView({
                        block: 'start',
                        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                          ? 'auto'
                          : 'smooth',
                      }),
                    );
                  }
                }}
              />
            ))}
            {!lots.length && (
              <EmptyState
                title="Nenhum resultado"
                description="Ajuste os filtros ou busque outro bolsão."
              >
                {hasFilters && (
                  <Button variant="secondary" onClick={clear}>
                    Limpar filtros
                  </Button>
                )}
              </EmptyState>
            )}
          </div>
          <p className="lot-data-note">
            {USE_MOCK
              ? 'Demonstração: acessos, trajetos e coordenadas ilustrativos.'
              : 'A disponibilidade pode mudar durante o trajeto.'}
          </p>
        </section>
        <div className="sector-pane" ref={sectorRef}>
          <a className="return-to-lots" href="#bolsoes">
            Voltar aos bolsões
          </a>
          {currentId ? (
            <SectorPlan key={currentId} id={currentId} />
          ) : (
            <div className="sector-placeholder">
              <MapPin size={24} />
              <p>Nenhum bolsão selecionado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ParkingRow({
  lot,
  selected,
  onSelect,
}: {
  lot: EstacionamentoResumo;
  selected: boolean;
  onSelect: () => void;
}) {
  const unavailable = Math.max(0, lot.totalVagas - lot.vagasLivres);
  const percentage = lot.totalVagas ? Math.round((unavailable / lot.totalVagas) * 100) : 0;
  const url = directionsUrl(lot);
  return (
    <article className={`lot-row ${selected ? 'lot-selected' : ''}`}>
      <header>
        <h2>
          <button
            onClick={onSelect}
            aria-pressed={selected}
            aria-label={`Ver planta de ${lot.nome}`}
          >
            {lot.nome}
          </button>
        </h2>
      </header>
      <p className="lot-access">
        <MapPin size={13} />
        {lot.portao || 'Acesso não informado'}
      </p>
      <div className="lot-capacity">
        <span className={lot.vagasLivres ? 'lot-free' : ''}>
          <strong>{lot.vagasLivres}</strong>
          <span>/{lot.totalVagas}</span>
        </span>
        <span>vagas livres</span>
        <span className="lot-state">
          {!lot.totalVagas
            ? 'Sem vagas posicionadas'
            : lot.vagasLivres
              ? 'Disponível'
              : 'Sem vagas livres'}
        </span>
      </div>
      <div className="lot-occupancy">
        <div
          role="meter"
          aria-label={`Vagas indisponíveis em ${lot.nome}`}
          aria-valuenow={unavailable}
          aria-valuemin={0}
          aria-valuemax={lot.totalVagas || 1}
        >
          <span style={{ width: `${percentage}%` }} />
        </div>
        <span>{percentage}% indisponíveis</span>
      </div>
      {url ? (
        <a
          className={`btn ${selected ? 'btn-primary' : 'btn-secondary'} lot-navigate`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Navegar até o bolsão ${lot.nome} (Google Maps, nova aba)`}
        >
          <Navigation size={15} />
          Navegar até o bolsão
        </a>
      ) : (
        <Button variant="secondary" disabled>
          Coordenadas não informadas
        </Button>
      )}
    </article>
  );
}
