import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Accessibility,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bike,
  CarFront,
  Check,
  ListFilter,
  Map,
  MapPin,
  Minus,
  Search,
  Star,
  X,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useFavorites, useLots } from '../../features/estacionamentos/queries';
import { usePreferences } from '../../features/profile/preferences';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  LiveDot,
  Loading,
  OccupancyBar,
  Select,
  Tabs,
} from '../../components/ui';
import { CampusMap } from '../../components/lot/CampusMap';
import { CampusPlan } from '../../components/lot/CampusPlan';
import type { EstacionamentoResumo, TipoVaga } from '../../types';

export function LotsPage({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const { user } = useAuth();
  const query = useLots();
  const favorites = useFavorites();
  const { preferences } = usePreferences(user?.id ?? '');
  const [mode, setMode] = useState<'esquema' | 'mapa'>('esquema');
  const [mobilePane, setMobilePane] = useState<'lista' | 'mapa'>('lista');
  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [starred, setStarred] = useState(false);
  const [type, setType] = useState<TipoVaga | ''>(preferences.tipo);
  const [selectedId, setSelectedId] = useState('');
  if (query.isPending || favorites.isPending) return <Loading />;
  if (query.isError || favorites.isError)
    return (
      <ErrorState
        retry={() => {
          void query.refetch();
          void favorites.refetch();
        }}
      />
    );
  const lots = query.data
    .filter(
      (l) =>
        l.nome.toLowerCase().includes(search.toLowerCase()) &&
        (!freeOnly || l.vagasLivres > 0) &&
        (!(favoritesOnly || starred) || favorites.data.includes(l.id)) &&
        (!type || l.livresPorTipo[type] > 0),
    )
    .sort((a, b) => {
      if (preferences.favoritosPrimeiro) {
        const difference =
          Number(favorites.data.includes(b.id)) - Number(favorites.data.includes(a.id));
        if (difference) return difference;
      }
      return b.vagasLivres - a.vagasLivres;
    });
  const totalFree = query.data.reduce((n, l) => n + l.vagasLivres, 0);
  const currentId = lots.some((l) => l.id === selectedId) ? selectedId : (lots[0]?.id ?? '');
  const bestId = [...lots].sort((a, b) => b.vagasLivres - a.vagasLivres)[0]?.id;
  const campus = user?.empresaId === 'unisagrado' ? 'Unisagrado' : 'Meu campus';
  const hasFilters = search || freeOnly || starred || type;
  function clear() {
    setSearch('');
    setFreeOnly(false);
    setStarred(false);
    setType('');
  }
  return (
    <div className="parking-page">
      <div className="parking-page-heading">
        <div>
          <p className="section-kicker">Disponibilidade no campus</p>
          <h1>
            {favoritesOnly ? 'Estacionamentos\nfavoritos' : `Estacionamentos\n${campus}`}
            <span className="heading-dot">.</span>
          </h1>
        </div>
        <div className="campus-availability" aria-live="polite">
          <div>
            <strong>{String(totalFree).padStart(2, '0')}</strong>
            <span>
              vagas disponíveis
              <br />
              agora no campus
            </span>
          </div>
          <LiveDot label={`Atualização a cada 3 s · ${query.data.length} estacionamentos`} />
        </div>
      </div>
      <div className="parking-filters">
        <div className="search-input">
          <Search size={17} />
          <Input
            aria-label="Buscar estacionamento"
            placeholder="Nome ou setor do estacionamento"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="search-clear"
              aria-label="Limpar busca"
              onClick={() => setSearch('')}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="filter-group">
          <Button
            variant="secondary"
            className="filter-button"
            aria-pressed={freeOnly}
            onClick={() => setFreeOnly(!freeOnly)}
          >
            {freeOnly ? <Check size={15} /> : <ListFilter size={15} />}Com vagas
          </Button>
          {!favoritesOnly && (
            <Button
              variant="secondary"
              className="filter-button"
              aria-pressed={starred}
              onClick={() => setStarred(!starred)}
            >
              <Star size={15} />
              Favoritos
            </Button>
          )}
          <Select
            aria-label="Tipo de vaga"
            value={type}
            onChange={(e) => setType(e.target.value as TipoVaga | '')}
          >
            <option value="">Todos os tipos</option>
            <option value="COMUM">Carro</option>
            <option value="PCD">PCD</option>
            <option value="MOTO">Moto</option>
          </Select>
        </div>
      </div>
      <div className="mobile-view-toggle">
        <Tabs
          value={mobilePane}
          onChange={setMobilePane}
          options={[
            { value: 'lista', label: 'Lista' },
            { value: 'mapa', label: 'Ver mapa' },
          ]}
        />
      </div>
      <div className="parking-workspace" data-mobile-pane={mobilePane}>
        <section className="parking-results" aria-label="Estacionamentos disponíveis">
          <div className="results-heading">
            <span>
              {lots.length} {lots.length === 1 ? 'estacionamento' : 'estacionamentos'}
              {favoritesOnly ? ' nos favoritos' : ' encontrados'}
            </span>
            {hasFilters ? (
              <button onClick={clear}>
                Limpar filtros <X size={12} />
              </button>
            ) : (
              <span>
                {preferences.favoritosPrimeiro ? 'Favoritos primeiro' : 'Mais vagas primeiro'}
              </span>
            )}
          </div>
          {!lots.length ? (
            <EmptyState
              title={favoritesOnly ? 'Nenhum estacionamento favorito' : 'Nenhum resultado'}
              description={
                favoritesOnly
                  ? 'Adicione estacionamentos usando a estrela ao lado do nome.'
                  : 'Tente outro nome ou ajuste os filtros.'
              }
            >
              {hasFilters ? (
                <Button variant="secondary" onClick={clear}>
                  Limpar filtros
                </Button>
              ) : (
                <Link className="btn btn-secondary" to="/estacionamentos">
                  Ver todos
                </Link>
              )}
            </EmptyState>
          ) : (
            lots.map((lot, index) => (
              <ParkingRow
                key={lot.id}
                lot={lot}
                index={index}
                selected={lot.id === currentId}
                best={lot.id === bestId && lot.vagasLivres > 0}
                onSelect={() => {
                  setSelectedId(lot.id);
                  setMobilePane('mapa');
                }}
                favorite={favorites.data.includes(lot.id)}
                onFavorite={() => void favorites.toggle(lot.id)}
              />
            ))
          )}
          <p className="results-footnote">
            <span className="sensor-symbol" />
            Detecção automática por sensores. A disponibilidade pode mudar durante o trajeto.
          </p>
        </section>
        <aside className="parking-map-pane">
          <div className="map-view-bar">
            <span>
              <MapPin size={14} />
              Visão do campus
            </span>
            <Tabs
              value={mode}
              onChange={setMode}
              options={[
                { value: 'esquema', label: 'Esquema' },
                {
                  value: 'mapa',
                  label: (
                    <>
                      <Map size={13} />
                      Mapa
                    </>
                  ),
                },
              ]}
            />
          </div>
          {mode === 'mapa' ? (
            <CampusMap lots={lots} onFail={() => setMode('esquema')} />
          ) : (
            <CampusPlan
              lots={lots}
              lotOrder={query.data.map((lot) => lot.id)}
              selectedId={currentId}
              onSelect={setSelectedId}
              campus={campus}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
function ParkingRow({
  lot,
  index,
  selected,
  best,
  favorite,
  onFavorite,
  onSelect,
}: {
  lot: EstacionamentoResumo;
  index: number;
  selected: boolean;
  best: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onSelect: () => void;
}) {
  const Trend =
    lot.tendencia === 'SUBINDO'
      ? ArrowUpRight
      : lot.tendencia === 'CAINDO'
        ? ArrowDownRight
        : Minus;
  const low = lot.vagasLivres > 0 && lot.vagasLivres / Math.max(1, lot.totalVagas) <= 0.2;
  return (
    <article className={`parking-row ${selected ? 'selected' : ''}`}>
      <header>
        <button
          className="parking-index"
          onClick={onSelect}
          aria-label={`Localizar ${lot.nome} no esquema`}
          aria-pressed={selected}
        >
          {String(index + 1).padStart(2, '0')}
        </button>
        <div>
          <Link to={`/estacionamentos/${lot.id}`}>
            <h2>{lot.nome}</h2>
          </Link>
          <p>{lot.descricao || 'Sem descrição de acesso'}</p>
        </div>
        <button
          className={`icon-button favorite-button ${favorite ? 'is-favorite' : ''}`}
          aria-label={`${favorite ? 'Remover' : 'Adicionar'} ${lot.nome} ${favorite ? 'dos' : 'aos'} favoritos`}
          aria-pressed={favorite}
          onClick={onFavorite}
        >
          <Star size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </header>
      <div className="parking-row-main">
        <div
          className={`parking-row-count ${!lot.vagasLivres ? 'count-zero' : ''}`}
          aria-live="polite"
        >
          <strong>{String(lot.vagasLivres).padStart(2, '0')}</strong>
          <span>
            vagas livres<small>de {lot.totalVagas} no total</small>
          </span>
        </div>
        <div className="parking-capacity">
          <Badge
            className={
              !lot.totalVagas
                ? ''
                : !lot.vagasLivres
                  ? 'badge-red'
                  : low
                    ? 'badge-amber'
                    : 'badge-green'
            }
          >
            <span className="badge-dot" />
            {!lot.totalVagas
              ? 'Sem layout'
              : !lot.vagasLivres
                ? 'Lotado'
                : low
                  ? 'Quase cheio'
                  : 'Disponível'}
          </Badge>
          <span>
            {lot.totalVagas ? Math.round((lot.vagasLivres / lot.totalVagas) * 100) : 0}% disponíveis
          </span>
        </div>
      </div>
      <OccupancyBar total={lot.totalVagas} livres={lot.vagasLivres} />
      <div className="parking-row-details">
        <span title="Vagas comuns livres">
          <CarFront size={14} />
          {lot.livresPorTipo.COMUM} carro
        </span>
        <span title="Vagas para moto livres">
          <Bike size={14} />
          {lot.livresPorTipo.MOTO} moto
        </span>
        <span title="Vagas PCD livres">
          <Accessibility size={14} />
          {lot.livresPorTipo.PCD} PCD
        </span>
        <span className="parking-trend">
          <Trend size={13} />
          {lot.tendencia === 'SUBINDO'
            ? 'Mais vagas'
            : lot.tendencia === 'CAINDO'
              ? 'Menos vagas'
              : 'Estável'}
        </span>
      </div>
      <footer>
        {best ? (
          <span className="best-option-label">Mais vagas agora</span>
        ) : (
          <span className="parking-period">Tendência nos últimos 15 min</span>
        )}
        <Link to={`/estacionamentos/${lot.id}`}>
          Ver vagas <ArrowRight size={15} />
        </Link>
      </footer>
    </article>
  );
}
