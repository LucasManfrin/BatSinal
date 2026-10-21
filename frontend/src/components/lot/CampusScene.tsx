import { useEffect, useRef, useState } from 'react';
import { Focus, Minus, Plus } from 'lucide-react';
import type { MapaCampus, PontoCampus, VagaCampus } from '../../types';
import { campusStatus, distanceCampus, projectCampus } from '../../lib/campus';

export function CampusScene({
  mapa,
  vagas,
  destinoId,
  portaoId,
  selectedId,
  matches,
  onDestination,
  onSelect,
}: {
  mapa: MapaCampus;
  vagas: VagaCampus[];
  destinoId: string;
  portaoId: string;
  selectedId: string;
  matches: Set<string>;
  onDestination: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const [flat, setFlat] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PontoCampus>([0, 0]);
  const destination = mapa.predios.find((b) => b.id === destinoId);
  const selectedSlot = vagas.find((vaga) => vaga.id === selectedId);
  const focused = selectedSlot?.ponto ?? destination?.entrada;
  const gate = mapa.portoes.find((entry) => entry.id === portaoId);
  const focusX = focused?.[0];
  const focusY = focused?.[1];
  const gateX = gate?.ponto[0];
  const gateY = gate?.ponto[1];
  const hasSelectedSlot = Boolean(selectedSlot);
  useEffect(() => {
    if (focusX === undefined || focusY === undefined) {
      setZoom(1);
      setPan([0, 0]);
      return;
    }
    // Mostra entrada e destino no contexto do campus; selecionar uma vaga aproxima novamente.
    if (!hasSelectedSlot && gateX !== undefined && gateY !== undefined) {
      setZoom(1);
      setPan([0, 0]);
      return;
    }
    const center = projectCampus([focusX, focusY], 0, flat);
    const bounds = flat ? [-60, -65, 1460, 610] : [-70, -455, 1520, 850];
    setZoom(hasSelectedSlot ? 2.2 : 1.6);
    setPan([center[0] - (bounds[0] + bounds[2] / 2), center[1] - (bounds[1] + bounds[3] / 2)]);
  }, [focusX, focusY, gateX, gateY, flat, hasSelectedSlot]);
  const drag = useRef<{ x: number; y: number; pan: PontoCampus } | null>(null);
  const project = (p: PontoCampus, height = 0) => projectCampus(p, height, flat);
  const points = (polygon: PontoCampus[], height = 0) =>
    polygon.map((p) => project(p, height).join(',')).join(' ');
  const base = flat ? [-60, -65, 1460, 610] : [-70, -455, 1520, 850];
  const w = base[2] / zoom;
  const h = base[3] / zoom;
  const viewBox = [
    base[0] + (base[2] - w) / 2 + pan[0],
    base[1] + (base[3] - h) / 2 + pan[1],
    w,
    h,
  ].join(' ');
  const activate = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };
  return (
    <section className="campus-scene" aria-label="Mapa interativo do campus">
      <div className="campus-scene-toolbar">
        <div className="campus-view-toggle" aria-label="Visualização do mapa">
          <button
            aria-pressed={!flat}
            onClick={() => {
              setFlat(false);
              setPan([0, 0]);
            }}
          >
            3D
          </button>
          <button
            aria-pressed={flat}
            onClick={() => {
              setFlat(true);
              setPan([0, 0]);
            }}
          >
            2D
          </button>
        </div>
        <span>Maquete do campus</span>
        <div className="campus-zoom-controls">
          <button
            aria-label="Diminuir mapa"
            disabled={zoom <= 1}
            onClick={() => setZoom(Math.max(1, zoom - 0.4))}
          >
            <Minus size={16} />
          </button>
          <button
            aria-label="Enquadrar campus"
            onClick={() => {
              setZoom(1);
              setPan([0, 0]);
            }}
          >
            <Focus size={16} />
          </button>
          <button
            aria-label="Aproximar mapa"
            disabled={zoom >= 3}
            onClick={() => setZoom(Math.min(3, zoom + 0.4))}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <svg
        className="campus-scene-svg"
        viewBox={viewBox}
        aria-label={`Campus ${mapa.nome}, vista ${flat ? '2D' : 'isométrica'}`}
        onPointerDown={(event) => {
          if ((event.target as Element).closest('[data-map-action]')) return;
          drag.current = { x: event.clientX, y: event.clientY, pan };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const scale = Math.max(w / rect.width, h / rect.height);
          setPan([
            drag.current.pan[0] - (event.clientX - drag.current.x) * scale,
            drag.current.pan[1] - (event.clientY - drag.current.y) * scale,
          ]);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern id="campus-slot-hatch" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M0 5L5 0" stroke="#6a645a" strokeWidth="1" />
          </pattern>
          <pattern id="campus-map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="currentColor" opacity="0.16" />
          </pattern>
        </defs>
        <rect x="-3000" y="-3000" width="7000" height="7000" fill="url(#campus-map-grid)" />
        {!flat && (
          <polygon
            points={points(mapa.limite.map(([x, y]) => [x, y + 13]))}
            className="campus-base-edge"
          />
        )}
        <polygon points={points(mapa.limite)} className="campus-ground" />
        {mapa.vias.map((via) => (
          <g key={via.id}>
            <polyline
              points={points(via.pontos)}
              fill="none"
              stroke="var(--campus-road-border)"
              strokeWidth={via.largura + 4}
              strokeLinejoin="round"
            />
            <polyline
              points={points(via.pontos)}
              fill="none"
              stroke="var(--campus-road)"
              strokeWidth={via.largura}
              strokeLinejoin="round"
            />
            <polyline
              points={points(via.pontos)}
              fill="none"
              stroke="var(--campus-road-line)"
              strokeWidth="1.2"
              strokeDasharray="9 11"
            />
          </g>
        ))}
        {mapa.areas.map((area) => (
          <polygon key={area.id} points={points(area.contorno)} className="campus-parking-area" />
        ))}
        {destination && (
          <polygon
            points={points(
              Array.from({ length: 48 }, (_, i): PontoCampus => [
                destination.entrada[0] + Math.cos((i / 48) * Math.PI * 2) * 220,
                destination.entrada[1] + Math.sin((i / 48) * Math.PI * 2) * 220,
              ]),
            )}
            className="campus-proximity"
          />
        )}
        {vagas.map((vaga) => {
          const angle = (vaga.rotacao * Math.PI) / 180;
          const footprint = (
            [
              [-6, -14],
              [6, -14],
              [6, 14],
              [-6, 14],
            ] as PontoCampus[]
          ).map(([x, y]): PontoCampus => [
            vaga.ponto[0] + x * Math.cos(angle) - y * Math.sin(angle),
            vaga.ponto[1] + x * Math.sin(angle) + y * Math.cos(angle),
          ]);
          const [x, y] = project(vaga.ponto);
          const nearby = !destination || distanceCampus(vaga.ponto, destination.entrada) <= 220;
          return (
            <g
              key={vaga.id}
              role="button"
              tabIndex={0}
              data-map-action="vaga"
              aria-pressed={selectedId === vaga.id}
              aria-label={`Vaga ${vaga.rotulo}, ${campusStatus[vaga.status]}, ${mapa.areas.find((a) => a.id === vaga.areaId)?.nome}`}
              className={`campus-map-slot ${vaga.status.toLowerCase()} ${matches.has(vaga.id) && nearby ? '' : 'slot-dimmed'} ${selectedId === vaga.id ? 'slot-selected' : ''}`}
              onClick={() => onSelect(vaga.id)}
              onKeyDown={(e) => activate(e, () => onSelect(vaga.id))}
            >
              <title>
                {vaga.rotulo} · {campusStatus[vaga.status]} · {vaga.tipo}
              </title>
              <polygon points={points(footprint)} />
              {vaga.status === 'SEM_SINAL' && (
                <polygon points={points(footprint)} style={{ fill: 'url(#campus-slot-hatch)' }} />
              )}
              {vaga.status === 'LIVRE' && (
                <path
                  d={`M${x - 3} ${y}l2 2 4-5`}
                  fill="none"
                  stroke="#f3efe6"
                  strokeWidth="1.5"
                  pointerEvents="none"
                />
              )}
              {selectedId === vaga.id && (
                <circle cx={x} cy={y} r="23" className="campus-selection-ring" />
              )}
            </g>
          );
        })}
        {[...mapa.predios]
          .sort((a, b) => project(a.entrada)[1] - project(b.entrada)[1])
          .map((building) => {
            const selected = building.id === destinoId;
            const roof = building.contorno;
            const center: PontoCampus = [
              roof.reduce((s, p) => s + p[0], 0) / roof.length,
              roof.reduce((s, p) => s + p[1], 0) / roof.length,
            ];
            const [x, y] = project(center, building.altura);
            const [ex, ey] = project(building.entrada);
            const shortName =
              building.id === 'ab'
                ? 'A · B'
                : building.id === 'cde'
                  ? 'C · D · E'
                  : building.id === 'fg'
                    ? 'F · G'
                    : building.id.toUpperCase();
            return (
              <g
                key={building.id}
                role="button"
                tabIndex={0}
                data-map-action="predio"
                aria-label={`Localizar ${building.nome}`}
                aria-pressed={selected}
                className={`campus-building ${selected ? 'building-selected' : ''}`}
                onClick={() => onDestination(building.id)}
                onKeyDown={(e) => activate(e, () => onDestination(building.id))}
              >
                <title>{building.nome}</title>
                {!flat &&
                  roof.map((p, i) => {
                    const next = roof[(i + 1) % roof.length];
                    const top = [project(p, building.altura), project(next, building.altura)];
                    return (
                      <polygon
                        key={i}
                        points={[project(p), project(next), top[1], top[0]]
                          .map((p) => p.join(','))
                          .join(' ')}
                        className={i % 2 ? 'campus-wall-light' : 'campus-wall-dark'}
                      />
                    );
                  })}
                <polygon points={points(roof, building.altura)} className="campus-roof" />
                <polygon
                  points={points(
                    roof.map(([px, py]) => [
                      center[0] + (px - center[0]) * 0.85,
                      center[1] + (py - center[1]) * 0.77,
                    ]),
                    building.altura + 1,
                  )}
                  className="campus-roof-inset"
                />
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  className={`campus-building-name ${shortName.length > 5 ? 'campus-small-label' : ''}`}
                >
                  {shortName}
                </text>
                {selected && (
                  <>
                    <circle cx={ex} cy={ey} r="6" className="campus-building-entry" />
                    <text x={ex + 13} y={ey + 4} className="campus-entry-label">
                      Entrada do bloco
                    </text>
                  </>
                )}
              </g>
            );
          })}
        {mapa.portoes.map((gate) => {
          const [x, y] = project(gate.ponto);
          const name = gate.nome.split(' ·')[0];
          return (
            <g
              key={gate.id}
              className={`campus-gate ${gate.id === portaoId ? 'gate-selected' : ''}`}
            >
              <circle cx={x} cy={y} r="7" />
              <rect x={x - 46} y={y + 15} width="92" height="27" rx="4" />
              <text x={x} y={y + 33} textAnchor="middle">
                {name}
                {!gate.veiculos ? ' / a pé' : ''}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="campus-map-caption">
        <span>Arraste para mover · selecione um bloco ou uma vaga</span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
    </section>
  );
}
