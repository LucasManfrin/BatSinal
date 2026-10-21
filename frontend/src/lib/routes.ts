export const DEFAULT_CAMPUS_SLUG = import.meta.env.VITE_DEFAULT_CAMPUS_SLUG || 'unisagrado';

export function publicCampusPath(slug: string) {
  return slug === DEFAULT_CAMPUS_SLUG ? '/' : `/c/${encodeURIComponent(slug)}`;
}

export function publicLotPath(slug: string, id: string) {
  return `/c/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`;
}
