import { useEffect, useRef, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip as MapTooltip,
  useMapEvents,
  ZoomControl,
  AttributionControl,
} from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import type { EstacionamentoResumo } from '../../types';
import { Button } from '../ui';

function PickPoint({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
export function CampusMap({
  lots = [],
  onFail,
  onPick,
  point,
}: {
  lots?: EstacionamentoResumo[];
  onFail?: () => void;
  onPick?: (latitude: number, longitude: number) => void;
  point?: [number, number];
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const failCallback = useRef(onFail);
  useEffect(() => {
    failCallback.current = onFail;
  }, [onFail]);
  useEffect(() => {
    if (loaded) return;
    const timer = window.setTimeout(() => {
      setFailed(true);
      failCallback.current?.();
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [loaded]);
  if (failed)
    return (
      <div className="map-fallback">
        <p>O mapa está indisponível. As vagas continuam disponíveis na lista.</p>
        {onFail && <Button onClick={onFail}>Ver lista</Button>}
        {onPick && <p>Use os campos de latitude e longitude abaixo.</p>}
      </div>
    );
  return (
    <div className="campus-map">
      <MapContainer
        center={point ?? [-22.326, -49.053]}
        zoom={17}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <ZoomControl zoomInTitle="Aumentar zoom" zoomOutTitle="Diminuir zoom" />
        <AttributionControl prefix={false} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          eventHandlers={{
            tileerror: () => {
              setFailed(true);
              onFail?.();
            },
            load: () => setLoaded(true),
          }}
        />
        {onPick && <PickPoint onPick={onPick} />}
        {point && (
          <CircleMarker
            center={point}
            radius={9}
            pathOptions={{ color: '#a66d00', fillColor: '#FFC800', fillOpacity: 1 }}
          />
        )}
        {lots.map((lot) => (
          <CircleMarker
            key={lot.id}
            center={[lot.latitude, lot.longitude]}
            radius={24}
            pathOptions={{
              color: '#0B0D10',
              weight: 3,
              fillColor: lot.vagasLivres ? '#22C55E' : '#EF4444',
              fillOpacity: 0.95,
            }}
          >
            <MapTooltip permanent direction="center" className="map-count" opacity={1}>
              {lot.vagasLivres}
            </MapTooltip>
            <Popup>
              <strong>{lot.nome}</strong>
              <p>
                {lot.vagasLivres} livres de {lot.totalVagas}
              </p>
              <Link to={`/admin/consulta/${lot.id}`}>Ver vagas →</Link>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="map-note">
        Toque em um marcador para consultar as vagas.
        {onPick && ' Clique no mapa para definir a posição.'}
      </p>
    </div>
  );
}
