import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useRef, useState } from 'react';
import { ArrowRight, Bell, Car, MapPin, Navigation, Star } from 'lucide-react';
import { useCampusScene } from '../../features/estacionamentos/queries';
import { Button, EmptyState, ErrorState, Loading, Select, UpdatedAt } from '../../components/ui';
import { CampusScene } from '../../components/lot/CampusScene';
import { ApiError } from '../../lib/api';
import { campusStatus, distanceCampus, nearbySlots } from '../../lib/campus';
import type { ConsultaCampus, TipoVaga } from '../../types';
import { useFavoritos, useUltimoDestino, useAlertaDeVaga } from '../../features/visitante/hooks';
import { toast } from 'sonner';
import { SectorLotsPage } from './SectorLotsPage';

export function LotsPage() {
  const query = useCampusScene();
  if (query.isPending) return <Loading />;
  if (query.error instanceof ApiError && query.error.details.status === 404)
    return (
      <EmptyState title="Campus não encontrado">
        <Link className="btn btn-secondary" to="/">
          Escolher campus
        </Link>
      </EmptyState>
    );
  if (!query.data) return <ErrorState retry={() => void query.refetch()} />;
  // Conserva a consulta existente nos campi que ainda não têm mapa cadastrado.
  if (!query.data.mapa) return <SectorLotsPage />;
  return (
    <CampusConsult
      data={query.data}
      updatedAt={query.dataUpdatedAt}
      failed={query.isError}
      retry={() => void query.refetch()}
    />
  );
}

