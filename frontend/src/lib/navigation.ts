import type { Estacionamento } from '../types';

export function directionsUrl(lot: Pick<Estacionamento, 'latitude' | 'longitude'>) {
  if (
    !Number.isFinite(lot.latitude) ||
    !Number.isFinite(lot.longitude) ||
    Math.abs(lot.latitude) > 90 ||
    Math.abs(lot.longitude) > 180
  )
    return null;
  const query = new URLSearchParams({
    api: '1',
    destination: `${lot.latitude},${lot.longitude}`,
    travelmode: 'driving',
  });
  return `https://www.google.com/maps/dir/?${query.toString()}`;
}
