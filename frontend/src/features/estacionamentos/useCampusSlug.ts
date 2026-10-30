import { useLocation, useParams } from 'react-router-dom';
import { DEFAULT_CAMPUS_SLUG } from '../../lib/routes';

export function useCampusSlug() {
  const { campusSlug } = useParams();
  const { pathname } = useLocation();
  return (
    campusSlug ?? (pathname === '/' || pathname === '/anunciar' ? DEFAULT_CAMPUS_SLUG : undefined)
  );
}