function CampusConsult({
  data,
  updatedAt,
  failed,
  retry,
}: {
  data: ConsultaCampus;
  updatedAt: number;
  failed: boolean;
  retry: () => void;
}) {
  const mapa = data.mapa!;
  const { campusSlug = '' } = useParams();
  const { favoritos, alternar } = useFavoritos(campusSlug);
  const [ultimoDestino, setUltimoDestino] = useUltimoDestino(campusSlug);
  const [params, setParams] = useSearchParams();
  const [freeOnly, setFreeOnly] = useState(true);
  const [type, setType] = useState<TipoVaga | ''>('');
  const [selectedId, setSelectedId] = useState('');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const mapPane = useRef<HTMLDivElement>(null);
  const selectSlot = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia?.('(max-width: 760px)').matches) {
      requestAnimationFrame(() =>
        mapPane.current?.scrollIntoView({ block: 'start', behavior: 'auto' }),
      );
    }
  };
  const destination = mapa.predios.find(
    (building) => building.id === (params.get('bloco') ?? ultimoDestino),
  );
  const gate = mapa.portoes.find((entry) => entry.veiculos && entry.id === params.get('entrada'));
  const vagas = failed
    ? data.vagas.map((vaga) => ({ ...vaga, status: 'SEM_SINAL' as const }))
    : data.vagas;
  const filtered = vagas.filter(
    (vaga) => (!freeOnly || vaga.status === 'LIVRE') && (!type || vaga.tipo === type),
  );
  const matches = new Set(filtered.map((vaga) => vaga.id));
  const nearby = filtered.filter(
    (vaga) => !destination || distanceCampus(vaga.ponto, destination.entrada) <= 220,
  );
  const regionFree = vagas.filter(
    (vaga) =>
      vaga.status === 'LIVRE' &&
      (!destination || distanceCampus(vaga.ponto, destination.entrada) <= 220),
  ).length;
  const alert = useAlertaDeVaga(
    campusSlug,
    destination?.id ?? 'campus',
    failed ? null : regionFree,
    () =>
      toast.success(
        `Abriu uma vaga ${destination ? 'perto de ' + destination.nome : 'no campus'}.`,
      ),
  );
  const ordered = nearbySlots(nearby, destination?.entrada);
  const closestFree = nearbySlots(
    nearby.filter((vaga) => vaga.status === 'LIVRE'),
    destination?.entrada,
  )[0];
  const shown = showAll ? ordered : ordered.slice(0, 6);
  const selected = vagas.find((vaga) => vaga.id === selectedId);
  const areaName = (id: string) => mapa.areas.find((area) => area.id === id)?.nome ?? 'Campus';
  const changeParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    if (key === 'bloco') setUltimoDestino(value);
    setSelectedId('');
    setShowAll(false);
  };
  return (
    <div className="campus-consult">
      <header className="campus-page-heading">
        <div>
          <p className="eyebrow">{mapa.nome}</p>
          <h1>Mapa do campus</h1>
        </div>
        <span className="campus-live-note">
          <span />
          Leituras a cada 3 s
        </span>
      </header>
      <h1 className="sr-only">Mapa do campus {mapa.nome}</h1>
      <div className="campus-planner">
        <label className="campus-destination">
          <span>
            <MapPin size={15} />
            Para onde você vai?
          </span>
          <Select
            aria-label="Bloco de destino"
            value={destination?.id ?? ''}
            onChange={(event) => changeParam('bloco', event.target.value)}
          >
            <option value="">Ver todo o campus</option>
            {mapa.predios.map((building) => (
              <option key={building.id} value={building.id}>
                {building.nome}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span>
            <Navigation size={15} />
            Entrada de veículos
          </span>
          <Select
            aria-label="Entrada de veículos"
            value={gate?.id ?? ''}
            onChange={(event) => changeParam('entrada', event.target.value)}
          >
            <option value="">Selecionar portão</option>
            {mapa.portoes
              .filter((entry) => entry.veiculos)
              .map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.nome}
                </option>
              ))}
          </Select>
        </label>
        <label className="campus-type">
          <span>
            <Car size={15} />
            Tipo de vaga
          </span>
          <Select
            aria-label="Tipo de vaga"
            value={type}
            onChange={(event) => {
              setType(event.target.value as TipoVaga | '');
              setShowAll(false);
              setSelectedId('');
            }}
          >
            <option value="">Todos os tipos</option>
            <option value="COMUM">Carro</option>
            <option value="PCD">PCD</option>
            <option value="MOTO">Moto</option>
          </Select>
        </label>
        <Button
          variant="secondary"
          className="campus-free-filter"
          aria-pressed={freeOnly}
          onClick={() => {
            setFreeOnly(!freeOnly);
            setShowAll(false);
            setSelectedId('');
          }}
        >
          Somente livres
        </Button>
      </div>
      {failed && (
        <div role="alert" className="campus-reading-error">
          Leituras indisponíveis. Vagas exibidas sem sinal.
          <Button variant="secondary" onClick={retry}>
            Atualizar
          </Button>
        </div>
      )}
      <div className="campus-workspace">
        <aside
          className="campus-nearby"
          data-expanded={sheetExpanded}
          aria-label="Vagas próximas ao destino"
        >
          <button
            className="campus-sheet-toggle"
            aria-expanded={sheetExpanded}
            onClick={() => setSheetExpanded(!sheetExpanded)}
          >
            {sheetExpanded ? 'Recolher vagas' : 'Mostrar vagas próximas'}
          </button>
          <div className="campus-nearby-heading">
            <p className="eyebrow">{destination ? 'Destino selecionado' : 'Disponibilidade'}</p>
            <h2>{destination?.nome ?? 'Todo o campus'}</h2>
            <div className="campus-nearby-count">
              <strong>{ordered.length}</strong>
              <span>
                {freeOnly ? 'vagas livres' : 'vagas'}
                {destination ? ' próximas' : ' no mapa'}
              </span>
            </div>
            <p>
              {destination
                ? closestFree
                  ? `A vaga ${closestFree.rotulo} é a livre mais próxima de ${destination.nome}: ${areaName(closestFree.areaId).toLowerCase()}.`
                  : `Ainda não há vagas livres perto de ${destination.nome} neste filtro.`
                : 'Toque em um bloco para ver as vagas mais perto dele.'}
            </p>
            {gate && (
              <p className="campus-selected-gate">
                <Navigation size={13} />
                {gate.nome} destacado no mapa
              </p>
            )}
          </div>
          <UpdatedAt at={updatedAt} />
          <div className="visitor-actions">
            {destination && (
              <Button
                variant="ghost"
                aria-pressed={favoritos.includes(destination.id)}
                onClick={() => alternar(destination.id)}
              >
                <Star size={16} />
                {favoritos.includes(destination.id) ? 'Destino favorito' : 'Favoritar destino'}
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={regionFree > 0 && !alert.ativo}
              onClick={alert.alternar}
            >
              <Bell size={16} />
              {alert.ativo ? 'Cancelar aviso' : 'Avisar quando abrir vaga'}
            </Button>
            <small>O aviso funciona enquanto esta aba estiver aberta.</small>
            {!!favoritos.length && (
              <div>
                {mapa.predios
                  .filter((p) => favoritos.includes(p.id))
                  .map((p) => (
                    <button
                      key={p.id}
                      className="text-link"
                      onClick={() => changeParam('bloco', p.id)}
                    >
                      {p.nome}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="campus-nearby-list">
            {shown.map((vaga) => (
              <button
                key={vaga.id}
                className={selectedId === vaga.id ? 'nearby-selected' : ''}
                aria-pressed={selectedId === vaga.id}
                onClick={() => selectSlot(vaga.id)}
                aria-label={`Destacar vaga ${vaga.rotulo}, ${areaName(vaga.areaId)}`}
              >
                <span className={`campus-status-dot ${vaga.status.toLowerCase()}`} />
                <span>
                  <strong>
                    {vaga.rotulo}
                    <small>{vaga.tipo === 'COMUM' ? 'Carro' : vaga.tipo}</small>
                  </strong>
                  <span>{areaName(vaga.areaId)}</span>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
            {!ordered.length && (
              <EmptyState
                title="Nenhuma vaga neste filtro"
                description="Veja todo o campus ou inclua vagas ocupadas e sem sinal."
              />
            )}
          </div>
          {ordered.length > 6 && (
            <button className="campus-show-all" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Mostrar menos' : `Ver as ${ordered.length} vagas na lista`}
            </button>
          )}
          {selected && (
            <div className="campus-slot-detail" role="status">
              <p className="eyebrow">Vaga selecionada</p>
              <strong>
                {selected.rotulo} · {campusStatus[selected.status]}
              </strong>
              <p>
                {areaName(selected.areaId)} · {selected.tipo === 'COMUM' ? 'Carro' : selected.tipo}
              </p>
            </div>
          )}
        </aside>
        <div className="campus-map-pane" ref={mapPane}>
          <CampusScene
            mapa={mapa}
            vagas={vagas}
            destinoId={destination?.id ?? ''}
            portaoId={gate?.id ?? ''}
            selectedId={selectedId}
            matches={matches}
            onDestination={(id) => changeParam('bloco', id)}
            onSelect={selectSlot}
          />
          <div className="campus-legend" aria-label="Legenda das vagas">
            <span>
              <i className="livre" />
              Livre
            </span>
            <span>
              <i className="ocupada" />
              Ocupada
            </span>
            <span>
              <i className="sem_sinal" />
              Sem sinal
            </span>
            <span className="campus-legend-destination">
              <i />
              Destino / seleção
            </span>
          </div>
        </div>
      </div>
      <p className="campus-accuracy-note">
        {mapa.aproximado
          ? 'Mapa aproximado a partir das áreas indicadas pelo grupo. Maquete sem escala. Posições e leituras são demonstrativas.'
          : 'A disponibilidade pode mudar durante o deslocamento.'}
        {data.vagasSemPosicao > 0 &&
          ` ${data.vagasSemPosicao} vagas cadastradas ainda não têm posição no mapa.`}
      </p>
    </div>
  );
}
